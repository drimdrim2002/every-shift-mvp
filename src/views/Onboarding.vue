<template>
  <div class="min-h-screen bg-slate-50 px-4 py-10">
    <div class="mx-auto max-w-6xl">
      <n-card
        :bordered="false"
        class="rounded-3xl shadow-sm"
      >
        <div class="space-y-8">
          <div class="space-y-3">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              신규 조직 온보딩
            </p>
            <div class="space-y-2">
              <h1 class="text-3xl font-bold text-slate-900">
                EveryShift 시작 준비를 함께 완료해볼까요?
              </h1>
              <p class="max-w-3xl text-base leading-7 text-slate-600">
                조직 설정, 첫 직원 등록, 첫 스케줄 요청까지 완료하면 관리자 대시보드로 이동합니다.
              </p>
            </div>
          </div>

          <div
            v-if="isInitializing"
            class="flex min-h-[320px] items-center justify-center"
          >
            <div class="space-y-4 text-center">
              <n-spin size="large" />
              <p class="text-sm text-slate-500">
                온보딩 상태를 불러오는 중입니다...
              </p>
            </div>
          </div>

          <n-alert
            v-else-if="loadErrorState"
            type="error"
            :title="loadErrorTitle"
          >
            <div class="space-y-3">
              <p>{{ loadErrorState.message }}</p>
              <n-button
                size="small"
                secondary
                @click="initializePage"
              >
                다시 시도
              </n-button>
            </div>
          </n-alert>

          <template v-else>
            <template v-if="showCompletionState">
              <div class="rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-12 text-center">
                <div class="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white">
                  ✓
                </div>
                <p class="text-sm font-semibold tracking-[0.2em] text-emerald-700">
                  온보딩 완료
                </p>
                <h2 class="mt-3 text-3xl font-bold text-slate-900">
                  이제 EveryShift를 사용할 준비가 되었습니다!
                </h2>
                <p class="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  온보딩이 완료되어 관리자 대시보드로 이동합니다.
                </p>
                <div class="mt-8">
                  <n-button
                    type="primary"
                    size="large"
                    @click="handleGoToDashboard"
                  >
                    대시보드로 이동
                  </n-button>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="grid gap-3 md:grid-cols-3">
                <div
                  v-for="step in onboardingSteps"
                  :key="step.key"
                  :class="getProgressCardClass(step.key)"
                  class="rounded-2xl border p-4 transition-colors"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-slate-500">
                        {{ step.label }}
                      </p>
                      <h2 class="mt-1 text-lg font-semibold text-slate-900">
                        {{ step.title }}
                      </h2>
                    </div>
                    <n-tag
                      :type="getStepStatusTagType(step.key)"
                      round
                    >
                      {{ getStepStatusLabel(step.key) }}
                    </n-tag>
                  </div>
                </div>
              </div>

              <section
                v-for="step in onboardingSteps"
                :key="step.key"
                :class="getStepCardClass(step.key)"
                class="rounded-3xl border p-6 transition-colors"
              >
                <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div class="max-w-3xl space-y-2">
                    <div class="flex flex-wrap items-center gap-3">
                      <p class="text-sm font-semibold text-slate-500">
                        {{ step.label }}
                      </p>
                      <n-tag
                        :type="getStepStatusTagType(step.key)"
                        size="small"
                        round
                      >
                        {{ getStepStatusLabel(step.key) }}
                      </n-tag>
                    </div>
                    <h3 class="text-2xl font-semibold text-slate-900">
                      {{ step.title }}
                    </h3>
                    <p class="text-base leading-7 text-slate-600">
                      {{ step.body }}
                    </p>
                  </div>
                  <n-button
                    v-if="getStepStatus(step.key) === 'current' && step.key === 'organization_info'"
                    type="primary"
                    :loading="isConfirmingOrganizationInfo"
                    :disabled="!canConfirmOrganizationInfo"
                    @click="handleConfirmOrganizationInfo"
                  >
                    조직 정보 확인하기
                  </n-button>
                </div>

                <ul class="mt-5 space-y-2 text-sm leading-6 text-slate-600">
                  <li
                    v-for="item in step.checklist"
                    :key="item"
                    class="flex gap-2"
                  >
                    <span class="mt-0.5 text-sky-600">•</span>
                    <span>{{ item }}</span>
                  </li>
                </ul>

                <div
                  v-if="getStepStatus(step.key) === 'complete'"
                  class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                >
                  <p class="text-sm font-medium text-emerald-800">
                    {{ step.completedMessage }}
                  </p>
                  <p class="mt-1 text-sm text-emerald-700">
                    {{ step.nextNudge }}
                  </p>
                </div>

                <template v-if="getStepStatus(step.key) === 'current'">
                  <div
                    v-if="step.key === 'organization_info'"
                    class="mt-6 space-y-6"
                  >
                    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <div class="space-y-4">
                        <div class="rounded-2xl border border-slate-200 bg-white p-4">
                          <div class="flex items-center justify-between gap-4">
                            <div>
                              <p class="text-sm font-medium text-slate-500">
                                조직 정보
                              </p>
                              <h4 class="mt-1 text-lg font-semibold text-slate-900">
                                {{ orgStore.current?.name || '조직 정보를 불러오는 중' }}
                              </h4>
                            </div>
                            <n-tag
                              round
                              type="info"
                            >
                              {{ getOrganizationTypeLabel(orgStore.current?.type) }}
                            </n-tag>
                          </div>
                        </div>

                        <div class="rounded-2xl border border-slate-200 bg-white p-4">
                          <div class="flex items-center justify-between gap-4">
                            <div>
                              <p class="text-sm font-medium text-slate-500">
                                운영 기준
                              </p>
                              <p class="mt-1 text-sm leading-6 text-slate-600">
                                {{
                                  masterStore.settings
                                    ? '현재 저장된 운영 기준을 확인하고 그대로 시작합니다.'
                                    : '운영 기준이 아직 없어서 기본값(주 40시간, 최대 52시간, 주 2회 휴무)으로 저장합니다.'
                                }}
                              </p>
                            </div>
                            <n-tag
                              round
                              :type="masterStore.settings ? 'success' : 'warning'"
                            >
                              {{ masterStore.settings ? '저장됨' : '기본값 저장 예정' }}
                            </n-tag>
                          </div>
                        </div>

                        <div class="rounded-2xl border border-slate-200 bg-white p-4">
                          <div class="mb-4 flex items-center justify-between gap-4">
                            <div>
                              <p class="text-sm font-medium text-slate-500">
                                시프트 설정
                              </p>
                              <p class="mt-1 text-sm text-slate-600">
                                시간 정보가 있는 시프트를 최소 1개 이상 준비해야 합니다.
                              </p>
                            </div>
                            <n-button
                              type="primary"
                              secondary
                              size="small"
                              @click="handleAddShift"
                            >
                              + 시프트 추가
                            </n-button>
                          </div>

                          <n-alert
                            v-if="shiftsWithTime.length === 0"
                            type="warning"
                            class="mb-4"
                          >
                            시간 정보가 있는 시프트가 아직 없습니다.
                          </n-alert>

                          <n-data-table
                            v-if="shiftsWithTime.length > 0"
                            :columns="shiftColumns"
                            :data="shiftsWithTime"
                            :bordered="false"
                            :pagination="false"
                          />
                        </div>

                        <div class="rounded-2xl border border-slate-200 bg-white p-4">
                          <div class="mb-4 flex flex-wrap items-end justify-between gap-4">
                            <div>
                              <p class="text-sm font-medium text-slate-500">
                                사이트 설정
                              </p>
                              <p class="mt-1 text-sm text-slate-600">
                                최소 1개 이상의 근무 사이트가 필요합니다.
                              </p>
                            </div>
                            <div class="flex flex-wrap gap-2">
                              <n-input
                                v-model:value="siteForm.code"
                                placeholder="코드 예: MAIN"
                                class="w-32"
                              />
                              <n-input
                                v-model:value="siteForm.name"
                                placeholder="사이트명 예: 본원"
                                class="w-40"
                              />
                              <n-button
                                type="primary"
                                secondary
                                :loading="isSavingSite"
                                @click="handleCreateSite"
                              >
                                사이트 추가
                              </n-button>
                            </div>
                          </div>

                          <div
                            v-if="masterStore.sites.length === 0"
                            class="rounded-2xl bg-slate-50 px-4 py-5"
                          >
                            <p class="text-sm text-slate-500">
                              등록된 사이트가 없습니다. 첫 번째 사이트를 추가해주세요.
                            </p>
                          </div>

                          <div
                            v-else
                            class="space-y-3"
                          >
                            <div
                              v-for="site in masterStore.sites"
                              :key="site.id"
                              class="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
                            >
                              <div>
                                <p class="text-sm font-semibold text-slate-900">
                                  {{ site.name }}
                                </p>
                                <p class="text-xs uppercase tracking-[0.16em] text-slate-500">
                                  {{ site.code }}
                                </p>
                              </div>
                              <n-popconfirm @positive-click="handleDeleteSite(site.id)">
                                <template #trigger>
                                  <n-button
                                    text
                                    type="error"
                                  >
                                    삭제
                                  </n-button>
                                </template>
                                이 사이트를 삭제하시겠습니까?
                              </n-popconfirm>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div class="rounded-3xl border border-sky-200 bg-sky-50 p-5">
                        <p class="text-sm font-semibold text-sky-700">
                          완료 조건
                        </p>
                        <div class="mt-4 space-y-3">
                          <div class="flex items-center justify-between gap-3">
                            <span class="text-sm text-slate-700">조직 정보 확인</span>
                            <n-tag
                              :type="orgStore.current ? 'success' : 'warning'"
                              round
                            >
                              {{ orgStore.current ? '완료' : '대기' }}
                            </n-tag>
                          </div>
                          <div class="flex items-center justify-between gap-3">
                            <span class="text-sm text-slate-700">시간 정보 시프트</span>
                            <n-tag
                              :type="shiftsWithTime.length > 0 ? 'success' : 'warning'"
                              round
                            >
                              {{ shiftsWithTime.length > 0 ? `${shiftsWithTime.length}개` : '필수' }}
                            </n-tag>
                          </div>
                          <div class="flex items-center justify-between gap-3">
                            <span class="text-sm text-slate-700">사이트</span>
                            <n-tag
                              :type="masterStore.sites.length > 0 ? 'success' : 'warning'"
                              round
                            >
                              {{ masterStore.sites.length > 0 ? `${masterStore.sites.length}개` : '필수' }}
                            </n-tag>
                          </div>
                          <div class="flex items-center justify-between gap-3">
                            <span class="text-sm text-slate-700">운영 기준</span>
                            <n-tag
                              :type="masterStore.settings ? 'success' : 'info'"
                              round
                            >
                              {{ masterStore.settings ? '저장됨' : '기본값 저장 예정' }}
                            </n-tag>
                          </div>
                        </div>
                        <p class="mt-5 text-sm leading-6 text-slate-600">
                          모든 조건이 갖춰지면 확인 버튼으로 Step 1을 완료하고 다음 단계로 넘어갑니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    v-else-if="step.key === 'employee_seed'"
                    class="mt-6 space-y-4"
                  >
                    <n-alert
                      type="info"
                      title="직원 등록 방식 선택"
                    >
                      직원은 직접 입력하거나 엑셀 업로드 방식으로 등록할 수 있습니다. 저장 후에는 온보딩으로 돌아와 다음 단계를 진행하세요.
                    </n-alert>
                    <div class="flex flex-wrap gap-3">
                      <n-button
                        type="primary"
                        size="large"
                        @click="handleEmployeeSeedEntry('manual')"
                      >
                        직원 등록하러 가기
                      </n-button>
                      <n-button
                        size="large"
                        secondary
                        @click="handleEmployeeSeedEntry('excel')"
                      >
                        엑셀 업로드로 시작
                      </n-button>
                    </div>
                  </div>

                  <div
                    v-else
                    class="mt-6 space-y-4"
                  >
                    <n-alert
                      type="info"
                      title="첫 스케줄 요청 시작"
                    >
                      계획월을 선택하는 모달을 바로 열어 현재 앱의 첫 스케줄 생성 흐름으로 연결합니다.
                    </n-alert>
                    <div class="flex flex-wrap gap-3">
                      <n-button
                        type="primary"
                        size="large"
                        @click="handleScheduleRequestEntry"
                      >
                        첫 스케줄 요청 시작하기
                      </n-button>
                    </div>
                  </div>
                </template>
              </section>
            </template>
          </template>
        </div>
      </n-card>
    </div>

    <ShiftManager
      v-model:visible="showShiftModal"
      :editing-shift="editingShift"
      @confirm="handleShiftConfirm"
      @cancel="handleShiftCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NInput,
  NPopconfirm,
  NSpin,
  NTag,
  type DataTableColumns,
} from 'naive-ui'
import ShiftManager from '@/components/schedule/ShiftManager.vue'
import { OnboardingProgressApiError } from '@/api/onboarding'
import { createShift, deleteShift, updateShift } from '@/api/shift'
import {
  ADMIN_DASHBOARD_ROUTE_PATH,
  resolvePostAuthRedirectPath,
} from '@/constants/routes'
import { useOrganizationMasterStore } from '@/stores/organization-master'
import { useOrganizationStore } from '@/stores/organization'
import { useOnboardingStore } from '@/stores/onboarding'
import { useRbacStore } from '@/stores/rbac'
import type { OrganizationType } from '@/types/organization'
import type { Shift } from '@/types/shift'
import type { Site } from '@/types/site'
import type { OnboardingStepKey } from '@/types/onboarding'
import { showError, showSuccess, showWarning } from '@/utils/message'
import { buildOnboardingQuery, resolveOnboardingRouteContext } from '@/utils/onboarding-context'

