import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { getScheduleResultsRoutePath } from '@/constants/routes'

const { pushMock, getScheduleListMock, useScheduleStoreMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  getScheduleListMock: vi.fn(),
  useScheduleStoreMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('@/api/schedule', () => ({
  getScheduleList: getScheduleListMock,
}))

vi.mock('@/stores/schedule', () => ({
  useScheduleStore: useScheduleStoreMock,
}))

import WorkPerformance from '@/views/schedule/WorkPerformance.vue'

function createWrapper() {
  return mount(WorkPerformance, {
    global: {
      stubs: {
        NButton: {
          template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>',
        },
      },
    },
  })
}

describe('WorkPerformance', () => {
  it('renders the title and preparing empty state without loading performance data', () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('근무 실적')
    expect(wrapper.get('[data-test="work-performance-empty"]').text()).toContain('준비 중입니다')
    expect(getScheduleListMock).not.toHaveBeenCalled()
    expect(useScheduleStoreMock).not.toHaveBeenCalled()
  })

  it('routes the secondary action to generated schedule results', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-test="work-performance-results"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith(getScheduleResultsRoutePath())
  })
})
