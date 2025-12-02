<template>
  <div class="flex gap-0.5 p-0.5">
    <button
      v-for="shift in availableShifts"
      :key="shift"
      :class="getShiftButtonClass(shift)"
      :disabled="readonly"
      @click="handleSelect(shift)"
    >
      {{ shift }}
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  employeeId: string
  date: string
  availableShifts: string[]
  currentShift: string | null
  readonly?: boolean
}

interface Emits {
  (e: 'select', shiftCode: string): void
  (e: 'select-off', payload: { employeeId: string; date: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

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

const baseClass = 'w-7 h-7 rounded text-xs font-semibold border-2 transition-opacity'

function getShiftButtonClass(shiftCode: string) {
  const isSelected = props.currentShift === shiftCode
  const color = isSelected ? selectedColorMap[shiftCode] : colorMap[shiftCode]
  const opacity = isSelected ? 'opacity-100' : 'opacity-40'
  const hover = !props.readonly ? 'hover:opacity-80 cursor-pointer' : 'cursor-not-allowed'

  return `${baseClass} ${color} ${opacity} ${hover}`
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
