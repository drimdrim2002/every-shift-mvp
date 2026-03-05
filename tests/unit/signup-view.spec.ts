import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

const pushMock = vi.fn()
const signupMock = vi.fn()
const logoutMock = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    loading: false,
    user: null,
    signup: signupMock,
    logout: logoutMock,
  }),
}))

vi.mock('@/api/hospital', () => ({
  searchHospitals: vi.fn(async () => []),
}))

vi.mock('@/composables/useGlobalMessage', () => ({
  useGlobalMessage: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

import Signup from '@/views/auth/Signup.vue'

function findSubmitButton(wrapper: ReturnType<typeof mount>) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => candidate.text().includes('가입'))

  if (!button) {
    throw new Error('submit button not found')
  }

  return button
}

describe('Signup view role-branch UI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows hospital source label in admin flow', () => {
    const wrapper = mount(Signup)
    expect(wrapper.text()).toContain('병원 목록 출처: 공공데이터포털(data.go.kr)')
  })

  it('disables submit for admin until hospital is selected', async () => {
    const wrapper = mount(Signup)
    const vm = wrapper.vm as unknown as {
      formValue: {
        role: 'admin' | 'user'
        hospitalId: string | null
      }
    }

    expect(findSubmitButton(wrapper).attributes('disabled')).toBeDefined()

    vm.formValue.hospitalId = 'hospital-1'
    await nextTick()

    expect(findSubmitButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('switches required field to invite code for user role', async () => {
    const wrapper = mount(Signup)
    const vm = wrapper.vm as unknown as {
      formValue: {
        role: 'admin' | 'user'
        inviteCode: string
        hospitalId: string | null
      }
    }

    vm.formValue.role = 'user'
    await nextTick()

    expect(wrapper.text()).toContain('초대코드')
    expect(findSubmitButton(wrapper).attributes('disabled')).toBeDefined()

    vm.formValue.inviteCode = 'INV-001'
    await nextTick()

    expect(findSubmitButton(wrapper).attributes('disabled')).toBeUndefined()
  })
})
