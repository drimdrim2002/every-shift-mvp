import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import WorkPerformanceMonthRangePicker from '@/components/schedule/WorkPerformanceMonthRangePicker.vue'

type MonthRangeValue = [string, string]

vi.mock('naive-ui', () => ({
  NPopover: {
    name: 'NPopover',
    props: ['show'],
    emits: ['update:show'],
    template:
      '<div><slot name="trigger" /><div data-test="month-range-popover" :data-show="String(show)"><slot /></div></div>',
  },
  NButton: {
    name: 'NButton',
    props: ['disabled', 'type', 'secondary', 'size'],
    emits: ['click'],
    template:
      '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  NSelect: {
    name: 'NSelect',
    props: ['value', 'options'],
    emits: ['update:value'],
    template: `
      <select v-bind="$attrs" :value="value" @change="$emit('update:value', $event.target.value)">
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    `,
  },
}))

function createWrapper(modelValue: MonthRangeValue = ['2026-03', '2026-05']) {
  return mount(WorkPerformanceMonthRangePicker, {
    props: {
      modelValue,
    },
  })
}

async function openPanel(wrapper: ReturnType<typeof createWrapper>) {
  await wrapper.get('[data-test="work-performance-month-range-trigger"]').trigger('click')
}

describe('WorkPerformanceMonthRangePicker', () => {
  it('formats the selected same-year range as Korean year plus month range', () => {
    const wrapper = createWrapper(['2026-03', '2026-05'])

    expect(wrapper.get('[data-test="work-performance-month-range-trigger"]').text()).toContain(
      '2026년 3월 ~ 5월',
    )
  })

  it('formats a same-month range without changing the external contract', () => {
    const wrapper = createWrapper(['2026-03', '2026-03'])

    expect(wrapper.get('[data-test="work-performance-month-range-trigger"]').text()).toContain(
      '2026년 3월 ~ 3월',
    )
  })

  it('does not emit while start and end month edits are still pending', async () => {
    const wrapper = createWrapper(['2026-03', '2026-05'])

    await openPanel(wrapper)
    await wrapper.get('[data-test="work-performance-start-month-select"]').setValue('2026-04')
    await wrapper.get('[data-test="work-performance-end-month-select"]').setValue('2026-05')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get('[data-test="work-performance-month-range-trigger"]').text()).toContain(
      '2026년 3월 ~ 5월',
    )
  })

  it('emits the pending range and closes the panel when apply is clicked', async () => {
    const wrapper = createWrapper(['2026-03', '2026-05'])

    await openPanel(wrapper)
    await wrapper.get('[data-test="work-performance-start-month-select"]').setValue('2026-04')
    await wrapper.get('[data-test="work-performance-end-month-select"]').setValue('2026-05')
    await wrapper.get('[data-test="work-performance-month-range-apply"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['2026-04', '2026-05']])
    expect(wrapper.get('[data-test="month-range-popover"]').attributes('data-show')).toBe('false')
    expect(wrapper.get('[data-test="work-performance-month-range-trigger"]').attributes('aria-expanded')).toBe(
      'false',
    )
  })

  it('closes without emitting and resets pending edits when cancel is clicked', async () => {
    const wrapper = createWrapper(['2026-03', '2026-05'])

    await openPanel(wrapper)
    await wrapper.get('[data-test="work-performance-start-month-select"]').setValue('2026-04')
    await wrapper.get('[data-test="work-performance-end-month-select"]').setValue('2026-05')
    await wrapper.get('[data-test="work-performance-month-range-cancel"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get('[data-test="month-range-popover"]').attributes('data-show')).toBe('false')
    expect(wrapper.get('[data-test="work-performance-start-month-select"]').element).toHaveProperty(
      'value',
      '2026-03',
    )
    expect(wrapper.get('[data-test="work-performance-end-month-select"]').element).toHaveProperty(
      'value',
      '2026-05',
    )
  })

  it('does not render recent month shortcut controls', () => {
    const wrapper = createWrapper(['2026-03', '2026-05'])

    expect(wrapper.text()).not.toContain('최근 월')
    expect(wrapper.find('[data-test^="work-performance-month-shortcut-"]').exists()).toBe(false)
  })

  it('adjusts an end month from a different year to keep a same-year valid range', async () => {
    const wrapper = createWrapper(['2026-03', '2026-05'])

    await openPanel(wrapper)
    await wrapper.get('[data-test="work-performance-end-month-select"]').setValue('2025-12')
    await wrapper.get('[data-test="work-performance-month-range-apply"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['2025-12', '2025-12']])
  })

  it('adjusts a reversed range before emitting', async () => {
    const wrapper = createWrapper(['2026-03', '2026-05'])

    await openPanel(wrapper)
    await wrapper.get('[data-test="work-performance-start-month-select"]').setValue('2026-06')
    await wrapper.get('[data-test="work-performance-month-range-apply"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['2026-06', '2026-06']])
  })

  it('offers month options from January 2000 through December 2100', () => {
    const wrapper = createWrapper()
    const options = wrapper
      .get('[data-test="work-performance-start-month-select"]')
      .findAll('option')

    expect(options[0].attributes('value')).toBe('2000-01')
    expect(options[0].text()).toBe('2000년 1월')
    expect(options.at(-1)?.attributes('value')).toBe('2100-12')
    expect(options.at(-1)?.text()).toBe('2100년 12월')
  })
})
