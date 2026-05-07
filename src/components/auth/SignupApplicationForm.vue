<template>
  <n-form
    ref="formRef"
    :model="formValue"
    :rules="rules"
    label-placement="top"
  >
    <n-form-item
      label="이름"
      path="name"
    >
      <n-input
        v-model:value="formValue.name"
        placeholder="이름 입력"
      />
    </n-form-item>

    <n-form-item
      v-if="mode === 'password'"
      label="이메일"
      path="email"
    >
      <n-input
        v-model:value="formValue.email"
        placeholder="name@example.com"
      />
    </n-form-item>

    <n-form-item
      v-else
      label="이메일"
    >
      <div class="w-full space-y-2">
        <p class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          {{ sessionEmail ?? '이메일 확인 필요' }}
        </p>
        <n-input
          :value="sessionEmail ?? ''"
          readonly
          placeholder="name@example.com"
          class="sr-only"
        />
      </div>
    </n-form-item>

    <n-form-item
      v-if="mode === 'password'"
      label="비밀번호"
      path="password"
    >
      <n-input
        v-model:value="formValue.password"
        type="password"
        show-password-on="click"
        placeholder="8자 이상 입력"
      />
    </n-form-item>

    <n-form-item
      v-if="mode === 'password'"
      label="비밀번호 확인"
      path="passwordConfirm"
    >
      <n-input
        v-model:value="formValue.passwordConfirm"
        type="password"
        show-password-on="click"
        placeholder="비밀번호 재입력"
      />
    </n-form-item>

    <n-form-item
      label="가입 역할"
      path="role"
    >
      <n-radio-group v-model:value="formValue.role">
        <n-radio-button value="admin">
          관리자
        </n-radio-button>
        <n-radio-button value="user">
          사용자
        </n-radio-button>
      </n-radio-group>
    </n-form-item>

    <div
      v-if="formValue.role === 'admin'"
      class="space-y-2"
    >
      <n-form-item
        label="병원명"
        path="hospitalName"
      >
        <div class="w-full space-y-1">
          <div
            ref="hospitalSearchFieldRef"
            class="flex w-full gap-2"
          >
            <n-input
              v-model:value="formValue.hospitalName"
              placeholder="병원명을 직접 입력하거나 검색하세요"
              @keydown.enter.prevent="handleHospitalSearch"
            />
            <n-button
              data-test="signup-search"
              secondary
              :disabled="!canSearchHospital"
              :loading="hospitalLoading"
              @click="handleHospitalSearch"
            >
              검색
            </n-button>
          </div>
          <p
            class="text-xs text-gray-500"
            data-test="signup-hospital-search-source"
          >
            검색 출처: 공공데이터포털(data.go.kr)
          </p>
        </div>
      </n-form-item>

      <n-alert
        type="info"
        class="mb-2"
        data-test="signup-manual-hospital-info"
      >
        병원명은 검색 결과에서 선택하거나 직접 입력할 수 있습니다.
      </n-alert>

      <n-form-item
        label="검색 결과에서 선택 (선택사항)"
      >
        <n-select
          :value="formValue.hospitalId"
          data-test="signup-hospital-select"
          :options="hospitalOptions"
          :loading="hospitalLoading"
          placeholder="검색 결과를 선택하면 병원명이 자동 입력됩니다"
          filterable
          clearable
          @update:value="handleHospitalSelect"
        />
      </n-form-item>

      <n-alert
        v-if="hospitalSearchFeedback?.type === 'empty'"
        type="warning"
        class="mb-2"
        data-test="signup-manual-hospital-empty"
      >
        '{{ hospitalSearchFeedback.keyword }}' 검색 결과가 없습니다. 입력한 병원명으로 가입을 계속 진행할 수 있습니다.
      </n-alert>

      <n-alert
        v-else-if="hospitalSearchFeedback?.type === 'error'"
        type="warning"
        class="mb-2"
        data-test="signup-manual-hospital-error"
      >
        병원 검색이 원활하지 않습니다. 병원명을 직접 입력해 가입을 계속 진행할 수 있습니다.
      </n-alert>
    </div>

    <div
      v-else
      class="space-y-2"
    >
      <n-form-item
        label="초대코드"
        path="inviteCode"
      >
        <n-input
          v-model:value="formValue.inviteCode"
          placeholder="초대코드 입력"
        />
      </n-form-item>
    </div>

    <n-button
      data-test="signup-submit"
      type="primary"
      block
      :loading="submitting"
      :disabled="isRoleSpecificFieldMissing"
      class="mt-4"
      @click="handleSignup"
    >
      {{ submitLabel }}
    </n-button>

    <n-button
      data-test="signup-to-login"
      tertiary
      block
      class="mt-3"
      @click="emit('cancel')"
    >
      로그인으로 이동
    </n-button>
  </n-form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FormInst, FormItemRule, FormRules, SelectOption } from 'naive-ui'
