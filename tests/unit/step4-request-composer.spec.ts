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
  NCheckbox: {
    name: 'NCheckbox',
    props: ['checked'],
    template: '<span v-bind="$attrs" />',
  },
  NSelect: {
    name: 'NSelect',
    props: {
      value: {
        type: Array,
        default: () => [],
      },
      options: {
        type: Array,
        default: () => [],
      },
      filterable: Boolean,
      multiple: Boolean,
      placeholder: String,
      showOnFocus: Boolean,
      virtualScroll: {
        type: Boolean,
        default: true,
      },
      renderLabel: Function,
      renderOption: Function,
    },
    emits: ['update:value'],
    data() {
      return {
        query: '',
      };
    },
    computed: {
      selectedValues() {
        return Array.isArray(this.value) ? this.value : [];
      },
      filteredOptions() {
        const query = String(this.query).trim().toLowerCase();
        const options = Array.isArray(this.options) ? this.options : [];

        if (!query) {
          return options;
        }

        return options.filter((option) => {
          return String(option.label).toLowerCase().includes(query);
        });
      },
    },
    methods: {
      toggleValue(value) {
        const nextValues = this.selectedValues.includes(value)
          ? this.selectedValues.filter((selectedValue) => selectedValue !== value)
          : [...this.selectedValues, value];

        this.$emit('update:value', nextValues);
      },
    },
    template: `
      <div
        v-bind="$attrs"
        :data-show-on-focus="String(showOnFocus)"
        :data-virtual-scroll="String(virtualScroll)"
      >
        <input
          data-test="step4-employee-select-search"
          :placeholder="placeholder"
          :value="query"
          @input="query = $event.target.value"
        />
        <div data-test="step4-employee-select-options">
          <button
            type="button"
            v-for="option in filteredOptions"
            :key="option.value"
            :data-test="'employee-option-' + option.value"
            @click="toggleValue(option.value)"
          >
            <span
              role="checkbox"
              :aria-checked="selectedValues.includes(option.value)"
              :data-test="'employee-checkbox-' + option.value"
            ></span>
            {{ option.label }}
          </button>
        </div>
      </div>
    `,
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
      selectedEmployeeIds: [],
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
      selectedEmployeeIds: [],
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

  it('renders every employee as a searchable dropdown option', () => {
    const employees = Array.from({ length: 24 }, (_, index) => ({
      id: `emp-${index + 1}`,
      organizationId: 'org-1',
      employeeId: `E${String(index + 1).padStart(3, '0')}`,
      name: `근무자${index + 1}`,
      availableShifts: ['D', 'E', 'N'],
    }));
    const wrapper = createWrapperWithProps({ employees });

    expect(wrapper.get('[data-test="step4-employee-select"]').exists()).toBe(true);
    employees.forEach((employee) => {
      expect(wrapper.get(`[data-test="employee-option-${employee.id}"]`).text()).toBe(
        `${employee.name} (${employee.employeeId})`,
      );
      expect(wrapper.get(`[data-test="employee-checkbox-${employee.id}"]`).exists()).toBe(true);
    });
    expect(wrapper.find('[data-test="step4-employee-search"]').exists()).toBe(false);
  });

  it('keeps the employee dropdown closed on focus and disables virtual option clipping', () => {
    const employees = Array.from({ length: 24 }, (_, index) => ({
      id: `emp-${index + 1}`,
      organizationId: 'org-1',
      employeeId: `E${String(index + 1).padStart(3, '0')}`,
      name: `근무자${index + 1}`,
      availableShifts: ['D', 'E', 'N'],
    }));
    const wrapper = createWrapperWithProps({ employees });
    const select = wrapper.get('[data-test="step4-employee-select"]');

    expect(select.attributes('data-show-on-focus')).toBe('false');
    expect(select.attributes('data-virtual-scroll')).toBe('false');
    expect(wrapper.findAll('[data-test^="employee-option-"]')).toHaveLength(employees.length);
  });

  it('customizes the option label without replacing the clickable option row', () => {
    type RenderedVNode = {
      children?: unknown;
      props?: Record<string, unknown>;
    };
    const wrapper = createWrapper();
    const select = wrapper.getComponent({ name: 'NSelect' });
    const renderLabel = select.props('renderLabel') as (
      option: { label: string; value: string },
      selected: boolean,
    ) => RenderedVNode;
    const rendered = renderLabel({ label: '김하나 (E001)', value: 'emp-1' }, false);
    const children = Array.isArray(rendered.children) ? rendered.children : [];
    const checkbox = children[0] as RenderedVNode;

    expect(select.props('renderOption')).toBeUndefined();
    expect(checkbox.props?.class).toContain('pointer-events-none');
    expect(checkbox.props).not.toHaveProperty('onClick');
  });

  it('selects employees after filtering the dropdown by name and employee ID', async () => {
    const wrapper = createWrapper();
    const searchInput = wrapper.get('[data-test="step4-employee-select-search"]');

    await searchInput.setValue('이둘');
    expect(wrapper.find('[data-test="employee-option-emp-2"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="employee-option-emp-1"]').exists()).toBe(false);

    await wrapper.get('[data-test="employee-option-emp-2"]').trigger('click');
    expect(wrapper.emitted('select-employee')).toEqual([[['emp-2']]]);

    await searchInput.setValue('E001');
    expect(wrapper.find('[data-test="employee-option-emp-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="employee-option-emp-2"]').exists()).toBe(false);
  });

  it('prefills the dropdown option filter through the exposed API', async () => {
    const wrapper = createWrapper();

    (wrapper.vm as unknown as { prefillSearchQuery: (value: string) => void }).prefillSearchQuery('이둘');
    await nextTick();

    expect(wrapper.find('[data-test="employee-option-emp-2"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="employee-option-emp-1"]').exists()).toBe(false);
  });

  it('offers only 하루 and 여러 날 date selection modes', () => {
    const wrapper = createWrapper();

    expect(wrapper.text()).toContain('하루');
    expect(wrapper.text()).toContain('여러 날');
    expect(wrapper.text()).not.toContain('연속 기간');
    expect(wrapper.text()).not.toContain('개별 여러 날');
    expect(wrapper.find('[data-test="selection-mode-range"]').exists()).toBe(false);
  });

  it('shows the disabled reason and keeps apply disabled when the draft cannot be applied', () => {
    const wrapper = createWrapper();

    expect(wrapper.text()).toContain('근무자를 먼저 선택해 주세요.');
    expect(wrapper.get('[data-test="apply-request"]').attributes('disabled')).toBeDefined();
  });

  it('emits select, selected-dates, apply, and reset intents', async () => {
    const wrapper = createWrapperWithProps({
      applyDisabledReason: null,
      selectedEmployeeIds: ['emp-1'],
    });

    await wrapper.get('[data-test="employee-option-emp-2"]').trigger('click');
    await wrapper.get('[data-test="calendar-emit-selected-dates"]').trigger('click');
    await wrapper.get('[data-test="apply-request"]').trigger('click');
    await wrapper.get('[data-test="reset-draft"]').trigger('click');

    expect(wrapper.emitted('select-employee')).toEqual([[['emp-1', 'emp-2']]]);
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
