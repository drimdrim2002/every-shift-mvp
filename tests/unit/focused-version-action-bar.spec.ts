import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import FocusedVersionActionBar from '@/components/schedule/review/FocusedVersionActionBar.vue'
import type { SchedulePrimaryAction, ScheduleVersionSummary } from '@/types/schedule'

function createVersion(overrides: Partial<ScheduleVersionSummary> = {}): ScheduleVersionSummary {
  return {
    id: 'version-1',
    scheduleId: 'schedule-1',
    versionNo: 1,
    name: 'V1',
    sourceType: 'initial_solve',
    baseVersionId: null,
    status: 'review_ready',
    currentRevision: 1,
    manualEditCount: 0,
    inputDiffSummary: {
      changedOffRequests: 0,
      changedLockedAssignments: 0,
      changedSiteRequirements: 0,
      note: null,
    },
    latestEvaluationId: null,
    latestEvaluationResultStatus: null,
    comparisonMetrics: null,
    finalizationGate: null,
    activeSolverExecutionId: null,
    isSelected: false,
    isFinalized: false,
    ...overrides,
  }
}

function createPrimaryAction(overrides: Partial<SchedulePrimaryAction> = {}): SchedulePrimaryAction {
  return {
    kind: 'select',
    targetVersionId: 'version-1',
    label: '이 안을 기준안으로 사용',
    disabledReason: null,
    ...overrides,
  }
}

describe('FocusedVersionActionBar', () => {
  it('shows focused and selected plan summaries separately', () => {
    const wrapper = mount(FocusedVersionActionBar, {
      props: {
        focusedVersion: createVersion(),
        selectedVersion: createVersion({
          id: 'version-2',
          versionNo: 2,
          name: 'V2',
        }),
        primaryAction: createPrimaryAction(),
        supportCopy: null,
        selecting: false,
        acting: false,
      },
    })

    expect(wrapper.text()).toContain('현재 보는 근무표안')
    expect(wrapper.text()).toContain('선택한 근무표안')
    expect(wrapper.text()).toContain('V1')
    expect(wrapper.text()).toContain('V2')
  })

  it('hides focused and selected summaries when version context is disabled', () => {
    const wrapper = mount(FocusedVersionActionBar, {
      props: {
        focusedVersion: createVersion(),
        selectedVersion: createVersion({
          id: 'version-2',
          versionNo: 2,
          name: 'V2',
        }),
        primaryAction: createPrimaryAction(),
        supportCopy: null,
        selecting: false,
        acting: false,
        showVersionContext: false,
      },
    })

    expect(wrapper.text()).not.toContain('현재 보는 근무표안')
    expect(wrapper.text()).not.toContain('선택한 근무표안')
    expect(wrapper.find('[data-test="primary-action-button"]').exists()).toBe(true)
  })

  it('localizes version status and primary action copy', () => {
    const wrapper = mount(FocusedVersionActionBar, {
      props: {
        focusedVersion: createVersion({
          status: 'review_pending',
        }),
        selectedVersion: createVersion({
          id: 'version-2',
          versionNo: 2,
          name: 'V2',
          status: 'finalized',
        }),
        primaryAction: createPrimaryAction({
          kind: 'finalize',
          targetVersionId: 'version-2',
          label: '이 안으로 최종 확정',
        }),
        supportCopy: '직접 수정이 있어 다시 검사가 필요합니다.',
        selecting: false,
        acting: false,
      },
    })

    expect(wrapper.text()).toContain('수정 후 다시 검사 필요')
    expect(wrapper.text()).toContain('최종 확정됨')
    expect(wrapper.text()).toContain('이 근무표안 확정')
    expect(wrapper.text()).toContain('직접 수정이 있어 다시 검사가 필요합니다.')
  })

  it('emits the primary action and reflects loading states', async () => {
    const wrapper = mount(FocusedVersionActionBar, {
      props: {
        focusedVersion: createVersion(),
        selectedVersion: createVersion({
          id: 'version-2',
          versionNo: 2,
          name: 'V2',
        }),
        primaryAction: createPrimaryAction(),
        supportCopy: null,
        selecting: true,
        acting: false,
      },
    })

    expect(wrapper.get('[data-test="primary-action-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="primary-action-button"]').text()).toContain('선택 중...')

    await wrapper.setProps({ selecting: false, acting: true })

    expect(wrapper.get('[data-test="primary-action-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="primary-action-button"]').text()).toContain('처리 중...')

    await wrapper.setProps({
      selecting: false,
      acting: false,
      primaryAction: createPrimaryAction({
        disabledReason: '현재는 기준안으로 사용할 수 없습니다.',
      }),
    })

    expect(wrapper.get('[data-test="primary-action-button"]').attributes('disabled')).toBeDefined()

    await wrapper.setProps({
      selecting: false,
      acting: false,
      primaryAction: createPrimaryAction(),
    })

    await wrapper.get('[data-test="primary-action-button"]').trigger('click')

    expect(wrapper.emitted('primary-action')).toEqual([[]])
  })
})
