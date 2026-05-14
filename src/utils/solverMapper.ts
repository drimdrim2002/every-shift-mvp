import dayjs from 'dayjs';
import {
  buildRollingHistoryWindow,
  mergePlanningAssignmentsWithFallback,
} from '@/utils/rollingHistory';
import { buildZeroYearlyEmployeeStats } from '@/utils/solverYearlyEmployeeStats';
import type {
  ConstraintMap,
  PlanningAssignment,
  PlanningEmployee,
  PlanningShift,
  ScheduleBasicInfo,
  SiteRequirements,
  SolverRequestEmployee,
  SolverRequestHistoryItem,
  SolverRequest,
  SolverRequestRequirementItem,
  SolverRequestUndesirableItem,
} from '@/types/schedule';
import type { Shift } from '@/types/shift';

/**
 * Maps application state to the API SolverRequest format.
 * 
 * @param basicInfo Basic schedule information (month, organization, etc.)
 * @param siteRequirements Daily staffing requirements
 * @param constraints Current unavailable requests from Step4 (O)
 * @param employees List of employees
 * @param shifts List of defined shifts
 * @param existingAssignments Previously saved assignments (optional)
 * @param lastMonthDays Number of previous-month days to include in payload
 * @returns SolverRequest payload for the API
 */
export function mapToSolverRequest(
  basicInfo: ScheduleBasicInfo,
  siteRequirements: SiteRequirements,
  constraints: ConstraintMap,
  employees: PlanningEmployee[],
  shifts: Shift[],
  existingAssignments: PlanningAssignment[] = [],
  lastMonthDays: number,
  fallbackHistoryAssignments: PlanningAssignment[] = [],
): SolverRequest {
  const { month, organizationId, organizationName, organizationType } = basicInfo;

  const window = buildRollingHistoryWindow(month, lastMonthDays);
  const daysInMonth = dayjs(window.firstDraftDate).daysInMonth();
  
  const planningShiftSource = shifts.filter((shift) => ['D', 'E', 'N'].includes(shift.code));

  // Transform shifts to PlanningShift format (send only planning shifts D/E/N)
  const planningShifts: PlanningShift[] = planningShiftSource.map(s => ({
    id: s.id,
    code: s.code,
    name: s.name,
    start_time: s.startTime
      ? (s.startTime.length === 5 ? `${s.startTime}:00` : s.startTime)
      : '00:00:00',
    end_time: s.endTime
      ? (s.endTime.length === 5 ? `${s.endTime}:00` : s.endTime)
      : '00:00:00',
  }));

  // Create maps for quick shift lookups
  const shiftCodeById: Record<string, string> = {};
  shifts.forEach(s => {
    shiftCodeById[s.id] = s.code;
  });

  // Transform employees to SolverRequestEmployee format
  const solverEmployees: SolverRequestEmployee[] = employees.map(e => ({
    employee_id: e.employee_id,
    name: e.name,
    available_shifts: e.available_shifts,
    skill_set: ['ALL'], // Default skill set
  }));

  // Generate History (Locked Assignments)
  const historyAssignments = mergePlanningAssignmentsWithFallback(
    existingAssignments,
    fallbackHistoryAssignments,
    window,
  );

  const history: SolverRequestHistoryItem[] = historyAssignments
    .filter((assignment) => shiftCodeById[assignment.shift_id] !== 'O')
    .map(assignment => ({
      employee_id: assignment.employee_id,
      shift_id: assignment.shift_id,
      date: assignment.date,
      is_locked: true,
    }));

  // Generate Requirements
  const requirements: SolverRequestRequirementItem[] = [];
  const sortedDates = Object.keys(siteRequirements).sort();

  sortedDates.forEach((date, dayIndex) => {
    const dailyReq = siteRequirements[date];
    if (!dailyReq) return;

    shifts.forEach(shift => {
      // Cast to keyof DailyRequirement if needed, assuming keys match shift codes 'D', 'E', 'N'
      // 'O' (Off) is usually not a requirement
      const shiftCode = shift.code;
      if (['D', 'E', 'N'].includes(shiftCode) && shiftCode in dailyReq) {
        const count = dailyReq[shiftCode as keyof typeof dailyReq] as number;
        if (count > 0) {
          requirements.push({
            shiftId: shift.id,
            dayIndex: dayIndex, // 0-based index from firstDraftDate
            employeeCount: count,
          });
        }
      }
    });
  });

  // Generate Undesirable (Step4 O requests as soft constraints)
  const undesirable: SolverRequestUndesirableItem[] = [];
  Object.entries(constraints).forEach(([employeeId, dateMap]) => {
    Object.entries(dateMap).forEach(([date, requestCode]) => {
      if (requestCode !== 'O') return;
      if (date < window.firstDraftDate) return;
      undesirable.push({
        employee_id: employeeId,
        date,
        is_locked: false,
      });
    });
  });

  return {
    organization: {
      id: organizationId,
      name: organizationName,
      type: organizationType,
      shifts: planningShifts,
      lastHistoricalDate: window.lastHistoricalDate,
      firstDraftDate: window.firstDraftDate,
      publishLength: window.publishLength,
      draftLength: daysInMonth,
    },
    employees: solverEmployees,
    history,
    undesirable,
    requirements,
    publicHolidays: [],
    yearlyEmployeeStats: buildZeroYearlyEmployeeStats(
      solverEmployees.map((employee) => employee.employee_id)
    ),
  };
}
