import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import ScheduleCompareModal from '@/components/schedule/review/ScheduleCompareModal.vue'
import type { ScheduleReviewResponse, ScheduleVersionSummary } from '@/types/schedule'

const mountedWrappers: Array<ReturnType<typeof mount>> = []

function createVersionSummary(overrides: Partial<ScheduleVersionSummary> = {}): ScheduleVersionSummary {
  const versionNo = overrides.versionNo ?? 1
  const id = overrides.id ?? `version-${versionNo}`

  return {
    id,
    scheduleId: 'schedule-1',
    versionNo,
    name: `${versionNo}안`,
    sourceType: versionNo === 1 ? 'initial_solve' : 're_solve',
    baseVersionId: versionNo === 1 ? null : 'version-1',
    status: 'review_ready',
    currentRevision: versionNo,
    manualEditCount: versionNo === 1 ? 0 : 1,
    inputDiffSummary: {
      changedOffRequests: versionNo === 1 ? 0 : 1,
      changedLockedAssignments: 0,
      changedSiteRequirements: 0,
      note: versionNo === 1 ? null : '비교안',
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

function createReview(version: ScheduleVersionSummary): ScheduleReviewResponse {
  return {
    scheduleId: version.scheduleId,
    selectedVersionId: 'version-1',
    finalizedVersionId: null,
    version,
    latestEvaluation: null,
    primaryAction: {
      kind: 'none',
      targetVersionId: null,
      label: '선택 가능한 작업이 없습니다.',
      disabledReason: null,
    },
    defaultTab: 'grid',
  }
}

function mountModal(props: Partial<InstanceType<typeof ScheduleCompareModal>['$props']> = {}) {
  const firstVersion = createVersionSummary({ id: 'version-1', versionNo: 1, isSelected: true })
  const secondVersion = createVersionSummary({ id: 'version-2', versionNo: 2 })
  const wrapper = mount(ScheduleCompareModal, {
    attachTo: document.body,
    props: {
      show: true,
      versions: [firstVersion, secondVersion],
      compareVersionIds: ['version-1', 'version-2'],
      focusedVersionId: 'version-1',
      selectedVersionId: 'version-1',
      lockedVersionId: null,
      leftVersion: firstVersion,
      rightVersion: secondVersion,
      leftReview: createReview(firstVersion),
      rightReview: createReview(secondVersion),
      loading: false,
      errorMessage: null,
      ...props,
    },
  })

  mountedWrappers.push(wrapper)
  return wrapper
}

async function clickDocumentTestId(testId: string) {
  const target = document.querySelector<HTMLElement>(`[data-test="${testId}"]`)
  expect(target).toBeTruthy()
  target!.click()
  await flushPromises()
}

describe('ScheduleCompareModal', () => {
  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    document.body.innerHTML = ''
  })

  it('does not render modal content when closed', async () => {
    mountModal({ show: false })
    await flushPromises()

    expect(document.body.textContent).not.toContain('근무표안 비교')
    expect(document.querySelector('[data-test="schedule-compare-modal"]')).toBeNull()
  })

  it('shows an empty state and emits request-edit when there is no other plan to compare', async () => {
    const onlyVersion = createVersionSummary({ id: 'version-1', versionNo: 1, isSelected: true })
    const wrapper = mountModal({
      versions: [onlyVersion],
      compareVersionIds: ['version-1'],
      focusedVersionId: 'version-1',
      selectedVersionId: 'version-1',
      leftVersion: onlyVersion,
      rightVersion: null,
      leftReview: createReview(onlyVersion),
      rightReview: null,
    })
    await flushPromises()

    expect(document.querySelector('[data-test="compare-modal-empty"]')).toBeTruthy()
    expect(document.body.textContent).toContain('비교할 다른 근무표안이 없습니다')

    const requestEditButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('요청 수정해서 새 근무표안 만들기'))
    expect(requestEditButton).toBeTruthy()
    requestEditButton!.click()
    await flushPromises()

    expect(wrapper.emitted('request-edit')).toEqual([[]])
  })

  it('renders candidate and comparison controls inside the modal and emits actions by version id', async () => {
    const wrapper = mountModal()
    await flushPromises()

    expect(document.querySelector('[data-test="schedule-compare-modal"]')).toBeTruthy()
    expect(document.querySelector('[data-test="comparison-workspace"]')).toBeTruthy()
    expect(document.body.textContent).toContain('비교 대상 변경')
    expect(document.body.textContent).toContain('다른 근무표안을 비교하려면 아래 후보를 선택하세요.')
    expect(document.body.textContent).not.toContain('비교 후보')
    expect(document.body.textContent).toContain('2안')

    await clickDocumentTestId('compare-version-2')
    await clickDocumentTestId('focus-version-2')
    await clickDocumentTestId('select-version-2')
    await clickDocumentTestId('delete-version-version-2')

    expect(wrapper.emitted('toggle-compare')).toEqual([['version-2']])
    expect(wrapper.emitted('focus-version')).toEqual([['version-2']])
    expect(wrapper.emitted('select-version')).toEqual([['version-2']])
    expect(wrapper.emitted('delete-version')).toEqual([['version-2']])
  })

  it('describes the modal as an Off-request and mandatory-rule decision surface', async () => {
    mountModal()
    await flushPromises()

    expect(document.body.textContent).toContain(
      'Off 요청 차이와 필수 기준 충족 여부를 비교한 뒤 필요한 근무표안을 자세히 확인하세요.',
    )
  })

  it('renders the decision workspace before the candidate shelf when two plans can be compared', async () => {
    mountModal()
    await flushPromises()

    const workspace = document.querySelector('[data-test="comparison-workspace"]')
    const shelf = document.querySelector('[data-test="comparison-candidate-shelf-section"]')

    expect(workspace).toBeTruthy()
    expect(shelf).toBeTruthy()
    expect(
      workspace!.compareDocumentPosition(shelf!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('keeps loading state modal-local and does not render the decision workspace while loading', async () => {
    mountModal({ loading: true })
    await flushPromises()

    expect(document.querySelector('[data-test="compare-modal-loading"]')).toBeTruthy()
    expect(document.querySelector('[data-test="comparison-workspace"]')).toBeNull()
  })

  it('keeps load failures modal-local and emits retry', async () => {
    const wrapper = mountModal({
      errorMessage: '네트워크 오류',
    })
    await flushPromises()

    expect(document.querySelector('[data-test="compare-modal-error"]')).toBeTruthy()
    expect(document.body.textContent).toContain('네트워크 오류')

    const retryButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('다시 시도'))
    expect(retryButton).toBeTruthy()
    retryButton!.click()
    await flushPromises()

    expect(wrapper.emitted('retry')).toEqual([[]])
  })
})
