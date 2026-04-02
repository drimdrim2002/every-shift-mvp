import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import VersionActionArea from '@/components/schedule/review/VersionActionArea.vue'
import type { SchedulePrimaryAction, ScheduleVersionSummary } from '@/types/schedule'

function createVersion(overrides: Partial<ScheduleVersionSummary> = {}): ScheduleVersionSummary {
  return {
    id: 'version-1',
    scheduleId: 'schedule-1',
    versionNo: 1,
    name: 'V1',
    sourceType: 'initial_solve',
    baseVersionId: null,
    status: 'draft',
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
    label: 'Select this version as the finalization candidate',
    disabledReason: null,
    ...overrides,
  }
}

describe('VersionActionArea', () => {
  it('shows preview and selected version labels separately', () => {
    const wrapper = mount(VersionActionArea, {
      props: {
        previewVersion: createVersion(),
        selectedVersion: createVersion({
          id: 'version-2',
          versionNo: 2,
          name: 'V2',
        }),
        primaryAction: createPrimaryAction(),
        selecting: false,
      },
    })

    expect(wrapper.text()).toContain('미리보기 버전')
    expect(wrapper.text()).toContain('선택된 버전')
  })

  it('emits select-preview only when the backend primary action is select', async () => {
    const wrapper = mount(VersionActionArea, {
      props: {
        previewVersion: createVersion(),
        selectedVersion: createVersion({
          id: 'version-2',
          versionNo: 2,
          name: 'V2',
        }),
        primaryAction: createPrimaryAction(),
        selecting: false,
      },
    })

    await wrapper.get('[data-test="select-preview-button"]').trigger('click')

    expect(wrapper.emitted('select-preview')).toEqual([[]])
  })

  it('localizes backend action labels and status values for user-facing copy', () => {
    const wrapper = mount(VersionActionArea, {
      props: {
        previewVersion: createVersion({
          status: 'review_ready',
        }),
        selectedVersion: createVersion({
          id: 'version-2',
          versionNo: 2,
          name: 'V2',
          status: 'solve_failed',
        }),
        primaryAction: createPrimaryAction({
          label: 'Select this version as the finalization candidate',
        }),
        selecting: false,
      },
    })

    expect(wrapper.text()).toContain('이 버전을 선택')
    expect(wrapper.text()).toContain('검토 준비 완료')
    expect(wrapper.text()).toContain('생성 실패')
    expect(wrapper.text()).not.toContain('Select this version as the finalization candidate')
    expect(wrapper.text()).not.toContain('review_ready')
    expect(wrapper.text()).not.toContain('solve_failed')
  })
})