interface StepDefinition {
  key: OnboardingStepKey
  label: string
  title: string
  body: string
  checklist: string[]
  completedMessage: string
  nextNudge: string
}

interface LoadErrorState {
  kind: 'progress' | 'organization'
  message: string
}

const DEFAULT_SETTINGS = {
  maxConsecutiveNightShifts: 3,
  minimumRestHours: { D: 24, E: 24, N: 36 },
  workConstraints: { weeklyTargetHours: 40, weeklyMaxHours: 52, weeklyOffDays: 2 },
}

const route = useRoute()
const router = useRouter()
const rbacStore = useRbacStore()
const onboardingStore = useOnboardingStore()
const orgStore = useOrganizationStore()
const masterStore = useOrganizationMasterStore()

const isInitializing = ref(true)
const loadErrorState = ref<LoadErrorState | null>(null)
const isConfirmingOrganizationInfo = ref(false)
const isSavingSite = ref(false)
const showShiftModal = ref(false)
const editingShift = ref<Shift | null>(null)
const siteForm = ref({
  code: '',
  name: '',
})

const onboardingSteps: StepDefinition[] = [
  {
    key: 'organization_info',
    label: '1단계',
    title: '조직 정보와 운영 기준을 확인하세요',
    body: '회원가입 때 입력한 조직 정보를 바탕으로 근무 유형과 주요 사이트를 확인하고, 스케줄 생성에 필요한 기본 설정을 마무리합니다.',
    checklist: [
      '조직 이름과 조직 유형을 확인합니다.',
      '근무 유형 또는 시프트 운영 방식을 확인합니다.',
      '최소 1개 이상의 근무 사이트를 확인하거나 추가합니다.',
    ],
    completedMessage: '조직 기본 설정이 준비되었습니다.',
    nextNudge: '이제 첫 직원을 등록해 스케줄링 준비를 이어가세요.',
  },
  {
    key: 'employee_seed',
    label: '2단계',
    title: '첫 직원을 등록하세요',
    body: '근무표를 만들기 전에 스케줄에 포함할 직원을 최소 1명 이상 준비해야 합니다. 직접 입력하거나 엑셀 업로드 방식으로 시작할 수 있습니다.',
    checklist: [
      '근무자 이름과 식별 정보를 등록합니다.',
      '직급, 전문 분야, 근무 가능 시프트를 설정합니다.',
      '스케줄에 포함할 수 있는 직원이 최소 1명 이상 준비되었는지 확인합니다.',
    ],
    completedMessage: '첫 직원 등록이 완료되었습니다.',
    nextNudge: '이제 첫 스케줄 요청을 시작해 보세요.',
  },
  {
    key: 'schedule_request',
    label: '3단계',
    title: '첫 스케줄 요청을 시작하세요',
    body: '템플릿을 확인하고 초기 데이터를 입력해 첫 근무표 생성을 시작합니다. 이 단계는 실제 스케줄 생성 워크플로우를 시작하면 완료됩니다.',
    checklist: [
      '계획 월과 기본 스케줄 정보를 확인합니다.',
      '필요하면 템플릿 또는 예시 데이터를 참고합니다.',
      '첫 스케줄 생성 요청을 시작합니다.',
    ],
    completedMessage: '첫 스케줄 요청이 시작되었습니다.',
    nextNudge: '이제 EveryShift를 사용할 준비가 되었습니다.',
  },
]

