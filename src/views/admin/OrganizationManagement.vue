<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <section class="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Admin</span>
          <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {{ scopeRoleLabel }}
          </span>
        </div>
        <div>
          <h1 class="text-3xl font-semibold tracking-tight text-slate-900">
            조직 관리
          </h1>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            조직 정보, 운영 규칙, 마스터 데이터, 배치 기준을 한 화면에서 관리하는 관리자 셸입니다.
            Phase 5에서는 구조와 접근 계약만 확정하고 저장 로직은 후속 태스크에서 연결합니다.
          </p>
        </div>
      </div>

      <div class="grid min-w-full gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 lg:min-w-[320px]">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            접근 범위
          </p>
          <p class="mt-1 font-semibold text-slate-900">
            {{ scopeSummaryLabel }}
          </p>
        </div>
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            현재 조직
          </p>
          <p class="mt-1 font-semibold text-slate-900">
            {{ selectedOrganizationLabel }}
          </p>
        </div>
        <n-button
          secondary
          type="primary"
          class="justify-self-start"
          @click="handleDeferredAction('조직 선택과 저장 연결은 P5-1.3 이후 태스크에서 활성화됩니다.')"
        >
          연결 예정 기능 보기
        </n-button>
      </div>
    </section>

    <n-alert
      type="warning"
      :show-icon="true"
      class="rounded-2xl"
    >
      이 페이지는 Phase 5 관리자 IA 셸입니다. 저장, 삭제, 조직 전환은 아직 연결하지 않으며
      `site_requirements` 대신 `site_staffing_requirements` 기반 관리 화면을 붙일 준비만 완료합니다.
    </n-alert>

    <n-card
      title="화면 운영 원칙"
      class="rounded-3xl"
    >
      <div class="grid gap-4 md:grid-cols-2">
        <div
          v-for="principle in managementPrinciples"
          :key="principle.title"
          class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <p class="text-sm font-semibold text-slate-900">
            {{ principle.title }}
          </p>
          <p class="mt-2 text-sm leading-6 text-slate-600">
            {{ principle.description }}
          </p>
        </div>
      </div>
    </n-card>

    <n-card class="rounded-3xl">
      <template #header>
        <div class="flex flex-col gap-1">
          <h2 class="text-xl font-semibold text-slate-900">
            조직 관리 작업 영역
          </h2>
          <p class="text-sm text-slate-500">
            단일 라우트(`/admin/organization`) 안에서 탭으로 세부 도메인을 분리합니다.
          </p>
        </div>
      </template>

      <n-tabs
        v-model:value="activeTab"
        type="line"
        animated
      >
        <n-tab-pane
          v-for="tab in tabDefinitions"
          :key="tab.key"
          :name="tab.key"
          :tab="tab.label"
        >
          <div class="space-y-4">
            <section class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-slate-900">
                    {{ tab.headline }}
                  </h3>
                  <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    {{ tab.description }}
                  </p>
                </div>
                <n-button
                  tertiary
                  type="primary"
                  @click="handleDeferredAction(tab.ctaMessage)"
                >
                  연결 포인트 확인
                </n-button>
              </div>
            </section>

            <section class="grid gap-4 lg:grid-cols-2">
              <article
                v-for="card in tab.cards"
                :key="card.title"
                class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p class="text-base font-semibold text-slate-900">
                  {{ card.title }}
                </p>
                <p class="mt-2 text-sm leading-6 text-slate-600">
                  {{ card.description }}
                </p>
                <ul class="mt-4 space-y-2 text-sm text-slate-700">
                  <li
                    v-for="item in card.items"
                    :key="item"
                    class="flex gap-2"
                  >
                    <span class="mt-1 size-1.5 rounded-full bg-slate-400" />
                    <span>{{ item }}</span>
                  </li>
                </ul>
              </article>
            </section>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAlert, NButton, NCard, NTabPane, NTabs } from 'naive-ui'
import { useOrganizationStore } from '@/stores/organization'
import { useRbacStore } from '@/stores/rbac'
import { showInfo } from '@/utils/message'

type OrganizationManagementTabKey = 'overview' | 'settings' | 'master-data' | 'staffing'

interface ManagementPrinciple {
  title: string
  description: string
}

interface TabCard {
  title: string
  description: string
  items: string[]
}

