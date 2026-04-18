import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import UserHome from '@/views/UserHome.vue'

describe('UserHome', () => {
  it('renders the restricted user guidance in Korean', () => {
    const wrapper = mount(UserHome, {
      global: {
        stubs: {
          NCard: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('현재 계정은 운영 기능 권한이 없습니다.')
    expect(wrapper.text()).toContain('운영 권한 안내')
  })
})
