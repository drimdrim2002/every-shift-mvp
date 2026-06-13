<template>
  <div>
    <!-- 직원 추가 버튼 -->
    <div class="mb-4 flex items-center justify-between">
      <span class="text-sm text-gray-600">
        총 {{ employees.length }}명의 직원
      </span>
      <n-button
        type="primary"
        size="small"
        @click="handleAdd"
      >
        + 직원 추가
      </n-button>
    </div>

    <!-- 직원 테이블 -->
    <n-data-table
      :columns="columns"
      :data="employees"
      :bordered="true"
      :pagination="pagination"
      :row-key="(row: EmployeeInput) => row.employeeId || row.name"
    />

    <!-- 직원 편집 모달 -->
    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="isEditing ? '직원 수정' : '직원 추가'"
      class="w-[500px]"
      :mask-closable="false"
    >
      <n-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-placement="left"
        label-width="100"
      >
        <n-form-item
          label="직원 ID"
          path="employeeId"
        >
          <n-input
            v-model:value="formData.employeeId"
            placeholder="미입력 시 자동 생성 (예: EMP001)"
            :maxlength="20"
          />
        </n-form-item>

        <n-form-item
          label="이름"
          path="name"
        >
          <n-input
            v-model:value="formData.name"
            placeholder="직원 이름 입력"
            :maxlength="50"
          />
        </n-form-item>

        <n-form-item
          label="가능 시프트"
          path="availableShifts"
        >
          <n-checkbox-group v-model:value="formData.availableShifts">
            <n-space>
              <n-checkbox
                v-for="shift in availableShiftOptions"
                :key="shift.code"
                :value="shift.code"
              >
                <span
                  class="inline-flex items-center gap-1"
                  :style="{ color: shift.colorCode }"
                >
                  <span
                    class="inline-block size-3 rounded"
                    :style="{ backgroundColor: shift.colorCode }"
                  />
                  {{ shift.code }} ({{ shift.name }})
                </span>
              </n-checkbox>
            </n-space>
          </n-checkbox-group>
        </n-form-item>

        <n-form-item
          label="프리셉터"
          path="preceptorEmployeeId"
        >
          <n-select
            v-model:value="formData.preceptorEmployeeId"
            :options="preceptorOptions"
            clearable
            placeholder="프리셉터 선택 (선택)"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="handleCancel">
            취소
          </n-button>
          <n-button
            type="primary"
            @click="handleConfirm"
          >
            {{ isEditing ? '수정' : '추가' }}
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue';
import {
  NButton,
  NDataTable,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NCheckboxGroup,
  NCheckbox,
  NSpace,
  NSelect,
  NPopconfirm,
  type FormInst,
  type FormRules,
  type DataTableColumns,
} from 'naive-ui';
import type { EmployeeInput } from '@/types/employee';
import type { Shift } from '@/types/shift';
import { buildPreceptorCandidateOptions, validatePreceptorAssignment } from '@/utils/preceptorValidation';
import { showError } from '@/utils/message';

// Props
interface Props {
  employees: EmployeeInput[];
  shifts: Shift[];
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (e: 'update:employees', employees: EmployeeInput[]): void;
  (e: 'add', employee: EmployeeInput): void;
  (e: 'edit', index: number, employee: EmployeeInput): void;
  (e: 'delete', index: number): void;
}

const emit = defineEmits<Emits>();

// State
const showModal = ref(false);
const isEditing = ref(false);
const editingIndex = ref(-1);
const formRef = ref<FormInst | null>(null);

const formData = ref<EmployeeInput>({
  employeeId: '',
  name: '',
  availableShifts: [],
  preceptorEmployeeId: null,
});

const preceptorOptions = computed(() =>
  buildPreceptorCandidateOptions(props.employees, editingIndex.value)
);

// 시프트 옵션 (O는 제외)
const availableShiftOptions = computed(() => {
  return props.shifts
    .filter((s) => s.code !== 'O') // O(Off)는 UI에서 숨김
    .map((s) => ({
      code: s.code,
      name: s.name,
      colorCode: s.colorCode,
    }));
});

// Pagination
const pagination = {
  pageSize: 10,
};

// Form Rules
const formRules: FormRules = {
  name: [
    { required: true, message: '이름을 입력해주세요', trigger: 'blur' },
    { max: 50, message: '이름은 50자 이하여야 합니다', trigger: 'blur' },
  ],
  availableShifts: [
    {
      type: 'array',
      required: true,
      message: '최소 1개의 시프트를 선택해주세요',
      trigger: 'change',
    },
  ],
};

