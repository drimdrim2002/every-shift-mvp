import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ScheduleOffRequestGroupList from '@/components/schedule/review/ScheduleOffRequestGroupList.vue';
import type { Employee } from '@/types/employee';
import type {
  AssignmentMap,
  CommentMap,
  ConstraintMap,
  ScheduleOffRequestResult,
} from '@/types/schedule';

const employees: Employee[] = [
  {
    id: 'emp-1',
    organizationId: 'org-1',
    employeeId: 'E001',
    name: '김간호',
    availableShifts: ['D', 'E', 'N', 'O'],
  },
  {
    id: 'emp-2',
    organizationId: 'org-1',
    employeeId: 'E002',
    name: '이간호',
    availableShifts: ['D', 'E', 'N', 'O'],
  },
  {
    id: 'emp-3',
    organizationId: 'org-1',
    employeeId: 'E003',
    name: '박간호',
    availableShifts: ['D', 'E', 'N', 'O'],
  },
];

function createOffRequestResult(
  overrides: Partial<ScheduleOffRequestResult> = {},
): ScheduleOffRequestResult {
  return {
    employeeId: 'emp-1',
    date: '2025-12-02',
    requestCode: 'O',
    requestNote: '외래 진료',
    isSoft: false,
    resolutionStatus: 'unfulfilled',
    resolvedShiftId: null,
    resolvedAt: null,
    fulfilled: false,
    reason: '필요 인력 기준 때문에 D 근무로 배정되었습니다.',
    ...overrides,
  };
}

describe('ScheduleOffRequestGroupList', () => {
  it('renders Off requests grouped by employee with reflection counts and row details', () => {
    const assignments: AssignmentMap = {
      'emp-1': {
        '2025-12-01': 'O',
        '2025-12-02': 'D',
      },
      'emp-2': {
        '2025-12-03': '',
      },
    };
    const offRequests: ConstraintMap = {
      'emp-1': {
        '2025-12-01': 'O',
        '2025-12-02': 'O',
      },
      'emp-2': {
        '2025-12-03': 'O',
      },
    };
    const offRequestNotes: CommentMap = {
      'emp-1': {
        '2025-12-01': '가족 일정',
        '2025-12-02': '외래 진료',
      },
      'emp-2': {
        '2025-12-03': '개인 일정',
      },
    };

    const wrapper = mount(ScheduleOffRequestGroupList, {
      props: {
        employees,
        assignments,
        offRequests,
        offRequestNotes,
        offRequestResults: [
          createOffRequestResult(),
        ],
      },
    });

    const groups = wrapper.findAll('[data-test="off-request-employee-group"]');
    const rows = wrapper.findAll('[data-test="off-request-row"]');

    expect(wrapper.get('[data-test="off-request-group-list"]').exists()).toBe(true);
    expect(groups).toHaveLength(2);
    expect(rows).toHaveLength(3);

    expect(groups[0]?.text()).toContain('김간호');
    expect(groups[0]?.text()).toContain('요청 2건');
    expect(groups[0]?.text()).toContain('반영 1건');
    expect(groups[0]?.text()).toContain('미반영 1건');
    expect(groups[0]?.text()).toContain('2025-12-01');
    expect(groups[0]?.text()).toContain('가족 일정');
    expect(groups[0]?.text()).toContain('실제 배정 O');
    expect(groups[0]?.text()).toContain('반영 상태 반영');
    expect(groups[0]?.text()).toContain('2025-12-02');
    expect(groups[0]?.text()).toContain('외래 진료');
    expect(groups[0]?.text()).toContain('실제 배정 D');
    expect(groups[0]?.text()).toContain('반영 상태 미반영');
    expect(groups[0]?.text()).toContain('필요 인력 기준 때문에 D 근무로 배정되었습니다.');

    expect(groups[1]?.text()).toContain('이간호');
    expect(groups[1]?.text()).toContain('요청 1건');
    expect(groups[1]?.text()).toContain('반영 1건');
    expect(groups[1]?.text()).toContain('미반영 0건');
    expect(groups[1]?.text()).toContain('2025-12-03');
    expect(groups[1]?.text()).toContain('개인 일정');
    expect(groups[1]?.text()).toContain('실제 배정 미배정');
    expect(groups[1]?.text()).toContain('반영 상태 반영');

    expect(wrapper.text()).not.toContain('박간호');
  });

  it('renders an empty state when there are no Off requests', () => {
    const wrapper = mount(ScheduleOffRequestGroupList, {
      props: {
        employees,
        assignments: {},
        offRequests: {},
        offRequestNotes: {},
        offRequestResults: [],
      },
    });

    expect(wrapper.get('[data-test="off-request-group-list"]').text()).toContain('표시할 Off 요청이 없습니다.');
    expect(wrapper.find('[data-test="off-request-employee-group"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="off-request-row"]').exists()).toBe(false);
  });
});
