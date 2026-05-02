<script setup lang="ts">
import { computed } from 'vue'
import { NTooltip } from 'naive-ui'
import type { ScheduleVersionSummary } from '@/types/schedule'
import { formatScheduleVersionStatus } from '@/utils/scheduleReviewCopy'

const props = defineProps<{
  versions: ScheduleVersionSummary[]
  compareVersionIds: string[]
  focusedVersionId: string | null
  selectedVersionId: string | null
  lockedVersionId?: string | null
}>()

const emit = defineEmits<{
  (event: 'toggle-compare', versionId: string): void
  (event: 'focus-version', versionId: string): void
  (event: 'select-version', versionId: string): void
  (event: 'delete-version', versionId: string): void
}>()

const compareVersionSet = computed(() => new Set(props.compareVersionIds))

function formatVersionLabel(version: ScheduleVersionSummary) {
  return version.name ?? `V${version.versionNo}`
}

function isLockedOut(versionId: string) {
  return !!props.lockedVersionId && versionId !== props.lockedVersionId
}

function getCompareActionState(version: ScheduleVersionSummary) {
  if (version.id === props.focusedVersionId) {
    return {
      label: '현재 보는 안',
      disabled: true,
    }
  }

  return {
    label: compareVersionSet.value.has(version.id) ? '비교에서 제거' : '비교에 추가',
    disabled: false,
  }
}

function canDeleteVersion(version: ScheduleVersionSummary) {
  return version.id !== props.focusedVersionId
    && version.id !== props.lockedVersionId
    && !version.isFinalized
    && version.status !== 'solving'
    && !version.activeSolverExecutionId
}

function handleDeleteVersion(version: ScheduleVersionSummary) {
  if (!canDeleteVersion(version)) {
    return
  }

  emit('delete-version', version.id)
}
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4">
    <div class="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">
          비교 후보
        </h3>
        <p class="text-xs text-slate-500">
          여러 안을 골라 비교하고, 하나를 자세히 보거나 기준안으로 사용할 수 있습니다.
        </p>
      </div>
      <p class="text-xs text-slate-500">
        {{ versions.length }}개 버전
      </p>
    </div>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="version in versions"
        :key="version.id"
        class="relative rounded-xl border border-slate-200 bg-slate-50 p-4"
        :class="version.id === focusedVersionId ? 'ring-2 ring-sky-100' : ''"
      >
        <n-tooltip
          v-if="canDeleteVersion(version)"
          trigger="hover"
        >
          <template #trigger>
            <button
              type="button"
              aria-label="이 안 삭제"
              :data-test="`delete-version-${version.id}`"
              class="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-base font-bold leading-none text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
              @click.stop="handleDeleteVersion(version)"
            >
              <span aria-hidden="true">×</span>
            </button>
          </template>
          <span>이 안 삭제</span>
        </n-tooltip>

        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span class="text-sm font-semibold text-slate-900">
            {{ formatVersionLabel(version) }}
          </span>
          <span
            v-if="version.id === selectedVersionId"
            class="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
          >
            현재 기준안
          </span>
          <span
            v-if="compareVersionSet.has(version.id)"
            :data-test="`compare-badge-${version.id}`"
            class="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700"
          >
            비교 중
          </span>
          <span
            v-if="version.id === focusedVersionId"
            class="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700"
          >
            지금 자세히 보는 안
          </span>
          <span
            v-if="version.id === lockedVersionId"
            :data-test="`locked-${version.id}`"
            class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700"
          >
            잠김
          </span>
        </div>

        <div class="space-y-1 text-xs text-slate-600">
          <p>
            상태: {{ formatScheduleVersionStatus(version.status) }}
          </p>
          <p>
            수정 {{ version.manualEditCount ?? 0 }}회
          </p>
          <p v-if="version.inputDiffSummary?.note">
            변경 메모: {{ version.inputDiffSummary.note }}
          </p>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            :data-test="`compare-${version.id}`"
            :disabled="isLockedOut(version.id) || getCompareActionState(version).disabled"
            @click="emit('toggle-compare', version.id)"
          >
            {{ getCompareActionState(version).label }}
          </button>

          <button
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            :data-test="`focus-${version.id}`"
            :disabled="isLockedOut(version.id) || version.id === focusedVersionId"
            @click="emit('focus-version', version.id)"
          >
            이 안 자세히 보기
          </button>

          <button
            type="button"
            class="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            :data-test="`select-${version.id}`"
            :disabled="isLockedOut(version.id) || version.id === selectedVersionId"
            @click="emit('select-version', version.id)"
          >
            이 안을 기준안으로 사용
          </button>
        </div>
      </article>
    </div>
  </section>
</template>
