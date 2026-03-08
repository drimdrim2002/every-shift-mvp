import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const routeMock = vi.hoisted(() => ({
  meta: {
    accessStateView: 'pending' as 'pending' | 'rejected',
  },
}))

const replaceMock = vi.fn()
const logoutMock = vi.fn(async () => ({ success: true }))

const rbacStoreMock = vi.hoisted(() => ({
  effectiveMembership: null as { rejectionReason?: string | null } | null,
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => ({
    replace: replaceMock,
  }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    loading: false,
    logout: logoutMock,
  }),
}))

vi.mock('@/stores/rbac', () => ({
  useRbacStore: () => rbacStoreMock,
}))

vi.mock('@/composables/useGlobalMessage', () => ({
  useGlobalMessage: () => ({
    error: vi.fn(),
  }),
}))

import AccessState from '@/views/auth/AccessState.vue'

describe('AccessState view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeMock.meta.accessStateView = 'pending'
    rbacStoreMock.effectiveMembership = null
  })

  it('renders pending copy', () => {
    const wrapper = mount(AccessState)

    expect(wrapper.text()).toContain('승인 대기')
    expect(wrapper.text()).toContain('superuser 승인 완료 후 다시 로그인해 주세요.')
    expect(wrapper.text()).not.toContain('반려 사유:')
  })

  it('renders rejected copy and rejection reason', () => {
    routeMock.meta.accessStateView = 'rejected'
    rbacStoreMock.effectiveMembership = {
      rejectionReason: '중복된 신청',
    }
    const wrapper = mount(AccessState)

    expect(wrapper.text()).toContain('승인 반려')
    expect(wrapper.text()).toContain('반려 사유: 중복된 신청')
  })

  it('logs out and redirects to login when CTA is clicked', async () => {
    const wrapper = mount(AccessState)
    const logoutButton = wrapper
      .findAll('button')
      .find((candidate) => candidate.text().includes('로그아웃'))

    if (!logoutButton) {
      throw new Error('logout button not found')
    }

    await logoutButton.trigger('click')

    expect(logoutMock).toHaveBeenCalledTimes(1)
    expect(replaceMock).toHaveBeenCalledWith('/login')
  })
})
