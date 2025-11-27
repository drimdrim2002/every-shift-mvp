<template>
  <n-modal
    :show="visible"
    preset="card"
    title="엑셀 미리보기"
    size="huge"
    :segmented="{ content: true }"
    @update:show="handleClose"
  >
    <div class="space-y-4">
      <!-- 검증 결과 표시 -->
      <div v-if="validationResult">
        <!-- 에러 표시 -->
        <n-alert
          v-if="validationResult.errors.length > 0"
          type="error"
          title="검증 실패"
          class="mb-4"
        >
          <div class="space-y-2">
            <p class="font-semibold">
              {{ validationResult.errors.length }}개의 에러가 발견되었습니다.
            </p>
            <ul class="list-inside list-disc space-y-1">
              <li
                v-for="(error, index) in displayedErrors"
                :key="index"
                class="text-sm"
              >
                <strong>[{{ error.sheet }}]</strong>
                <span v-if="error.row"> 행 {{ error.row }}</span>
                <span v-if="error.column"> - {{ error.column }}</span>: {{ error.message }}
              </li>
            </ul>
            <n-button
              v-if="validationResult.errors.length > 5"
              text
              type="primary"
              size="small"
              @click="showAllErrors = !showAllErrors"
            >
              {{ showAllErrors ? '접기' : `${validationResult.errors.length - 5}개 더보기` }}
            </n-button>
          </div>
        </n-alert>

        <!-- 경고 표시 -->
        <n-alert
          v-if="validationResult.warnings.length > 0"
          type="warning"
          title="경고"
          class="mb-4"
        >
          <p class="mb-2">
            {{ validationResult.warnings.length }}개의 경고가 있습니다. 계속 진행할 수 있습니다.
          </p>
          <ul class="list-inside list-disc space-y-1">
            <li
              v-for="(warning, index) in validationResult.warnings"
              :key="index"
              class="text-sm"
            >
              {{ warning.message }}
            </li>
          </ul>
        </n-alert>

        <!-- 성공 표시 -->
        <n-alert
          v-if="validationResult.isValid && validationResult.warnings.length === 0"
          type="success"
          title="검증 성공"
          class="mb-4"
        >
          모든 데이터가 정상적으로 검증되었습니다.
        </n-alert>
      </div>

      <!-- 데이터 미리보기 탭 (3개 탭) -->
      <n-tabs
        v-if="parsedData"
        type="line"
        animated
      >
        <!-- Tab 1: 직원정보 -->
        <n-tab-pane
          name="employees"
          tab="직원정보"
        >
          <div class="mb-2 text-sm text-gray-500">
            총 {{ parsedData.employees.length }}명의 직원
          </div>
          <n-data-table
            :columns="employeeColumns"
            :data="parsedData.employees"
            :pagination="{ pageSize: 10 }"
            :bordered="false"
            :max-height="400"
          />
        </n-tab-pane>

        <!-- Tab 2: 요일별인력 (세로형) -->
        <n-tab-pane
          name="requirements"
          tab="요일별인력"
        >
          <div class="mb-2 text-sm text-gray-500">
            총 {{ parsedData.siteRequirements.length }}개 행 (7일 x 시프트 수)
          </div>
          <n-data-table
            :columns="requirementColumns"
            :data="parsedData.siteRequirements"
            :pagination="{ pageSize: 21 }"
            :bordered="false"
            :max-height="400"
          />
        </n-tab-pane>

        <!-- Tab 3: 전월데이터 -->
        <n-tab-pane
          name="previousMonth"
          tab="전월데이터"
        >
          <div class="space-y-4 py-4">
            <div class="mb-2 text-sm text-gray-500">
              전월 마지막 5일 데이터 (AI Solver 연속성 계산용)
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="font-semibold">
                  직원 수
                </p>
                <p class="text-2xl">
                  {{ getPreviousMonthEmployeeCount() }}명
                </p>
              </div>
              <div>
                <p class="font-semibold">
                  시프트 데이터
                </p>
                <p class="text-2xl">
                  {{ getPreviousMonthCount() }}건
                </p>
              </div>
            </div>
            <!-- 전월 데이터 요약 테이블 -->
            <n-data-table
              v-if="previousMonthTableData.length > 0"
              :columns="previousMonthColumns"
              :data="previousMonthTableData"
              :pagination="{ pageSize: 10 }"
              :bordered="false"
              :max-height="300"
            />
          </div>
        </n-tab-pane>
      </n-tabs>
    </div>

    <!-- Footer 버튼 -->
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button
          @click="handleCancel"
        >
          취소
        </n-button>
        <n-button
          type="primary"
          :disabled="!validationResult?.isValid"
          @click="handleConfirm"
        >
          확인
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref, h } from 'vue';
import { NModal, NTabs, NTabPane, NDataTable, NAlert, NButton, NTag, type DataTableColumns } from 'naive-ui';
import type {
  ParsedExcelData,
  ExcelValidationResult,
  EmployeeData,
  SiteRequirementRow,
} from '@/types/excel';

