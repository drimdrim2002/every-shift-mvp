<template>
  <div class="mx-auto max-w-7xl px-4">
    <StepIndicator
      v-if="!isSetupEntry"
      :current-step="1"
    />

    <n-card :title="pageTitle">
      <n-space
        vertical
        :size="24"
      >
        <n-alert
          v-if="isSetupEntry"
          type="info"
        >
          처음 근무표를 만들기 전에 병원명과 실제 사용하는 근무 유형을 먼저 정리합니다.
          이 설정은 이후 새 근무표를 만들 때 기본값으로 사용됩니다.
        </n-alert>

        <!-- Section 1: 조직 정보 -->
        <div>
          <h3 class="mb-4 text-xl font-semibold">
            1. 병원 정보
          </h3>

          <div
            v-if="isSetupEntry"
            class="space-y-4"
          >
            <p class="text-sm text-gray-600">
              근무표에 표시될 병원명을 확인합니다. 병원 종류는 현재 선택된 조직 기준으로 사용합니다.
            </p>
            <n-form
              :model="setupOrganizationProfile"
              label-placement="top"
            >
              <n-form-item label="병원명">
                <n-input
                  v-model:value="setupOrganizationProfile.name"
                  placeholder="병원명을 입력하세요"
                  :disabled="organizationSaving"
                />
              </n-form-item>
            </n-form>
            <div class="rounded-lg bg-gray-50 p-4">
              <div class="space-y-2 text-sm">
                <div>
                  <span class="font-medium text-gray-700">기관 종류:</span>
                  <span class="ml-2 text-gray-900">{{ getOrgTypeLabel(setupOrganizationProfile.type) }}</span>
                </div>
              </div>
            </div>
            <div class="flex justify-end">
              <n-button
                type="primary"
                secondary
                :loading="organizationSaving"
                :disabled="!canConfirmOrganizationProfile"
                @click="handleSaveOrganizationProfile"
              >
                병원 정보 확인 완료
              </n-button>
            </div>
          </div>

          <!-- 간략한 조직 정보 표시 -->
          <div
            v-else
            class="mb-4 rounded-lg bg-gray-50 p-4"
          >
            <div class="space-y-2 text-sm">
              <div>
                <span class="font-medium text-gray-700">병원명:</span>
                <span class="ml-2 text-gray-900">{{ orgStore.current?.name || '-' }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700">기관 종류:</span>
                <span class="ml-2 text-gray-900">{{ getOrgTypeLabel(orgStore.current?.type) }}</span>
              </div>
            </div>
          </div>
          
          <!-- 계획월 표시 (읽기 전용) -->
          <div
            v-if="!isSetupEntry"
            class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4"
          >
            <div class="text-sm">
              <span class="font-medium text-blue-900">계획월:</span>
              <span class="ml-2 text-lg font-semibold text-blue-900">{{ scheduleStore.basicInfo?.month || '-' }}</span>
            </div>
          </div>
          <div
            v-else
            class="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
          >
            계획월은 나중에 새 근무표를 만들 때 선택합니다. 지금은 매달 반복해서 사용할 기본 정보만 준비합니다.
          </div>
        </div>

        <!-- Section 2: 시프트 관리 -->
        <div>
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-xl font-semibold">
              2. 근무 유형 설정
            </h3>
            <n-button
              type="primary"
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
            근무표에 배정할 근무 유형을 최소 1개 이상 추가해주세요. 시작/종료 시간이 있는 근무 유형만 사용할 수 있습니다.
          </n-alert>
          <n-alert
            v-else-if="isSetupEntry"
            type="success"
            class="mb-4"
          >
            실제 배정에 사용할 근무 유형을 확인했습니다. 빠진 근무가 있으면 다음 단계로 가기 전에 추가해주세요.
          </n-alert>
          
          <!-- <n-alert
            v-else
            type="info"
            class="mb-4"
          >
            💡 시간 정보가 없는 시프트(O, H 등)는 사이트 정보 입력에 사용되지 않으므로 표시되지 않습니다.
            <br>
            ⚠️ 시프트 변경 사항은 조직 전체에 영구 반영되며, 이후 생성되는 모든 근무표에도 동일하게 적용됩니다.
          </n-alert> -->

          <n-data-table
            v-if="shiftsWithTime.length > 0"
            :columns="shiftColumns"
            :data="shiftsWithTime"
            :bordered="false"
            :pagination="false"
          />
        </div>

        <!-- 버튼 -->
        <div class="flex justify-between pt-6">
          <n-button
            size="medium"
            @click="handleCancel"
          >
            {{ isSetupEntry ? '대시보드로 돌아가기' : '취소' }}
          </n-button>
          <n-button
            type="primary"
            size="medium"
            :disabled="!canProceed"
            @click="handleNext"
          >
            {{ isSetupEntry ? '다음: 필요 인원 입력' : '다음 단계 →' }}
          </n-button>
        </div>
      </n-space>
    </n-card>

    <!-- 시프트 관리 모달 -->
    <ShiftManager
      v-model:visible="showShiftModal"
      :editing-shift="editingShift"
      @confirm="handleShiftConfirm"
      @cancel="handleShiftCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NCard,
  NSpace,
  NButton,
  NAlert,
  NDataTable,
  NPopconfirm,
  NForm,
  NFormItem,
  NInput,
  type DataTableColumns,
} from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import ShiftManager from '@/components/schedule/ShiftManager.vue';
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import { getOrganizationProfile, updateOrganizationProfile } from '@/api/ops';
import { createShift, updateShift, deleteShift } from '@/api/shift';
import { buildScheduleEntryQuery } from '@/utils/scheduleEntryMode';
import { isSetupEntryMode } from '@/utils/scheduleEntryMode';
import { getAppHomeRoutePath, getScheduleStepRoutePath } from '@/constants/routes';
import type { OrganizationProfileRequest } from '@/types/ops';
import type { Shift } from '@/types/shift';

