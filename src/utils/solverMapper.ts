import dayjs from 'dayjs';
import type {
  ScheduleBasicInfo,
  SiteRequirements,
  ConstraintMap,
  PlanningEmployee,
  PlanningAssignment,
  SolverRequest,
  SolverRequestHistoryItem,
  SolverRequestUndesirableItem,
  SolverRequestRequirementItem,
  SolverRequestEmployee,
  PlanningShift
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
 * @returns SolverRequest payload for the API
 */
export function mapToSolverRequest(
  basicInfo: ScheduleBasicInfo,
  siteRequirements: SiteRequirements,
  constraints: ConstraintMap,
  employees: PlanningEmployee[],
  shifts: Shift[],
  existingAssignments: PlanningAssignment[] = []
): SolverRequest {
  const { month, organizationId, organizationName, organizationType } = basicInfo;

  // Calculate dates
  const firstDraftDate = dayjs(month).startOf('month').format('YYYY-MM-DD');
  const lastHistoricalDate = dayjs(firstDraftDate).subtract(1, 'day').format('YYYY-MM-DD');
  const daysInMonth = dayjs(month).daysInMonth();
  
  // Transform shifts to PlanningShift format (include O for undesirable mapping)
  const planningShifts: PlanningShift[] = shifts.map(s => ({
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

  // Create a map for quick shift lookup by code
  const shiftsMap: Record<string, string> = {};
  shifts.forEach(s => {
    shiftsMap[s.code] = s.id;
  });

  // Transform employees to SolverRequestEmployee format
  const solverEmployees: SolverRequestEmployee[] = employees.map(e => ({
    employee_id: e.employee_id,
    name: e.name,
    available_shifts: e.available_shifts,
    skill_set: ['ALL'], // Default skill set
  }));

  // Generate History (Locked Assignments)
  const history: SolverRequestHistoryItem[] = existingAssignments
    .filter(assignment => assignment.date < firstDraftDate || assignment.is_locked)
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

  // Generate Undesirable (Step4 O requests as soft Off preference)
  const offShiftId = shiftsMap.O;
  const undesirable: SolverRequestUndesirableItem[] = [];
  if (offShiftId) {
    Object.entries(constraints).forEach(([employeeId, dateMap]) => {
      Object.entries(dateMap).forEach(([date, requestCode]) => {
        if (requestCode !== 'O') return;
        if (date < firstDraftDate) return;
        undesirable.push({
          employee_id: employeeId,
          shift_id: offShiftId,
          date,
          is_locked: false,
        });
      });
    });
  }

  return {
    organization: {
      id: organizationId,
      name: organizationName,
      type: organizationType,
      shifts: planningShifts,
      lastHistoricalDate,
      firstDraftDate,
      publishLength: daysInMonth,
      draftLength: daysInMonth,
    },
    employees: solverEmployees,
    history,
    undesirable,
    requirements,
  };
}
