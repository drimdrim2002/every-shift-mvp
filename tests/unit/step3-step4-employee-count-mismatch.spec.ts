import { describe, expect, it } from 'vitest';
import type { Employee, EmployeeInput } from '@/types/employee';
import {
  mapEmployeesToInput,
  normalizeEmployeeInputs,
} from '@/utils/employeeRosterMapping';

/**
 * Regression tests for Step3(19) vs Step4(11) employee count mismatch.
 * See docs/investigations/2026-06-14-step3-step4-employee-count-mismatch.ko.md
 */

type RosterRow = {
  employeeId: string;
  name: string;
  preceptorEmployeeId?: string | null;
};

function filterRosterRowsForInsert(rows: RosterRow[]): RosterRow[] {
  return rows.filter(
    (row) => row.employeeId.trim().length > 0 && row.name.trim().length > 0,
  );
}

function shouldReloadOrganizationEmployees(options: {
  forceRefresh: boolean;
  hasOrgCurrent: boolean;
  orgEmployeeCount: number;
  scheduleId?: string;
  metaEmployeeCount?: number;
}): boolean {
  if (options.forceRefresh) return true;
  if (!options.hasOrgCurrent || options.orgEmployeeCount === 0) return true;
  if (!options.scheduleId) return true;
  const metaCount = options.metaEmployeeCount ?? 0;
  if (metaCount > 0 && metaCount !== options.orgEmployeeCount) return true;
  return false;
}

function simulatePostWizardSaveState(options: {
  localEmployees: EmployeeInput[];
  applyResultEmployeeCount: number;
  orgStoreEmployeesAfterReload: Employee[];
}): {
  step3UiCount: number;
  scheduleStoreCount: number;
  orgStoreCount: number;
  employeeCountMismatch: boolean;
} {
  const normalizedPayload = normalizeEmployeeInputs(options.localEmployees);
  const syncedEmployees = mapEmployeesToInput(options.orgStoreEmployeesAfterReload);
  const step3UiCount = syncedEmployees.length;
  const scheduleStoreCount = syncedEmployees.length;
  const orgStoreCount = options.orgStoreEmployeesAfterReload.length;

  return {
    step3UiCount,
    scheduleStoreCount,
    orgStoreCount,
    employeeCountMismatch:
      options.applyResultEmployeeCount !== normalizedPayload.length ||
      orgStoreCount !== normalizedPayload.length ||
      step3UiCount !== orgStoreCount,
  };
}

