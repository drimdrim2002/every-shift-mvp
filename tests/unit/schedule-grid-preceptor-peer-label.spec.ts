import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type { Employee } from '@/types/employee';
import type { GridColumn } from '@/types/schedule';
import type { PreceptorPairDisplayMeta } from '@/utils/preceptorPairDisplayOrder';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';

vi.mock('@/components/schedule/ConstraintSelector.vue', () => ({
  default: {
    props: ['employeeId', 'date'],
    template: '<div data-test="constraint-selector-stub" />',
  },
}));

function buildEmployee(partial: Partial<Employee> & Pick<Employee, 'id' | 'employeeId' | 'name'>): Employee {
  return {
    organizationId: 'org-1',
    availableShifts: ['D'],
    preceptorId: null,
    ...partial,
  };
}

const dates: GridColumn[] = [
  {
    date: '2025-05-01',
    day: 1,
    dayOfWeek: 4,
    dayName: '목',
    isLastMonth: false,
  },
];

describe('ScheduleGrid preceptor peer label', () => {
  const preceptor = buildEmployee({
    id: 'uuid-preceptor',
    employeeId: '42635',
    name: '정다래Q',
  });
  const preceptee = buildEmployee({
    id: 'uuid-preceptee',
    employeeId: '43178',
    name: '이민지',
    preceptorId: 'uuid-preceptor',
  });

  const pairDisplayMetaByEmployeeId: Record<string, PreceptorPairDisplayMeta> = {
    'uuid-preceptor': {
      peerId: 'uuid-preceptee',
      peerName: '이민지',
      peerEmployeeId: '43178',
      role: 'preceptor',
      groupKey: 'uuid-preceptee::uuid-preceptor',
    },
    'uuid-preceptee': {
      peerId: 'uuid-preceptor',
      peerName: '정다래Q',
      peerEmployeeId: '42635',
      role: 'preceptee',
      groupKey: 'uuid-preceptee::uuid-preceptor',
    },
  };

  it('shows peer role, name, and employee id for preceptor and preceptee rows', () => {
    const wrapper = mount(ScheduleGrid, {
      props: {
        employees: [preceptor, preceptee],
        dates,
        mode: 'planning',
        pairDisplayMetaByEmployeeId,
      },
    });

    expect(wrapper.get('[data-test="preceptor-pair-peer-preceptor"]').text()).toBe(
      '프리셉티: 이민지 (43178)',
    );
    expect(wrapper.get('[data-test="preceptor-pair-peer-preceptee"]').text()).toBe(
      '프리셉터: 정다래Q (42635)',
    );
  });

  it('does not render peer labels for unpaired employees', () => {
    const solo = buildEmployee({
      id: 'uuid-solo',
      employeeId: '50001',
      name: '이단독',
    });

    const wrapper = mount(ScheduleGrid, {
      props: {
        employees: [solo],
        dates,
        mode: 'planning',
        pairDisplayMetaByEmployeeId: {},
      },
    });

    expect(wrapper.find('[data-test^="preceptor-pair-peer-"]').exists()).toBe(false);
  });
});
