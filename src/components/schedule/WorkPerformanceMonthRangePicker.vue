<template>
  <div class="space-y-1">
    <span class="text-sm font-medium text-slate-700">조회 기간</span>
    <n-popover
      trigger="click"
      placement="bottom-start"
      :show="showPanel"
      :style="popoverStyle"
      @update:show="handlePopoverShowUpdate"
    >
      <template #trigger>
        <n-button
          data-test="work-performance-month-range-trigger"
          size="large"
          class="min-h-11 w-full justify-center tabular-nums"
          :aria-expanded="String(showPanel)"
          @click="openPanel"
        >
          {{ formattedLabel }}
        </n-button>
      </template>

      <div
        data-test="work-performance-month-range-panel"
        class="w-full space-y-4"
      >
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="space-y-1 text-sm font-medium text-slate-700">
            <span>시작 월</span>
            <n-select
              data-test="work-performance-start-month-select"
              class="w-full"
              :value="pendingRange[0]"
              :options="monthOptions"
              :consistent-menu-width="false"
              filterable
              @update:value="updatePendingStartMonth"
            />
          </label>
          <label class="space-y-1 text-sm font-medium text-slate-700">
            <span>종료 월</span>
            <n-select
              data-test="work-performance-end-month-select"
              class="w-full"
              :value="pendingRange[1]"
              :options="monthOptions"
              :consistent-menu-width="false"
              filterable
              @update:value="updatePendingEndMonth"
            />
          </label>
        </div>

        <div class="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <n-button
            data-test="work-performance-month-range-cancel"
            secondary
            @click="cancelSelection"
          >
            취소
          </n-button>
          <n-button
            data-test="work-performance-month-range-apply"
            type="primary"
            :disabled="!canApplyPendingRange"
            @click="applySelection"
          >
            적용
          </n-button>
        </div>
      </div>
    </n-popover>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NPopover, NSelect } from 'naive-ui'
import type { SelectOption } from 'naive-ui'

type MonthRangeValue = [string, string]

interface MonthOption extends SelectOption {
  label: string
  value: string
}

const props = defineProps<{
  modelValue: MonthRangeValue
}>()

const emit = defineEmits<{
  'update:modelValue': [value: MonthRangeValue]
}>()

const yearRange: [number, number] = [2000, 2100]
const popoverStyle = {
  width: 'min(34rem, calc(100vw - 2rem))',
  maxWidth: 'calc(100vw - 2rem)',
}

const showPanel = ref(false)
const pendingRange = ref<MonthRangeValue>(getInitialPendingRange())

const monthOptions: MonthOption[] = createMonthOptions()

const formattedLabel = computed(() => formatMonthRangeLabel(props.modelValue))
const canApplyPendingRange = computed(() => isValidMonthRange(pendingRange.value))

watch(
  () => props.modelValue,
  () => {
    if (!showPanel.value) {
      resetPendingRange()
    }
  },
)

function openPanel() {
  resetPendingRange()
  showPanel.value = true
}

function handlePopoverShowUpdate(value: boolean) {
  if (value) {
    openPanel()
    return
  }

  cancelSelection()
}

function updatePendingStartMonth(value: unknown) {
  if (typeof value !== 'string' || !isSelectableMonth(value)) {
    return
  }

  const start = parseYearMonth(value)
  const end = parseYearMonth(pendingRange.value[1])
  const nextEndValue = !start || !end || start.year !== end.year || start.month > end.month
    ? value
    : pendingRange.value[1]

  pendingRange.value = [value, nextEndValue]
}

function updatePendingEndMonth(value: unknown) {
  if (typeof value !== 'string' || !isSelectableMonth(value)) {
    return
  }

  const start = parseYearMonth(pendingRange.value[0])
  const end = parseYearMonth(value)
  const nextStartValue = !start || !end || start.year !== end.year || start.month > end.month
    ? value
    : pendingRange.value[0]

  pendingRange.value = [nextStartValue, value]
}

function cancelSelection() {
  resetPendingRange()
  showPanel.value = false
}

function applySelection() {
  if (!isValidMonthRange(pendingRange.value)) {
    return
  }

  emit('update:modelValue', [...pendingRange.value])
  showPanel.value = false
}

function resetPendingRange() {
  pendingRange.value = getInitialPendingRange()
}

function getInitialPendingRange(): MonthRangeValue {
  if (isValidMonthRange(props.modelValue)) {
    return [...props.modelValue]
  }

  const fallbackMonth = getCurrentMonthValue()
  return [fallbackMonth, fallbackMonth]
}

function createMonthOptions(): MonthOption[] {
  const options: MonthOption[] = []

  for (let year = yearRange[0]; year <= yearRange[1]; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const value = formatYearMonth(year, month)
      options.push({
        label: formatMonthLabel(value),
        value,
      })
    }
  }

  return options
}

function isSelectableMonth(value: string): boolean {
  const month = parseYearMonth(value)

  return Boolean(month && month.year >= yearRange[0] && month.year <= yearRange[1])
}

function isValidMonthRange(value: MonthRangeValue): boolean {
  const start = parseYearMonth(value[0])
  const end = parseYearMonth(value[1])

  return Boolean(
    start &&
      end &&
      start.year === end.year &&
      start.year >= yearRange[0] &&
      end.year <= yearRange[1] &&
      start.month <= end.month,
  )
}

function parseYearMonth(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function formatMonthRangeLabel(value: MonthRangeValue): string {
  const start = parseYearMonth(value[0])
  const end = parseYearMonth(value[1])

  if (!start || !end || start.year !== end.year) {
    return '조회 기간 선택'
  }

  return `${start.year}년 ${start.month}월 ~ ${end.month}월`
}

function formatMonthLabel(value: string): string {
  const month = parseYearMonth(value)

  if (!month) {
    return value
  }

  return `${month.year}년 ${month.month}월`
}

function getCurrentMonthValue(): string {
  const today = new Date()

  return formatYearMonth(today.getFullYear(), today.getMonth() + 1)
}
</script>