interface TabDefinition {
  key: OrganizationManagementTabKey
  label: string
  headline: string
  description: string
  ctaMessage: string
  cards: TabCard[]
}

const VALID_TAB_KEYS: OrganizationManagementTabKey[] = ['overview', 'settings', 'master-data', 'staffing']
const route = useRoute()
const router = useRouter()
const rbacStore = useRbacStore()
const organizationStore = useOrganizationStore()

const managementPrinciples: ManagementPrinciple[] = [
  {
    title: '권한 가드 유지',
    description: '`allowedAccessStates` 규약을 그대로 사용하고, `super_active`와 `admin_active`만 진입할 수 있습니다.',
  },
  {
    title: '단일 페이지 셸',
    description: 'Phase 5에서는 `/admin/organization` 한 페이지에 탭을 두고, 중첩 라우트 없이 도메인 구조만 고정합니다.',
  },
  {
    title: '저장 연결 보류',
    description: '데이터 조회·저장·삭제 API는 P5-1.3 이후 계약에 맞춰 연결하고, 이번 태스크에서는 진입점만 노출합니다.',
  },
  {
    title: '레거시 스키마 보호',
    description: '관리 화면은 서비스 전환용 `site_staffing_requirements`를 목표로 하고, 기존 스케줄 wizard의 `site_requirements`는 건드리지 않습니다.',
  },
]

const tabDefinitions: TabDefinition[] = [
  {
    key: 'overview',
    label: '조직 정보',
    headline: '조직 기본 정보와 권한 범위를 확인합니다.',
    description: '조직 이름, 유형, 수정 가능 범위, 슈퍼/어드민의 책임 경계를 한 곳에서 보여주는 영역입니다.',
    ctaMessage: '조직 기본 정보 저장 연결은 P5-1.3에서 확정됩니다.',
    cards: [
      {
        title: '이번 태스크에서 확정한 내용',
        description: '조직 정보는 단일 관리자 페이지에서 시작하며, 직접 접근은 라우터 가드가 차단합니다.',
        items: [
          '슈퍼 관리자와 조직 관리자만 메뉴를 볼 수 있습니다.',
          '어드민은 자기 조직만 수정하는 흐름을 전제로 셸을 고정합니다.',
          '슈퍼 관리자의 조직 선택 UX는 이 페이지 상단 컨텍스트 영역에서 이어집니다.',
        ],
      },
      {
        title: '후속 연결 포인트',
        description: '데이터 계약이 정리되면 아래 순서로 연결합니다.',
        items: [
          'organizations 조회와 수정 폼 바인딩',
          'organization type 허용 범위 검증',
          '슈퍼 관리자 전용 조직 전환 selector',
        ],
      },
    ],
  },
  {
    key: 'settings',
    label: '운영 설정',
    headline: '연속 N, 최소 휴식, 주간 제약 같은 조직 규칙을 묶습니다.',
    description: 'organization_settings 책임 범위를 시각적으로 분리해 저장 API가 붙기 전에도 도메인 경계를 명확히 유지합니다.',
    ctaMessage: '운영 설정 저장 API는 organization_settings 경계 확정 후 연결됩니다.',
    cards: [
      {
        title: '운영 규칙 범위',
        description: '조직 차원의 스케줄링 제약은 별도 설정 영역에서 관리합니다.',
        items: [
          '최대 연속 야간 근무 수',
          '시프트 전환 최소 휴식 시간',
          '주간 목표/최대 근무 시간과 휴무일 기준',
        ],
      },
      {
        title: '현재 셸 상태',
        description: '저장 버튼 없이 설명 카드만 두고, 추후 폼 컴포넌트가 교체될 위치를 확보합니다.',
        items: [
          'P5-1.3에서 direct `.from()` 기반 API 연결 여부 확정',
          '필드 단위 검증 규칙은 P5-2.3 이후 상세화',
          '읽기/쓰기 실패 처리는 Naive UI 글로벌 메시지로 통일',
        ],
      },
    ],
  },
  {
    key: 'master-data',
    label: '마스터 데이터',
    headline: '시프트, 사이트, 스킬, 직급 관리 탭이 들어올 영역입니다.',
    description: 'Phase 5-2.x 작업이 붙을 수 있도록 마스터 데이터 묶음을 별도 탭으로 분리해 후속 확장 비용을 줄입니다.',
    ctaMessage: '마스터 데이터 CRUD 연결은 P5-2.x 태스크에서 순차적으로 활성화됩니다.',
    cards: [
      {
        title: '포함 도메인',
        description: '병렬 탭으로 확장될 후보들을 미리 고정합니다.',
        items: [
          '시프트 정의와 표시 규칙',
          '사이트 목록과 사이트별 운영 단위',
          '스킬 및 직급과 크레딧 설정',
        ],
      },
      {
        title: '안전 장치',
        description: '삭제는 즉시 구현하지 않고 참조 중 차단 정책을 우선합니다.',
        items: [
          'soft delete 컬럼이 없으면 삭제 차단을 기본값으로 유지',
          'wizard 컴포넌트 리팩터는 P7로 미루고 현행 UI를 보존',
          'FK 참조가 있는 엔티티는 DB 차단 정책과 UX를 함께 검토',
        ],
      },
    ],
  },
  {
    key: 'staffing',
    label: '배치 기준',
    headline: '서비스 전환용 인력 배치 기준을 연결할 자리입니다.',
    description: '레거시 Step 2 흐름과 분리된 관리자용 기준 데이터를 다루며, `site_staffing_requirements`를 주 경계로 사용합니다.',
    ctaMessage: '배치 기준 화면은 `site_staffing_requirements` 전용으로 후속 연결됩니다.',
    cards: [
      {
        title: '스키마 경계',
        description: '관리자 페이지와 스케줄 생성 wizard가 서로 다른 데이터 책임을 가지도록 분리합니다.',
        items: [
          '`site_staffing_requirements`는 관리자 화면의 canonical 소스입니다.',
          '`site_requirements`는 기존 wizard 호환성을 위해 그대로 둡니다.',
          '두 스키마를 동시에 수정하는 작업은 이 단계에서 금지합니다.',
        ],
      },
      {
        title: '후속 확장',
        description: '월별 확장, 사이트/직급/스킬 조합, 테넌트 격리 검증이 이어집니다.',
        items: [
          '조직 단위 조회와 저장 가드 추가',
          'URL 조작에 대한 접근 차단 확인',
          '월별 확장 UI 또는 계산 보조 도구 연결',
        ],
      },
    ],
  },
]

