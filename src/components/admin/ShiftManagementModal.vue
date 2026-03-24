<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  NAlert,
  NButton,
  NColorPicker,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NText,
  NTimePicker,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import type { Shift } from '@/types/shift'

interface Props {
  visible: boolean
  editingShift: Shift | null
  existingShifts: Shift[]
  saving?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  saving: false,
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'submit', value: Omit<Shift, 'id' | 'organizationId' | 'createdAt'>): void
}>()

interface ShiftFormState {
  code: string
  name: string
  colorCode: string
  startTime: number | null
  endTime: number | null
}

const formRef = ref<FormInst | null>(null)
const validationError = ref<string | null>(null)
const formData = ref<ShiftFormState>({
  code: '',
  name: '',
  colorCode: '#FF6B6B',
  startTime: null,
  endTime: null,
})

const defaultColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#F59E0B', '#64748B']

const isEditMode = computed(() => props.editingShift !== null)
const normalizedCode = computed(() => formData.value.code.trim().toUpperCase())
const modalTitle = computed(() => (isEditMode.value ? '시프트 수정' : '시프트 추가'))

const rules: FormRules = {
  code: [
    { required: true, message: '시프트 코드를 입력해주세요', trigger: 'blur' },
    {
      validator: (_rule, value: string) => {
        const nextCode = value.trim().toUpperCase()
        if (!/^[A-Z0-9]{1,2}$/.test(nextCode)) {
          return new Error('코드는 대문자 영숫자 1~2자여야 합니다')
        }

        const hasDuplicate = props.existingShifts.some((shift) => {
          if (props.editingShift && shift.id === props.editingShift.id) {
            return false
          }

          return shift.code.toUpperCase() === nextCode
        })

        if (hasDuplicate) {
          return new Error(`이미 존재하는 시프트 코드입니다: ${nextCode}`)
        }

        return true
      },
      trigger: ['blur', 'input'],
    },
  ],
  name: [
    { required: true, message: '시프트 이름을 입력해주세요', trigger: 'blur' },
    { max: 50, message: '시프트 이름은 50자 이하여야 합니다', trigger: 'blur' },
  ],
  colorCode: [
    {
      validator: (_rule, value: string) => {
        if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
          return new Error('#RRGGBB 형식의 색상을 선택해주세요')
        }

        return true
      },
      trigger: ['blur', 'change'],
    },
  ],
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      return
    }

    validationError.value = null
    if (props.editingShift) {
      formData.value = {
        code: props.editingShift.code,
        name: props.editingShift.name,
        colorCode: props.editingShift.colorCode,
        startTime: parseTimeToTimestamp(props.editingShift.startTime),
        endTime: parseTimeToTimestamp(props.editingShift.endTime),
      }
      return
    }

    formData.value = {
      code: '',
      name: '',
      colorCode: '#FF6B6B',
      startTime: null,
      endTime: null,
    }
  },
)

function parseTimeToTimestamp(time: string | null): number | null {
  if (!time) {
    return null
  }

  const [hoursText = '0', minutesText = '0'] = time.split(':')
  const date = new Date()
  date.setHours(Number(hoursText), Number(minutesText), 0, 0)
  return date.getTime()
}

function formatTimestamp(timestamp: number | null): string | null {
  if (timestamp === null) {
    return null
  }

  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function closeModal() {
  emit('update:visible', false)
}

function handleCodeInput(value: string) {
  formData.value.code = value.toUpperCase()
}

async function handleSubmit() {
  validationError.value = null

  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  const startTime = formatTimestamp(formData.value.startTime)
  const endTime = formatTimestamp(formData.value.endTime)
  const code = normalizedCode.value

  if ((startTime === null) !== (endTime === null)) {
    validationError.value = '시작 시간과 종료 시간은 모두 입력하거나 모두 비워주세요.'
    return
  }

  if (code === 'O' && (startTime !== null || endTime !== null)) {
    validationError.value = '휴무(O) 시프트는 시간을 비워두어야 합니다.'
    return
  }

  if (code !== 'O' && (startTime === null || endTime === null)) {
    validationError.value = '근무 시프트는 시작 시간과 종료 시간을 모두 입력해야 합니다.'
    return
  }

  if (startTime && endTime && startTime === endTime) {
    validationError.value = '시작 시간과 종료 시간은 같을 수 없습니다.'
    return
  }

  emit('submit', {
    code,
    name: formData.value.name.trim(),
    colorCode: formData.value.colorCode,
    startTime,
    endTime,
  })
}
</script>

<template>
  <NModal
    :show="visible"
    preset="dialog"
    :title="modalTitle"
    :mask-closable="false"
    style="width: 520px"
    @close="closeModal"
    @mask-click="closeModal"
  >
    <div class="space-y-4">
      <NAlert
        v-if="validationError"
        type="error"
        :show-icon="true"
      >
        {{ validationError }}
      </NAlert>

      <NAlert
        type="info"
        :show-icon="true"
      >
        현재 운영 호환 범위는 D/E/N/O를 기준으로 유지됩니다. 추가 코드는 저장할 수 있지만 Step wizard와 결과 화면의 실사용 확장은 P7 범위입니다.
      </NAlert>

      <NForm
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-placement="left"
        label-width="110"
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
            placeholder="예: 낮, 저녁, 밤, 휴무"
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

        <NFormItem
          label="시작 시간"
          path="startTime"
        >
          <NTimePicker
            v-model:value="formData.startTime"
            format="HH:mm"
            placeholder="시작 시간 선택"
            style="width: 100%"
          />
        </NFormItem>

        <NFormItem
          label="종료 시간"
          path="endTime"
        >
          <NTimePicker
            v-model:value="formData.endTime"
            format="HH:mm"
            placeholder="종료 시간 선택"
            style="width: 100%"
          />
        </NFormItem>
      </NForm>

      <NText depth="3">
        종료 시간이 시작 시간보다 이르면 다음날 종료로 해석합니다. 휴무(O)는 시작/종료 시간을 모두 비워두세요.
      </NText>

      <div class="flex justify-end gap-2">
        <NButton
          :disabled="saving"
          @click="closeModal"
        >
          취소
        </NButton>
        <NButton
          type="primary"
          :loading="saving"
          @click="handleSubmit"
        >
          {{ isEditMode ? '수정 저장' : '추가 저장' }}
        </NButton>
      </div>
    </div>
  </NModal>
</template>