const routeContext = computed(() => resolveOnboardingRouteContext(route.query))
const activeOrganizationId = computed(
  () => rbacStore.effectiveMembership?.organizationId ?? onboardingStore.organizationId ?? null,
)
const shiftsWithTime = computed(() =>
  orgStore.shifts.filter((shift) => shift.startTime !== null && shift.endTime !== null),
)
const canConfirmOrganizationInfo = computed(
  () => Boolean(orgStore.current) && shiftsWithTime.value.length > 0 && masterStore.sites.length > 0,
)
const showCompletionState = computed(
  () => !isInitializing.value && loadErrorState.value === null && onboardingStore.isOnboardingComplete,
)
const loadErrorTitle = computed(() => {
  if (loadErrorState.value?.kind === 'organization') {
    return '온보딩 화면 정보를 불러오지 못했습니다'
  }

  return '온보딩 상태를 확인하지 못했습니다'
})

const shiftColumns = computed<DataTableColumns<Shift>>(() => [
  {
    title: '코드',
    key: 'code',
    width: 90,
  },
  {
    title: '이름',
    key: 'name',
    width: 140,
  },
  {
    title: '시간',
    key: 'time',
    width: 160,
    render(row) {
      return formatShiftTime(row)
    },
  },
  {
    title: '작업',
    key: 'actions',
    width: 130,
    render(row) {
      return h('div', { class: 'flex gap-2' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            onClick: () => handleEditShift(row),
          },
          { default: () => '수정' },
        ),
        h(
          NPopconfirm,
          {
            onPositiveClick: () => handleDeleteShift(row.id),
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  type: 'error',
                },
                { default: () => '삭제' },
              ),
            default: () => '이 시프트를 삭제하시겠습니까?',
          },
        ),
      ])
    },
  },
])

