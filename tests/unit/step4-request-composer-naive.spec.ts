/* eslint-disable vue/one-component-per-file */
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { describe, expect, it } from 'vitest';

import Step4RequestComposer from '@/components/schedule/request-entry/Step4RequestComposer.vue';

const Step4MonthCalendarStub = defineComponent({
  emits: ['update:selected-dates'],
  template: '<div />',
});

const EmployeeRequestListStub = defineComponent({
  emits: ['edit-request', 'delete-request'],
  template: '<div />',
});

function createWrapper() {
  return mount(Step4RequestComposer, {
    attachTo: document.body,
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

async function flushNaiveUiUpdates() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

describe('Step4RequestComposer with real Naive UI select', () => {
  it('selects an employee when the checkbox visual is clicked', async () => {
    document.body.innerHTML = '';
    const wrapper = createWrapper();
    const selection = wrapper.element.querySelector<HTMLElement>('.n-base-selection');

    selection?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushNaiveUiUpdates();

    const option = Array.from(document.body.querySelectorAll<HTMLElement>('.n-base-select-option')).find(
      (element) => element.textContent?.includes('김하나'),
    );
    const checkbox = option?.querySelector<HTMLElement>('.n-checkbox');

    checkbox?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushNaiveUiUpdates();

    expect(wrapper.emitted('select-employee')).toEqual([[['emp-1']]]);
    wrapper.unmount();
  });
});
