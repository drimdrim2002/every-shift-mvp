import dayjs from 'dayjs';
import { loadSiteRequirements } from '@/api/employee';
import { listPublicHolidayDatesInRange } from '@/api/publicHolidays';
import {
  getPlanningAssignmentsForVersion,
  getPlanningEmployees,
  getPreviousMonthFinalizedContext,
  getScheduleVersionPreferences,
} from '@/api/schedule';
import { mapToSolverRequest } from '@/utils/solverMapper';
import { buildScheduleInputSnapshot } from '@/utils/scheduleInputSnapshot';
import type { Shift } from '@/types/shift';
import type {
  ConstraintMap,
  PlanningAssignment,
  PlanningEmployee,
  ScheduleBasicInfo,
  ScheduleInputSnapshot,
  SiteRequirementList,
  SiteRequirements,
  SolverRequest,
} from '@/types/schedule';

export interface BuildScheduleSolverRequestInput {
  basicInfo: ScheduleBasicInfo;
  scheduleId: string;
  versionId: string;
  shifts: Shift[];
  siteRequirements?: SiteRequirementList;
  constraints?: ConstraintMap;
  lastMonthDays: number;
  siteId?: string | null;
  inputSnapshot?: ScheduleInputSnapshot | null;
  fallbackHistoryAssignments?: PlanningAssignment[];
  onSiteRequirementsLoaded?: (requirements: SiteRequirementList) => void;
}

export interface ScheduleSolverRequestBundle {
  solverRequest: SolverRequest;
  inputSnapshot: ScheduleInputSnapshot;
}

export function resolveSolverHolidayRange(
  solverRequest: SolverRequest
): { startDate: string; endDate: string } {
  const startDate = solverRequest.organization.firstDraftDate;
  return {
    startDate,
    endDate: dayjs(startDate)
      .add(solverRequest.organization.draftLength - 1, 'day')
      .format('YYYY-MM-DD'),
  };
}

function buildDateBasedRequirements(
  month: string,
  siteRequirements: SiteRequirementList
): SiteRequirements {
  const weeklyRequirements: Record<
    number,
    { D: number; E: number; N: number; O: number; total: number }
  > = {};

  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
    weeklyRequirements[dayOfWeek] = { D: 0, E: 0, N: 0, O: 0, total: 0 };
  }

  siteRequirements.forEach((requirement) => {
    const dayRequirements = weeklyRequirements[requirement.dayOfWeek];
    if (!dayRequirements) return;

    if (['D', 'E', 'N', 'O'].includes(requirement.shiftCode)) {
      const shiftCode = requirement.shiftCode as 'D' | 'E' | 'N' | 'O';
      dayRequirements[shiftCode] = requirement.requiredCount;
      dayRequirements.total += requirement.requiredCount;
    }
  });

  const daysInMonth = dayjs(`${month}-01`).daysInMonth();
  const dateBasedRequirements: SiteRequirements = {};

  for (let dayIndex = 0; dayIndex < daysInMonth; dayIndex += 1) {
    const date = dayjs(`${month}-01`).add(dayIndex, 'day');
    const dayOfWeek = date.day();
    const weeklyRequirement = weeklyRequirements[dayOfWeek];
    dateBasedRequirements[date.format('YYYY-MM-DD')] = weeklyRequirement
      ? { ...weeklyRequirement }
      : { D: 0, E: 0, N: 0, O: 0, total: 0 };
  }

  return dateBasedRequirements;
}