const router = useRouter();
const route = useRoute();
const scheduleStore = useScheduleStore();
const orgStore = useOrganizationStore();
const DEFAULT_ORGANIZATION_TYPE = 'hospital';

// 시프트 목록 (로컬 상태)
const shifts = ref<Shift[]>([]);
const organizationSaving = ref(false);
const setupOrganizationProfile = ref<OrganizationProfileRequest>({
  organizationId: '',
  name: '',
  type: DEFAULT_ORGANIZATION_TYPE,
});
const setupOrganizationProfileBaseline = ref('');
const organizationTypeBackfillRequired = ref(false);
const isSetupEntry = computed(() => isSetupEntryMode(route.query));
const pageTitle = computed(() =>
  isSetupEntry.value ? '운영 준비 - 병원 정보와 근무 유형 확인' : '근무표 생성 - 기본 정보 설정'
);

// 시간 정보가 있는 시프트만 필터링 (computed)
const shiftsWithTime = computed(() => {
  return shifts.value.filter(
    (shift) => shift.startTime !== null && shift.endTime !== null
  );
});

// 시프트 모달 상태
const showShiftModal = ref(false);
const editingShift = ref<Shift | null>(null);

// 조직 유형 라벨 헬퍼 함수
function getOrgTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    hospital: '병원',
    fire: '소방서',
    police: '경찰서',
  };
  return type ? map[type] || type : '-';
}

function normalizeOrganizationType(type: string): string {
  const normalizedType = type.trim();
  return normalizedType.length > 0 ? normalizedType : DEFAULT_ORGANIZATION_TYPE;
}

function normalizeOrganizationProfile(
  profile: OrganizationProfileRequest
): OrganizationProfileRequest {
  return {
    organizationId: profile.organizationId.trim(),
    name: profile.name.trim(),
    type: normalizeOrganizationType(profile.type),
  };
}

function serializeOrganizationProfile(profile: OrganizationProfileRequest): string {
  return JSON.stringify(normalizeOrganizationProfile(profile));
}

function setSetupOrganizationProfile(profile: OrganizationProfileRequest) {
  const normalizedProfile = normalizeOrganizationProfile(profile);
  setupOrganizationProfile.value = normalizedProfile;
  setupOrganizationProfileBaseline.value = serializeOrganizationProfile(normalizedProfile);
}

function buildFallbackOrganizationProfile(): OrganizationProfileRequest | null {
  if (!orgStore.current?.id) {
    return null;
  }

  return {
    organizationId: orgStore.current.id,
    name: orgStore.current.name ?? '',
    type: normalizeOrganizationType(orgStore.current.type ?? ''),
  };
}

const hasOrganizationProfileChanges = computed(() =>
  serializeOrganizationProfile(setupOrganizationProfile.value) !== setupOrganizationProfileBaseline.value
);

const canConfirmOrganizationProfile = computed(() =>
  setupOrganizationProfile.value.organizationId.trim().length > 0
  && setupOrganizationProfile.value.name.trim().length > 0
  && !organizationSaving.value
);

// 폼 유효성 검증 규칙 - 제거됨

