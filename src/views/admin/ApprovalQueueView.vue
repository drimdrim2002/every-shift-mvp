<template>
  <AppContainer>
    <n-card>
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-900">
              관리자 가입 승인
            </h1>
            <p class="mt-1 text-sm text-slate-500">
              대기 중인 관리자 가입 신청만 검토합니다.
            </p>
          </div>
          <div class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Pending Admin Requests
          </div>
        </div>
      </template>

      <div class="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-700">
              승인 대기 목록
            </h2>
            <span class="text-xs text-slate-500">
              {{ approvalStore.items.length }}건
            </span>
          </div>

          <div
            v-if="approvalStore.loadingQueue"
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500"
          >
            <n-spin size="small" />
            <p class="mt-3">
              승인 요청을 불러오는 중입니다.
            </p>
          </div>

          <div
            v-else-if="approvalStore.items.length === 0"
            class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500"
          >
            <n-empty description="대기 중인 관리자 가입 요청이 없습니다." />
          </div>

          <div
            v-else
            class="space-y-3"
          >
            <button
              v-for="item in approvalStore.items"
              :key="item.signupRequestId"
              type="button"
              class="w-full rounded-2xl border p-4 text-left transition"
              :class="item.signupRequestId === approvalStore.selectedRequestId
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300'"
              :data-test="`approval-queue-item-${item.signupRequestId}`"
              @click="handleSelect(item.signupRequestId)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-900">
                    {{ item.requesterName || item.requesterEmail || item.requesterUserId || '신청자 정보 없음' }}
                  </p>
                  <p class="mt-1 truncate text-xs text-slate-500">
                    이메일: {{ item.requesterEmail || '-' }}
                  </p>
                  <p class="mt-1 truncate text-xs text-slate-500">
                    조직: {{ item.organizationName || item.organizationId || '미확인' }}
                  </p>
                </div>
                <span class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                  {{ formatStatus(item.status) }}
                </span>
              </div>

              <div class="mt-3 text-xs text-slate-500">
                요청 ID: {{ item.signupRequestId }}
              </div>
              <div class="mt-1 text-xs text-slate-400">
                접수 시각: {{ item.createdAt }}
              </div>
            </button>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
          <div
            v-if="approvalStore.loadingDetail"
            class="py-16 text-center text-sm text-slate-500"
          >
            상세 정보를 불러오는 중입니다.
          </div>

          <div
            v-else-if="!approvalStore.selectedRequest"
            class="py-16 text-center text-sm text-slate-500"
          >
            왼쪽 목록에서 승인 요청을 선택하세요.
          </div>

          <div
            v-else
            class="space-y-6"
          >
            <div class="border-b border-slate-200 pb-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-medium text-slate-500">
                    관리자 가입 요청
                  </p>
                  <h2 class="mt-1 text-xl font-semibold text-slate-900">
                    {{ resolveRequestTitle(approvalStore.selectedRequest) }}
                  </h2>
                </div>
                <span class="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                  {{ formatStatus(approvalStore.selectedRequest.status) }}
                </span>
              </div>
            </div>

            <dl class="grid gap-4 sm:grid-cols-2">
              <div
                class="rounded-2xl bg-white p-4"
                data-test="approval-detail-requester-name"
              >
                <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">
                  신청자 이름
                </dt>
                <dd class="mt-2 text-sm text-slate-700">
                  {{ approvalStore.selectedRequest.requesterName || approvalStore.selectedRequest.requesterUserId || '정보 없음' }}
                </dd>
              </div>
              <div
                class="rounded-2xl bg-white p-4"
                data-test="approval-detail-email"
              >
                <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">
                  이메일
                </dt>
                <dd class="mt-2 text-sm text-slate-700">
                  {{ approvalStore.selectedRequest.requesterEmail || '-' }}
                </dd>
              </div>
              <div
                class="rounded-2xl bg-white p-4"
                data-test="approval-detail-hospital"
              >
                <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">
                  신청 병원
                </dt>
                <dd class="mt-2 text-sm text-slate-700">
                  {{ resolveRequestedHospitalName(approvalStore.selectedRequest) }}
                </dd>
              </div>
              <div
                v-if="shouldShowOrganization(approvalStore.selectedRequest)"
                class="rounded-2xl bg-white p-4"
                data-test="approval-detail-organization"
              >
                <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">
                  조직
                </dt>
                <dd class="mt-2 text-sm text-slate-700">
                  {{ resolveOrganizationName(approvalStore.selectedRequest) }}
                </dd>
              </div>
            </dl>

            <div class="space-y-2">
              <label
                for="approval-review-note"
                class="text-sm font-semibold text-slate-700"
              >
                검토 메모
              </label>
              <n-input
                id="approval-review-note"
                v-model:value="reviewNote"
                data-test="approval-review-note"
                type="textarea"
                placeholder="필요한 경우 승인/반려 메모를 남기세요."
                :autosize="{ minRows: 4, maxRows: 6 }"
              />
            </div>

            <div class="flex flex-wrap justify-end gap-3">
              <n-button
                data-test="approval-reject"
                tertiary
                type="error"
                :loading="approvalStore.submittingDecision"
                :disabled="!approvalStore.selectedRequestId"
                @click="handleDecision('reject')"
              >
                반려
              </n-button>
              <n-button
                data-test="approval-approve"
                type="primary"
                :loading="approvalStore.submittingDecision"
                :disabled="!approvalStore.selectedRequestId"
                @click="handleDecision('approve')"
              >
                승인
              </n-button>
            </div>
          </div>
        </section>
      </div>
    </n-card>
  </AppContainer>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCard, NEmpty, NInput, NSpin } from 'naive-ui'
