import dayjs from 'dayjs';
import type {
  ScheduleBasicInfo,
  SiteRequirements,
  AssignmentMap,
  OffReasonMap,
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
 * @param assignments Current grid assignments (from Step 3)
 * @param offReasons Off reasons map (from Step 3)
 * @param employees List of employees
 * @param shifts List of defined shifts
 * @param existingAssignments Previously saved assignments (optional)
 * @returns SolverRequest payload for the API
 */
export function mapToSolverRequest(
  basicInfo: ScheduleBasicInfo,
  siteRequirements: SiteRequirements,
  assignments: AssignmentMap,
  offReasons: OffReasonMap,
  employees: PlanningEmployee[],
  shifts: Shift[],
  existingAssignments: PlanningAssignment[] = []
): SolverRequest {
  const { month, organizationId, organizationName, organizationType } = basicInfo;

  // Calculate dates
  const firstDraftDate = dayjs(month).startOf('month').format('YYYY-MM-DD');
  const lastHistoricalDate = dayjs(firstDraftDate).subtract(1, 'day').format('YYYY-MM-DD');
  const daysInMonth = dayjs(month).daysInMonth();
  
  // Filter out invalid shifts (e.g. Off, Holiday without time)
  const validShifts = shifts.filter(s => s.startTime && s.endTime);

  // Transform shifts to PlanningShift format
  const planningShifts: PlanningShift[] = validShifts.map(s => ({
    id: s.id,
    code: s.code,
    name: s.name,
    start_time: s.startTime!.length === 5 ? `${s.startTime}:00` : s.startTime!,
    end_time: s.endTime!.length === 5 ? `${s.endTime}:00` : s.endTime!,
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

  // Merge grid assignments and existing assignments
  const assignmentMap = new Map<string, PlanningAssignment>();

  // 1. Add existing assignments first
  existingAssignments.forEach(assignment => {
    let isLocked = assignment.is_locked;
    if (assignment.date < firstDraftDate) {
      isLocked = true;
    }
    const key = `${assignment.employee_id}_${assignment.date}`;
    assignmentMap.set(key, { ...assignment, is_locked: isLocked });
  });

  // 2. Overwrite with grid assignments (user input in Step 3/4)
  Object.entries(assignments).forEach(([employeeId, dateMap]) => {
    Object.entries(dateMap).forEach(([date, shiftCode]) => {
      // Use shiftsMap (which contains all shifts including Off)
      if (shiftCode && shiftsMap[shiftCode]) {
        // Check for off reason to determine lock status
        const offReason = offReasons[employeeId]?.[date];
        let isLocked = !!offReason;
        
        // Historical dates are always locked
        if (date < firstDraftDate) {
          isLocked = true;
        }

        const key = `${employeeId}_${date}`;
        assignmentMap.set(key, {
          employee_id: employeeId,
          shift_id: shiftsMap[shiftCode],
          date,
          is_locked: isLocked,
        });
      }
    });
  });
  
  const finalAssignments = Array.from(assignmentMap.values());

  // Generate History (Locked Assignments)
  const history: SolverRequestHistoryItem[] = finalAssignments
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

    validShifts.forEach(shift => {
      // Cast to keyof DailyRequirement if needed, assuming keys match shift codes 'D', 'E', 'N'
      // 'O' (Off) is usually not a requirement
      const shiftCode = shift.code;
      if (shiftCode !== 'O' && shiftCode in dailyReq) {
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

  // Generate Undesirable (Future Off Requests - currently empty as per MVP decision)
  // In the future, non-locked Off requests could go here
  const undesirable: SolverRequestUndesirableItem[] = [];

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