function buildSolverRequestFromSnapshot(
  input: BuildScheduleSolverRequestInput,
  planningEmployees: PlanningEmployee[],
  shifts: Shift[]
): SolverRequest {
  const { solverInput } = input.inputSnapshot!;
  const employeeNameById = new Map(
    planningEmployees.map((employee) => [employee.employee_id, employee.name])
  );
  const shiftNameById = new Map(shifts.map((shift) => [shift.id, shift.name]));

  return {
    organization: {
      id: solverInput.organizationId,
      name: input.basicInfo.organizationName,
      type: solverInput.hospitalRules.organizationType,
      shifts: solverInput.hospitalRules.shifts.map((shift) => ({
        id: shift.id,
        code: shift.code,
        name: shiftNameById.get(shift.id) ?? shift.code,
        start_time: shift.startTime,
        end_time: shift.endTime,
      })),
      lastHistoricalDate: solverInput.hospitalRules.lastHistoricalDate,
      firstDraftDate: solverInput.hospitalRules.firstDraftDate,
      publishLength: solverInput.hospitalRules.publishLength,
      draftLength: solverInput.hospitalRules.draftLength,
    },
    employees: solverInput.employees.map((employee) => ({
      employee_id: employee.employeeId,
      name: employeeNameById.get(employee.employeeId) ?? employee.employeeId,
      available_shifts: [...employee.availableShifts],
      skill_set: [...employee.skillSet],
    })),
    history: solverInput.assignments.map((assignment) => ({
      employee_id: assignment.employeeId,
      shift_id: assignment.shiftId,
      date: assignment.date,
      is_locked: assignment.isLocked,
    })),
    undesirable: solverInput.employeeConstraints.map((constraint) => ({
      employee_id: constraint.employeeId,
      date: constraint.date,
      is_locked: constraint.isLocked,
    })),
    requirements: solverInput.monthlyRequirements.map((requirement) => ({
      shiftId: requirement.shiftId,
      dayIndex: requirement.dayIndex,
      employeeCount: requirement.employeeCount,
    })),
    publicHolidays: [...(solverInput.publicHolidays ?? [])],
  };
}

export function useScheduleSolverRequest() {
  async function resolveSiteRequirements(
    input: BuildScheduleSolverRequestInput
  ): Promise<SiteRequirementList> {
    if (input.siteRequirements && input.siteRequirements.length > 0) {
      return input.siteRequirements;
    }

    const loadedRequirements = await loadSiteRequirements(input.basicInfo.organizationId);
    input.onSiteRequirementsLoaded?.(loadedRequirements);
    return loadedRequirements;
  }

  async function resolveFallbackHistoryAssignments(
    input: BuildScheduleSolverRequestInput
  ): Promise<PlanningAssignment[]> {
    if (input.fallbackHistoryAssignments) {
      return input.fallbackHistoryAssignments;
    }

    const context = await getPreviousMonthFinalizedContext(
      input.basicInfo.organizationId,
      input.basicInfo.month
    );

    return context?.planningAssignments ?? [];
  }

  async function buildScheduleSolverRequest(
    input: BuildScheduleSolverRequestInput
  ): Promise<ScheduleSolverRequestBundle> {
    const shifts = input.shifts.length > 0 ? input.shifts : input.basicInfo.shifts;

    if (shifts.length === 0) {
      throw new Error('시프트 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    }

    if (input.inputSnapshot) {
      const planningEmployees = await getPlanningEmployees(input.basicInfo.organizationId);
      return {
        solverRequest: buildSolverRequestFromSnapshot(input, planningEmployees, shifts),
        inputSnapshot: input.inputSnapshot,
      };
    }

    const [siteRequirements, constraints, planningEmployees, planningAssignments, fallbackHistory] =
      await Promise.all([
        resolveSiteRequirements(input),
        input.constraints !== undefined
          ? Promise.resolve(input.constraints)
          : getScheduleVersionPreferences(input.versionId).then((result) => result.constraints),
        getPlanningEmployees(input.basicInfo.organizationId),
        getPlanningAssignmentsForVersion(input.versionId),
        resolveFallbackHistoryAssignments(input),
      ]);

    if (siteRequirements.length === 0) {
      throw new Error('사이트 요구사항이 비어 있습니다. Step2에서 먼저 설정해주세요.');
    }

    const solverRequest = mapToSolverRequest(
      input.basicInfo,
      buildDateBasedRequirements(input.basicInfo.month, siteRequirements),
      constraints,
      planningEmployees,
      shifts,
      planningAssignments,
      input.lastMonthDays,
      fallbackHistory
    );

    const holidayRange = resolveSolverHolidayRange(solverRequest);
    solverRequest.publicHolidays = await listPublicHolidayDatesInRange(
      holidayRange.startDate,
      holidayRange.endDate
    );

    const inputSnapshot = await buildScheduleInputSnapshot({
      scheduleId: input.scheduleId,
      siteId: input.siteId ?? null,
      month: input.basicInfo.month,
      lastMonthDays: input.lastMonthDays,
      solverRequest,
    });

    return {
      solverRequest,
      inputSnapshot,
    };
  }

  return {
    buildScheduleSolverRequest,
  };
}
