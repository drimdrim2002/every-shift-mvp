/* eslint-disable vue/one-component-per-file */
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import type { Employee } from '@/types/employee';
import type {
  AssignmentMap,
  CommentMap,
  ConstraintMap,
  GridColumn,
  ScheduleOffRequestResult,
} from '@/types/schedule';
import type { ScheduleComplianceViolation } from '@/types/scheduleCompliance';

vi.mock('naive-ui', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    NSelect: defineComponent({
      name: 'NSelect',
      props: {
        value: {
          type: [String, null],
          default: null,
        },
        options: {
          type: Array,
          default: () => [],
        },
      },
      emits: ['update:value'],
      setup(props, { emit, attrs }) {
        return () =>
          h(
            'select',
            {
              ...attrs,
              value: props.value ?? '',
              onChange: (event: Event) => {
                const value = (event.target as HTMLSelectElement).value;
                emit('update:value', value === '' ? null : value);
              },
            },
            [
              h('option', { value: '' }, '선택 안 함'),
              ...(props.options as Array<{ label: string; value: string }>).map((option) =>
                h('option', { value: option.value }, option.label)
              ),
            ]
          );
      },
    }),
    NModal: defineComponent({
      name: 'NModal',
      props: {
        show: {
          type: Boolean,
          default: false,
        },
      },
      emits: ['update:show'],
      setup(props, { slots, attrs }) {
        return () => (props.show ? h('div', attrs, slots.default?.()) : null);
      },
    }),
  };
});

import EmployeeResultDetail from '@/components/schedule/review/EmployeeResultDetail.vue';

function createEmployee(id: string, name: string): Employee {
  return {
    id,
    organizationId: 'org-1',
    employeeId: id,
    name,
    availableShifts: ['D', 'E', 'N', 'O'],
  };
}

function createDate(date: string, day: number, dayName: string, isLastMonth = false): GridColumn {
  return {
    date,
    day,
    dayOfWeek: 1,
    dayName,
    isLastMonth,
  };
}

function createViolation(
  employeeId: string,
  overrides: Partial<ScheduleComplianceViolation> = {}
): ScheduleComplianceViolation {
  return {
    id: `violation-${employeeId}`,
    ruleCode: 'nod_pattern',
    employeeId,
    employeeName: employeeId,
    dates: ['2025-12-02', '2025-12-03'],
    message: '야간 근무 후 휴식 기준 위반',
    ...overrides,
  };
}

function createOffRequestResult(
  overrides: Partial<ScheduleOffRequestResult> = {}
): ScheduleOffRequestResult {
  return {
    employeeId: 'employee-1',
    date: '2025-12-02',
    requestCode: 'O',
    requestNote: '가족 행사',
    isSoft: false,
    resolutionStatus: 'unfulfilled',
    resolvedShiftId: 'shift-d',
    resolvedAt: '2025-11-20T00:00:00.000Z',
    fulfilled: false,
    reason: '필수 인력 부족',
    ...overrides,
  };
}

const employees = [
  createEmployee('employee-1', '김민지'),
  createEmployee('employee-2', '박서연'),
];

const dates = [
  createDate('2025-11-30', 30, '일', true),
  createDate('2025-12-01', 1, '월'),
  createDate('2025-12-02', 2, '화'),
];

const assignments: AssignmentMap = {
  'employee-1': {
    '2025-11-30': 'N',
    '2025-12-01': 'D',
    '2025-12-02': 'D',
  },
  'employee-2': {
    '2025-11-30': 'O',
    '2025-12-01': 'O',
    '2025-12-02': 'E',
  },
};

const offRequests: ConstraintMap = {
  'employee-1': {
    '2025-12-02': 'O',
  },
};

const offRequestNotes: CommentMap = {
  'employee-1': {
    '2025-12-02': '가족 행사',
  },
};

const violations = [createViolation('employee-1')];
const offRequestResults = [createOffRequestResult()];

function mountDetail(selectedEmployeeId = 'employee-1') {
  return mount(EmployeeResultDetail, {
    props: {
      employees,
      dates,
      assignments,
      violations,
      offRequests,
      offRequestNotes,
      offRequestResults,
      selectedEmployeeId,
    },
  });
}

