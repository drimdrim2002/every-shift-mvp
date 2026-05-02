import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import EmployeeRequestList from '@/components/schedule/request-entry/EmployeeRequestList.vue';

interface EmployeeRequestRowVM {
  requestKey: string;
  employeeId: string;
  dates: string[];
  requestTypeId: 'off';
  requestCode: 'O';
  note: string;
  status: 'local-pending' | 'persisted' | 'policy-checking' | 'policy-rejected';
  policyRejectionReason: string | null;
}

function createRow(overrides: Partial<EmployeeRequestRowVM> = {}): EmployeeRequestRowVM {
  return {
    requestKey: 'request-1',
    employeeId: 'employee-1',
    dates: ['2026-05-03', '2026-05-04'],
    requestTypeId: 'off',
    requestCode: 'O',
    note: '개인 일정',
    status: 'persisted',
    policyRejectionReason: null,
    ...overrides,
  };
}

describe('EmployeeRequestList', () => {
  it('renders date summary, request chip, note preview, and persisted status', () => {
    const wrapper = mount(EmployeeRequestList, {
      props: {
        rows: [createRow()],
      },
    });

    expect(wrapper.get('[data-test="request-row-request-1"]').text()).toContain('5월 3일, 5월 4일');
    expect(wrapper.text()).toContain('휴무 요청 (O)');
    expect(wrapper.text()).toContain('개인 일정');
    expect(wrapper.text()).toContain('저장됨');
  });

  it('shows rejection reason only for rejected rows and hides stale reason on local-pending rows', () => {
    const wrapper = mount(EmployeeRequestList, {
      props: {
        rows: [
          createRow({
            requestKey: 'request-rejected',
            dates: ['2026-05-08'],
            status: 'policy-rejected',
            policyRejectionReason: '월 한도 초과',
          }),
          createRow({
            requestKey: 'request-pending',
            dates: ['2026-05-09'],
            status: 'local-pending',
            policyRejectionReason: '이전 거부 사유',
          }),
        ],
      },
    });

    expect(wrapper.get('[data-test="request-row-request-rejected"]').text()).toContain('정책 거부');
    expect(wrapper.get('[data-test="request-rejection-request-rejected"]').text()).toContain(
      '월 한도 초과',
    );

    expect(wrapper.get('[data-test="request-row-request-pending"]').text()).toContain('저장 전');
    expect(wrapper.find('[data-test="request-rejection-request-pending"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('이전 거부 사유');
  });

  it('renders policy-checking rows distinctly', () => {
    const wrapper = mount(EmployeeRequestList, {
      props: {
        rows: [
          createRow({
            requestKey: 'request-checking',
            dates: ['2026-05-10'],
            status: 'policy-checking',
          }),
        ],
      },
    });

    expect(wrapper.get('[data-test="request-row-request-checking"]').text()).toContain('정책 확인 중');
  });

  it('emits edit-request and delete-request with the request key', async () => {
    const wrapper = mount(EmployeeRequestList, {
      props: {
        rows: [createRow()],
      },
    });

    await wrapper.get('[data-test="edit-request-request-1"]').trigger('click');
    await wrapper.get('[data-test="delete-request-request-1"]').trigger('click');

    expect(wrapper.emitted('edit-request')).toEqual([['request-1']]);
    expect(wrapper.emitted('delete-request')).toEqual([['request-1']]);
  });
})
