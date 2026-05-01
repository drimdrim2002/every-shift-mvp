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

  it('does not render delete action for the focused version card', () => {
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
        compareVersionIds: [],
        focusedVersionId: 'version-1',
        selectedVersionId: null,
        lockedVersionId: null,
      },
    })

    expect(wrapper.find('[data-test="delete-version-version-1"]').exists()).toBe(false)
  })

  it('does not expose delete action for finalized, solving, locked, or solver-linked versions', () => {
    const wrapper = mount(VersionCandidateShelf, {
      props: {
        versions: [
          createVersion({
            id: 'finalized-version',
            versionNo: 2,
            name: 'V2',
            isFinalized: true,
          }),
          createVersion({
            id: 'solving-version',
            versionNo: 3,
            name: 'V3',
            status: 'solving',
          }),
          createVersion({
            id: 'locked-version',
            versionNo: 4,
            name: 'V4',
          }),
          createVersion({
            id: 'solver-linked-version',
            versionNo: 5,
            name: 'V5',
            activeSolverExecutionId: 'exec-1',
          }),
        ],
        compareVersionIds: [],
        focusedVersionId: 'version-1',
        selectedVersionId: null,
        lockedVersionId: 'locked-version',
      },
    })

    expect(wrapper.find('[data-test="delete-version-finalized-version"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="delete-version-solving-version"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="delete-version-locked-version"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="delete-version-solver-linked-version"]').exists()).toBe(false)
  })

  it('renders delete action for an eligible non-focused version', () => {
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
        compareVersionIds: [],
        focusedVersionId: 'version-1',
        selectedVersionId: null,
        lockedVersionId: null,
      },
    })

    const deleteButton = wrapper.get('[data-test="delete-version-version-2"]')

    expect(deleteButton.attributes('aria-label')).toBe('이 안 삭제')
  })

  it('emits delete-version when the delete action is clicked', async () => {
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
        compareVersionIds: [],
        focusedVersionId: 'version-1',
        selectedVersionId: null,
        lockedVersionId: null,
      },
    })

    await wrapper.get('[data-test="delete-version-version-2"]').trigger('click')

    expect(wrapper.emitted('delete-version')).toEqual([['version-2']])
    expect(wrapper.emitted('toggle-compare')).toBeUndefined()
    expect(wrapper.emitted('focus-version')).toBeUndefined()
    expect(wrapper.emitted('select-version')).toBeUndefined()
  })
})