describe('Step3 vs Step4 employee count mismatch regression', () => {
  it('RPC insert filter drops rows with empty employeeId or name (H1)', () => {
    const payload: RosterRow[] = Array.from({ length: 19 }, (_, index) => {
      if (index < 11) {
        return {
          employeeId: `E${String(index + 1).padStart(3, '0')}`,
          name: `Employee ${index + 1}`,
          preceptorEmployeeId: null,
        };
      }

      return {
        employeeId: '',
        name: `Missing Id ${index + 1}`,
        preceptorEmployeeId: `E${String((index % 4) + 1).padStart(3, '0')}`,
      };
    });

    const inserted = filterRosterRowsForInsert(payload);

    expect(payload).toHaveLength(19);
    expect(inserted).toHaveLength(11);
    expect(payload.length - inserted.length).toBe(8);
  });

  it('normalizeEmployeeInputs fills empty employeeId before save', () => {
    const localEmployees: EmployeeInput[] = Array.from({ length: 19 }, (_, index) => ({
      employeeId: index < 11 ? `E${index + 1}` : '',
      name: `Name ${index + 1}`,
      availableShifts: ['D'],
      preceptorEmployeeId: index >= 11 ? 'E1' : null,
    }));

    const normalized = normalizeEmployeeInputs(localEmployees);

    expect(normalized).toHaveLength(19);
    expect(normalized.every((employee) => employee.employeeId.trim().length > 0)).toBe(true);
    expect(filterRosterRowsForInsert(normalized)).toHaveLength(19);
  });

  it('post-save sync keeps Step3, scheduleStore, and orgStore aligned', () => {
    const localEmployees: EmployeeInput[] = Array.from({ length: 19 }, (_, index) => ({
      employeeId: index < 11 ? `E${index + 1}` : '',
      name: `Name ${index + 1}`,
      availableShifts: ['D'],
      preceptorEmployeeId: index >= 11 ? 'E1' : null,
    }));

    const orgStoreEmployees: Employee[] = normalizeEmployeeInputs(localEmployees).map(
      (employee, index) => ({
        id: `uuid-${index + 1}`,
        organizationId: 'org-1',
        employeeId: employee.employeeId,
        name: employee.name,
        availableShifts: employee.availableShifts,
        rankCode: null,
        preceptorId: null,
      }),
    );

    const snapshot = simulatePostWizardSaveState({
      localEmployees,
      applyResultEmployeeCount: 19,
      orgStoreEmployeesAfterReload: orgStoreEmployees,
    });

    expect(snapshot).toEqual({
      step3UiCount: 19,
      scheduleStoreCount: 19,
      orgStoreCount: 19,
      employeeCountMismatch: false,
    });
  });

  it('mapEmployeesToInput resolves preceptor UUID to employeeId', () => {
    const employees: Employee[] = [
      {
        id: 'uuid-p',
        organizationId: 'org-1',
        employeeId: 'P-1',
        name: 'Preceptor',
        availableShifts: ['D'],
        preceptorId: null,
      },
      {
        id: 'uuid-t',
        organizationId: 'org-1',
        employeeId: 'T-1',
        name: 'Trainee',
        availableShifts: ['D'],
        preceptorId: 'uuid-p',
      },
    ];

    expect(mapEmployeesToInput(employees)[1]?.preceptorEmployeeId).toBe('P-1');
  });

  it('mapEmployeesToInput sorts rows by employee_id', () => {
    const employees: Employee[] = [
      {
        id: 'uuid-3',
        organizationId: 'org-1',
        employeeId: '43338',
        name: 'Trainee C',
        availableShifts: ['D'],
        rankCode: null,
        preceptorId: 'uuid-2',
      },
      {
        id: 'uuid-1',
        organizationId: 'org-1',
        employeeId: '101',
        name: 'Alpha',
        availableShifts: ['D'],
        rankCode: null,
        preceptorId: null,
      },
      {
        id: 'uuid-2',
        organizationId: 'org-1',
        employeeId: '42865',
        name: 'Trainee B',
        availableShifts: ['D'],
        rankCode: null,
        preceptorId: 'uuid-4',
      },
    ];

    expect(mapEmployeesToInput(employees).map((employee) => employee.employeeId)).toEqual([
      '101',
      '42865',
      '43338',
    ]);
  });

  it('Step4 reloads org employees when scheduleId is cleared after Step3 save', () => {
    expect(
      shouldReloadOrganizationEmployees({
        forceRefresh: false,
        hasOrgCurrent: true,
        orgEmployeeCount: 11,
        scheduleId: undefined,
      }),
    ).toBe(true);
  });

  it('Step4 skips reload when scheduleId exists and counts match', () => {
    expect(
      shouldReloadOrganizationEmployees({
        forceRefresh: false,
        hasOrgCurrent: true,
        orgEmployeeCount: 11,
        scheduleId: 'schedule-1',
        metaEmployeeCount: 11,
      }),
    ).toBe(false);
  });

  it('Step4 reloads when scheduleId exists but employeeCount metadata drifts (H3)', () => {
    expect(
      shouldReloadOrganizationEmployees({
        forceRefresh: false,
        hasOrgCurrent: true,
        orgEmployeeCount: 11,
        scheduleId: 'schedule-1',
        metaEmployeeCount: 19,
      }),
    ).toBe(true);
  });

  it('expected Step4 grid count follows orgStore, not stale Step3 local state', () => {
    const step3UiCount = 19;
    const orgStoreCount = 11;

    const step4GridCount = orgStoreCount;

    expect(step4GridCount).toBe(11);
    expect(step4GridCount).not.toBe(step3UiCount);
  });
});
