import { beforeEach, describe, expect, it, vi } from 'vitest';

const listPublicHolidayDatesInRangeMock = vi.hoisted(() => vi.fn());
const loadSiteRequirementsMock = vi.hoisted(() => vi.fn());
const getPlanningAssignmentsForVersionMock = vi.hoisted(() => vi.fn());
const getPlanningEmployeesMock = vi.hoisted(() => vi.fn());
const getPreviousMonthFinalizedContextMock = vi.hoisted(() => vi.fn());
const getScheduleVersionPreferencesMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/publicHolidays', () => ({
  listPublicHolidayDatesInRange: listPublicHolidayDatesInRangeMock,
}));

vi.mock('@/api/employee', () => ({
  loadSiteRequirements: loadSiteRequirementsMock,
}));

vi.mock('@/api/schedule', () => ({
  getPlanningAssignmentsForVersion: getPlanningAssignmentsForVersionMock,
  getPlanningEmployees: getPlanningEmployeesMock,
  getPreviousMonthFinalizedContext: getPreviousMonthFinalizedContextMock,
  getScheduleVersionPreferences: getScheduleVersionPreferencesMock,
}));

import {
  resolveSolverHolidayRange,
  useScheduleSolverRequest,
} from '@/composables/useScheduleSolverRequest';
import type {
  ScheduleBasicInfo,
  ScheduleInputSnapshot,
  SolverRequest,
} from '@/types/schedule';
import type { Shift } from '@/types/shift';

function createShifts(): Shift[] {
  return [
    {
      id: 'shift-d',
      organizationId: 'org-1',
      code: 'D',
      name: 'Day',
      colorCode: '#92D050',
      startTime: '08:00:00',
      endTime: '16:00:00',
    },
    {
      id: 'shift-e',
      organizationId: 'org-1',
      code: 'E',
      name: 'Evening',
      colorCode: '#FFC000',
      startTime: '16:00:00',
      endTime: '00:00:00',
    },
    {
      id: 'shift-n',
      organizationId: 'org-1',
      code: 'N',
      name: 'Night',
      colorCode: '#4472C4',
      startTime: '00:00:00',
      endTime: '08:00:00',
    },
  ];
}

function createBasicInfo(): ScheduleBasicInfo {
  const shifts = createShifts();
  return {
    scheduleId: 'schedule-1',
    month: '2026-01',
    organizationId: 'org-1',
    organizationName: '테스트병원',
    organizationType: 'hospital',
    employeeCount: 1,
    shifts,
  };
}

function createSolverRequest(): SolverRequest {
  return {
    organization: {
      id: 'org-1',
      name: '테스트병원',
      type: 'hospital',
      shifts: [
        {
          id: 'shift-d',
          code: 'D',
          name: 'Day',
          start_time: '08:00:00',
          end_time: '16:00:00',
        },
      ],
      lastHistoricalDate: '2025-12-27',
      firstDraftDate: '2026-01-01',
      publishLength: 5,
      draftLength: 31,
    },
    employees: [],
    history: [],
    undesirable: [],
    requirements: [],
    publicHolidays: [],
  };
}

function createInputSnapshot(publicHolidays?: string[]): ScheduleInputSnapshot {
  const solverInput = {
    scheduleId: 'schedule-1',
    organizationId: 'org-1',
    siteId: 'site-1',
    month: '2026-01',
    lastMonthDays: 5,
    employees: [
      {
        employeeId: 'emp-1',
        availableShifts: ['D', 'E', 'N', 'O'],
        skillSet: ['ALL'],
      },
    ],
    assignments: [],
    employeeConstraints: [],
    hospitalRules: {
      organizationType: 'hospital',
      shifts: [
        {
          id: 'shift-d',
          code: 'D',
          startTime: '08:00:00',
          endTime: '16:00:00',
        },
      ],
      lastHistoricalDate: '2025-12-27',
      firstDraftDate: '2026-01-01',
      publishLength: 5,
      draftLength: 31,
    },
    monthlyRequirements: [],
    ...(publicHolidays === undefined ? {} : { publicHolidays }),
  };

  return {
    solverInputHash: 'sha256:snapshot',
    solverInput,
    generatorVersion: 'test-generator',
    createdAt: '2026-01-01T00:00:00.000Z',
  } as unknown as ScheduleInputSnapshot;
}

