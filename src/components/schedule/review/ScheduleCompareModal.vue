<script setup lang="ts">
import { NAlert, NButton, NModal, NSpin } from 'naive-ui';
import ComparisonWorkspace from '@/components/schedule/review/ComparisonWorkspace.vue';
import VersionCandidateShelf from '@/components/schedule/review/VersionCandidateShelf.vue';
import type { ScheduleReviewResponse, ScheduleVersionSummary } from '@/types/schedule';

defineProps<{
  show: boolean;
  versions: ScheduleVersionSummary[];
  compareVersionIds: string[];
  focusedVersionId: string | null;
  selectedVersionId: string | null;
  lockedVersionId: string | null;
  leftVersion: ScheduleVersionSummary | null;
  rightVersion: ScheduleVersionSummary | null;
  leftReview: ScheduleReviewResponse | null;
  rightReview: ScheduleReviewResponse | null;
  loading?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  (event: 'update:show', value: boolean): void;
  (event: 'toggle-compare', versionId: string): void;
  (event: 'focus-version', versionId: string): void;
  (event: 'select-version', versionId: string): void;
  (event: 'delete-version', versionId: string): void;
  (event: 'request-edit'): void;
  (event: 'retry'): void;
}>();
</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    class="w-[min(1180px,calc(100vw-48px))] max-sm:h-screen max-sm:w-screen"
    :mask-closable="true"
    @update:show="emit('update:show', $event)"
  >
    <template #header>
      근무표안 비교
    </template>

    <div
      data-test="schedule-compare-modal"
      class="max-h-[calc(100vh-120px)] overflow-y-auto pr-1"
    >
      <p class="mb-5 text-sm leading-6 text-slate-600">
        Off 요청 차이와 필수 기준 충족 여부를 비교한 뒤 필요한 근무표안을 자세히 확인하세요.
      </p>

      <div
        v-if="loading"
        data-test="compare-modal-loading"
        class="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500"
      >
        <n-spin size="large" />
        <p class="mt-3">
          비교할 근무표안 정보를 불러오는 중입니다.
        </p>
      </div>

      <n-alert
        v-else-if="errorMessage"
        type="error"
        data-test="compare-modal-error"
      >
        <template #header>
          근무표안 비교를 불러오지 못했습니다
        </template>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm">
            {{ errorMessage }}
          </p>
          <n-button
            size="small"
            @click="emit('retry')"
          >
            다시 시도
          </n-button>
        </div>
      </n-alert>

      <div
        v-else-if="versions.length <= 1"
        data-test="compare-modal-empty"
        class="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center"
      >
        <h3 class="text-base font-semibold text-slate-900">
          비교할 다른 근무표안이 없습니다
        </h3>
        <p class="mt-2 text-sm text-slate-600">
          Off 요청을 수정해 새 근무표안을 만들면 여기에서 나란히 비교할 수 있습니다.
        </p>
        <n-button
          class="mt-5"
          type="primary"
          @click="emit('request-edit')"
        >
          요청 수정해서 새 근무표안 만들기
        </n-button>
      </div>

      <div
        v-else
        class="space-y-5"
      >
        <ComparisonWorkspace
          :left-version="leftVersion"
          :right-version="rightVersion"
          :left-review="leftReview"
          :right-review="rightReview"
          :focused-version-id="focusedVersionId"
          @focus-version="emit('focus-version', $event)"
        />

        <section
          data-test="comparison-candidate-shelf-section"
          class="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div class="mb-3">
            <h3 class="text-sm font-semibold text-slate-900">
              비교 대상 변경
            </h3>
            <p class="mt-1 text-sm text-slate-600">
              다른 근무표안을 비교하려면 아래 후보를 선택하세요.
            </p>
          </div>

          <VersionCandidateShelf
            :versions="versions"
            :compare-version-ids="compareVersionIds"
            :focused-version-id="focusedVersionId"
            :selected-version-id="selectedVersionId"
            :locked-version-id="lockedVersionId"
            @toggle-compare="emit('toggle-compare', $event)"
            @focus-version="emit('focus-version', $event)"
            @select-version="emit('select-version', $event)"
            @delete-version="emit('delete-version', $event)"
          />
        </section>
      </div>
    </div>
  </n-modal>
</template>
