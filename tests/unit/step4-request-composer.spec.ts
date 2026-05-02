import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('naive-ui', () => ({
  NButton: { template: '<button v-bind="$attrs"><slot /></button>' },
  NInput: {
    template:
      '<input v-bind="$attrs" :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
    props: ['value'],
    emits: ['update:value'],
  },
}));

import Step4RequestComposer from '@/components/schedule/request-entry/Step4RequestComposer.vue';

const Step4MonthCalendarStub = defineComponent({
  emits: ['update:selected-dates'],
  template: `
    <button
      data-test="calendar-emit-selected-dates"
      @click="$emit('update:selected-dates', ['2025-12-03'])"
    >
      calendar-emit-selected-dates
    </button>
  `,
});

const EmployeeRequestListStub = defineComponent({
  emits: ['edit-request', 'delete-request'],
  template: `
    <div>
      <button data-test="list-emit-edit" @click="$emit('edit-request', 'request-1')">
        list-emit-edit
      </button>
      <button data-test="list-emit-delete" @click="$emit('delete-request', 'request-1')">
        list-emit-delete
      </button>
    </div>
  `,
});

function createWrapper() {
  return mount(Step4RequestComposer, {
    props: {
      employees: [
        {
          id: 'emp-1',
          organizationId: 'org-1',
          employeeId: 'E001',
          name: '김하나',
          availableShifts: ['D', 'E', 'N'],
        },
        {
          id: 'emp-2',
          organizationId: 'org-1',
          employeeId: 'A210',
          name: '이둘',
          availableShifts: ['D', 'E', 'N'],
        },
      ],
      dates: [
        {
          date: '2025-12-03',
          day: 3,
          dayOfWeek: 3,
          dayName: '수',
          isLastMonth: false,
        },
      ],
      selectedEmployeeId: null,
      selectedEmployeeName: '',
      requestCatalog: [{ id: 'off', label: 'Off', shortCode: 'O' }],
      draftRequestTypeId: 'off',
      draftSelectionMode: 'single',
      draftSelectedDates: [],
      draftNote: '',
      selectedDateSummary: '',
      currentEmployeeRequests: [],
      hasUnappliedDraft: false,
      hasUnpersistedAppliedChanges: false,
      applyDisabledReason: '근무자를 먼저 선택해 주세요.',
      blockedTransitionReason: null,
    },
    global: {
      stubs: {
        Step4MonthCalendar: Step4MonthCalendarStub,
        EmployeeRequestList: EmployeeRequestListStub,
      },
    },
  });
}

function createWrapperWithProps(propOverrides: Record<string, unknown> = {}) {
  return mount(Step4RequestComposer, {
    props: {
      employees: [
        {
          id: 'emp-1',
          organizationId: 'org-1',
          employeeId: 'E001',
          name: '김하나',
          availableShifts: ['D', 'E', 'N'],
        },
        {
          id: 'emp-2',
          organizationId: 'org-1',
          employeeId: 'A210',
          name: '이둘',
          availableShifts: ['D', 'E', 'N'],
        },
      ],
      dates: [
        {
          date: '2025-12-03',
          day: 3,
          dayOfWeek: 3,
          dayName: '수',
          isLastMonth: false,
        },
      ],
      selectedEmployeeId: null,
      selectedEmployeeName: '',
      requestCatalog: [{ id: 'off', label: 'Off', shortCode: 'O' }],
      draftRequestTypeId: 'off',
      draftSelectionMode: 'single',
      draftSelectedDates: [],
      draftNote: '',
      selectedDateSummary: '',
      currentEmployeeRequests: [],
      hasUnappliedDraft: false,
      hasUnpersistedAppliedChanges: false,
      applyDisabledReason: '근무자를 먼저 선택해 주세요.',
      blockedTransitionReason: null,
      ...propOverrides,
    },
    global: {
      stubs: {
        Step4MonthCalendar: Step4MonthCalendarStub,
        EmployeeRequestList: EmployeeRequestListStub,
      },
    },
  });
}

describe('Step4RequestComposer', () => {
  it('renders the body-only composer surface without the old panel shell copy', () => {
    const wrapper = createWrapper();

    expect(wrapper.get('[data-test="step4-request-composer"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('근무자 검색');
    expect(wrapper.text()).toContain('요청 유형');
    expect(wrapper.text()).toContain('날짜 선택 모드');
    expect(wrapper.text()).toContain('메모');
    expect(wrapper.text()).not.toContain('요청 입력 패널');
    expect(wrapper.text()).not.toContain('근무자를 찾고 날짜를 선택한 뒤 요청을 반영합니다.');
  });

  it('filters employees by name and employee ID', async () => {
    const wrapper = createWrapper();
    const searchInput = wrapper.get('[data-test="step4-employee-search"]');

    await searchInput.setValue('이둘');
    expect(wrapper.find('[data-test="employee-option-emp-2"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="employee-option-emp-1"]').exists()).toBe(false);

    await searchInput.setValue('E001');
    expect(wrapper.find('[data-test="employee-option-emp-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="employee-option-emp-2"]').exists()).toBe(false);
  });

  it('prefills the search field and narrows employee options through the exposed API', async () => {
    const wrapper = createWrapper();

    (wrapper.vm as unknown as { prefillSearchQuery: (value: string) => void }).prefillSearchQuery('이둘');
    await nextTick();

    expect(wrapper.get('[data-test="step4-employee-search"]').element.value).toBe('이둘');
    expect(wrapper.find('[data-test="employee-option-emp-2"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="employee-option-emp-1"]').exists()).toBe(false);
  });

  it('shows the disabled reason and keeps apply disabled when the draft cannot be applied', () => {
    const wrapper = createWrapper();

    expect(wrapper.text()).toContain('근무자를 먼저 선택해 주세요.');
    expect(wrapper.get('[data-test="apply-request"]').attributes('disabled')).toBeDefined();
  });

  it('emits select, selected-dates, apply, and reset intents', async () => {
    const wrapper = createWrapperWithProps({
      applyDisabledReason: null,
      selectedEmployeeId: 'emp-1',
    });

    await wrapper.get('[data-test="employee-option-emp-1"]').trigger('click');
    await wrapper.get('[data-test="calendar-emit-selected-dates"]').trigger('click');
    await wrapper.get('[data-test="apply-request"]').trigger('click');
    await wrapper.get('[data-test="reset-draft"]').trigger('click');

    expect(wrapper.emitted('select-employee')).toEqual([['emp-1']]);
    expect(wrapper.emitted('update:selected-dates')).toEqual([[['2025-12-03']]]);
    expect(wrapper.emitted('apply-request')).toHaveLength(1);
    expect(wrapper.emitted('reset-draft')).toHaveLength(1);
  });

  it('re-emits edit and delete intents from the request list child', async () => {
    const wrapper = createWrapper();

    await wrapper.get('[data-test="list-emit-edit"]').trigger('click');
    await wrapper.get('[data-test="list-emit-delete"]').trigger('click');

    expect(wrapper.emitted('edit-request')).toEqual([['request-1']]);
    expect(wrapper.emitted('delete-request')).toEqual([['request-1']]);
  });
})
