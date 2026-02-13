<template>
  <template v-if="isSingleBox">
    <button
      :class="getSingleBoxClass(currentShift)"
      :style="getSingleBoxStyle(currentShift)"
      :disabled="readonly"
      @click="handleSingleBoxToggle"
    >
      <span class="font-bold">{{ currentShift || '' }}</span>
    </button>
  </template>
  <div v-else class="flex gap-0.5 p-0.5">
    <n-tooltip
      v-for="shift in availableShifts"
      :key="shift"
      :disabled="shift !== 'O' || !offReason"
      trigger="manual"
      :show="shift === 'O' && props.currentShift === 'O' && !!offReason"
      placement="top"
      :y="-5"
      :show-arrow="false"
      content-class="shift-selector-tooltip"
      :content-style="{ padding: '1px 1px', fontSize: '8px', maxWidth: '50px', lineHeight: '1.1' }"
    >
      <template #trigger>
        <button
          :class="getShiftButtonClass(shift)"
          :disabled="readonly"
          @click="handleSelect(shift)"
        >
          {{ shift }}
        </button>
      </template>
      <div class="text-xs leading-tight">
        {{ offReason }}
      </div>
    </n-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NTooltip } from 'naive-ui';

interface Props {
  employeeId: string
  date: string
  availableShifts: string[]
  currentShift: string | null
  variant?: 'multi-button' | 'single-box'
  isLastMonth?: boolean
  shiftColors?: Record<string, string>
  readonly?: boolean
  offReason?: string | null
}

interface Emits {
  (e: 'select', shiftCode: string): void
  (e: 'select-off', payload: { employeeId: string; date: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const isSingleBox = computed(() => props.variant === 'single-box')

// 색상 맵을 컴포넌트 레벨에서 한 번만 정의 (성능 최적화)
const colorMap: Record<string, string> = {
  D: 'border-shift-day text-green-700',
  E: 'border-shift-evening text-orange-700',
  N: 'border-shift-night text-blue-700',
  O: 'border-shift-off text-gray-700',
}

const selectedColorMap: Record<string, string> = {
  D: 'bg-shift-day text-white',
  E: 'bg-shift-evening text-white',
  N: 'bg-shift-night text-white',
  O: 'bg-shift-off text-white',
}
const singleBoxColorMap: Record<string, string> = {
  '': 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50',
  D: 'bg-green-50 border-green-200 text-green-700',
  E: 'bg-orange-50 border-orange-200 text-orange-700',
  N: 'bg-blue-50 border-blue-200 text-blue-700',
  O: 'bg-gray-100 border-gray-300 text-gray-700',
}

const baseClass = 'w-7 h-7 rounded text-xs font-semibold border-2 transition-opacity'
const singleBoxBaseClass = 'flex h-8 w-full items-center justify-center rounded border text-xs font-semibold transition-colors'
const toggleCursorClass = 'cursor-pointer'

function getShiftButtonClass(shiftCode: string) {
  const isSelected = props.currentShift === shiftCode
  const color = isSelected ? selectedColorMap[shiftCode] : colorMap[shiftCode]
  const opacity = isSelected ? 'opacity-100' : 'opacity-40'
  const hover = !props.readonly ? 'hover:opacity-80 cursor-pointer' : 'cursor-not-allowed'

  return `${baseClass} ${color} ${opacity} ${hover}`
}

function getSingleBoxClass(shiftCode: string | null) {
  if (props.readonly) {
    return `${singleBoxBaseClass} bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed`
  }

  const color = singleBoxColorMap[shiftCode || ''] || singleBoxColorMap['']
  return `${singleBoxBaseClass} ${color} ${toggleCursorClass}`
}

function normalizeHexColor(color?: string): string | null {
  if (!color) return null
  const normalized = color.trim()
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(normalized) ? normalized : null
}

function getReadableTextColor(hexColor: string): string {
  const hex = hexColor.slice(1)
  const normalized = hex.length === 3
    ? hex.split('').map((value) => value + value).join('')
    : hex
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000
  return luminance >= 170 ? '#1f2937' : '#ffffff'
}

function getSingleBoxStyle(shiftCode: string | null): Record<string, string> {
  if (!props.isLastMonth || !shiftCode) return {}

  const rawColor = props.shiftColors?.[shiftCode]
  const color = normalizeHexColor(rawColor)
  if (!color) return {}

  return {
    backgroundColor: color,
    borderColor: color,
    color: getReadableTextColor(color),
  }
}

function handleSingleBoxToggle() {
  if (props.readonly) return

  const cycleOrder = [...props.availableShifts, '']
  if (cycleOrder.length === 0) {
    emit('select', '')
    return
  }

  const currentShift = props.currentShift || ''
  const currentIndex = cycleOrder.indexOf(currentShift)
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % cycleOrder.length : 0
  const nextShift = cycleOrder[nextIndex] || ''
  emit('select', nextShift)
}

function handleSelect(shiftCode: string) {
  if (!props.readonly) {
    // O(Off) 선택 시 사유 입력을 위한 별도 이벤트 emit
    if (shiftCode === 'O' && props.currentShift !== 'O') {
      emit('select-off', { employeeId: props.employeeId, date: props.date })
      return
    }
    
    // 이미 선택된 shift를 다시 클릭하면 해제 (토글 기능)
    const newShiftCode = props.currentShift === shiftCode ? '' : shiftCode
    emit('select', newShiftCode)
  }
}
</script>

<style scoped>
.shift-selector-tooltip {
  padding: 1px 4px !important;
  font-size: 10px !important;
  line-height: 1.1 !important;
}
</style>
