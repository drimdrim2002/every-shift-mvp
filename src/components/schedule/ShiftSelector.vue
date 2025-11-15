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
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

function getShiftButtonClass(shiftCode: string) {
  const isSelected = props.currentShift === shiftCode
  const baseClass = 'w-7 h-7 rounded text-xs font-semibold border-2 transition-opacity'

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

  const color = isSelected ? selectedColorMap[shiftCode] : colorMap[shiftCode]
  const opacity = isSelected ? 'opacity-100' : 'opacity-40'
  const hover = !props.readonly ? 'hover:opacity-80 cursor-pointer' : 'cursor-not-allowed'

  return `${baseClass} ${color} ${opacity} ${hover}`
}

function handleSelect(shiftCode: string) {
  if (!props.readonly) {
    emit('select', shiftCode)
  }
}
</script>
