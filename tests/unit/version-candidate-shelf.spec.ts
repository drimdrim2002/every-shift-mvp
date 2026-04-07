import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import VersionCandidateShelf from '@/components/schedule/review/VersionCandidateShelf.vue'
import type { ScheduleVersionSummary } from '@/types/schedule'

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

describe('VersionCandidateShelf', () => {
  it('renders compare and focus badges for the current candidate set', () => {
    const wrapper = mount(VersionCandidateShelf, {
      props: {
        versions: [
          createVersion(),
          createVersion({
            id: 'version-2',
            versionNo: 2,
            name: 'V2',
            manualEditCount: 2,
          }),
        ],
        compareVersionIds: ['version-1', 'version-2'],
        focusedVersionId: 'version-1',
        selectedVersionId: 'version-2',
        lockedVersionId: null,
      },
    })

    expect(wrapper.text()).toContain('비교 후보')
    expect(wrapper.text()).toContain('현재 기준안')
    expect(wrapper.text()).toContain('비교 중')
    expect(wrapper.text()).toContain('지금 자세히 보는 안')
  })

  it('emits explicit actions for compare, focus, and select on non-focused versions', async () => {
    const wrapper = mount(VersionCandidateShelf, {
      props: {
        versions: [
          createVersion(),
          createVersion({
            id: 'version-2',
            versionNo: 2,
            name: 'V2',
          }),
        ],
        compareVersionIds: ['version-1'],
        focusedVersionId: 'version-1',
        selectedVersionId: 'version-1',
        lockedVersionId: null,
      },
    })

    await wrapper.get('[data-test="compare-version-2"]').trigger('click')
    await wrapper.get('[data-test="focus-version-2"]').trigger('click')
    await wrapper.get('[data-test="select-version-2"]').trigger('click')

    expect(wrapper.emitted('toggle-compare')).toEqual([['version-2']])
    expect(wrapper.emitted('focus-version')).toEqual([['version-2']])
    expect(wrapper.emitted('select-version')).toEqual([['version-2']])
  })

  it('disables the focused version compare button instead of pretending removal', async () => {
    const wrapper = mount(VersionCandidateShelf, {
      props: {
        versions: [
          createVersion(),
          createVersion({
            id: 'version-2',
            versionNo: 2,
            name: 'V2',
          }),
        ],
        compareVersionIds: ['version-1'],
        focusedVersionId: 'version-1',
        selectedVersionId: 'version-2',
        lockedVersionId: null,
      },
    })

    const compareButton = wrapper.get('[data-test="compare-version-1"]')

    expect(compareButton.text()).toContain('현재 보는 안')
    expect(compareButton.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).not.toContain('비교에서 제거')

    await compareButton.trigger('click')

    expect(wrapper.emitted('toggle-compare')).toBeUndefined()
    expect(wrapper.get('[data-test="focus-version-1"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="select-version-1"]').attributes('disabled')).toBeUndefined()
  })
})
