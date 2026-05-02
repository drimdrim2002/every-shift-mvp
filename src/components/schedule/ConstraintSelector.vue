<template>
  <n-tooltip
    :disabled="!tooltipText"
    trigger="hover"
  >
    <template #trigger>
      <div
        class="constraint-selector relative flex h-8 cursor-pointer select-none items-center justify-center rounded border transition-colors"
        :class="getCellClass(currentConstraint)"
        @click="handleClick"
        @contextmenu.prevent="handleContextMenu"
      >
        <span class="font-bold">{{ currentConstraint || '' }}</span>

        <!-- 코멘트 인디케이터 -->
        <div
          v-if="hasComment"
          class="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-red-500"
        />
      </div>
    </template>
    <div class="max-w-56 whitespace-pre-wrap break-words">
      {{ tooltipText }}
    </div>
  </n-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NTooltip } from 'naive-ui';

interface Props {
  employeeId: string;
  date: string;
  currentConstraint: string | null;
  hasComment?: boolean;
  comment?: string | null;
  readonly?: boolean;
  interactionMode?: 'toggle' | 'select';
  selected?: boolean;
}

interface Emits {
  (e: 'update:constraint', payload: { employeeId: string; date: string; constraint: string }): void;
  (e: 'context-menu', event: MouseEvent, payload: { employeeId: string; date: string }): void;
  (e: 'select', payload: { employeeId: string; date: string }): void;
}

const props = withDefaults(defineProps<Props>(), {
  interactionMode: 'toggle',
  selected: false,
});
const emit = defineEmits<Emits>();

// 순환 순서: 빈칸 <-> O
const TOGGLE_ORDER = ['', 'O'];

// 스타일 매핑
const styleMap: Record<string, string> = {
  '': 'bg-white border-gray-200 hover:bg-gray-50',
  'O': 'bg-gray-100 border-gray-300 text-gray-700', // Off
};

const tooltipText = computed(() => {
  if (props.currentConstraint !== 'O') return '';
  return props.comment?.trim() || '';
});

function getCellClass(constraint: string | null) {
  if (props.readonly) return 'bg-gray-50 border-gray-200 cursor-not-allowed';
  return [
    styleMap[constraint || ''] || styleMap[''],
    props.selected ? 'ring-2 ring-emerald-300 ring-inset' : '',
    tooltipText.value.includes('정책 거부:') ? 'border-amber-300 bg-amber-50' : '',
  ];
}

function handleClick() {
  if (props.readonly) return;
  if (props.interactionMode === 'select') {
    emit('select', {
      employeeId: props.employeeId,
      date: props.date
    });
    return;
  }

  const currentIndex = TOGGLE_ORDER.indexOf(props.currentConstraint || '');
  const nextIndex = (currentIndex + 1) % TOGGLE_ORDER.length;
  const nextConstraint = TOGGLE_ORDER[nextIndex] || '';

  emit('update:constraint', {
    employeeId: props.employeeId,
    date: props.date,
    constraint: nextConstraint
  });
}

function handleContextMenu(event: MouseEvent) {
  if (props.readonly) return;
  if (props.interactionMode === 'select') return;
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