function getOrganizationTypeLabel(type: OrganizationType | undefined) {
  const labelMap: Record<OrganizationType, string> = {
    hospital: '병원',
    fire: '소방서',
    police: '경찰서',
    logistics: '물류',
    production: '생산',
  }

  if (!type) {
    return '조직'
  }

  return labelMap[type] ?? type
}

function formatShiftTime(shift: Shift) {
  if (!shift.startTime || !shift.endTime) {
    return '-'
  }

  return `${shift.startTime} - ${shift.endTime}`
}

function getStepStatus(stepKey: OnboardingStepKey) {
  if (onboardingStore.completedStepKeys.includes(stepKey)) {
    return 'complete'
  }

  if (onboardingStore.currentStepKey === stepKey) {
    return 'current'
  }

  return 'upcoming'
}

function getStepStatusLabel(stepKey: OnboardingStepKey) {
  const status = getStepStatus(stepKey)
  if (status === 'complete') {
    return '완료'
  }

  if (status === 'current') {
    return '진행 중'
  }

  return '예정'
}

function getStepStatusTagType(stepKey: OnboardingStepKey) {
  const status = getStepStatus(stepKey)
  if (status === 'complete') {
    return 'success'
  }

  if (status === 'current') {
    return 'info'
  }

  return 'default'
}

