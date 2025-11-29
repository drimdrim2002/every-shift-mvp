<template>
  <div class="mx-auto max-w-7xl px-4">
    <StepIndicator :current-step="1" />

    <n-card title="근무표 생성 - 기본 정보 설정">
      <n-space
        vertical
        :size="24"
      >
        <!-- Section 1: 조직 정보 입력 -->
        <div>
          <h3 class="mb-4 text-xl font-semibold">
            1. 조직 정보
          </h3>
          <n-form
            ref="orgFormRef"
            :model="orgForm"
            :rules="orgFormRules"
            label-placement="left"
            label-width="100"
          >
            <n-form-item
              label="조직명"
              path="name"
            >
              <n-input
                v-model:value="orgForm.name"
                placeholder="예: 서울대학교병원"
                :maxlength="100"
              />
            </n-form-item>

            <n-form-item
              label="조직 유형"
              path="type"
            >
              <n-select
                v-model:value="orgForm.type"
                :options="orgTypeOptions"
                placeholder="조직 유형 선택"
              />
            </n-form-item>

            <n-form-item
              label="계획월"
              path="month"
            >
              <n-select
                v-model:value="orgForm.month"
                :options="monthOptions"
                placeholder="월 선택"
              />
            </n-form-item>
          </n-form>
        </div>

        <!-- Section 2: 시프트 관리 -->
        <div>
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-xl font-semibold">
              2. 시프트 설정
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
            v-if="shifts.length === 0"
            type="warning"
            class="mb-4"
          >
            시프트를 최소 1개 이상 추가해주세요. 엑셀 템플릿 다운로드 및 업로드가 가능합니다.
          </n-alert>

          <n-data-table
            v-if="shifts.length > 0"
            :columns="shiftColumns"
            :data="shifts"
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
            취소
          </n-button>
          <n-button
            type="primary"
            size="medium"
            :disabled="!canProceed"
            @click="handleNext"
          >
            다음 단계 →
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
import { useRouter } from 'vue-router';
import {
  NCard,
  NSpace,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NButton,
  NAlert,
  NDataTable,
  NPopconfirm,
  type FormInst,
  type FormRules,
  type DataTableColumns,
} from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import ShiftManager from '@/components/schedule/ShiftManager.vue';
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import { getAvailableMonths } from '@/utils/date';
import { replaceAllShifts } from '@/api/shift';
import * as organizationApi from '@/api/organization';
import type { Shift } from '@/types/shift';

const router = useRouter();
const scheduleStore = useScheduleStore();
const orgStore = useOrganizationStore();

// Form Refs
const orgFormRef = ref<FormInst | null>(null);

// 조직 정보 폼
const orgForm = ref({
  name: '',
  type: '' as 'hospital' | 'fire' | 'police' | '',
  month: '',
});

// 시프트 목록 (로컬 상태)
const shifts = ref<Shift[]>([]);

// 시프트 모달 상태
const showShiftModal = ref(false);
const editingShift = ref<Shift | null>(null);

// 조직 유형 옵션
const orgTypeOptions = [
  { label: '병원', value: 'hospital' },
  { label: '소방서', value: 'fire' },
  { label: '경찰서', value: 'police' },
];

// 월 옵션
const monthOptions = computed(() => {
  return getAvailableMonths().map((month) => ({
    label: month,
    value: month,
  }));
});

// 폼 유효성 검증 규칙
const orgFormRules: FormRules = {
  name: [
    { required: true, message: '조직명을 입력해주세요', trigger: 'blur' },
    { max: 100, message: '조직명은 100자 이하여야 합니다', trigger: 'blur' },
  ],
  type: [{ required: true, message: '조직 유형을 선택해주세요', trigger: 'change' }],
  month: [{ required: true, message: '계획월을 선택해주세요', trigger: 'change' }],
};

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
  return (
    orgForm.value.name &&
    orgForm.value.type &&
    orgForm.value.month &&
    shifts.value.length > 0
  );
});

// 초기화
onMounted(async () => {
  // 기존 조직 정보가 있으면 로드
  if (orgStore.current) {
    orgForm.value.name = orgStore.current.name;
    orgForm.value.type = orgStore.current.type as 'hospital' | 'fire' | 'police';
    shifts.value = [...orgStore.shifts];
  } else {
    // 기본 시프트 추가
    addDefaultShifts();
  }

  // 기본값: 다음 달
  orgForm.value.month = monthOptions.value[1]?.value || '';
});

