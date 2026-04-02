import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import VersionCompareSurface from '@/components/schedule/review/VersionCompareSurface.vue'
import type { ScheduleVersionSummary } from '@/types/schedule'

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
    comparisonMetrics: {
      offRequestReflectionRate: 88,
      nightShiftMin: 1,
      nightShiftMax: 2,
      weekendShiftMin: 0,
      weekendShiftMax: 1,
      manualEditCount: 0,
    },
    finalizationGate: null,
    activeSolverExecutionId: null,
    isSelected: false,
    isFinalized: false,
    ...overrides,
  }
}

describe('VersionCompareSurface', () => {
  it('renders every version with preview and selected markers', () => {
    const wrapper = mount(VersionCompareSurface, {
      props: {
        versions: [
          createVersion(),
          createVersion({
            id: 'version-2',
            versionNo: 2,
            name: 'V2',
          }),
        ],
        previewVersionId: 'version-1',
        selectedVersionId: 'version-2',
      },
    })

    expect(wrapper.text()).toContain('V1')
    expect(wrapper.text()).toContain('미리보기')
    expect(wrapper.text()).toContain('선택됨')
  })

  it('localizes version statuses instead of exposing raw backend enums', () => {
    const wrapper = mount(VersionCompareSurface, {
      props: {
        versions: [
          createVersion({
            status: 'review_pending',
          }),
        ],
        previewVersionId: 'version-1',
        selectedVersionId: null,
      },
    })

    expect(wrapper.text()).toContain('재검토 필요')
    expect(wrapper.text()).not.toContain('review_pending')
  })

  it('emits preview change without implying selection', async () => {
    const wrapper = mount(VersionCompareSurface, {
      props: {
        versions: [
          createVersion(),
          createVersion({
            id: 'version-2',
            versionNo: 2,
            name: 'V2',
          }),
        ],
        previewVersionId: 'version-2',
        selectedVersionId: 'version-2',
      },
    })

    await wrapper.get('[data-test="preview-version-1"]').trigger('click')

    expect(wrapper.emitted('preview-change')).toEqual([['version-1']])
  })
})
