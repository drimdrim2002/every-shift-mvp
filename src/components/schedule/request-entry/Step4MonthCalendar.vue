<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { NTooltip } from 'naive-ui'

import type { GridColumn } from '@/types/schedule'
import {
  buildMonthCalendarMatrix,
  buildSelectedDateSummary,
  getCurrentMonthGridDates,
  getNextSelectedDates,
  normalizeSelectedDates,
  type Step4MonthCalendarCell,
  type Step4SelectionMode,
} from '@/components/schedule/request-entry/requestEntryUtils'

const props = withDefaults(defineProps<{
  dates: GridColumn[]
  selectionMode: Step4SelectionMode
  selectedDates: string[]
  existingRequestDates?: string[]
  existingRequestSummaries?: Record<string, string[]>
  transitionBlocked?: boolean
}>(), {
  existingRequestDates: () => [],
  existingRequestSummaries: () => ({}),
  transitionBlocked: false,
})

const emit = defineEmits<{
  'update:selected-dates': [dates: string[]]
  'request-blocked-transition': []
}>()

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'] as const

const currentMonthDates = computed(() => getCurrentMonthGridDates(props.dates))
const calendarWeeks = computed(() => buildMonthCalendarMatrix(props.dates))
const normalizedSelectedDates = computed(() => normalizeSelectedDates(props.selectedDates, props.dates))
const existingRequestDateSet = computed(() => {
  return new Set([
    ...props.existingRequestDates,
    ...Object.keys(props.existingRequestSummaries),
  ])
})
const selectedDateSummary = computed(() => buildSelectedDateSummary(props.selectedDates, props.dates))
const activeDate = ref<string | null>(null)
const dayButtonRefs = ref<Record<string, HTMLButtonElement | null>>({})

const monthLabel = computed(() => {
  const firstDate = currentMonthDates.value[0]
  return firstDate ? dayjs(firstDate.date).format('YYYY년 M월') : '날짜 없음'
})

function setDayButtonRef(date: string, element: HTMLButtonElement | null) {
  dayButtonRefs.value[date] = element
}

function syncActiveDate() {
  const firstSelectedDate = normalizedSelectedDates.value[0]

  if (firstSelectedDate) {
    activeDate.value = firstSelectedDate
    return
  }

  const currentActiveDate = activeDate.value
  if (currentActiveDate && currentMonthDates.value.some((date) => date.date === currentActiveDate)) {
    return
  }

  activeDate.value = currentMonthDates.value[0]?.date ?? null
}

watch(
  () => [props.dates, props.selectedDates],
  () => {
    syncActiveDate()
  },
  { deep: true, immediate: true },
)

function focusDate(date: string) {
  activeDate.value = date

  void nextTick(() => {
    dayButtonRefs.value[date]?.focus()
  })
}

function moveActiveDate(delta: number) {
  if (!activeDate.value) {
    syncActiveDate()
    return
  }

  const activeIndex = currentMonthDates.value.findIndex((date) => date.date === activeDate.value)
  if (activeIndex === -1) {
    syncActiveDate()
    return
  }

  const nextIndex = Math.min(
    Math.max(activeIndex + delta, 0),
    currentMonthDates.value.length - 1,
  )
  const nextDate = currentMonthDates.value[nextIndex]?.date

  if (nextDate) {
    focusDate(nextDate)
  }
}

function requestSelection(date: string) {
  if (props.transitionBlocked) {
    emit('request-blocked-transition')
    return
  }

  const nextDates = getNextSelectedDates({
    dates: props.dates,
    selectionMode: props.selectionMode,
    selectedDates: props.selectedDates,
    targetDate: date,
  })

  emit('update:selected-dates', nextDates)
}

function handleDayKeydown(date: string, event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      moveActiveDate(-1)
      return
    case 'ArrowRight':
      event.preventDefault()
      moveActiveDate(1)
      return
    case 'ArrowUp':
      event.preventDefault()
      moveActiveDate(-7)
      return
    case 'ArrowDown':
      event.preventDefault()
      moveActiveDate(7)
      return
    case 'Enter':
    case ' ':
    case 'Spacebar':
      event.preventDefault()
      requestSelection(date)
      return
    default:
      return
  }
}

function isSelected(date: string) {
  return normalizedSelectedDates.value.includes(date)
}

function isExistingRequestDate(date: string) {
  return existingRequestDateSet.value.has(date)
}

function getExistingRequestNames(date: string) {
  const names = props.existingRequestSummaries[date] ?? []
  return Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)))
}