// 기본 시프트 추가
function addDefaultShifts() {
  const defaultShifts: Omit<Shift, 'id' | 'organizationId' | 'createdAt'>[] = [
    { code: 'D', name: '주간', colorCode: '#3B82F6', startTime: '08:00', endTime: '16:00' },
    { code: 'E', name: '오후', colorCode: '#F59E0B', startTime: '16:00', endTime: '00:00' },
    { code: 'N', name: '야간', colorCode: '#8B5CF6', startTime: '00:00', endTime: '08:00' },
  ];

  shifts.value = defaultShifts.map((s, i) => ({
    ...s,
    id: `temp-${Date.now()}-${i}`,
    organizationId: '',
  }));
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
function handleDeleteShift(shiftId: string) {
  shifts.value = shifts.value.filter((s) => s.id !== shiftId);
  window.$message?.success('시프트가 삭제되었습니다.');
}

// 시프트 모달 확인 핸들러
function handleShiftConfirm(shiftData: Omit<Shift, 'id' | 'organizationId' | 'createdAt'>) {
  if (editingShift.value) {
    // 수정 모드
    shifts.value = shifts.value.map((s) =>
      s.id === editingShift.value!.id ? { ...s, ...shiftData } : s
    );
    window.$message?.success('시프트가 수정되었습니다.');
  } else {
    // 추가 모드
    // 중복 코드 확인
    const existingCode = shifts.value.find(
      (s) => s.code.toUpperCase() === shiftData.code.toUpperCase()
    );
    if (existingCode) {
      window.$message?.error(`시프트 코드 '${shiftData.code}'가 이미 존재합니다.`);
      return;
    }

    const newShift: Shift = {
      ...shiftData,
      id: `temp-${Date.now()}`,
      organizationId: '',
    };
    shifts.value = [...shifts.value, newShift];
    window.$message?.success('시프트가 추가되었습니다.');
  }

  showShiftModal.value = false;
  editingShift.value = null;
}

// 시프트 모달 취소 핸들러
function handleShiftCancel() {
  showShiftModal.value = false;
  editingShift.value = null;
}

// 취소 핸들러
function handleCancel() {
  router.push('/');
}

// 다음 단계 핸들러
async function handleNext() {
  // 폼 유효성 검증
  try {
    await orgFormRef.value?.validate();
  } catch {
    return;
  }

  if (shifts.value.length === 0) {
    window.$message?.warning('시프트를 최소 1개 이상 추가해주세요.');
    return;
  }

  try {
    // 1. 조직 생성 또는 업데이트
    let orgId: string;

    if (orgStore.current) {
      // 기존 조직 업데이트
      await organizationApi.updateOrganization(orgStore.current.id, {
        name: orgForm.value.name,
        type: orgForm.value.type,
      });
      orgId = orgStore.current.id;
    } else {
      // 새 조직 생성
      const newOrg = await organizationApi.createOrganization({
        name: orgForm.value.name,
        type: orgForm.value.type,
      });
      orgId = newOrg.id;
    }

    // 2. 시프트 저장
    const shiftData = shifts.value.map((s) => ({
      code: s.code,
      name: s.name,
      colorCode: s.colorCode,
      startTime: s.startTime,
      endTime: s.endTime,
    }));
    await replaceAllShifts(orgId, shiftData);

    // 3. 조직 스토어 업데이트 (시프트 새로 로드)
    await orgStore.loadOrganization(orgId);

    // 4. Pinia schedule store 업데이트
    scheduleStore.setBasicInfo({
      month: orgForm.value.month,
      organizationId: orgId,
      organizationName: orgForm.value.name,
      organizationType: orgForm.value.type,
      employeeCount: 0, // 직원은 Step3에서 설정
      shifts: orgStore.shifts,
    });

    // 5. Step2로 이동
    scheduleStore.currentStep = 2;
    window.$message?.success('기본 정보가 저장되었습니다.');
    router.push('/schedule/step2');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '데이터 저장 중 오류가 발생했습니다.';
    window.$message?.error(errorMessage);
  }
}
</script>
