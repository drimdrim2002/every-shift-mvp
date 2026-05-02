<script setup lang="ts">
import type { ScheduleVersionSummary } from '@/types/schedule';
import {
  formatScheduleVersionLabel,
  formatScheduleVersionStatus,
} from '@/utils/scheduleReviewCopy';

const props = defineProps<{
  versions: ScheduleVersionSummary[];
  previewVersionId: string | null;
  selectedVersionId: string | null;
  lockedVersionId?: string | null;
}>();

const emit = defineEmits<{
  (event: 'preview-change', versionId: string): void;
}>();

const formatVersionLabel = formatScheduleVersionLabel;

function formatPercent(value: number | null) {
  if (value === null) return null;
  return `${Math.round(value)}%`;
}

function handlePreviewChange(versionId: string) {
  if (props.lockedVersionId && versionId !== props.lockedVersionId) {
    return;
  }

  if (versionId === props.previewVersionId) {
    return;
  }

  emit('preview-change', versionId);
}
</script>

<template>
  <section
    data-test="version-compare-surface"
    class="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"
  >
    <div class="mb-3 flex items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">
          근무표안 비교
        </h3>
        <p class="text-xs text-slate-500">
          클릭하면 미리보기만 변경됩니다.
        </p>
      </div>
      <span class="text-xs text-slate-500">{{ versions.length }}개 안</span>
    </div>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <button
        v-for="version in versions"
        :key="version.id"
        type="button"
        class="rounded-xl border bg-white p-4 text-left transition"
        :class="version.id === previewVersionId
          ? 'border-sky-500 ring-2 ring-sky-100'
          : 'border-slate-200 hover:border-slate-300'"
        :disabled="Boolean(lockedVersionId) && version.id !== lockedVersionId"
        :data-test="`preview-${version.id}`"
        @click="handlePreviewChange(version.id)"
      >
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span class="text-sm font-semibold text-slate-900">
            {{ formatVersionLabel(version) }}
          </span>
          <span
            v-if="version.id === previewVersionId"
            class="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700"
          >
            미리보기
          </span>
          <span
            v-if="version.id === selectedVersionId"
            class="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
          >
            선택됨
          </span>
          <span
            v-if="version.isFinalized"
            class="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700"
          >
            확정됨
          </span>
          <span
            v-if="lockedVersionId && version.id === lockedVersionId"
            class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700"
          >
            잠김
          </span>
        </div>

        <div class="space-y-1 text-xs text-slate-600">
          <p>상태: {{ formatScheduleVersionStatus(version.status) }}</p>
          <p>수정 {{ version.manualEditCount ?? 0 }}회</p>
          <p v-if="formatPercent(version.comparisonMetrics?.offRequestReflectionRate ?? null)">
            Off 반영률:
            {{ formatPercent(version.comparisonMetrics?.offRequestReflectionRate ?? null) }}
          </p>
          <p v-if="version.inputDiffSummary?.note">
            변경 메모: {{ version.inputDiffSummary.note }}
          </p>
        </div>
      </button>
    </div>
  </section>
</template>