// 시프트 테이블 컬럼
const shiftColumns = computed<DataTableColumns<Shift>>(() => [
  {
    title: '코드',
    key: 'code',
    width: 80,
  },
  {
    title: '이름',
    key: 'name',
    width: 120,
  },
  {
    title: '색상',
    key: 'colorCode',
    width: 100,
    render(row) {
      return h('div', { class: 'flex items-center gap-2' }, [
        h('div', {
          class: 'w-6 h-6 rounded',
          style: { backgroundColor: row.colorCode },
        }),
        h('span', { class: 'text-sm' }),
      ]);
    },
  },
  {
    title: '시간',
    key: 'time',
    width: 150,
    render(row) {
      if (row.startTime && row.endTime) {
        // hh:mm:ss 형태를 hh:mm로 변환
        const formatTime = (time: string) => {
          const parts = time.split(':');
          return `${parts[0]}:${parts[1]}`;
        };
        return `${formatTime(row.startTime)} - ${formatTime(row.endTime)}`;
      }
      return '-';
    },
  },
  {
    title: '작업',
    key: 'actions',
    width: 120,
    render(row) {
      return h('div', { class: 'flex gap-2' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            onClick: () => handleEditShift(row),
          },
          { default: () => '수정' }
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
                { size: 'small', quaternary: true, type: 'error' },
                { default: () => '삭제' }
              ),
            default: () => '이 시프트를 삭제하시겠습니까?',
          }
        ),
      ]);
    },
  },
]);

// 진행 가능 여부
const canProceed = computed(() => {
  if (isSetupEntry.value) {
    return shiftsWithTime.value.length > 0 && orgStore.current !== null && canConfirmOrganizationProfile.value;
  }

  return Boolean(
    scheduleStore.basicInfo?.month &&
    shiftsWithTime.value.length > 0 &&
    orgStore.current !== null
  );
});

// 초기화
onMounted(async () => {
  // Dashboard에서 계획월이 설정되지 않은 경우 Dashboard로 리다이렉트
  if (!isSetupEntry.value && !scheduleStore.basicInfo?.month) {
    window.$message?.warning('계획월을 먼저 선택해주세요');
    router.push(getAppHomeRoutePath());
    return;
  }

  const result = isSetupEntry.value
    ? await orgStore.loadOrganization()
    : await orgStore.loadOrganization(scheduleStore.basicInfo?.organizationId);

  if (!result.success) {
    window.$message?.error(result.error || '조직 정보를 불러올 수 없습니다.');
    router.push(getAppHomeRoutePath());
    return;
  }
  
  // 시프트는 항상 orgStore에서 가져옴 (최신 상태 반영)
  if (orgStore.shifts.length > 0) {
    shifts.value = [...orgStore.shifts];
  }

  if (isSetupEntry.value) {
    await loadSetupOrganizationProfile();
  }
});

async function loadSetupOrganizationProfile() {
  const fallbackProfile = buildFallbackOrganizationProfile();
  if (!fallbackProfile) {
    return;
  }

  try {
    const profile = await getOrganizationProfile(fallbackProfile.organizationId);
    organizationTypeBackfillRequired.value = profile.type.trim().length === 0;
    setSetupOrganizationProfile({
      organizationId: profile.organizationId,
      name: profile.name || fallbackProfile.name,
      type: normalizeOrganizationType(profile.type || fallbackProfile.type),
    });
  } catch (error) {
    console.warn('[Step1BasicInfo] Failed to load organization profile:', error);
    organizationTypeBackfillRequired.value = false;
    setSetupOrganizationProfile(fallbackProfile);
  }
}

