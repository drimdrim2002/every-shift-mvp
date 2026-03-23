<template>
  <div class="mx-auto max-w-6xl px-4">
    <div
      v-if="showOnboardingBanner"
      class="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4"
    >
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm font-semibold text-sky-700">
            3단계: 첫 스케줄 요청 시작
          </p>
          <p class="mt-1 text-sm leading-6 text-slate-600">
            계획월을 선택하면 첫 스케줄 생성 흐름으로 이동합니다. 작업을 마친 뒤에는 온보딩으로 돌아와 완료 상태를 확인하세요.
          </p>
        </div>
        <n-button
          secondary
          @click="handleReturnToOnboarding"
        >
          온보딩으로 돌아가기
        </n-button>
      </div>
    </div>

    <n-card>
      <template #header>
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">
            근무표 관리
          </h1>
          <n-button
            type="primary"
            @click="handleCreateNew"
          >
            <template #icon>
              <span class="text-lg">+</span>
            </template>
            새 근무표 생성
          </n-button>
        </div>
      </template>

      <!-- 로딩 상태 -->
      <div
        v-if="loading"
        class="py-12 text-center"
      >
        <n-spin size="large" />
        <p class="mt-4 text-gray-500">
          근무표 목록을 불러오는 중...
        </p>
      </div>

      <!-- 목록이 비어있을 때 -->
      <div
        v-else-if="schedules.length === 0"
        class="py-16 text-center"
      >
        <div class="mb-4 text-6xl">
          📅
        </div>
        <h2 class="mb-2 text-xl font-semibold text-gray-700">
          생성된 근무표가 없습니다
        </h2>
        <p class="mb-6 text-gray-500">
          새 근무표를 생성하여 시작하세요
        </p>
        <n-button
          type="primary"
          size="large"
          @click="handleCreateNew"
        >
          첫 근무표 생성하기
        </n-button>
      </div>

      <!-- 근무표 목록 -->
      <div
        v-else
        class="space-y-4"
      >
        <n-card
          v-for="schedule in schedules"
          :key="schedule.id"
          :bordered="true"
          class="cursor-pointer transition-shadow hover:shadow-md"
          @click="handleViewSchedule(schedule)"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <h3 class="text-lg font-semibold">
                  {{ schedule.month }} 근무표
                </h3>
                <n-badge
                  :value="getStatusText(schedule.status)"
                  :type="getStatusType(schedule.status)"
                />
              </div>
              <div class="mt-2 flex gap-6 text-sm text-gray-600">
                <span>생성일: {{ formatDate(schedule.created_at) }}</span>
                <span v-if="schedule.hard_score !== null && schedule.soft_score !== null">
                  Hard Score: {{ schedule.hard_score }} / Soft Score: {{ schedule.soft_score }}
                </span>
              </div>
            </div>
            <div class="flex gap-2">
              <n-button
                secondary
                @click.stop="handleEdit(schedule)"
              >
                수정
              </n-button>
              <n-button
                secondary
                type="error"
                @click.stop="handleDelete(schedule)"
              >
                삭제
              </n-button>
            </div>
          </div>
        </n-card>
      </div>
    </n-card>

    <!-- 월 선택 모달 -->
    <n-modal
      v-model:show="showMonthModal"
      preset="dialog"
      title="근무표 생성"
      positive-text="확인"
      negative-text="취소"
      :loading="modalLoading"
      @positive-click="handleMonthConfirm"
    >
      <div class="py-4">
        <n-form
          ref="monthFormRef"
          :model="monthForm"
        >
          <n-form-item
            label="계획월"
            path="month"
          >
            <n-select
              v-model:value="monthForm.month"
              :options="monthOptions"
              placeholder="근무표 생성할 월을 선택하세요"
            />
          </n-form-item>
        </n-form>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NCard, NButton, NSpin, NBadge, NModal, NForm, NFormItem, NSelect } from 'naive-ui';
import { useOrganizationStore } from '@/stores/organization';
import { useOnboardingStore } from '@/stores/onboarding';
import { useRbacStore } from '@/stores/rbac';
import { useScheduleStore } from '@/stores/schedule';
import { getScheduleList } from '@/api/schedule';
import { supabase } from '@/api/supabase';
import { showSuccess, showError } from '@/utils/message';
import { getAvailableMonths } from '@/utils/date';
import { buildOnboardingQuery, resolveOnboardingRouteContext } from '@/utils/onboarding-context';
import dayjs from 'dayjs';