describe('EmployeeResultDetail', () => {
  it('renders a read-only employee schedule without grid edit controls', () => {
    const wrapper = mountDetail();

    expect(wrapper.get('[data-test="employee-result-detail"]').exists()).toBe(true);
    const schedule = wrapper.get('[data-test="employee-result-schedule"]');
    expect(schedule.text()).toContain('11/30');
    expect(schedule.text()).toContain('12/1');
    expect(schedule.text()).toContain('12/2');
    expect(schedule.text()).toContain('N');
    expect(schedule.text()).toContain('D');
    expect(wrapper.find('[data-test="grid-edit"]').exists()).toBe(false);
    expect(wrapper.find('input').exists()).toBe(false);
    expect(wrapper.find('textarea').exists()).toBe(false);
    expect(wrapper.find('[contenteditable="true"]').exists()).toBe(false);
    expect(wrapper.findAll('select, [role="combobox"]')).toHaveLength(1);
    expect(wrapper.get('[data-test="employee-result-select"]').attributes('aria-label')).toBe(
      '직원 선택'
    );
  });

  it('emits selected employee updates and changes to a non-violating employee state', async () => {
    const wrapper = mountDetail();

    await wrapper.getComponent({ name: 'NSelect' }).vm.$emit('update:value', 'employee-2');

    expect(wrapper.emitted('update:selectedEmployeeId')).toEqual([['employee-2']]);

    await wrapper.setProps({ selectedEmployeeId: 'employee-2' });

    expect(wrapper.get('[data-test="employee-guideline-status"]').text()).toContain(
      '보건복지부 가이드라인 충족'
    );
    expect(wrapper.find('[data-test="employee-violation-reveal"]').exists()).toBe(false);
  });

  it('auto-expands violation details for a violating employee', () => {
    const wrapper = mountDetail();

    expect(wrapper.get('[data-test="employee-guideline-status"]').text()).toContain(
      '보건복지부 가이드라인 위반 1건'
    );
    expect(wrapper.get('[data-test="employee-violation-section"]').text()).toContain(
      '야간 근무 후 휴식 기준 위반'
    );
    expect(wrapper.get('[data-test="employee-violation-reveal"]').attributes('aria-expanded')).toBe(
      'true'
    );
  });

  it('reopens violation details when same-count selected violation content changes', async () => {
    const wrapper = mountDetail();

    await wrapper.get('[data-test="employee-violation-reveal"]').trigger('click');
    expect(wrapper.get('[data-test="employee-violation-reveal"]').attributes('aria-expanded')).toBe(
      'false'
    );

    await wrapper.setProps({
      violations: [
        createViolation('employee-1', {
          id: 'violation-employee-1-refreshed',
          message: '새로 계산된 위반',
        }),
      ],
    });

    expect(wrapper.get('[data-test="employee-violation-reveal"]').attributes('aria-expanded')).toBe(
      'true'
    );
    expect(wrapper.get('[data-test="employee-violation-section"]').text()).toContain(
      '새로 계산된 위반'
    );
  });

  it('renders Off request detail modal content', async () => {
    const wrapper = mountDetail();

    const detailButton = wrapper.get('[data-test="employee-off-request-detail-button"]');
    expect(detailButton.attributes('aria-label')).toBe('2025-12-02 Off 요청 상세');

    await detailButton.trigger('click');
    await nextTick();

    const modal = wrapper.get('[data-test="employee-off-request-detail-modal"]');
    expect(modal.text()).toContain('2025-12-02');
    expect(modal.text()).toContain('가족 행사');
    expect(modal.text()).toContain('D');
    expect(modal.text()).toContain('미반영');
    expect(modal.text()).toContain('필수 인력 부족');
  });

  it('keeps Off request detail modal synced when row data changes while open', async () => {
    const wrapper = mountDetail();

    await wrapper.get('[data-test="employee-off-request-detail-button"]').trigger('click');
    await nextTick();

    await wrapper.setProps({
      assignments: {
        ...assignments,
        'employee-1': {
          ...assignments['employee-1'],
          '2025-12-02': 'N',
        },
      },
      offRequestResults: [
        createOffRequestResult({
          reason: '야간 전담 인력 필요',
        }),
      ],
    });

    const modal = wrapper.get('[data-test="employee-off-request-detail-modal"]');
    expect(modal.text()).toContain('N');
    expect(modal.text()).toContain('야간 전담 인력 필요');
    expect(modal.text()).not.toContain('필수 인력 부족');
  });

  it('does not emit edit-like events while using detail controls', async () => {
    const wrapper = mountDetail();

    await wrapper.get('[data-test="employee-violation-reveal"]').trigger('click');
    await wrapper.get('[data-test="employee-off-request-detail-button"]').trigger('click');
    await nextTick();

    expect(wrapper.emitted('update:assignments')).toBeUndefined();
    expect(wrapper.emitted('update:assignment')).toBeUndefined();
    expect(wrapper.emitted('grid-edit')).toBeUndefined();
    expect(wrapper.emitted('assignment:update')).toBeUndefined();
    expect(wrapper.emitted('update:selectedEmployeeId')).toBeUndefined();

    await wrapper.getComponent({ name: 'NSelect' }).vm.$emit('update:value', 'employee-2');

    expect(wrapper.emitted('update:assignments')).toBeUndefined();
    expect(wrapper.emitted('update:assignment')).toBeUndefined();
    expect(wrapper.emitted('grid-edit')).toBeUndefined();
    expect(wrapper.emitted('assignment:update')).toBeUndefined();
    expect(wrapper.emitted('update:selectedEmployeeId')).toEqual([['employee-2']]);
  });
});
