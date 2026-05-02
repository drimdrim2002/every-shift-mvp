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
  triple_night: '3연속 야간 금지',
  rest_after_two_nights: '2연속 야간 후 48시간 휴식',
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
    expect(wrapper.get('[data-test="compliance-decision-status"]').text()).toContain('법적 기준 충족');
    expect(wrapper.findAll('[data-test^="compliance-rule-"]')).toHaveLength(4);

    for (const [code, label] of Object.entries(ruleLabels)) {
      const row = wrapper.get(`[data-test="compliance-rule-${code}"]`);
      expect(row.text()).toContain(label);
      expect(row.text()).toContain('충족');
      expect(row.text().indexOf(label)).toBeLessThan(row.text().indexOf('충족'));
    }
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

    expect(wrapper.get('[data-test="compliance-decision-status"]').text()).toContain('법적 기준 위반 6건');

    const list = wrapper.get('[data-test="compliance-violation-list"]');
    expect(list.text()).toContain('김간호1');
    expect(list.text()).toContain('2026-05-01');
    expect(list.text()).toContain('1번째 야간 연속 위반');
    expect(list.text()).not.toContain('김간호4');
    expect(wrapper.text()).toContain('3건 더 보기');
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

    expect(wrapper.get('[data-test="compliance-decision-status"]').text()).toContain('법적 기준 확인 필요');
    expect(wrapper.get('[data-test="compliance-rule-triple_night"]').text()).toContain('확인 필요');
    expect(wrapper.get('[data-test="compliance-decision-status"]').text()).not.toContain('법적 기준 충족');
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
        violations: [createViolation(4), createViolation(5), createViolation(6)],
      }),
    });

    expect(wrapper.get('[data-test="compliance-violation-list"]').text()).toContain('김간호4');
    expect(wrapper.get('[data-test="compliance-violation-list"]').text()).not.toContain('김간호6');
    expect(getRevealButton(wrapper).attributes('aria-expanded')).toBe('false');
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
        compliance: '<div data-test="compliance-panel">법적 기준 검증</div>',
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