function parseTabKey(value: unknown): OrganizationManagementTabKey {
  if (typeof value === 'string' && VALID_TAB_KEYS.includes(value as OrganizationManagementTabKey)) {
    return value as OrganizationManagementTabKey
  }

  if (Array.isArray(value)) {
    const candidate = value.find((item) => typeof item === 'string')
    if (candidate && VALID_TAB_KEYS.includes(candidate as OrganizationManagementTabKey)) {
      return candidate as OrganizationManagementTabKey
    }
  }

  return 'overview'
}

const activeTab = ref<OrganizationManagementTabKey>(parseTabKey(route.query.tab))

const scopeRoleLabel = computed(() => {
  if (rbacStore.accessState === 'super_active') {
    return '슈퍼 관리자'
  }

  return '조직 관리자'
})

const currentOrganizationName = computed(() => {
  const organizationId = rbacStore.effectiveMembership?.organizationId ?? null
  if (!organizationId) {
    return null
  }

  if (organizationStore.current?.id === organizationId) {
    return organizationStore.current.name
  }

  return null
})

const selectedOrganizationLabel = computed(() => {
  if (rbacStore.accessState === 'super_active') {
    return '전체 조직 대상 선택 예정'
  }

  const organizationId = rbacStore.effectiveMembership?.organizationId
  if (!organizationId) {
    return '조직 정보 확인 필요'
  }

  if (currentOrganizationName.value) {
    return `${currentOrganizationName.value} (${organizationId})`
  }

  return organizationId
})

const scopeSummaryLabel = computed(() => {
  if (rbacStore.accessState === 'super_active') {
    return '전체 조직 조회 및 선택'
  }

  return '현재 소속 조직만 수정'
})

watch(
  () => route.query.tab,
  (nextTab) => {
    const resolvedTab = parseTabKey(nextTab)
    if (resolvedTab !== activeTab.value) {
      activeTab.value = resolvedTab
    }
  },
)

watch(activeTab, async (nextTab) => {
  if (route.query.tab === nextTab) {
    return
  }

  await router.replace({
    query: {
      ...route.query,
      tab: nextTab,
    },
  })
})

function handleDeferredAction(message: string) {
  showInfo(message)
}
</script>
