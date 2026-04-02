<script setup lang="ts">
import { computed } from 'vue';
import type { SchedulePrimaryAction, ScheduleVersionSummary } from '@/types/schedule';
import {
  formatSchedulePrimaryActionLabel,
  formatScheduleVersionStatus,
} from '@/utils/scheduleReviewCopy';

const props = defineProps<{
  previewVersion: ScheduleVersionSummary | null;
  selectedVersion: ScheduleVersionSummary | null;
  primaryAction: SchedulePrimaryAction;
  selecting: boolean;
}>();

const emit = defineEmits<{
  (event: 'select-preview'): void;
}>();

const canSelectPreview = computed(() => props.primaryAction.kind === 'select');
const primaryActionLabel = computed(() => {
  return formatSchedulePrimaryActionLabel(props.primaryAction.kind, props.primaryAction.label);
});

function formatVersionLabel(version: ScheduleVersionSummary | null) {
  if (!version) return '없음';
  return version.name ?? `V${version.versionNo}`;
}
</script>

<template>
  <section class="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-xl bg-slate-50 p-4">
          <p class="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
            미리보기 버전
          </p>
          <p class="mt-2 text-lg font-semibold text-slate-900">
            {{ formatVersionLabel(previewVersion) }}
          </p>
          <p class="mt-1 text-sm text-slate-600">
            상태: {{ previewVersion ? formatScheduleVersionStatus(previewVersion.status) : '없음' }}
          </p>
        </div>

        <div class="rounded-xl bg-slate-50 p-4">
          <p class="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
            선택된 버전
          </p>
          <p class="mt-2 text-lg font-semibold text-slate-900">
            {{ formatVersionLabel(selectedVersion) }}
          </p>
          <p class="mt-1 text-sm text-slate-600">
            상태: {{ selectedVersion ? formatScheduleVersionStatus(selectedVersion.status) : '없음' }}
          </p>
        </div>
      </div>

      <div class="flex min-w-0 flex-col items-start gap-3 lg:max-w-sm lg:items-end">
        <p class="text-sm text-slate-600">
          {{ primaryActionLabel }}
        </p>
        <p
          v-if="primaryAction.disabledReason"
          class="text-xs text-amber-700"
        >
          {{ primaryAction.disabledReason }}
        </p>

        <button
          v-if="canSelectPreview"
          data-test="select-preview-button"
          type="button"
          class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          :disabled="selecting || !!primaryAction.disabledReason"
          @click="emit('select-preview')"
        >
          {{ selecting ? '선택 중...' : primaryActionLabel }}
        </button>
      </div>
    </div>
  </section>
</template>