describe('useScheduleSolverRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPublicHolidayDatesInRangeMock.mockResolvedValue(['2026-01-01', '2026-01-15']);
    loadSiteRequirementsMock.mockResolvedValue([]);
    getPlanningEmployeesMock.mockResolvedValue([
      {
        employee_id: 'emp-1',
        name: '직원1',
        available_shifts: ['D', 'E', 'N', 'O'],
      },
    ]);
    getPlanningAssignmentsForVersionMock.mockResolvedValue([]);
    getPreviousMonthFinalizedContextMock.mockResolvedValue(null);
    getScheduleVersionPreferencesMock.mockResolvedValue({ constraints: {} });
  });

  it('fresh build loads public holidays for the inclusive solver draft range', async () => {
    const solver = useScheduleSolverRequest();

    const bundle = await solver.buildScheduleSolverRequest({
      basicInfo: createBasicInfo(),
      scheduleId: 'schedule-1',
      versionId: 'version-1',
      shifts: createShifts(),
      siteRequirements: [
        { dayOfWeek: 4, shiftCode: 'D', requiredCount: 1 },
      ],
      constraints: {},
      lastMonthDays: 5,
      siteId: 'site-1',
      fallbackHistoryAssignments: [],
    });

    expect(listPublicHolidayDatesInRangeMock).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
    expect(bundle.solverRequest.publicHolidays).toEqual(['2026-01-01', '2026-01-15']);
    expect(bundle.inputSnapshot.solverInput.publicHolidays).toEqual([
      '2026-01-01',
      '2026-01-15',
    ]);
  });

  it('snapshot rebuild uses stored public holidays without loading them again', async () => {
    const solver = useScheduleSolverRequest();

    const bundle = await solver.buildScheduleSolverRequest({
      basicInfo: createBasicInfo(),
      scheduleId: 'schedule-1',
      versionId: 'version-1',
      shifts: createShifts(),
      lastMonthDays: 5,
      inputSnapshot: createInputSnapshot(['2026-01-01']),
    });

    expect(listPublicHolidayDatesInRangeMock).not.toHaveBeenCalled();
    expect(bundle.solverRequest.publicHolidays).toEqual(['2026-01-01']);
  });

  it('legacy snapshot rebuild defaults missing public holidays to an empty list', async () => {
    const solver = useScheduleSolverRequest();

    const bundle = await solver.buildScheduleSolverRequest({
      basicInfo: createBasicInfo(),
      scheduleId: 'schedule-1',
      versionId: 'version-1',
      shifts: createShifts(),
      lastMonthDays: 5,
      inputSnapshot: createInputSnapshot(),
    });

    expect(listPublicHolidayDatesInRangeMock).not.toHaveBeenCalled();
    expect(bundle.solverRequest.publicHolidays).toEqual([]);
  });

  it('resolveSolverHolidayRange includes the first and last draft dates', () => {
    expect(resolveSolverHolidayRange(createSolverRequest())).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });
  });

  it('resolveSolverHolidayRange handles one-day draft ranges', () => {
    const solverRequest = createSolverRequest();
    solverRequest.organization.draftLength = 1;

    expect(resolveSolverHolidayRange(solverRequest)).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-01-01',
    });
  });

  it('resolveSolverHolidayRange crosses leap-day month boundaries', () => {
    const solverRequest = createSolverRequest();
    solverRequest.organization.firstDraftDate = '2028-02-28';
    solverRequest.organization.draftLength = 3;

    expect(resolveSolverHolidayRange(solverRequest)).toEqual({
      startDate: '2028-02-28',
      endDate: '2028-03-01',
    });
  });
});
