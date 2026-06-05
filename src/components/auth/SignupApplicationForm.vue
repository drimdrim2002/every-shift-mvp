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
        <n-input
          v-model:value="formValue.hospitalName"
          placeholder="병원명 입력"
          @keydown.enter.prevent="handleHospitalSearchEnter"
        />
      </n-form-item>

      <HospitalSearchSection
        v-if="HOSPITAL_SEARCH_ENABLED"
        ref="hospitalSearchSectionRef"
        v-model:hospital-name="formValue.hospitalName"
        v-model:hospital-id="formValue.hospitalId"
      />
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
import type { FormInst, FormItemRule, FormRules } from 'naive-ui'
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NRadioButton,
  NRadioGroup,
} from 'naive-ui'
import HospitalSearchSection from '@/components/auth/HospitalSearchSection.vue'
import { HOSPITAL_SEARCH_ENABLED } from '@/constants/signupFeatures'
import { getSignupErrorMessage, submitSignup } from '@/api/signup'
import type { SignupNextState, SignupRole, SignupSubmitRequest } from '@/types/signup'
import { showError, showSuccess } from '@/utils/message'

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
const hospitalSearchSectionRef = ref<InstanceType<typeof HospitalSearchSection> | null>(null)
const submitting = ref(false)

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

    if (role === 'admin') {
      formValue.value.inviteCode = ''
      return
    }

    formValue.value.hospitalName = ''
    formValue.value.hospitalId = null
    hospitalSearchSectionRef.value?.resetHospitalSearchState()
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

function handleHospitalSearchEnter() {
  if (!HOSPITAL_SEARCH_ENABLED) {
    return
  }

  void hospitalSearchSectionRef.value?.handleHospitalSearch()
}

function buildAdminHospitalFields() {
  const hospitalName = formValue.value.hospitalName.trim()

  if (!HOSPITAL_SEARCH_ENABLED) {
    return {
      hospitalName,
      hospitalSource: 'manual' as const,
    }
  }

  const hospitalId = formValue.value.hospitalId ?? undefined

  return {
    ...(hospitalId ? { hospitalId } : {}),
    hospitalName,
    hospitalSource: hospitalId ? ('data.go.kr' as const) : ('manual' as const),
  }
}

function buildPasswordSignupRequest(): SignupSubmitRequest {
  if (formValue.value.role === 'admin') {
    return {
      authMode: 'password',
      role: 'admin',
      name: formValue.value.name.trim(),
      email: formValue.value.email.trim(),
      password: formValue.value.password,
      ...buildAdminHospitalFields(),
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
    return {
      authMode: 'existing_session',
      role: 'admin',
      name: formValue.value.name.trim(),
      ...buildAdminHospitalFields(),
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
