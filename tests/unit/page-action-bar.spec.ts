import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'

const PageActionBar = defineComponent({
  name: 'PageActionBar',
  template: `
    <div>
      <slot name="left" />
      <slot name="right" />
    </div>
  `,
})

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