interface Schedule {
  id: string;
  organization_id: string;
  month: string;
  status: 'created' | 'running' | 'complete' | 'changed' | 'error';
  hard_score: number | null;
  soft_score: number | null;
  created_at: string;
  updated_at: string;
}

const route = useRoute();
const router = useRouter();
const rbacStore = useRbacStore();
const onboardingStore = useOnboardingStore();
const orgStore = useOrganizationStore();
const scheduleStore = useScheduleStore();
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

const loading = ref(true);
const schedules = ref<Schedule[]>([]);

// 월 선택 모달 관련
const showMonthModal = ref(false);
const modalLoading = ref(false);
const monthFormRef = ref();
const monthForm = ref({
  month: '',
});
const hasAutoOpenedOnboardingModal = ref(false);

const onboardingContext = computed(() => resolveOnboardingRouteContext(route.query));
const currentOrganizationId = computed(
  () => rbacStore.effectiveMembership?.organizationId ?? DEFAULT_ORG_ID,
);
const showOnboardingBanner = computed(
  () =>
    onboardingContext.value.isOnboardingSource &&
    onboardingContext.value.step === 'schedule_request' &&
    !onboardingStore.isOnboardingComplete,
);
const shouldAutoOpenCreateModal = computed(
  () =>
    showOnboardingBanner.value &&
    onboardingContext.value.entry === 'create_schedule' &&
    onboardingContext.value.openCreateSchedule,
);

// 월 옵션
const monthOptions = computed(() => {
  return getAvailableMonths().map((month) => ({
    label: month,
    value: month,
  }));
});

async function loadCurrentOrganization() {
  const organizationId = currentOrganizationId.value;
  if (!orgStore.current || orgStore.current.id !== organizationId) {
    const result = await orgStore.loadOrganization(organizationId);
    if (!result.success || !orgStore.current) {
      showError('조직 정보를 불러오지 못했습니다. 시드 데이터 또는 권한 설정을 확인해주세요.');
      loading.value = false;
      return false;
    }
  }

  return true;
}

onMounted(async () => {
  const loaded = await loadCurrentOrganization();
  if (!loaded) {
    return;
  }

  await loadSchedules();
});

watch(
  shouldAutoOpenCreateModal,
  (nextValue) => {
    if (!nextValue || hasAutoOpenedOnboardingModal.value) {
      return;
    }

    hasAutoOpenedOnboardingModal.value = true;
    handleCreateNew();
  },
  { immediate: true },
);

async function loadSchedules() {
  if (!orgStore.current) {
    schedules.value = [];
    showError('조직 정보가 없어 근무표 목록을 조회할 수 없습니다.');
    loading.value = false;
    return;
  }

  try {
    loading.value = true;
    const data = await getScheduleList(orgStore.current.id);
    schedules.value = data as Schedule[];
  } catch (error) {
    console.warn('근무표 목록 로드 실패:', error);
    showError('근무표 목록을 불러오는데 실패했습니다');
  } finally {
    loading.value = false;
  }
}

function handleCreateNew() {
  // 기본값: 다음 달
  monthForm.value.month = monthOptions.value[1]?.value || '';
  showMonthModal.value = true;
}

async function handleMonthConfirm() {
  if (!orgStore.current) {
    showError('조직 정보가 없습니다. 페이지를 새로고침 해주세요.');
    return false;
  }

  // 월 선택 확인
  if (!monthForm.value.month) {
    window.$message?.warning('계획월을 선택해주세요');
    return false; // 모달 닫기 방지
  }

  // 중복 체크
  modalLoading.value = true;
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('id, month, status')
      .eq('organization_id', orgStore.current.id)
      .eq('month', monthForm.value.month)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      window.$message?.error(`${monthForm.value.month} 근무표가 이미 존재합니다. 다른 월을 선택해주세요.`);
      return false; // 모달 닫기 방지
    }

    // 중복 없음 - scheduleStore에 month 저장 후 Step1으로 이동
    scheduleStore.reset();
    scheduleStore.setBasicInfo({
      month: monthForm.value.month,
      organizationId: orgStore.current.id,
      organizationName: orgStore.current.name,
      organizationType: orgStore.current.type,
      shifts: orgStore.shifts,
      employeeCount: orgStore.employees.length,
    });

    const query =
      showOnboardingBanner.value && onboardingContext.value.step === 'schedule_request'
        ? buildOnboardingQuery({
            step: 'schedule_request',
            entry: 'create_schedule',
            returnTo: onboardingContext.value.returnTo,
            returnStep: onboardingContext.value.returnStep ?? 'schedule_request',
          })
        : undefined;

    router.push({
      path: '/schedule/step1',
      query,
    });
    return true; // 모달 닫기 허용
  } catch (error) {
    console.warn('중복 체크 실패:', error);
    window.$message?.error('월 중복 체크 중 오류가 발생했습니다');
    return false;
  } finally {
    modalLoading.value = false;
  }
}