function getProgressCardClass(stepKey: OnboardingStepKey) {
  const status = getStepStatus(stepKey)
  if (status === 'complete') {
    return 'border-emerald-200 bg-emerald-50'
  }

  if (status === 'current') {
    return 'border-sky-300 bg-sky-50'
  }

  return 'border-slate-200 bg-white'
}

function getStepCardClass(stepKey: OnboardingStepKey) {
  const status = getStepStatus(stepKey)
  if (status === 'complete') {
    return 'border-emerald-200 bg-emerald-50'
  }

  if (status === 'current') {
    return 'border-sky-300 bg-white'
  }

  return 'border-slate-200 bg-slate-50/70'
}

function setLoadError(kind: LoadErrorState['kind'], error: unknown, fallbackMessage: string) {
  loadErrorState.value = {
    kind,
    message: error instanceof Error ? error.message : fallbackMessage,
  }
}

async function initializePage() {
  const organizationId = activeOrganizationId.value
  const accessState = rbacStore.accessState

  if (accessState !== 'admin_active' || !organizationId) {
    await router.replace(resolvePostAuthRedirectPath(accessState))
    return
  }

  isInitializing.value = true
  loadErrorState.value = null

  try {
    try {
      await onboardingStore.loadProgress({
        scope: {
          accessState,
          organizationId,
        },
        force: true,
      })
    } catch (error) {
      console.warn('[Onboarding] Failed to load onboarding progress:', error)
      setLoadError('progress', error, '온보딩 상태를 불러오는 중 오류가 발생했습니다.')
      return
    }

    let organizationResult: Awaited<ReturnType<typeof orgStore.loadOrganization>>
    let settingsResult: Awaited<ReturnType<typeof masterStore.loadSettings>>
    let sitesResult: Awaited<ReturnType<typeof masterStore.loadSites>>

    try {
      ;[organizationResult, settingsResult, sitesResult] = await Promise.all([
        orgStore.loadOrganization(organizationId),
        masterStore.loadSettings(organizationId),
        masterStore.loadSites(organizationId),
      ])
    } catch (error) {
      console.warn('[Onboarding] Failed to load onboarding page data:', error)
      setLoadError('organization', error, '온보딩 화면 정보를 불러오는 중 오류가 발생했습니다.')
      return
    }

    if (!organizationResult.success) {
      setLoadError(
        'organization',
        new Error(organizationResult.error || '조직 정보를 불러오지 못했습니다.'),
        '온보딩 화면 정보를 불러오는 중 오류가 발생했습니다.',
      )
      return
    }

    if (!settingsResult.success) {
      setLoadError(
        'organization',
        new Error(settingsResult.error || '운영 기준을 불러오지 못했습니다.'),
        '온보딩 화면 정보를 불러오는 중 오류가 발생했습니다.',
      )
      return
    }

    if (!sitesResult.success) {
      setLoadError(
        'organization',
        new Error(sitesResult.error || '사이트 목록을 불러오지 못했습니다.'),
        '온보딩 화면 정보를 불러오는 중 오류가 발생했습니다.',
      )
      return
    }

    try {
      if (
        routeContext.value.scheduleStarted &&
        onboardingStore.currentStepKey === 'schedule_request' &&
        !onboardingStore.isOnboardingComplete
      ) {
        await onboardingStore.complete()
      }
    } catch (error) {
      console.warn('[Onboarding] Failed to finalize onboarding completion:', error)
      setLoadError('progress', error, '온보딩 완료 상태를 반영하는 중 오류가 발생했습니다.')
      return
    }
  } finally {
    isInitializing.value = false
  }
}