import {
  NAlert,
  NButton,
  NForm,
  NFormItem,
  NInput,
  NRadioButton,
  NRadioGroup,
  NSelect,
} from 'naive-ui'
import { searchHospitals } from '@/api/hospital'
import { getSignupErrorMessage, submitSignup } from '@/api/signup'
import type { SignupNextState, SignupRole, SignupSubmitRequest } from '@/types/signup'
import { showError, showInfo, showSuccess } from '@/utils/message'

interface SignupFormValue {
  name: string
  email: string
  password: string
  passwordConfirm: string
  role: SignupRole
  hospitalName: string
  hospitalId: string | null
  inviteCode: string
}

interface HospitalSearchFeedback {
  type: 'empty' | 'error'
  keyword: string
}

const props = withDefaults(
  defineProps<{
    mode?: 'password' | 'existing_session'
    sessionEmail?: string | null
    initialRole?: SignupRole
  }>(),
  {
    mode: 'password',
    sessionEmail: null,
    initialRole: 'admin',
  },
)

const emit = defineEmits<{
  completed: [nextState: SignupNextState]
  cancel: []
  'state-reset': []
}>()

const formRef = ref<FormInst | null>(null)
const hospitalSearchFieldRef = ref<HTMLElement | null>(null)
const hospitalLoading = ref(false)
const submitting = ref(false)
const hospitalOptions = ref<SelectOption[]>([])
const hospitalSearchFeedback = ref<HospitalSearchFeedback | null>(null)

const formValue = ref<SignupFormValue>({
  name: '',
  email: props.sessionEmail ?? '',
  password: '',
  passwordConfirm: '',
  role: props.initialRole,
  hospitalName: '',
  hospitalId: null,
  inviteCode: '',
})

const hospitalNameValidationRule: FormItemRule = {
  trigger: ['blur', 'change'],
  validator: () => {
    if (formValue.value.role === 'admin' && !formValue.value.hospitalName.trim()) {
      return new Error('병원명을 입력하세요')
    }
    return true
  },
}

const inviteCodeValidationRule: FormItemRule = {
  trigger: ['blur', 'input'],
  validator: () => {
    if (formValue.value.role === 'user' && !formValue.value.inviteCode.trim()) {
      return new Error('초대코드를 입력하세요')
    }
    return true
  },
}

const rules = computed<FormRules>(() => ({
  name: {
    required: true,
    message: '이름을 입력하세요',
    trigger: 'blur',
  },
  ...(props.mode === 'password'
    ? {
        email: [
          {
            required: true,
            message: '이메일을 입력하세요',
            trigger: 'blur',
          },
          {
            type: 'email',
            message: '올바른 이메일 형식을 입력하세요',
            trigger: ['blur', 'input'],
          },
        ],
        password: [
          {
            required: true,
            message: '비밀번호를 입력하세요',
            trigger: 'blur',
          },
          {
            trigger: ['blur', 'input'],
            validator: (_rule: FormItemRule, value: string) => {
              if (!value || value.length < 8) {
                return new Error('비밀번호는 8자 이상이어야 합니다')
              }
              return true
            },
          },
        ],
        passwordConfirm: [
          {
            required: true,
            message: '비밀번호 확인을 입력하세요',
            trigger: 'blur',
          },
          {
            trigger: ['blur', 'input'],
            validator: (_rule: FormItemRule, value: string) => {
              if (value !== formValue.value.password) {
                return new Error('비밀번호가 일치하지 않습니다')
              }
              return true
            },
          },
        ],
      }
    : {}),
  hospitalName: hospitalNameValidationRule,
  inviteCode: inviteCodeValidationRule,
}))

const canSearchHospital = computed(() => formValue.value.hospitalName.trim().length >= 2)

const isRoleSpecificFieldMissing = computed(() => {
  if (formValue.value.role === 'admin') {
    return formValue.value.hospitalName.trim().length === 0
  }

  return formValue.value.inviteCode.trim().length === 0
})

const submitLabel = computed(() =>
  formValue.value.role === 'admin' ? '가입 신청' : '가입하기',
)

watch(
  () => formValue.value.role,
  (role) => {
    emit('state-reset')
    hospitalSearchFeedback.value = null

    if (role === 'admin') {
      formValue.value.inviteCode = ''
      return
    }

    formValue.value.hospitalName = ''
    formValue.value.hospitalId = null
    hospitalOptions.value = []
  },
)

