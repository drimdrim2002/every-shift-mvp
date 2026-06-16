import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type { Employee } from '@/types/employee';
import type { GridColumn } from '@/types/schedule';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';

vi.mock('@/components/schedule/ConstraintSelector.vue', () => ({
  default: {
    props: ['employeeId', 'date'],
    template: '<div data-test="constraint-selector-stub" />',
  },
}));

vi.mock('@/components/schedule/ShiftSelector.vue', () => ({
  default: {
    props: ['employeeId', 'date'],
    template: '<div data-test="shift-selector-stub" />',
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

function buildMay2026Dates(): GridColumn[] {
  return Array.from({ length: 31 }, (_, index) => {
    const day = index + 1;
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = (5 + index) % 7;

    return {
      date: `2026-05-${String(day).padStart(2, '0')}`,
      day,
      dayOfWeek,
      dayName: dayNames[dayOfWeek]!,
      isLastMonth: false,
    };
  });
}

describe('ScheduleGrid compact layout', () => {
  const employee = buildEmployee({
    id: 'emp-1',
    employeeId: '10001',
    name: '테스트',
  });

  it('applies compact layout class in planning and result modes', () => {
    const planningWrapper = mount(ScheduleGrid, {
      props: {
        employees: [employee],
        dates: buildMay2026Dates(),
        mode: 'planning',
      },
    });

    expect(planningWrapper.find('.schedule-grid--compact').exists()).toBe(true);

    const resultWrapper = mount(ScheduleGrid, {
      props: {
        employees: [employee],
        dates: buildMay2026Dates(),
        mode: 'result',
      },
    });

    expect(resultWrapper.find('.schedule-grid--compact').exists()).toBe(true);
  });

  it('renders the longest May date header label in full', () => {
    const wrapper = mount(ScheduleGrid, {
      props: {
        employees: [employee],
        dates: buildMay2026Dates(),
        mode: 'planning',
      },
    });

    const may31Header = wrapper
      .findAll('.date-col-header')
      .find((node) => node.text().includes('31일'));

    expect(may31Header?.text()).toContain('31일');
    expect(may31Header?.text()).toContain('(일)');
    expect(may31Header?.find('.block.font-medium').text()).toBe('31일');
    expect(may31Header?.find('.block.text-slate-600').text()).toBe('(일)');
  });

  it('uses a 56px compact day column width token', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/components/schedule/ScheduleGrid.vue'),
      'utf8',
    );

    expect(source).toContain('.schedule-grid--compact');
    expect(source).toMatch(/--day-col-width:\s*56px/);
    expect(source).not.toContain('schedule-grid--planning-compact');
  });
});