function handleViewSchedule(schedule: Schedule) {
  if (!orgStore.current) {
    showError('조직 정보가 없습니다. 페이지를 새로고침 해주세요.');
    return;
  }

  // scheduleStore에 기본 정보 로드
  scheduleStore.reset();
  scheduleStore.setBasicInfo({
    scheduleId: schedule.id,
    month: schedule.month,
    organizationId: orgStore.current.id,
    organizationName: orgStore.current.name,
    organizationType: orgStore.current.type,
    shifts: orgStore.shifts,
    employeeCount: orgStore.employees.length,
  });
  
  if (schedule.status === 'complete' || schedule.status === 'changed') {
    router.push(`/schedule/step5/${schedule.id}`);
  } else if (schedule.status === 'created' || schedule.status === 'running') {
    router.push(`/schedule/step5/${schedule.id}`);
  } else {
    window.$message?.info('해당 근무표를 조회할 수 없습니다');
  }
}

async function handleEdit(schedule: Schedule) {
  if (!orgStore.current) {
    showError('조직 정보가 없습니다. 페이지를 새로고침 해주세요.');
    return;
  }

  // running 상태여도 수정 가능하도록 변경 (중간 결과 확인 및 수정 기능 지원)
  // 이전: if (schedule.status === 'running') { ... return; }

  // created, complete, changed, error 상태는 모두 수정 가능
  scheduleStore.reset();
  scheduleStore.setBasicInfo({
    scheduleId: schedule.id,
    month: schedule.month,
    organizationId: orgStore.current.id,
    organizationName: orgStore.current.name,
    organizationType: orgStore.current.type,
    shifts: orgStore.shifts,
    employeeCount: orgStore.employees.length,
  });
  
  // Step1부터 다시 시작 (시프트, 사이트 정보 등 재설정)
  router.push('/schedule/step1');
}

function handleDelete(schedule: Schedule) {
  window.$dialog?.warning({
    title: '근무표 삭제',
    content: `${schedule.month} 근무표를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
    positiveText: '삭제',
    negativeText: '취소',
    onPositiveClick: async () => {
      try {
        // schedule_assignments 먼저 삭제 (FK 제약)
        await supabase.from('schedule_assignments').delete().eq('schedule_id', schedule.id);

        // schedule 삭제
        const { error } = await supabase.from('schedules').delete().eq('id', schedule.id);

        if (error) throw error;

        showSuccess('근무표가 삭제되었습니다');
        await loadSchedules();
      } catch (error) {
        console.warn('삭제 실패:', error);
        showError('삭제 중 오류가 발생했습니다');
      }
    },
  });
}

function handleReturnToOnboarding() {
  router.push({
    path: onboardingContext.value.returnTo,
    query: buildOnboardingQuery({
      step: 'schedule_request',
      returnTo: onboardingContext.value.returnTo,
      returnStep: onboardingContext.value.returnStep ?? 'schedule_request',
      resumeStep: onboardingContext.value.returnStep ?? 'schedule_request',
    }),
  });
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    created: '생성됨',
    running: '생성 중',
    complete: '완료',
    changed: '수정됨',
    error: '오류',
  };
  return map[status] || status;
}

function getStatusType(status: string): 'info' | 'success' | 'error' | 'warning' | 'default' {
  const map: Record<string, 'info' | 'success' | 'error' | 'warning' | 'default'> = {
    created: 'info',
    running: 'info',
    complete: 'success',
    changed: 'warning',
    error: 'error',
  };
  return map[status] || 'default';
}

function formatDate(dateStr: string): string {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
}
</script>