watch(
  () => formValue.value.hospitalName,
  (hospitalName) => {
    if (hospitalSearchFeedback.value && hospitalSearchFeedback.value.keyword !== hospitalName.trim()) {
      hospitalSearchFeedback.value = null
    }

    if (formValue.value.role !== 'admin' || !formValue.value.hospitalId) {
      return
    }

    const selectedHospitalName = resolveSelectedHospitalName(formValue.value.hospitalId)
    if (!selectedHospitalName || selectedHospitalName !== hospitalName.trim()) {
      formValue.value.hospitalId = null
    }
  },
)

watch(
  () => props.sessionEmail,
  (sessionEmail) => {
    if (props.mode === 'existing_session') {
      formValue.value.email = sessionEmail ?? ''
    }
  },
)

function resolveHospitalSearchKeyword(): string {
  const inputValue = hospitalSearchFieldRef.value
    ?.querySelector('input')
    ?.value

  const keyword = (inputValue ?? formValue.value.hospitalName).trim()

  if (keyword !== formValue.value.hospitalName) {
    formValue.value.hospitalName = keyword
  }

  return keyword
}

function resolveSelectedHospitalName(hospitalId: string | null): string | null {
  if (!hospitalId) {
    return null
  }

  const option = hospitalOptions.value.find((candidate) => candidate.value === hospitalId)
  return option?.label?.toString().trim() || null
}

function handleHospitalSelect(value: string | null) {
  formValue.value.hospitalId = value

  const hospitalName = resolveSelectedHospitalName(value)
  if (hospitalName) {
    formValue.value.hospitalName = hospitalName
  }
}

async function handleHospitalSearch() {
  const keyword = resolveHospitalSearchKeyword()

  if (keyword.length < 2) {
    showInfo('병원명을 2글자 이상 입력하세요.')
    return
  }

  hospitalLoading.value = true

  try {
    const items = await searchHospitals(keyword)
    hospitalOptions.value = items.map((item) => ({
      label: item.name,
      value: item.id,
    }))

    if (hospitalOptions.value.length === 0) {
      hospitalSearchFeedback.value = {
        type: 'empty',
        keyword,
      }
      showInfo('검색 결과가 없어도 병원명을 직접 입력하고 가입 신청할 수 있습니다.')
      return
    }

    hospitalSearchFeedback.value = null
  } catch {
    hospitalSearchFeedback.value = {
      type: 'error',
      keyword,
    }
    showInfo('병원 검색이 원활하지 않습니다. 병원명을 직접 입력해 가입을 계속 진행할 수 있습니다.')
  } finally {
    hospitalLoading.value = false
  }
}

function buildPasswordSignupRequest(): SignupSubmitRequest {
  if (formValue.value.role === 'admin') {
    const hospitalName = formValue.value.hospitalName.trim()
    const hospitalId = formValue.value.hospitalId ?? undefined

    return {
      authMode: 'password',
      role: 'admin',
      name: formValue.value.name.trim(),
      email: formValue.value.email.trim(),
      password: formValue.value.password,
      ...(hospitalId ? { hospitalId } : {}),
      hospitalName,
      hospitalSource: hospitalId ? 'data.go.kr' : 'manual',
    }
  }

  return {
    authMode: 'password',
    role: 'user',
    name: formValue.value.name.trim(),
    email: formValue.value.email.trim(),
    password: formValue.value.password,
    inviteCode: formValue.value.inviteCode.trim(),
  }
}

function buildExistingSessionSignupRequest(): SignupSubmitRequest {
  if (formValue.value.role === 'admin') {
    const hospitalName = formValue.value.hospitalName.trim()
    const hospitalId = formValue.value.hospitalId ?? undefined

    return {
      authMode: 'existing_session',
      role: 'admin',
      name: formValue.value.name.trim(),
      ...(hospitalId ? { hospitalId } : {}),
      hospitalName,
      hospitalSource: hospitalId ? 'data.go.kr' : 'manual',
    }
  }

  return {
    authMode: 'existing_session',
    role: 'user',
    name: formValue.value.name.trim(),
    inviteCode: formValue.value.inviteCode.trim(),
  }
}

function buildSignupRequest(): SignupSubmitRequest {
  return props.mode === 'existing_session'
    ? buildExistingSessionSignupRequest()
    : buildPasswordSignupRequest()
}

async function handleSignup() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  submitting.value = true

  try {
    const result = await submitSignup(buildSignupRequest())
    emit('completed', result.nextState)

    if (result.nextState === 'pending_approval') {
      showSuccess('가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.')
      return
    }

    showSuccess('가입이 완료되었습니다. 로그인할 수 있습니다.')
  } catch (error) {
    const message =
      error instanceof Error && 'code' in error
        ? getSignupErrorMessage(String(error.code))
        : error instanceof Error
          ? error.message
          : '회원가입에 실패했습니다.'
    showError(message)
  } finally {
    submitting.value = false
  }
}
</script>
