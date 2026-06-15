import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import type { Employee } from '@/types/employee';
import type { ConstraintMap, GridColumn } from '@/types/schedule';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';

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
    date: '2026-05-04',
    day: 4,
    dayOfWeek: 1,
    dayName: '월',
    isLastMonth: false,
  },
  {
    date: '2026-05-28',
    day: 28,
    dayOfWeek: 4,
    dayName: '목',
    isLastMonth: false,
  },
];

describe('ScheduleGrid planning Off display', () => {
  const employee = buildEmployee({
    id: 'uuid-employee-1',
    employeeId: '101',
    name: '소한지',
  });

  const constraints: ConstraintMap = {
    'uuid-employee-1': {
      '2026-05-04': 'O',
      '2026-05-28': 'O',
    },
  };

  it('renders ConstraintSelector with Off for persisted constraints in planning mode', () => {
    const wrapper = mount(ScheduleGrid, {
      props: {
        employees: [employee],
        dates,
        mode: 'planning',
        constraints,
        planningInteractionMode: 'select',
      },
    });

    const offCells = wrapper.findAll('.constraint-selector').filter((cell) => cell.text() === 'O');
    expect(offCells).toHaveLength(2);
  });

  it('renders empty ConstraintSelector cells when no Off constraint exists', () => {
    const wrapper = mount(ScheduleGrid, {
      props: {
        employees: [employee],
        dates,
        mode: 'planning',
        constraints: {},
        planningInteractionMode: 'select',
      },
    });

    const offCells = wrapper.findAll('.constraint-selector').filter((cell) => cell.text() === 'O');
    expect(offCells).toHaveLength(0);
    expect(wrapper.findAll('.constraint-selector')).toHaveLength(2);
  });
});