async function confirmSetupOrganizationProfile(options: { silent?: boolean } = {}): Promise<boolean> {
  if (!canConfirmOrganizationProfile.value) {
    window.$message?.warning('병원명을 입력해주세요.');
    return false;
  }

  organizationSaving.value = true;

  try {
    const saved = await updateOrganizationProfile(
      normalizeOrganizationProfile(setupOrganizationProfile.value)
    );
    organizationTypeBackfillRequired.value = false;
    setSetupOrganizationProfile(saved);
    orgStore.updateFoundationProfileCache?.(saved);

    if (!options.silent) {
      window.$message?.success('병원 정보를 확인했습니다.');
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '병원 정보 확인 중 오류가 발생했습니다.';
    window.$message?.error(errorMessage);
    return false;
  } finally {
    organizationSaving.value = false;
  }
}

async function handleSaveOrganizationProfile() {
  await confirmSetupOrganizationProfile();
}

// 시프트 추가 핸들러
function handleAddShift() {
  editingShift.value = null;
  showShiftModal.value = true;
}

// 시프트 수정 핸들러
function handleEditShift(shift: Shift) {
  editingShift.value = shift;
  showShiftModal.value = true;
}

// 시프트 삭제 핸들러
async function handleDeleteShift(shiftId: string) {
  try {
    // DB에서 삭제
    await deleteShift(shiftId);
    
    // 로컬 상태에서 제거
    shifts.value = shifts.value.filter((s) => s.id !== shiftId);
    
    // orgStore 다시 로드
    if (orgStore.current) {
      await orgStore.loadOrganization(orgStore.current.id);
    }
    
    window.$message?.success('시프트가 삭제되었습니다.');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '시프트 삭제 중 오류가 발생했습니다.';
    window.$message?.error(errorMessage);
  }
}

// 시프트 모달 확인 핸들러
async function handleShiftConfirm(shiftData: Omit<Shift, 'id' | 'organizationId' | 'createdAt'>) {
  if (!orgStore.current) {
    window.$message?.error('조직 정보를 불러올 수 없습니다.');
    return;
  }

  try {
    if (editingShift.value) {
      // 수정 모드: DB 업데이트
      await updateShift(editingShift.value.id, shiftData);
      
      // 로컬 상태 업데이트
      shifts.value = shifts.value.map((s) =>
        s.id === editingShift.value!.id ? { ...s, ...shiftData } : s
      );
      
      window.$message?.success('시프트가 수정되었습니다.');
    } else {
      // 추가 모드: 중복 코드 확인
      const existingCode = shifts.value.find(
        (s) => s.code.toUpperCase() === shiftData.code.toUpperCase()
      );
      if (existingCode) {
        window.$message?.error(`시프트 코드 '${shiftData.code}'가 이미 존재합니다.`);
        return;
      }

      // DB에 생성
      const newShift = await createShift(orgStore.current.id, shiftData);
      
      // 로컬 상태에 추가
      shifts.value = [...shifts.value, newShift];
      
      window.$message?.success('시프트가 추가되었습니다.');
    }

    // orgStore 다시 로드
    await orgStore.loadOrganization(orgStore.current.id);

    showShiftModal.value = false;
    editingShift.value = null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '시프트 저장 중 오류가 발생했습니다.';
    window.$message?.error(errorMessage);
  }
}

// 시프트 모달 취소 핸들러
function handleShiftCancel() {
  showShiftModal.value = false;
  editingShift.value = null;
}

// 취소 핸들러
function handleCancel() {
  if (isSetupEntry.value && (hasOrganizationProfileChanges.value || organizationTypeBackfillRequired.value)) {
    window.$message?.info('변경된 병원 정보가 있습니다. 확인 완료 후 이동하세요.');
    return;
  }

  router.push(getAppHomeRoutePath());
}

// 다음 단계 핸들러
async function handleNext() {
  if (!orgStore.current) {
    window.$message?.error('조직 정보를 불러올 수 없습니다.');
    return;
  }

  if (shiftsWithTime.value.length === 0) {
    window.$message?.warning('시간 정보가 있는 시프트를 최소 1개 이상 추가해주세요.');
    return;
  }

  if (isSetupEntry.value) {
    const confirmed = await confirmSetupOrganizationProfile({ silent: true });
    if (!confirmed) return;

    window.$message?.success('기본 정보가 확인되었습니다.');
    router.push({
      path: getScheduleStepRoutePath(2),
      query: buildScheduleEntryQuery('setup'),
    });
    return;
  }

  try {
    const orgId = orgStore.current.id;
    const basicInfo = scheduleStore.basicInfo;
    const existingScheduleId = basicInfo?.scheduleId;

    // Pinia schedule store 업데이트 (시간 정보가 있는 시프트만)
    scheduleStore.setBasicInfo({
      ...(existingScheduleId ? { scheduleId: existingScheduleId } : {}),
      month: basicInfo?.month || '',
      organizationId: orgId,
      organizationName: orgStore.current.name,
      organizationType: orgStore.current.type,
      employeeCount: basicInfo?.employeeCount || 0,
      shifts: shiftsWithTime.value,
    });

    // Step2로 이동
    scheduleStore.currentStep = 2;
    if (existingScheduleId) {
      window.$message?.success('기존 스케줄 정보를 유지하고 다음 단계로 이동합니다.');
    } else {
      window.$message?.success('기본 정보가 저장되었습니다.');
    }
    const entryQuery = buildScheduleEntryQuery('wizard');
    if (entryQuery) {
      router.push({
        path: getScheduleStepRoutePath(2),
        query: entryQuery,
      });
    } else {
      router.push(getScheduleStepRoutePath(2));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '데이터 저장 중 오류가 발생했습니다.';
    window.$message?.error(errorMessage);
  }
}
</script>
