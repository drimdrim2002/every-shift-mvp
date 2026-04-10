<template>
  <div class="mx-auto max-w-6xl px-4">
    <n-card>
      <template #header>
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">
            근무표 관리
          </h1>
          <n-button
            data-test="dashboard-create-schedule"
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

      <n-card
        data-test="dashboard-foundation-card"
        :bordered="true"
        class="mb-6"
      >
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-base font-semibold text-gray-900">
              {{
                foundationReady
                  ? '조직/사이트 기본 설정이 완료되었습니다'
                  : '조직/사이트 기본 설정이 아직 완료되지 않았습니다'
              }}
            </p>
            <p class="mt-1 text-sm text-gray-500">
              {{
                foundationReady
                  ? '대시보드와 근무표 생성 흐름에서 동일한 기본 설정 정보를 사용합니다.'
                  : '조직 기본 정보 확인과 스케줄 대상 사이트 지정을 먼저 완료해주세요.'
              }}
            </p>
          </div>
          <n-button
            v-if="!foundationReady"
            data-test="dashboard-foundation-setup"
            secondary
            type="primary"
            @click="handleOpenFoundationSetup"
          >
            기본 설정 열기
          </n-button>
        </div>
      </n-card>

      <PilotChecklistCard
        v-if="checklist"
        class="mb-6"
        :checklist="checklist"
        @navigate="handleChecklistNavigate"
      />

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
          data-test="dashboard-create-schedule"
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
          data-test="schedule-card"
          :bordered="true"
          class="cursor-pointer transition-shadow hover:shadow-md"
          @click="handleViewSchedule(schedule)"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <h3
                  data-test="schedule-card-month"
                  class="text-lg font-semibold"
                >
                  {{ schedule.month }} 근무표
                </h3>
                <n-badge
                  data-test="schedule-card-status"
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
      data-test="dashboard-month-modal"
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
              data-test="dashboard-month-select"
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
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NButton, NSpin, NBadge, NModal, NForm, NFormItem, NSelect } from 'naive-ui';
import PilotChecklistCard from '@/components/ops/PilotChecklistCard.vue';
import { useOrganizationStore } from '@/stores/organization';
import { useScheduleStore } from '@/stores/schedule';
import { loadCanonicalSiteRequirements } from '@/api/employee';
import { getPhase2ScheduleCompare, getScheduleList } from '@/api/schedule';
import { getChecklist } from '@/api/ops';
import { supabase } from '@/api/supabase';
import { showSuccess, showError } from '@/utils/message';
import { getAvailableMonths, getNextMonth } from '@/utils/date';
import { buildStep5Route, resolveStep5VersionState } from '@/utils/scheduleVersionResolver';
import dayjs from 'dayjs';
import type { ChecklistItem, ChecklistResponse } from '@/types/ops';

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

const router = useRouter();
const orgStore = useOrganizationStore();
const scheduleStore = useScheduleStore();

const loading = ref(true);
const schedules = ref<Schedule[]>([]);
const checklist = ref<ChecklistResponse | null>(null);

// 월 선택 모달 관련
const showMonthModal = ref(false);
const modalLoading = ref(false);
const monthFormRef = ref();
const monthForm = ref({
  month: '',
});

// 월 옵션
const monthOptions = computed(() => {
  return getAvailableMonths().map((month) => ({
    label: month,
    value: month,
  }));
});

const foundationReady = computed(() => {
  const organizationConfirmed = Boolean(orgStore.current?.foundation?.organizationInfoConfirmedAt);
  const hasScheduleActiveSite = orgStore.foundationSites.some(
    (site) => site.isActive && site.isScheduleActive
  );

  return organizationConfirmed && hasScheduleActiveSite;
});

onMounted(async () => {
  const result = await orgStore.loadOrganization();

  if (!result.success) {
    showError(result.error || '조직 정보를 불러오지 못했습니다.');
    loading.value = false;
    return;
  }

  if (orgStore.current?.id && typeof orgStore.loadFoundationData === 'function') {
    await orgStore.loadFoundationData(orgStore.current.id);
  }

  // 근무표 목록 로드
  await loadSchedules();
  await loadChecklist();
});

async function loadSchedules() {
  try {
    loading.value = true;
    const data = await getScheduleList(orgStore.current!.id);
    schedules.value = data as Schedule[];
  } catch (error) {
    console.warn('근무표 목록 로드 실패:', error);
    window.$message?.error('근무표 목록을 불러오는데 실패했습니다');
  } finally {
    loading.value = false;
  }
}

async function loadChecklist() {
  try {
    checklist.value = await getChecklist(orgStore.current!.id);
  } catch (error) {
    console.warn('체크리스트 로드 실패:', error);
    checklist.value = null;
  }
}

