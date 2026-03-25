import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const pushMock = vi.fn()
const routeMock = vi.hoisted(() => ({
  path: '/dashboard/admin',
}))
const rbacStoreMock = vi.hoisted(() => ({
  accessState: 'admin_active' as
    | 'super_active'
    | 'admin_active'
    | 'user_active'
    | 'admin_pending'
    | 'admin_rejected'
    | 'no_membership_or_inactive'
    | 'unauthenticated',
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('@/stores/rbac', () => ({
  useRbacStore: () => rbacStoreMock,
}))

import Sidebar from '@/components/layout/Sidebar.vue'

function mountSidebar() {
  return mount(Sidebar, {
    global: {
      stubs: {
        NMenu: {
          props: ['options'],
          template: `
            <nav>
              <button
                v-for="option in options"
                :key="option.key"
                type="button"
              >
                {{ option.label }}
              </button>
            </nav>
          `,
        },
      },
    },
  })
}

describe('Sidebar dashboard visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeMock.path = '/dashboard/admin'
    rbacStoreMock.accessState = 'admin_active'
  })

  it('shows admin, employee, schedule, and organization entries for admin users', () => {
    const wrapper = mountSidebar()

    expect(wrapper.text()).toContain('관리자 대시보드')
    expect(wrapper.text()).toContain('직원 대시보드')
    expect(wrapper.text()).toContain('근무표 생성')
    expect(wrapper.text()).toContain('조직 관리')
  })

  it('shows only the employee dashboard entry for user_active', () => {
    rbacStoreMock.accessState = 'user_active'
    routeMock.path = '/dashboard/employee'
    const wrapper = mountSidebar()

    expect(wrapper.text()).toContain('직원 대시보드')
    expect(wrapper.text()).not.toContain('관리자 대시보드')
    expect(wrapper.text()).not.toContain('근무표 생성')
    expect(wrapper.text()).not.toContain('조직 관리')
  })
})
