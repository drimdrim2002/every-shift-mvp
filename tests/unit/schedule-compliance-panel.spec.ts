import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ScheduleCompliancePanel from '@/components/schedule/review/ScheduleCompliancePanel.vue';
import VersionReviewDetail from '@/components/schedule/review/VersionReviewDetail.vue';
import type {
  ScheduleComplianceResult,
  ScheduleComplianceRuleCode,
  ScheduleComplianceRuleStatus,
  ScheduleComplianceRuleSummary,
  ScheduleComplianceViolation,
} from '@/types/scheduleCompliance';

const ruleLabels: Record<ScheduleComplianceRuleCode, string> = {
  nod_pattern: 'NOD 금지',
  triple_night: '4연속 야간 금지 (3연속 허용)',
  rest_after_two_nights: '연속 야간 후 48시간 휴식',
  monthly_night_limit: '월 야간 15회 이하',
};

function createSummary(
  code: ScheduleComplianceRuleCode,
  status: ScheduleComplianceRuleStatus = 'passed',
  violationCount = 0,
  message = status === 'passed' ? '충족' : status === 'failed' ? `위반 ${violationCount}건` : '확인 필요',
): ScheduleComplianceRuleSummary {
  return {
    code,
    label: ruleLabels[code],
    status,
    violationCount,
    message,
  };
}

function createResult(overrides: Partial<ScheduleComplianceResult> = {}): ScheduleComplianceResult {
  return {
    mandatoryPassed: true,
    canFinalizeLocally: true,
    mandatoryViolationCount: 0,
    checkRequiredCount: 0,
    summaries: [
      createSummary('nod_pattern'),
      createSummary('triple_night'),
      createSummary('rest_after_two_nights'),
      createSummary('monthly_night_limit'),
    ],
    violations: [],
    offRequests: {
      totalRequests: 0,
      fulfilledRequests: 0,
      unfulfilledRequests: 0,
      reflectionRate: null,
    },
    ...overrides,
  };
}

function createViolation(index: number): ScheduleComplianceViolation {
  return {
    id: `violation-${index}`,
    ruleCode: 'triple_night',
    employeeId: `employee-${index}`,
    employeeName: `김간호${index}`,
    dates: [`2026-05-${String(index).padStart(2, '0')}`],
    message: `${index}번째 야간 연속 위반`,
  };
}

function getRevealButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('[data-test="compliance-violation-reveal"]');
}

