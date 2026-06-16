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

  it('aggregates column Total from full roster when statisticsEmployees is provided', () => {
    const employee1 = buildEmployee({
      id: 'uuid-employee-1',
      employeeId: '101',
      name: '소한지',
    });
    const employee2 = buildEmployee({
      id: 'uuid-employee-2',
      employeeId: '102',
      name: '김간호',
    });

    const constraints: ConstraintMap = {
      'uuid-employee-1': {
        '2026-05-04': 'O',
      },
      'uuid-employee-2': {
        '2026-05-04': 'O',
      },
    };

    const wrapper = mount(ScheduleGrid, {
      props: {
        employees: [employee1],
        statisticsEmployees: [employee1, employee2],
        dates: [dates[0]],
        mode: 'planning',
        constraints,
        planningInteractionMode: 'select',
      },
    });

    const totalRow = wrapper.find('.stat-row-total-only');
    expect(totalRow.exists()).toBe(true);

    const totalCells = totalRow.findAll('td.shift-cell');
    expect(totalCells).toHaveLength(1);
    expect(totalCells[0].text()).toBe('2');

    const rowTotalCell = wrapper.find('tbody tr.data-row td.sticky-right-total');
    expect(rowTotalCell.text()).toBe('1');
  });

  const weekWithPlaceholders: Array<GridColumn | null> = [
    null,
    null,
    null,
    null,
    null,
    dates[0]!,
    dates[1]!,
  ];

  it('renders placeholder cells without ConstraintSelector when displayDateCells has nulls', () => {
    const wrapper = mount(ScheduleGrid, {
      props: {
        employees: [employee],
        dates: [dates[0]!, dates[1]!],
        displayDateCells: weekWithPlaceholders,
        mode: 'planning',
        constraints,
        planningInteractionMode: 'select',
      },
    });

    expect(wrapper.findAll('.constraint-selector')).toHaveLength(2);
    expect(wrapper.findAll('[data-test="schedule-grid-placeholder-cell"]')).toHaveLength(5);
  });

  it('does not emit header-click for placeholder header cells', async () => {
    const wrapper = mount(ScheduleGrid, {
      props: {
        employees: [employee],
        dates: [dates[0]!],
        displayDateCells: weekWithPlaceholders,
        mode: 'planning',
        constraints: {},
        planningInteractionMode: 'select',
      },
    });

    const placeholderHeaders = wrapper.findAll('[data-test="schedule-grid-placeholder-header"]');
    expect(placeholderHeaders.length).toBeGreaterThan(0);
    await placeholderHeaders[0]!.trigger('click');
    expect(wrapper.emitted('header-click')).toBeUndefined();
  });

  it('uses 2-row planning header with 당월 colspan 7 when displayDateCells is set', () => {
    const wrapper = mount(ScheduleGrid, {
      props: {
        employees: [employee],
        dates: dates,
        displayDateCells: weekWithPlaceholders,
        mode: 'planning',
        constraints,
        planningInteractionMode: 'select',
      },
    });

    const level1 = wrapper.find('.header-level-1');
    expect(level1.text()).toBe('당월');
    expect(level1.attributes('colspan')).toBe('7');
    expect(wrapper.find('.header-level-2').exists()).toBe(false);
  });

  it('keeps row Total as full month when rowStatisticsDates spans more days than displayDateCells', () => {
    const wrapper = mount(ScheduleGrid, {
      props: {
        employees: [employee],
        dates: dates,
        displayDateCells: [dates[0]!],
        rowStatisticsDates: dates,
        mode: 'planning',
        constraints,
        planningInteractionMode: 'select',
      },
    });

    expect(wrapper.find('tbody tr.data-row td.sticky-right-total').text()).toBe('2');
    expect(wrapper.find('.stat-row-total-only td.shift-cell').text()).toBe('1');
  });
});
