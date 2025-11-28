<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NColorPicker,
  NTimePicker,
  NButton,
  NSpace,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import type { Shift } from '@/types/shift'

// Props
interface Props {
  visible: boolean
  editingShift: Shift | null // null이면 추가 모드, 값이 있으면 수정 모드
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', shiftData: Omit<Shift, 'id' | 'organizationId' | 'createdAt'>): void
  (e: 'cancel'): void
}>()

// State
const formRef = ref<FormInst | null>(null)
const formData = ref({
  code: '',
  name: '',
  colorCode: '#3B82F6',
  startTime: null as number | null, // timestamp
  endTime: null as number | null, // timestamp
})

// 기본 시프트 색상
const defaultColors = [
  '#3B82F6', // Blue (D)
  '#F59E0B', // Orange (E)
  '#8B5CF6', // Purple (N)
  '#6B7280', // Gray (O)
  '#10B981', // Green
  '#EF4444', // Red
]

// Computed
const isEditMode = computed(() => props.editingShift !== null)
const modalTitle = computed(() => (isEditMode.value ? '시프트 수정' : '시프트 추가'))

// Validation Rules
const rules: FormRules = {
  code: [
    { required: true, message: '시프트 코드를 입력해주세요', trigger: 'blur' },
    { max: 2, message: '시프트 코드는 1-2자여야 합니다', trigger: 'blur' },
    {
      validator: (_rule, value: string) => {
        if (value && !/^[A-Za-z0-9]+$/.test(value)) {
          return new Error('영문 또는 숫자만 입력 가능합니다')
        }
        return true
      },
      trigger: 'blur',
    },
  ],
  name: [
    { required: true, message: '시프트 이름을 입력해주세요', trigger: 'blur' },
    { max: 50, message: '시프트 이름은 50자 이하여야 합니다', trigger: 'blur' },
  ],
  colorCode: [
    { required: true, message: '색상을 선택해주세요', trigger: 'blur' },
    {
      validator: (_rule, value: string) => {
        if (value && !/^#[0-9A-Fa-f]{6}$/.test(value)) {
          return new Error('#RRGGBB 형식이어야 합니다')
        }
        return true
      },
      trigger: 'blur',
    },
  ],
}

// Watch
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      // 모달 열릴 때 폼 초기화
      if (props.editingShift) {
        // 수정 모드: 기존 데이터로 채우기
        formData.value = {
          code: props.editingShift.code,
          name: props.editingShift.name,
          colorCode: props.editingShift.colorCode,
          startTime: props.editingShift.startTime
            ? parseTimeToTimestamp(props.editingShift.startTime)
            : null,
          endTime: props.editingShift.endTime
            ? parseTimeToTimestamp(props.editingShift.endTime)
            : null,
        }
      } else {
        // 추가 모드: 초기값으로 리셋
        resetForm()
      }
    }
  }
)

// Methods
function resetForm() {
  formData.value = {
    code: '',
    name: '',
    colorCode: '#3B82F6',
    startTime: null,
    endTime: null,
  }
}

function parseTimeToTimestamp(timeStr: string): number {
  // "HH:mm" or "HH:mm:ss" -> timestamp
  const parts = timeStr.split(':').map(Number)
  const hours = parts[0] || 0
  const minutes = parts[1] || 0
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.getTime()
}

function formatTimestamp(timestamp: number | null): string | null {
  if (!timestamp) return null
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function handleClose() {
  emit('update:visible', false)
  emit('cancel')
}

async function handleConfirm() {
  // 유효성 검증
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  // 데이터 변환 및 emit
  const shiftData: Omit<Shift, 'id' | 'organizationId' | 'createdAt'> = {
    code: formData.value.code.toUpperCase(),
    name: formData.value.name,
    colorCode: formData.value.colorCode,
    startTime: formatTimestamp(formData.value.startTime),
    endTime: formatTimestamp(formData.value.endTime),
  }

  emit('confirm', shiftData)
  emit('update:visible', false)
}

function handleCodeInput(value: string) {
  // 자동 대문자 변환
  formData.value.code = value.toUpperCase()
}
</script>

<template>
  <NModal
    :show="visible"
    preset="dialog"
    :title="modalTitle"
    :mask-closable="false"
    style="width: 480px"
    @close="handleClose"
    @mask-click="handleClose"
  >
    <NForm
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="left"
      label-width="100"
      require-mark-placement="right-hanging"
    >
      <NFormItem
        label="시프트 코드"
        path="code"
      >
        <NInput
          v-model:value="formData.code"
          placeholder="예: D, E, N, O"
          :maxlength="2"
          :disabled="isEditMode"
          @update:value="handleCodeInput"
        />
      </NFormItem>

      <NFormItem
        label="시프트 이름"
        path="name"
      >
        <NInput
          v-model:value="formData.name"
          placeholder="예: 주간, 야간, 비번"
          :maxlength="50"
        />
      </NFormItem>

      <NFormItem
        label="색상"
        path="colorCode"
      >
        <NColorPicker
          v-model:value="formData.colorCode"
          :swatches="defaultColors"
          :show-alpha="false"
          style="width: 100%"
        />
      </NFormItem>

      <NFormItem label="시작 시간">
        <NTimePicker
          v-model:value="formData.startTime"
          format="HH:mm"
          placeholder="선택 (선택사항)"
          clearable
          style="width: 100%"
        />
      </NFormItem>

      <NFormItem label="종료 시간">
        <NTimePicker
          v-model:value="formData.endTime"
          format="HH:mm"
          placeholder="선택 (선택사항)"
          clearable
          style="width: 100%"
        />
      </NFormItem>
    </NForm>

    <template #action>
      <NSpace justify="end">
        <NButton @click="handleClose">
          취소
        </NButton>
        <NButton
          type="primary"
          @click="handleConfirm"
        >
          {{ isEditMode ? '수정' : '추가' }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
/* ColorPicker의 텍스트 입력 필드만 숨기기 */
.color-picker-wrapper :deep(.n-color-picker-trigger__input) {
  display: none;
}
</style>