describe('ScheduleCompliancePanel', () => {
  it('renders the pass decision and four passed rule rows', () => {
    const wrapper = mount(ScheduleCompliancePanel, {
      props: {
        result: createResult(),
      },
    });

    expect(wrapper.get('[data-test="compliance-panel"]').attributes('class') ?? '').not.toContain('mb-4');
    expect(wrapper.get('[data-test="compliance-panel"]').text()).toContain('보건복지부 가이드라인 확인 결과');
    expect(wrapper.get('[role="list"]').attributes('aria-label')).toBe('보건복지부 가이드라인 확인 결과');
    expect(wrapper.get('[data-test="compliance-decision-status"]').text()).toContain('보건복지부 가이드라인 충족');
    expect(wrapper.findAll('[data-test^="compliance-rule-"]')).toHaveLength(4);
    expect(wrapper.get('[data-test="compliance-panel"]').text()).toContain('위반 없음');
    expect(wrapper.get('[data-test="compliance-violation-empty"]').text()).toContain(
      '보건복지부 가이드라인 위반 항목이 없습니다.',
    );
    expect(wrapper.find('[data-test="compliance-violation-list"]').exists()).toBe(false);

    for (const [code, label] of Object.entries(ruleLabels)) {
      const row = wrapper.get(`[data-test="compliance-rule-${code}"]`);
      expect(row.text()).toContain(label);
      expect(row.text()).toContain('충족');
      expect(row.text().indexOf(label)).toBeLessThan(row.text().indexOf('충족'));
    }
  });

  it('hides the decision header when requested while keeping rule summaries visible', () => {
    const wrapper = mount(ScheduleCompliancePanel, {
      props: {
        result: createResult(),
        showDecisionHeader: false,
      },
    });

    expect(wrapper.find('[data-test="compliance-decision-status"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-test^="compliance-rule-"]')).toHaveLength(4);
    expect(wrapper.get('[data-test="compliance-rule-nod_pattern"]').text()).toContain('NOD 금지');
  });

  it('hides the Off request summary when requested', () => {
    const wrapper = mount(ScheduleCompliancePanel, {
      props: {
        result: createResult({
          offRequests: {
            totalRequests: 5,
            fulfilledRequests: 3,
            unfulfilledRequests: 2,
            reflectionRate: 60,
          },
        }),
        showOffSummary: false,
      },
    });

    expect(wrapper.find('[data-test="compliance-off-summary"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-test^="compliance-rule-"]')).toHaveLength(4);
  });

  it('renders the fail decision with capped violation details', () => {
    const violations = Array.from({ length: 6 }, (_, index) => createViolation(index + 1));
    const wrapper = mount(ScheduleCompliancePanel, {
      props: {
        initialDetailLimit: 3,
        result: createResult({
          mandatoryPassed: false,
          canFinalizeLocally: false,
          mandatoryViolationCount: violations.length,
          summaries: [
            createSummary('nod_pattern'),
            createSummary('triple_night', 'failed', violations.length),
            createSummary('rest_after_two_nights'),
            createSummary('monthly_night_limit'),
          ],
          violations,
        }),
      },
    });

    expect(wrapper.get('[data-test="compliance-decision-status"]').text()).toContain('보건복지부 가이드라인 위반 6건');

    const list = wrapper.get('[data-test="compliance-violation-list"]');
    expect(list.text()).toContain('김간호1');
    expect(list.text()).toContain('2026년 5월 1일');
    expect(list.text()).toContain('1번째 야간 연속 위반');
    expect(list.text()).not.toContain('김간호4');
    expect(wrapper.text()).toContain('3건 더 보기');
  });

  it('formats violation date ranges with explicit year and month labels', () => {
    const wrapper = mount(ScheduleCompliancePanel, {
      props: {
        result: createResult({
          mandatoryPassed: false,
          canFinalizeLocally: false,
          mandatoryViolationCount: 1,
          summaries: [
            createSummary('nod_pattern'),
            createSummary('triple_night'),
            createSummary('rest_after_two_nights', 'failed', 1),
            createSummary('monthly_night_limit'),
          ],
          violations: [
            {
              id: 'rest:e1:2026-03-27|2026-03-30',
              ruleCode: 'rest_after_two_nights',
              employeeId: 'e1',
              employeeName: '남보미',
              dates: ['2026-03-27', '2026-03-30'],
              message: '남보미님은 연속 야간 종료 후 48시간 휴식 전에 다음 근무가 배정되었습니다.',
            },
          ],
        }),
      },
    });

    const listText = wrapper.get('[data-test="compliance-violation-list"]').text();
    expect(listText).toContain('2026년 3월 27일 ~ 2026년 3월 30일');
    expect(listText).not.toContain('2026-03-27');
  });

  it('renders check-required as 확인 필요 instead of success', () => {
    const wrapper = mount(ScheduleCompliancePanel, {
      props: {
        result: createResult({
          mandatoryPassed: false,
          canFinalizeLocally: false,
          checkRequiredCount: 1,
          summaries: [
            createSummary('nod_pattern'),
            createSummary('triple_night', 'check_required', 0, '확인 필요'),
            createSummary('rest_after_two_nights'),
            createSummary('monthly_night_limit'),
          ],
        }),
      },
    });

    expect(wrapper.get('[data-test="compliance-decision-status"]').text()).toContain('보건복지부 가이드라인 확인 필요');
    expect(wrapper.get('[data-test="compliance-rule-triple_night"]').text()).toContain('확인 필요');
    expect(wrapper.get('[data-test="compliance-decision-status"]').text()).not.toContain('보건복지부 가이드라인 충족');
  });

  it('renders 요청 없음 when there are no Off requests', () => {
    const wrapper = mount(ScheduleCompliancePanel, {
      props: {
        result: createResult(),
      },
    });

    expect(wrapper.get('[data-test="compliance-off-summary"]').text()).toContain('요청 없음');
  });

  it('renders Off request fulfilled and total counts without error styling', () => {
    const wrapper = mount(ScheduleCompliancePanel, {
      props: {
        result: createResult({
          offRequests: {
            totalRequests: 5,
            fulfilledRequests: 3,
            unfulfilledRequests: 2,
            reflectionRate: 60,
          },
        }),
      },
    });

    const offSummary = wrapper.get('[data-test="compliance-off-summary"]');
    expect(offSummary.text()).toContain('Off 요청 반영 3 / 요청 5일');
    expect(offSummary.text()).toContain('60%');
    expect(offSummary.attributes('class') ?? '').not.toMatch(/(?:red|rose)-/);
  });

  it('uses a real button for reveal when hidden violations remain', async () => {
    const firstViolations = [createViolation(1), createViolation(2), createViolation(3)];
    const wrapper = mount(ScheduleCompliancePanel, {
      props: {
        initialDetailLimit: 2,
        result: createResult({
          mandatoryPassed: false,
          canFinalizeLocally: false,
          mandatoryViolationCount: 3,
          summaries: [
            createSummary('nod_pattern'),
            createSummary('triple_night', 'failed', 3),
            createSummary('rest_after_two_nights'),
            createSummary('monthly_night_limit'),
          ],
          violations: firstViolations,
        }),
      },
    });

    const list = wrapper.get('[data-test="compliance-violation-list"]');
    const revealButton = getRevealButton(wrapper);
    expect(revealButton.attributes('type')).toBe('button');
    expect(revealButton.attributes('aria-expanded')).toBe('false');
    expect(revealButton.attributes('aria-controls')).toBe(list.attributes('id'));
    expect(revealButton.text()).toContain('1건 더 보기');

    await revealButton.trigger('click');

    expect(wrapper.get('[data-test="compliance-violation-list"]').text()).toContain('김간호3');
    expect(getRevealButton(wrapper).attributes('aria-expanded')).toBe('true');
    expect(getRevealButton(wrapper).text()).toContain('접기');

    await getRevealButton(wrapper).trigger('click');

    expect(wrapper.get('[data-test="compliance-violation-list"]').text()).not.toContain('김간호3');
    expect(getRevealButton(wrapper).attributes('aria-expanded')).toBe('false');
    expect(getRevealButton(wrapper).text()).toContain('1건 더 보기');

    await getRevealButton(wrapper).trigger('click');

    expect(getRevealButton(wrapper).attributes('aria-expanded')).toBe('true');

    await wrapper.setProps({
      result: createResult({
        mandatoryPassed: false,
        canFinalizeLocally: false,
        mandatoryViolationCount: 3,
        summaries: [
          createSummary('nod_pattern'),
          createSummary('triple_night', 'failed', 3),
          createSummary('rest_after_two_nights'),
          createSummary('monthly_night_limit'),
        ],
        violations: firstViolations,
      }),
    });

    expect(wrapper.get('[data-test="compliance-violation-list"]').text()).not.toContain('김간호3');
    expect(getRevealButton(wrapper).attributes('aria-expanded')).toBe('false');

    await getRevealButton(wrapper).trigger('click');

    expect(getRevealButton(wrapper).attributes('aria-expanded')).toBe('true');

    await wrapper.setProps({
      result: createResult({
        mandatoryPassed: false,
        canFinalizeLocally: false,
        mandatoryViolationCount: 3,
        summaries: [
          createSummary('nod_pattern'),
          createSummary('triple_night', 'failed', 3),
          createSummary('rest_after_two_nights'),
          createSummary('monthly_night_limit'),
        ],
        violations: [createViolation(4), createViolation(5), createViolation(6)],
      }),
    });

    expect(wrapper.get('[data-test="compliance-violation-list"]').text()).toContain('김간호4');
    expect(wrapper.get('[data-test="compliance-violation-list"]').text()).not.toContain('김간호6');
    expect(getRevealButton(wrapper).attributes('aria-expanded')).toBe('false');
  });

  it('uses unique controlled list ids for multiple panel instances', () => {
    const result = createResult({
      mandatoryPassed: false,
      canFinalizeLocally: false,
      mandatoryViolationCount: 3,
      summaries: [
        createSummary('nod_pattern'),
        createSummary('triple_night', 'failed', 3),
        createSummary('rest_after_two_nights'),
        createSummary('monthly_night_limit'),
      ],
      violations: [createViolation(1), createViolation(2), createViolation(3)],
    });

    const wrapper = mount({
      components: { ScheduleCompliancePanel },
      template: `
        <div>
          <ScheduleCompliancePanel :result="result" :initial-detail-limit="2" />
          <ScheduleCompliancePanel :result="result" :initial-detail-limit="2" />
        </div>
      `,
      setup() {
        return { result };
      },
    });

    const lists = wrapper.findAll('[data-test="compliance-violation-list"]');
    const buttons = wrapper.findAll('[data-test="compliance-violation-reveal"]');
    const listIds = lists.map((list) => list.attributes('id'));

    expect(lists).toHaveLength(2);
    expect(buttons).toHaveLength(2);
    expect(listIds.every(Boolean)).toBe(true);
    expect(listIds[0]).not.toBe(listIds[1]);
    expect(buttons[0]?.attributes('aria-controls')).toBe(listIds[0]);
    expect(buttons[1]?.attributes('aria-controls')).toBe(listIds[1]);
  });

  it('does not render nested n-card surfaces', () => {
    const wrapper = mount(ScheduleCompliancePanel, {
      props: {
        result: createResult(),
      },
    });

    expect(wrapper.find('.n-card').exists()).toBe(false);
    expect(wrapper.html()).not.toContain('<n-card');
  });
});

describe('VersionReviewDetail compliance slot', () => {
  it('renders the compliance slot after focus context and before review tabs', () => {
    const wrapper = mount(VersionReviewDetail, {
      props: {
        review: null,
        activeTab: 'grid',
        focusTitle: '2안',
      },
      slots: {
        compliance: '<div data-test="compliance-panel">보건복지부 가이드라인 확인 결과</div>',
      },
    });

    const html = wrapper.html();
    const focusIndex = html.indexOf('data-test="review-focus-heading"');
    const complianceIndex = html.indexOf('data-test="compliance-panel"');
    const gridTabIndex = html.indexOf('data-test="review-tab-grid"');
    const complianceParent = wrapper.get('[data-test="compliance-panel"]').element.parentElement;

    expect(focusIndex).toBeGreaterThanOrEqual(0);
    expect(complianceIndex).toBeGreaterThan(focusIndex);
    expect(gridTabIndex).toBeGreaterThan(complianceIndex);
    expect(complianceParent?.className).toContain('mb-4');
  });
});