async function ensureOrganizationDefaults(organizationId: string) {
  if (masterStore.settings) {
    return
  }

  const result = await masterStore.saveSettings(organizationId, DEFAULT_SETTINGS)
  if (!result.success) {
    throw new Error(result.error || '운영 기준 저장에 실패했습니다.')
  }
}

async function handleConfirmOrganizationInfo() {
  if (!activeOrganizationId.value) {
    showError('조직 정보를 확인할 수 없습니다.')
    return
  }

  if (!canConfirmOrganizationInfo.value) {
    showWarning('시프트와 사이트를 먼저 준비해주세요.')
    return
  }

  isConfirmingOrganizationInfo.value = true

  try {
    await ensureOrganizationDefaults(activeOrganizationId.value)
    await onboardingStore.updateStep('organization_info')
    showSuccess('조직 기본 설정이 준비되었습니다.')
  } catch (error) {
    if (error instanceof OnboardingProgressApiError) {
      showError(error.message)
    } else {
      showError(error instanceof Error ? error.message : '조직 정보 확인 중 오류가 발생했습니다.')
    }
  } finally {
    isConfirmingOrganizationInfo.value = false
  }
}

async function handleCreateSite() {
  if (!activeOrganizationId.value) {
    showError('조직 정보를 확인할 수 없습니다.')
    return
  }

  const code = siteForm.value.code.trim().toUpperCase()
  const name = siteForm.value.name.trim()

  if (!code || !name) {
    showWarning('사이트 코드와 이름을 모두 입력해주세요.')
    return
  }

  isSavingSite.value = true

  try {
    const result = await masterStore.addSite(activeOrganizationId.value, {
      code,
      name,
    })

    if (!result.success) {
      throw new Error(result.error || '사이트 생성에 실패했습니다.')
    }

    siteForm.value = { code: '', name: '' }
    showSuccess('사이트가 추가되었습니다.')
  } catch (error) {
    showError(error instanceof Error ? error.message : '사이트 추가 중 오류가 발생했습니다.')
  } finally {
    isSavingSite.value = false
  }
}

