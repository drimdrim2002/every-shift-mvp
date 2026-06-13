import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';
import EmployeeTable from '@/components/schedule/EmployeeTable.vue';

const shifts = [
  { id: '1', code: 'D', name: 'Day', colorCode: '#3B82F6', startTime: '09:00', endTime: '18:00' },
];

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
        stubs: {
          NDataTable: {
            props: ['columns', 'data'],
            template: '<div data-test="table"><slot /></div>',
          },
          NButton: { template: '<button><slot /></button>' },
          NModal: { template: '<div />' },
          NForm: { template: '<form><slot /></form>' },
          NFormItem: { template: '<div><slot /></div>' },
          NInput: { template: '<input />' },
          NCheckboxGroup: { template: '<div><slot /></div>' },
          NCheckbox: { template: '<label><slot /></label>' },
          NSpace: { template: '<div><slot /></div>' },
          NPopconfirm: { template: '<div><slot /></div>' },
          NSelect: { template: '<select />' },
        },
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
