import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import Step4MonthCalendar from '@/components/schedule/request-entry/Step4MonthCalendar.vue'
import { getDaysInMonth, getLastDaysOfPreviousMonth } from '@/utils/date'

type Step4SelectionMode = 'single' | 'range' | 'multi'

const gridDates = [
  ...getLastDaysOfPreviousMonth('2025-05', 5),
  ...getDaysInMonth('2025-05'),
]

function mountCalendar(options: {
  selectionMode: Step4SelectionMode
  selectedDates?: string[]
  existingRequestDates?: string[]
  transitionBlocked?: boolean
}): ReturnType<typeof mount> {
  const Harness = defineComponent({
    components: {
      Step4MonthCalendar,
    },
    setup() {
      const selectedDates = ref(options.selectedDates ?? [])
      const blockedCount = ref(0)

      function handleUpdate(nextDates: string[]) {
        selectedDates.value = nextDates
      }

      function handleBlockedTransition() {
        blockedCount.value += 1
      }

      return {
        blockedCount,
        dates: gridDates,
        existingRequestDates: options.existingRequestDates ?? [],
        handleBlockedTransition,
        handleUpdate,
        selectedDates,
        selectionMode: options.selectionMode,
        transitionBlocked: options.transitionBlocked ?? false,
      }
    },
    template: `
      <div>
        <Step4MonthCalendar
          :dates="dates"
          :selection-mode="selectionMode"
          :selected-dates="selectedDates"
          :existing-request-dates="existingRequestDates"
          :transition-blocked="transitionBlocked"
          @update:selected-dates="handleUpdate"
          @request-blocked-transition="handleBlockedTransition"
        />
        <output data-test="selected-model">{{ selectedDates.join(',') }}</output>
        <output data-test="blocked-count">{{ blockedCount }}</output>
      </div>
    `,
  })

  return mount(Harness)
}

describe('Step4MonthCalendar', () => {
  it('toggles a single day on and off in single mode', async () => {
    const wrapper = mountCalendar({
      selectionMode: 'single',
    })

    const dayButton = wrapper.get('[data-test="calendar-day-2025-05-03"]')

    await dayButton.trigger('click')
    expect(wrapper.get('[data-test="selected-model"]').text()).toBe('2025-05-03')

    await dayButton.trigger('click')
    expect(wrapper.get('[data-test="selected-model"]').text()).toBe('')
  })

  it('builds an inclusive range from start to end in range mode', async () => {
    const wrapper = mountCalendar({
      selectionMode: 'range',
    })

    await wrapper.get('[data-test="calendar-day-2025-05-10"]').trigger('click')
    await wrapper.get('[data-test="calendar-day-2025-05-13"]').trigger('click')

    expect(wrapper.get('[data-test="selected-model"]').text()).toBe(
      '2025-05-10,2025-05-11,2025-05-12,2025-05-13',
    )
  })

  it('adds and removes dates in multi mode without losing chronological order', async () => {
    const wrapper = mountCalendar({
      selectionMode: 'multi',
    })

    await wrapper.get('[data-test="calendar-day-2025-05-05"]').trigger('click')
    await wrapper.get('[data-test="calendar-day-2025-05-02"]').trigger('click')
    await wrapper.get('[data-test="calendar-day-2025-05-05"]').trigger('click')

    expect(wrapper.get('[data-test="selected-model"]').text()).toBe('2025-05-02')
  })

  it('supports keyboard navigation and Enter selection in single mode', async () => {
    const wrapper = mountCalendar({
      selectionMode: 'single',
      selectedDates: ['2025-05-01'],
    })

    const firstDay = wrapper.get('[data-test="calendar-day-2025-05-01"]')

    await firstDay.trigger('keydown', { key: 'ArrowRight' })

    const secondDay = wrapper.get('[data-test="calendar-day-2025-05-02"]')
    expect(secondDay.attributes('tabindex')).toBe('0')

    await secondDay.trigger('keydown', { key: 'Enter' })

    expect(wrapper.get('[data-test="selected-model"]').text()).toBe('2025-05-02')
  })

  it('supports Space selection in multi mode', async () => {
    const wrapper = mountCalendar({
      selectionMode: 'multi',
      selectedDates: ['2025-05-02'],
    })

    const secondDay = wrapper.get('[data-test="calendar-day-2025-05-02"]')

    await secondDay.trigger('keydown', { key: 'ArrowRight' })
    await wrapper.get('[data-test="calendar-day-2025-05-03"]').trigger('keydown', { key: ' ' })

    expect(wrapper.get('[data-test="selected-model"]').text()).toBe('2025-05-02,2025-05-03')
  })

  it('renders selected summary plus existing request badge and selected highlight', () => {
    const wrapper = mountCalendar({
      selectionMode: 'range',
      selectedDates: ['2025-05-10', '2025-05-11', '2025-05-12'],
      existingRequestDates: ['2025-05-11'],
    })

    expect(wrapper.get('[data-test="selected-date-summary"]').text()).toContain(
      '5월 10일 ~ 5월 12일 (3일)',
    )

    const selectedExistingDay = wrapper.get('[data-test="calendar-day-2025-05-11"]')

    expect(selectedExistingDay.attributes('aria-pressed')).toBe('true')
    expect(selectedExistingDay.text()).toContain('기존 요청')
  })

  it('emits a blocked transition signal instead of changing dates when selection is guarded', async () => {
    const wrapper = mountCalendar({
      selectionMode: 'single',
      selectedDates: ['2025-05-04'],
      transitionBlocked: true,
    })

    await wrapper.get('[data-test="calendar-day-2025-05-08"]').trigger('click')

    expect(wrapper.get('[data-test="selected-model"]').text()).toBe('2025-05-04')
    expect(wrapper.get('[data-test="blocked-count"]').text()).toBe('1')
  })
})
