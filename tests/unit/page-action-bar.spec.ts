import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PageActionBar from '@/components/ui/PageActionBar.vue'

describe('PageActionBar', () => {
  it('matches the shared action bar contract', () => {
    const wrapper = mount(PageActionBar, {
      slots: {
        left: '<button data-test="left-action">back</button>',
        right: '<button data-test="right-action">save</button>',
      },
    })

    const root = wrapper.find('[data-test="page-action-bar"]')
    const leftRegion = wrapper.find('[data-test="page-action-bar-left"]')
    const rightRegion = wrapper.find('[data-test="page-action-bar-right"]')

    expect(root.exists()).toBe(true)
    expect(leftRegion.exists()).toBe(true)
    expect(rightRegion.exists()).toBe(true)
    expect(root.classes()).toEqual(
      expect.arrayContaining([
        'mt-6',
        'flex',
        'flex-col',
        'gap-3',
        'border-t',
        'border-gray-200',
        'pt-6',
        'md:flex-row',
        'md:items-center',
        'md:justify-between',
      ]),
    )
    expect(leftRegion.classes()).toEqual(expect.arrayContaining(['flex', 'flex-wrap', 'gap-3']))
    expect(rightRegion.classes()).toEqual(
      expect.arrayContaining(['flex', 'flex-wrap', 'justify-end', 'gap-3']),
    )
    expect(leftRegion.text()).toContain('back')
    expect(rightRegion.text()).toContain('save')
  })
})
