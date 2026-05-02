<template>
  <section
    data-test="employee-request-list"
    class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
  >
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">
          요청 목록
        </h3>
        <p class="text-xs text-slate-500">
          현재 선택한 근무자의 요청을 확인하고 수정할 수 있습니다.
        </p>
      </div>
      <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        {{ rows.length }}건
      </span>
    </div>

    <div
      v-if="rows.length === 0"
      data-test="empty-request-list"
      class="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500"
    >
      아직 이 근무자의 요청이 없습니다.
    </div>

    <ul
      v-else
      class="mt-4 space-y-3"
    >
      <li
        v-for="row in rows"
        :key="row.requestKey"
        :data-test="`request-row-${row.requestKey}`"
      >
        <article class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 space-y-2">
              <p class="text-sm font-semibold text-slate-900">
                {{ formatDateSummary(row.dates) }}
              </p>
              <div class="flex flex-wrap items-center gap-2">
                <n-tag
                  size="small"
                  round
                  :bordered="false"
                >
                  {{ getRequestLabel(row) }}
                </n-tag>
                <n-tag
                  size="small"
                  round
                  :bordered="false"
                  :type="getStatusMeta(row.status).type"
                >
                  {{ getStatusMeta(row.status).label }}
                </n-tag>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-1">
              <n-button
                text
                size="small"
                :data-test="`edit-request-${row.requestKey}`"
                @click="emit('edit-request', row.requestKey)"
              >
                수정
              </n-button>
              <n-button
                text
                size="small"
                type="error"
                :data-test="`delete-request-${row.requestKey}`"
                @click="emit('delete-request', row.requestKey)"
              >
                삭제
              </n-button>
            </div>
          </div>

          <p
            :data-test="`request-note-${row.requestKey}`"
            class="mt-3 text-sm leading-6 text-slate-600"
          >
            {{ row.note.trim() || '메모 없음' }}
          </p>

          <p
            v-if="shouldShowRejectionReason(row)"
            :data-test="`request-rejection-${row.requestKey}`"
            class="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {{ row.policyRejectionReason }}
          </p>
        </article>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { NButton, NTag, type TagProps } from 'naive-ui';

type EmployeeRequestRowStatus =
  | 'local-pending'
  | 'persisted'
  | 'policy-checking'
  | 'policy-rejected';

interface EmployeeRequestRowVM {
  requestKey: string;
  employeeId: string;
  dates: string[];
  requestTypeId: 'off';
  requestCode: 'O';
  note: string;
  status: EmployeeRequestRowStatus;
  policyRejectionReason: string | null;
}

interface Props {
  rows: EmployeeRequestRowVM[];
}

interface Emits {
  (e: 'edit-request', requestKey: string): void;
  (e: 'delete-request', requestKey: string): void;
}

interface StatusMeta {
  label: string;
  type: TagProps['type'];
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const statusMetaMap: Record<EmployeeRequestRowStatus, StatusMeta> = {
  'local-pending': {
    label: '저장 전',
    type: 'warning',
  },
  persisted: {
    label: '저장됨',
    type: 'success',
  },
  'policy-checking': {
    label: '정책 확인 중',
    type: 'info',
  },
  'policy-rejected': {
    label: '정책 거부',
    type: 'error',
  },
};

function formatDateSummary(dates: string[]): string {
  return [...dates].sort().map(formatDateLabel).join(', ');
}

function formatDateLabel(date: string): string {
  const [, month, day] = date.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

function getRequestLabel(row: EmployeeRequestRowVM): string {
  if (row.requestTypeId === 'off') {
    return `휴무 요청 (${row.requestCode})`;
  }

  return row.requestCode;
}

function getStatusMeta(status: EmployeeRequestRowStatus): StatusMeta {
  return statusMetaMap[status];
}

function shouldShowRejectionReason(row: EmployeeRequestRowVM): boolean {
  if (row.status !== 'policy-rejected') {
    return false;
  }

  return Boolean(row.policyRejectionReason?.trim());
}
</script>
