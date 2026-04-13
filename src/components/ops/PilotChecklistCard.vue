<template>
  <n-card
    data-test="pilot-checklist-card"
    title="운영 준비 체크리스트"
  >
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm text-gray-500">
            근무표를 만들기 전에 조직, 사이트, 직원 기준을 먼저 정리합니다.
          </p>
          <p class="mt-1 text-xs text-gray-400">
            이 체크리스트는 월별 생성 wizard가 아니라 운영 준비 단계입니다.
          </p>
          <p
            v-if="checklist.checklistCursor"
            class="mt-1 text-xs text-gray-400"
          >
            마지막 확인 위치: {{ checklist.checklistCursor }}
          </p>
        </div>
        <div
          class="rounded-full px-3 py-1 text-xs font-medium"
          :class="checklist.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
        >
          {{ checklist.ready ? '준비 완료' : '준비 중' }}
        </div>
      </div>

      <div class="space-y-3">
        <div
          v-for="item in checklist.items"
          :key="item.key"
          class="rounded-lg border border-gray-200 bg-white p-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold text-gray-900">
                  {{ item.title }}
                </h3>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="item.status === 'ready' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'"
                >
                  {{ item.status === 'ready' ? '완료' : '대기' }}
                </span>
              </div>
              <p
                v-if="item.blockedReason"
                class="mt-1 text-sm text-gray-500"
              >
                {{ item.blockedReason }}
              </p>
            </div>

            <n-button
              :data-test="`pilot-checklist-link-${item.key}`"
              :aria-label="item.title"
              size="small"
              tertiary
              :disabled="!item.route"
              @click="emit('navigate', item)"
            >
              {{ item.route ? '열기' : '잠김' }}
            </n-button>
          </div>
        </div>
      </div>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { NButton, NCard } from 'naive-ui';
import type { ChecklistItem, ChecklistResponse } from '@/types/ops';

defineProps<{
  checklist: ChecklistResponse;
}>();

const emit = defineEmits<{
  navigate: [item: ChecklistItem];
}>();
</script>