async function handleDeleteSite(siteId: Site['id']) {
  try {
    const result = await masterStore.removeSite(siteId)
    if (!result.success) {
      throw new Error(result.error || '사이트 삭제에 실패했습니다.')
    }
    showSuccess('사이트가 삭제되었습니다.')
  } catch (error) {
    showError(error instanceof Error ? error.message : '사이트 삭제 중 오류가 발생했습니다.')
  }
}

function handleAddShift() {
  editingShift.value = null
  showShiftModal.value = true
}

function handleEditShift(shift: Shift) {
  editingShift.value = shift
  showShiftModal.value = true
}

async function handleDeleteShift(shiftId: string) {
  try {
    await deleteShift(shiftId)

    if (activeOrganizationId.value) {
      await orgStore.loadOrganization(activeOrganizationId.value)
    }

    showSuccess('시프트가 삭제되었습니다.')
  } catch (error) {
    showError(error instanceof Error ? error.message : '시프트 삭제 중 오류가 발생했습니다.')
  }
}

async function handleShiftConfirm(shiftData: Omit<Shift, 'id' | 'organizationId' | 'createdAt'>) {
  if (!activeOrganizationId.value) {
    showError('조직 정보를 확인할 수 없습니다.')
    return
  }

  try {
    if (editingShift.value) {
      await updateShift(editingShift.value.id, shiftData)
      showSuccess('시프트가 수정되었습니다.')
    } else {
      await createShift(activeOrganizationId.value, shiftData)
      showSuccess('시프트가 추가되었습니다.')
    }

    await orgStore.loadOrganization(activeOrganizationId.value)
    showShiftModal.value = false
    editingShift.value = null
  } catch (error) {
    showError(error instanceof Error ? error.message : '시프트 저장 중 오류가 발생했습니다.')
  }
}

function handleShiftCancel() {
  showShiftModal.value = false
  editingShift.value = null
}

function handleEmployeeSeedEntry(entry: 'manual' | 'excel') {
  router.push({
    path: '/schedule/step3',
    query: buildOnboardingQuery({
      step: 'employee_seed',
      entry,
    }),
  })
}

function handleScheduleRequestEntry() {
  router.push({
    path: ADMIN_DASHBOARD_ROUTE_PATH,
    query: buildOnboardingQuery({
      step: 'schedule_request',
      entry: 'create_schedule',
      openCreateSchedule: true,
    }),
  })
}

function handleGoToDashboard() {
  router.push(ADMIN_DASHBOARD_ROUTE_PATH)
}

onMounted(() => {
  void initializePage()
})
</script>