function handleCreateNew() {
  // 기본값: 다음 달
  monthForm.value.month = monthOptions.value[1]?.value || '';
  showMonthModal.value = true;
}

function handleOpenFoundationSetup() {
  router.push('/ops/organization-setup');
}

function buildChecklistBasicInfo(month: string, scheduleId?: string) {
  return {
    scheduleId,
    month,
    organizationId: orgStore.current!.id,
    organizationName: orgStore.current!.name,
    organizationType: orgStore.current!.type,
    shifts: orgStore.shifts,
    employeeCount: orgStore.employees.length,
  };
}

async function seedChecklistScheduleContext(item: ChecklistItem) {
  const nextMonth = getAvailableMonths()[1] || getNextMonth();

  if (item.route === '/schedule/step2') {
    scheduleStore.reset();
    scheduleStore.setBasicInfo(buildChecklistBasicInfo(nextMonth));
    return;
  }

  if (item.route === '/schedule/step3') {
    scheduleStore.reset();
    scheduleStore.setBasicInfo(buildChecklistBasicInfo(nextMonth));

    try {
      const requirements = await loadCanonicalSiteRequirements(orgStore.current!.id);
      scheduleStore.setSiteRequirements(requirements);
    } catch (error) {
      console.warn('체크리스트 Step3 요구사항 로드 실패:', error);
    }

    return;
  }

  if (item.route?.startsWith('/schedule/step5/')) {
    const scheduleId = item.route.split('/').pop() || undefined;
    const schedule = scheduleId ? schedules.value.find((entry) => entry.id === scheduleId) : null;

    scheduleStore.reset();
    scheduleStore.setBasicInfo(
      buildChecklistBasicInfo(schedule?.month || nextMonth, scheduleId)
    );
  }
}

async function handleChecklistNavigate(item: ChecklistItem) {
  if (!item.route) {
    return;
  }

  await seedChecklistScheduleContext(item);
  await router.push(item.route);
}

async function handleMonthConfirm() {
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
      .eq('organization_id', orgStore.current!.id)
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
      organizationId: orgStore.current!.id,
      organizationName: orgStore.current!.name,
      organizationType: orgStore.current!.type,
      shifts: orgStore.shifts,
      employeeCount: orgStore.employees.length,
    });

    router.push('/schedule/step1');
    return true; // 모달 닫기 허용
  } catch (error) {
    console.warn('중복 체크 실패:', error);
    window.$message?.error('월 중복 체크 중 오류가 발생했습니다');
    return false;
  } finally {
    modalLoading.value = false;
  }
}

async function handleViewSchedule(schedule: Schedule) {
  // scheduleStore에 기본 정보 로드
  scheduleStore.reset();
  scheduleStore.setBasicInfo({
    scheduleId: schedule.id,
    month: schedule.month,
    organizationId: orgStore.current!.id,
    organizationName: orgStore.current!.name,
    organizationType: orgStore.current!.type,
    shifts: orgStore.shifts,
    employeeCount: orgStore.employees.length,
  });
  
  if (schedule.status === 'complete' || schedule.status === 'changed') {
    try {
      const compareResponse = await getPhase2ScheduleCompare(schedule.id);
      const resolvedState = resolveStep5VersionState(compareResponse, null);

      scheduleStore.setSelectedVersionId(resolvedState.selectedVersionId);
      scheduleStore.setPreviewVersionId(resolvedState.previewVersionId);
      router.push(buildStep5Route(schedule.id, resolvedState.previewVersionId));
      return;
    } catch (error) {
      console.warn('Step5 preview version resolve 실패:', error);
      showError('선택한 근무표 버전을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
  } else if (schedule.status === 'created' || schedule.status === 'running') {
    try {
      const compareResponse = await getPhase2ScheduleCompare(schedule.id);
      const resolvedState = resolveStep5VersionState(compareResponse, null);

      scheduleStore.setSelectedVersionId(resolvedState.selectedVersionId);
      scheduleStore.setPreviewVersionId(resolvedState.previewVersionId);
      router.push(buildStep5Route(schedule.id, resolvedState.previewVersionId));
      return;
    } catch (error) {
      console.warn('Step5 preview version resolve 실패:', error);
      showError('선택한 근무표 버전을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
  } else {
    window.$message?.info('해당 근무표를 조회할 수 없습니다');
  }
}

async function handleEdit(schedule: Schedule) {
  // running 상태여도 수정 가능하도록 변경 (중간 결과 확인 및 수정 기능 지원)
  // 이전: if (schedule.status === 'running') { ... return; }

  // created, complete, changed, error 상태는 모두 수정 가능
  scheduleStore.reset();
  scheduleStore.setBasicInfo({
    scheduleId: schedule.id,
    month: schedule.month,
    organizationId: orgStore.current!.id,
    organizationName: orgStore.current!.name,
    organizationType: orgStore.current!.type,
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
