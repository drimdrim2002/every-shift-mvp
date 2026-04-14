import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PageActionBar from '@/components/ui/PageActionBar.vue'

describe('PageActionBar', () => {
  it('keeps the left and right action regions separate', () => {
    const wrapper = mount(PageActionBar, {
      slots: {
        left: '<button data-test="left-action">back</button>',
        right: '<button data-test="right-action">save</button>',
      },
    })

    const leftRegion = wrapper.find('[data-test="page-action-bar-left"]')
    const rightRegion = wrapper.find('[data-test="page-action-bar-right"]')

    expect(leftRegion.exists()).toBe(true)
    expect(rightRegion.exists()).toBe(true)
    expect(leftRegion.text()).toContain('back')
    expect(rightRegion.text()).toContain('save')
  })
})
