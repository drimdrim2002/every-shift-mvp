import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmployeeTable from '@/components/schedule/EmployeeTable.vue';
import { validatePreceptorAssignment } from '@/utils/preceptorValidation';
import { showError } from '@/utils/message';

vi.mock('@/utils/preceptorValidation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/preceptorValidation')>();
  return {
    ...actual,
    validatePreceptorAssignment: vi.fn(actual.validatePreceptorAssignment),
  };
});

vi.mock('@/utils/message', () => ({
  showError: vi.fn(),
}));

const shifts = [
  { id: '1', code: 'D', name: 'Day', colorCode: '#3B82F6', startTime: '09:00', endTime: '18:00' },
];

const employees = [
  { employeeId: 'P-1', name: '박선배', availableShifts: ['D'] },
  { employeeId: 'T-1', name: '김신규', availableShifts: ['D'] },
];

const tableStubs = {
  NDataTable: {
    props: ['columns', 'data'],
    template: '<div data-test="table"><slot /></div>',
  },
  NButton: {
    inheritAttrs: false,
    template: '<button v-bind="$attrs" @click="$attrs.onClick?.($event)"><slot /></button>',
  },
  NModal: {
    props: ['show'],
    template: '<div v-if="show" data-test="modal"><slot /><slot name="footer" /></div>',
  },
  NForm: { template: '<form><slot /></form>' },
  NFormItem: { template: '<div><slot /></div>' },
  NInput: { template: '<input />' },
  NCheckboxGroup: { template: '<div><slot /></div>' },
  NCheckbox: { template: '<label><slot /></label>' },
  NSpace: { template: '<div><slot /></div>' },
  NPopconfirm: { template: '<div><slot /></div>' },
  NSelect: {
    props: ['value'],
    emits: ['update:value'],
    template:
      '<select data-test="preceptor-select" :value="value ?? \'\'" @change="$emit(\'update:value\', $event.target.value || null)"><option value="">(없음)</option><option value="T-1">김신규 (T-1)</option></select>',
  },
};

describe('EmployeeTable preceptor column', () => {
  it('renders assigned preceptor as name and employee id', () => {
    const wrapper = mount(EmployeeTable, {
      props: {
        shifts,
        employees: [
          { employeeId: 'P-1', name: '박선배', availableShifts: ['D'] },
          { employeeId: 'T-1', name: '김신규', availableShifts: ['D'], preceptorEmployeeId: 'P-1' },
        ],
      },
      global: {
        stubs: tableStubs,
      },
    });

    const columns = (wrapper.vm as { columns: Array<{ key: string; render: (row: unknown) => unknown }> }).columns;
    const preceptorColumn = columns.find((column) => column.key === 'preceptorEmployeeId');
    expect(preceptorColumn).toBeTruthy();

    const rendered = preceptorColumn!.render({
      employeeId: 'T-1',
      name: '김신규',
      availableShifts: ['D'],
      preceptorEmployeeId: 'P-1',
    });

    const cellWrapper = mount(
      defineComponent({
        render: () => rendered,
      })
    );
    const html = cellWrapper.text();

    expect(html).toContain('박선배');
    expect(html).toContain('P-1');
  });
});

describe('EmployeeTable preceptor modal validation', () => {
  beforeEach(() => {
    vi.mocked(validatePreceptorAssignment).mockClear();
    vi.mocked(showError).mockClear();
  });

  it('blocks self-assignment via validatePreceptorAssignment on confirm', async () => {
    vi.mocked(validatePreceptorAssignment).mockReturnValue('본인을 프리셉터로 지정할 수 없습니다.');

    const wrapper = mount(EmployeeTable, {
      props: { shifts, employees },
      global: {
        stubs: tableStubs,
      },
    });

    const vm = wrapper.vm as {
      handleEdit: (index: number) => void;
      handleConfirm: () => Promise<void>;
      formData: { preceptorEmployeeId: string | null };
    };

    vm.handleEdit(1);
    await wrapper.vm.$nextTick();
    vm.formData.preceptorEmployeeId = 'T-1';
    await vm.handleConfirm();

    expect(validatePreceptorAssignment).toHaveBeenCalledWith({
      employees,
      targetIndex: 1,
      preceptorEmployeeId: 'T-1',
    });
    expect(showError).toHaveBeenCalledWith('본인을 프리셉터로 지정할 수 없습니다.');
    expect(wrapper.emitted('edit')).toBeUndefined();
  });
});