function getExistingRequestDisplayLabel(date: string) {
  const names = getExistingRequestNames(date)

  if (names.length === 0) {
    return isExistingRequestDate(date) ? '요청 있음' : ''
  }

  if (names.length === 1) {
    return names[0]
  }

  return `${names[0]} 외 ${names.length - 1}명`
}

function getExistingRequestTooltipText(date: string) {
  const names = getExistingRequestNames(date)

  if (names.length === 0) {
    return isExistingRequestDate(date) ? '기존 요청' : ''
  }

  return names.join(', ')
}

function isActiveDate(date: string) {
  return activeDate.value === date
}

function getDayButtonLabel(cell: GridColumn) {
  const tokens = [dayjs(cell.date).format('M월 D일')]

  if (isSelected(cell.date)) {
    tokens.push('선택됨')
  }

  if (isExistingRequestDate(cell.date)) {
    const names = getExistingRequestNames(cell.date)
    tokens.push(names.length > 0 ? `${names.join(', ')} 요청` : '기존 요청')
  }

  return tokens.join(', ')
}

function getDayButtonClasses(cell: GridColumn) {
  return {
    'border-slate-300 bg-white text-slate-700': !isSelected(cell.date),
    'border-emerald-500 bg-emerald-50 text-emerald-900': isSelected(cell.date),
    'ring-2 ring-emerald-300': isSelected(cell.date) && isExistingRequestDate(cell.date),
    'border-amber-300 bg-amber-50': !isSelected(cell.date) && isExistingRequestDate(cell.date),
    'outline outline-2 outline-offset-2 outline-slate-400': isActiveDate(cell.date),
  }
}

function getCellKey(cell: Step4MonthCalendarCell, index: number) {
  return cell?.date ?? `empty-${index}`
}
</script>

<template>
  <section
    data-test="step4-month-calendar"
    class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
  >
    <header class="mb-4 flex flex-col gap-1">
      <p class="text-sm font-semibold text-slate-900">
        {{ monthLabel }}
      </p>
      <p class="text-xs text-slate-500">
        선택 모드: {{ selectionMode }}
      </p>
      <p
        data-test="selected-date-summary"
        class="text-sm text-slate-700"
      >
        {{ selectedDateSummary }}
      </p>
    </header>

    <div class="grid grid-cols-7 gap-2 text-center text-xs font-medium text-slate-500">
      <span
        v-for="weekdayLabel in weekdayLabels"
        :key="weekdayLabel"
      >
        {{ weekdayLabel }}
      </span>
    </div>

    <div class="mt-2 space-y-2">
      <div
        v-for="(week, weekIndex) in calendarWeeks"
        :key="`week-${weekIndex}`"
        class="grid grid-cols-7 gap-2"
      >
        <template
          v-for="(cell, cellIndex) in week"
          :key="getCellKey(cell, cellIndex)"
        >
          <div
            v-if="!cell"
            class="h-16 rounded-xl border border-transparent bg-slate-50/40"
            aria-hidden="true"
          />
          <button
            v-else
            :ref="(element) => setDayButtonRef(cell.date, element as HTMLButtonElement | null)"
            :aria-label="getDayButtonLabel(cell)"
            :aria-pressed="isSelected(cell.date)"
            :data-test="`calendar-day-${cell.date}`"
            :tabindex="isActiveDate(cell.date) ? 0 : -1"
            class="flex h-16 min-w-0 flex-col items-start justify-between rounded-xl border p-2 text-left transition-colors"
            :class="getDayButtonClasses(cell)"
            type="button"
            @click="requestSelection(cell.date)"
            @focus="activeDate = cell.date"
            @keydown="handleDayKeydown(cell.date, $event)"
          >
            <span class="text-sm font-semibold">{{ cell.day }}</span>
            <n-tooltip
              v-if="isExistingRequestDate(cell.date)"
              :disabled="!getExistingRequestTooltipText(cell.date)"
              trigger="hover"
            >
              <template #trigger>
                <span
                  class="max-w-full truncate whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                  :title="getExistingRequestTooltipText(cell.date)"
                >
                  {{ getExistingRequestDisplayLabel(cell.date) }}
                </span>
              </template>
              <div class="max-w-56 whitespace-pre-wrap break-words">
                {{ getExistingRequestTooltipText(cell.date) }}
              </div>
            </n-tooltip>
          </button>
        </template>
      </div>
    </div>
  </section>
</template>