interface Props {
  visible: boolean;
  parsedData: ParsedExcelData | null;
  validationResult: ExcelValidationResult | null;
}

interface Emits {
  (e: 'confirm', data: ParsedExcelData): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showAllErrors = ref(false);

// 표시할 에러 목록 (최대 5개 또는 전체)
const displayedErrors = computed(() => {
  if (!props.validationResult) return [];
  if (showAllErrors.value) {
    return props.validationResult.errors;
  }
  return props.validationResult.errors.slice(0, 5);
});

// 직원정보 테이블 컬럼
const employeeColumns: DataTableColumns<EmployeeData> = [
  {
    title: '직원ID',
    key: 'employeeId',
    width: 120,
  },
  {
    title: '이름',
    key: 'name',
    width: 100,
  },
  {
    title: '가능한 시프트',
    key: 'availableShifts',
    render(row) {
      return row.availableShifts.join(', ');
    },
  },
];

// 요일별인력 테이블 컬럼 (세로형)
const requirementColumns: DataTableColumns<SiteRequirementRow> = [
  {
    title: '요일',
    key: 'dayName',
    width: 100,
  },
  {
    title: '시프트',
    key: 'shiftCode',
    width: 80,
    render(row) {
      const colors: Record<string, string> = {
        D: '#3B82F6',
        E: '#F59E0B',
        N: '#8B5CF6',
        O: '#6B7280',
      };
      const color = colors[row.shiftCode] || '#6B7280';
      return h(
        NTag,
        {
          size: 'small',
          bordered: false,
          style: { backgroundColor: color, color: 'white' },
        },
        { default: () => row.shiftCode }
      );
    },
  },
  {
    title: '필요인력수',
    key: 'requiredCount',
    width: 100,
    align: 'center',
  },
];

// 전월 데이터 테이블 타입
interface PreviousMonthRow {
  employeeId: string;
  shiftCount: number;
  shifts: string;
}

// 전월 데이터 테이블 컬럼
const previousMonthColumns: DataTableColumns<PreviousMonthRow> = [
  {
    title: '직원ID',
    key: 'employeeId',
    width: 120,
  },
  {
    title: '시프트 수',
    key: 'shiftCount',
    width: 100,
    align: 'center',
  },
  {
    title: '시프트 내역',
    key: 'shifts',
    ellipsis: {
      tooltip: true,
    },
  },
];

// 전월 데이터 테이블 데이터
const previousMonthTableData = computed<PreviousMonthRow[]>(() => {
  if (!props.parsedData) return [];

  return Object.entries(props.parsedData.previousMonthData).map(([employeeId, dateMap]) => {
    const shifts = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, shift]) => `${date.slice(5)}: ${shift}`)
      .join(', ');

    return {
      employeeId,
      shiftCount: Object.keys(dateMap).length,
      shifts,
    };
  });
});

/**
 * 전월 데이터 개수 계산
 */
function getPreviousMonthCount(): number {
  if (!props.parsedData) return 0;
  let count = 0;
  Object.values(props.parsedData.previousMonthData).forEach((dateMap) => {
    count += Object.keys(dateMap).length;
  });
  return count;
}

/**
 * 전월 데이터 직원 수 계산
 */
function getPreviousMonthEmployeeCount(): number {
  if (!props.parsedData) return 0;
  return Object.keys(props.parsedData.previousMonthData).length;
}

/**
 * 확인 버튼 핸들러
 */
function handleConfirm() {
  if (props.parsedData && props.validationResult?.isValid) {
    emit('confirm', props.parsedData);
  }
}

/**
 * 취소 버튼 핸들러
 */
function handleCancel() {
  emit('cancel');
}

/**
 * 모달 닫기 핸들러
 */
function handleClose(show: boolean) {
  if (!show) {
    emit('cancel');
  }
}
</script>