// Table Columns
const columns = computed<DataTableColumns<EmployeeInput>>(() => [
  {
    title: '직원 ID',
    key: 'employeeId',
    width: 120,
    render(row) {
      return row.employeeId || '(자동 생성)';
    },
  },
  {
    title: '이름',
    key: 'name',
    width: 150,
  },
  {
    title: '가능 시프트',
    key: 'availableShifts',
    render(row) {
      // O는 표시하지 않음 (UI에서만 필터링)
      const filteredShifts = row.availableShifts.filter((code) => code !== 'O');
      
      return h('div', { class: 'flex flex-wrap gap-1' }, 
        filteredShifts.map((shiftCode) => {
          const shift = props.shifts.find((s) => s.code === shiftCode);
          return h(
            'span',
            {
              class: 'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium',
              style: {
                backgroundColor: shift?.colorCode + '20',
                color: shift?.colorCode,
              },
            },
            shiftCode
          );
        })
      );
    },
  },
  {
    title: '프리셉터',
    key: 'preceptorEmployeeId',
    width: 180,
    render(row) {
      if (!row.preceptorEmployeeId) {
        return h('span', { class: 'text-gray-500' }, '—');
      }

      const preceptor = props.employees.find(
        (employee) => employee.employeeId === row.preceptorEmployeeId
      );
      const label = preceptor?.name ?? '(미지정)';
      const employeeId = row.preceptorEmployeeId;

      return h('span', { 'data-test': 'preceptor-cell' }, [
        `${label} (`,
        h('span', { class: 'font-mono' }, employeeId),
        ')',
      ]);
    },
  },
  {
    title: '작업',
    key: 'actions',
    width: 120,
    render(row) {
      // 페이지네이션을 고려한 실제 인덱스 찾기
      const actualIndex = props.employees.findIndex(
        (emp) => emp.employeeId === row.employeeId && emp.name === row.name
      );
      
      return h('div', { class: 'flex gap-2' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            onClick: () => handleEdit(actualIndex),
          },
          { default: () => '수정' }
        ),
        h(
          NPopconfirm,
          {
            onPositiveClick: () => handleDelete(actualIndex),
          },
          {
            trigger: () =>
              h(
                NButton,
                { size: 'small', quaternary: true, type: 'error' },
                { default: () => '삭제' }
              ),
            default: () => '이 직원을 삭제하시겠습니까?',
          }
        ),
      ]);
    },
  },
]);

defineExpose({ columns, handleEdit, handleConfirm, formData, showModal });

// 직원 추가 핸들러
function handleAdd() {
  isEditing.value = false;
  editingIndex.value = -1;
  formData.value = {
    employeeId: '',
    name: '',
    // 기본값: O를 제외한 시프트만 선택
    availableShifts: props.shifts
      .filter((s) => s.code !== 'O')
      .map((s) => s.code),
    rankCode: null,
    preceptorEmployeeId: null,
  };
  showModal.value = true;
}

// 직원 수정 핸들러
function handleEdit(index: number) {
  isEditing.value = true;
  editingIndex.value = index;
  const employee = props.employees[index];
  if (!employee) return;
  formData.value = {
    employeeId: employee.employeeId,
    name: employee.name,
    availableShifts: [...employee.availableShifts],
    rankCode: employee.rankCode ?? null,
    preceptorEmployeeId: employee.preceptorEmployeeId ?? null,
  };
  showModal.value = true;
}

// 직원 삭제 핸들러
function handleDelete(index: number) {
  emit('delete', index);
  window.$message?.success('직원이 삭제되었습니다.');
}

// 모달 취소 핸들러
function handleCancel() {
  showModal.value = false;
}

// 모달 확인 핸들러
async function handleConfirm() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  const preceptorEmployeeId =
    formData.value.preceptorEmployeeId === '__separator__'
      ? null
      : formData.value.preceptorEmployeeId ?? null;

  const validationMessage = validatePreceptorAssignment({
    employees: props.employees,
    targetIndex: isEditing.value ? editingIndex.value : props.employees.length,
    preceptorEmployeeId,
  });
  if (validationMessage) {
    showError(validationMessage);
    return;
  }

  const employeeData: EmployeeInput = {
    employeeId: formData.value.employeeId || generateEmployeeId(),
    name: formData.value.name,
    availableShifts: [...formData.value.availableShifts],
    rankCode: formData.value.rankCode ?? null,
    preceptorEmployeeId,
  };

  if (isEditing.value) {
    emit('edit', editingIndex.value, employeeData);
    window.$message?.success('직원 정보가 수정되었습니다.');
  } else {
    // 중복 확인
    const isDuplicate = props.employees.some(
      (e) => e.name === employeeData.name && e.employeeId === employeeData.employeeId
    );
    if (isDuplicate) {
      window.$message?.error('동일한 직원이 이미 존재합니다.');
      return;
    }

    emit('add', employeeData);
    window.$message?.success('직원이 추가되었습니다.');
  }

  showModal.value = false;
}

// 자동 직원 ID 생성
function generateEmployeeId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `EMP${timestamp}${random}`;
}
</script>