import AppContainer from '@/components/layout/AppContainer.vue'
import { showError, showSuccess } from '@/utils/message'
import { useApprovalStore } from '@/stores/approval'
import { useRbacStore } from '@/stores/rbac'
import type {
  ApprovalDecision,
  ApprovalQueueFilters,
  ApprovalRequestDetail,
  ApprovalRequestStatus,
} from '@/types/approval'

const router = useRouter()
const rbacStore = useRbacStore()
const approvalStore = useApprovalStore()

const reviewNote = ref('')

function formatStatus(status: ApprovalRequestStatus) {
  switch (status) {
    case 'approved':
      return '승인'
    case 'rejected':
      return '반려'
    case 'expired':
      return '만료'
    case 'withdrawn':
      return '철회'
    case 'pending':
    default:
      return '대기 중'
  }
}

function getDecisionMessage(decision: ApprovalDecision) {
  return decision === 'approve' ? '가입 요청을 승인했습니다.' : '가입 요청을 반려했습니다.'
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '승인 요청 처리 중 오류가 발생했습니다.'
}

function resolveRequestedHospitalName(request: ApprovalRequestDetail | null) {
  return request?.requestedHospitalName?.trim() || '-'
}

function resolveOrganizationName(request: ApprovalRequestDetail | null) {
  return request?.organizationName?.trim() || request?.organizationId || '정보 없음'
}

function resolveRequestTitle(request: ApprovalRequestDetail | null) {
  return request?.requestedHospitalName?.trim()
    || request?.organizationName?.trim()
    || request?.organizationId
    || '조직 미상'
}

function shouldShowOrganization(request: ApprovalRequestDetail | null) {
  return !request?.requestedHospitalName?.trim()
}

async function handleSelect(signupRequestId: string) {
  try {
    await approvalStore.selectRequest(signupRequestId)
  } catch (error) {
    showError(getErrorMessage(error))
  }
}

async function handleDecision(decision: ApprovalDecision) {
  if (!approvalStore.selectedRequestId) {
    return
  }

  try {
    await approvalStore.submitDecision({
      signupRequestId: approvalStore.selectedRequestId,
      decision,
      reviewNote: reviewNote.value.trim() || undefined,
    })
    showSuccess(getDecisionMessage(decision))
  } catch (error) {
    showError(getErrorMessage(error))
  }
}

function buildQueueFilters(): ApprovalQueueFilters {
  const organizationId = rbacStore.selectedOrganizationId?.trim() || undefined
  return organizationId
    ? { status: 'pending', organizationId }
    : { status: 'pending' }
}

async function loadApprovalQueue() {
  try {
    await approvalStore.loadQueue(buildQueueFilters())
  } catch (error) {
    showError(getErrorMessage(error))
  }
}

watch(
  () => approvalStore.selectedRequest?.signupRequestId,
  () => {
    reviewNote.value = approvalStore.selectedRequest?.reviewNote ?? ''
  },
  { immediate: true },
)

watch(
  () => rbacStore.selectedOrganizationId,
  async (nextOrganizationId, previousOrganizationId) => {
    if (rbacStore.accessState !== 'super_active' || nextOrganizationId === previousOrganizationId) {
      return
    }

    await loadApprovalQueue()
  },
)

onMounted(async () => {
  if (rbacStore.accessState !== 'super_active') {
    await router.replace('/')
    return
  }

  await loadApprovalQueue()
})
</script>
