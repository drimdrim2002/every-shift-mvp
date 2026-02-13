<template>
  <div 
    class="constraint-selector relative flex h-8 items-center justify-center rounded border transition-colors cursor-pointer select-none"
    :class="getCellClass(currentConstraint)"
    @click="handleToggle"
    @contextmenu.prevent="handleContextMenu"
  >
    <span class="font-bold">{{ currentConstraint || '' }}</span>
    
    <!-- 코멘트 인디케이터 -->
    <div 
      v-if="hasComment" 
      class="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-red-500"
    />
  </div>
</template>

<script setup lang="ts">

interface Props {
  employeeId: string;
  date: string;
  currentConstraint: string | null;
  hasComment?: boolean;
  readonly?: boolean;
}

interface Emits {
  (e: 'update:constraint', payload: { employeeId: string; date: string; constraint: string }): void;
  (e: 'context-menu', event: MouseEvent, payload: { employeeId: string; date: string }): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 순환 순서: 빈칸 -> H -> E -> O -> 빈칸
const TOGGLE_ORDER = ['', 'H', 'E', 'O'];

// 스타일 매핑
const styleMap: Record<string, string> = {
  '': 'bg-white border-gray-200 hover:bg-gray-50',
  'H': 'bg-purple-100 border-purple-300 text-purple-700', // Holiday
  'E': 'bg-orange-100 border-orange-300 text-orange-700', // Education
  'O': 'bg-gray-100 border-gray-300 text-gray-700',       // Off
};

function getCellClass(constraint: string | null) {
  if (props.readonly) return 'bg-gray-50 border-gray-200 cursor-not-allowed';
  return styleMap[constraint || ''] || styleMap[''];
}

function handleToggle() {
  if (props.readonly) return;

  const currentIndex = TOGGLE_ORDER.indexOf(props.currentConstraint || '');
  const nextIndex = (currentIndex + 1) % TOGGLE_ORDER.length;
  const nextConstraint = TOGGLE_ORDER[nextIndex];

  emit('update:constraint', {
    employeeId: props.employeeId,
    date: props.date,
    constraint: nextConstraint
  });
}

function handleContextMenu(event: MouseEvent) {
  if (props.readonly) return;
  emit('context-menu', event, {
    employeeId: props.employeeId,
    date: props.date
  });
}
</script>

<style scoped>
.constraint-selector {
  width: 100%;
  height: 100%;
  min-height: 32px;
}
</style>
