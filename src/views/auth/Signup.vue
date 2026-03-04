<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
    <n-card
      class="w-full max-w-xl"
      title="EveryShift 회원가입"
    >
      <n-alert
        v-if="resultNextState === 'pending_approval'"
        type="info"
        class="mb-4"
      >
        가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.
      </n-alert>
      <n-alert
        v-else-if="resultNextState === 'active'"
        type="success"
        class="mb-4"
      >
        가입이 완료되었습니다. 로그인 페이지에서 바로 로그인할 수 있습니다.
      </n-alert>

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
          label="이메일"
          path="email"
        >
          <n-input
            v-model:value="formValue.email"
            placeholder="name@example.com"
          />
        </n-form-item>

        <n-form-item
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
          <n-form-item label="병원 검색">
            <div class="flex w-full gap-2">
              <n-input
                v-model:value="formValue.hospitalKeyword"
                placeholder="병원명을 2글자 이상 입력하세요"
                @keydown.enter.prevent="handleHospitalSearch"
              />
              <n-button
                secondary
                :disabled="!canSearchHospital"
                :loading="hospitalLoading"
                @click="handleHospitalSearch"
              >
                검색
              </n-button>
            </div>
          </n-form-item>

          <n-form-item
            label="병원 선택"
            path="hospitalId"
          >
            <n-select
              v-model:value="formValue.hospitalId"
              :options="hospitalOptions"
              :loading="hospitalLoading"
              placeholder="병원을 선택하세요"
              filterable
              clearable
            />
          </n-form-item>

          <p class="text-xs text-gray-500">
            병원 목록 출처: 공공데이터포털(data.go.kr)
          </p>
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
          type="primary"
          block
          :loading="authStore.loading"
          class="mt-4"
          @click="handleSignup"
        >
          {{ submitLabel }}
        </n-button>

        <n-button
          tertiary
          block
          class="mt-3"
          @click="moveToLogin"
        >
          로그인으로 이동
        </n-button>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInst, FormItemRule, FormRules, SelectOption } from 'naive-ui'
import {
  NAlert,
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NRadioButton,
  NRadioGroup,
  NSelect,
} from 'naive-ui'
import { searchHospitals } from '@/api/hospital'
import { useGlobalMessage } from '@/composables/useGlobalMessage'
import { useAuthStore } from '@/stores/auth'
import type { SignupNextState, SignupRole, SignupSubmitRequest } from '@/types/signup'

interface SignupFormValue {
  name: string
  email: string
  password: string
  role: SignupRole
  hospitalKeyword: string
  hospitalId: string | null
  inviteCode: string
}

const router = useRouter()
const authStore = useAuthStore()
const { success, error, info } = useGlobalMessage()

const formRef = ref<FormInst | null>(null)
const hospitalLoading = ref(false)
const hospitalOptions = ref<SelectOption[]>([])
const resultNextState = ref<SignupNextState | null>(null)

const formValue = ref<SignupFormValue>({
  name: '',
  email: '',
  password: '',
  role: 'admin',
  hospitalKeyword: '',
  hospitalId: null,
  inviteCode: '',
})

const hospitalValidationRule: FormItemRule = {
  trigger: ['blur', 'change'],
  validator: () => {
    if (formValue.value.role === 'admin' && !formValue.value.hospitalId) {
      return new Error('병원을 선택하세요')
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

const rules: FormRules = {
  name: {
    required: true,
    message: '이름을 입력하세요',
    trigger: 'blur',
  },
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
      validator: (_rule, value: string) => {
        if (!value || value.length < 8) {
          return new Error('비밀번호는 8자 이상이어야 합니다')
        }
        return true
      },
    },
  ],
  hospitalId: hospitalValidationRule,
  inviteCode: inviteCodeValidationRule,
}

const submitLabel = computed(() => (formValue.value.role === 'admin' ? '가입 신청' : '가입하기'))
const canSearchHospital = computed(() => formValue.value.hospitalKeyword.trim().length >= 2)

function getSelectedHospitalName(): string {
  const selectedHospitalId = formValue.value.hospitalId
  if (!selectedHospitalId) {
    return ''
  }

  const option = hospitalOptions.value.find((item) => item.value === selectedHospitalId)
  return typeof option?.label === 'string' ? option.label : ''
}

async function handleHospitalSearch() {
  if (!canSearchHospital.value) {
    info('병원 검색은 2글자 이상 입력해주세요')
    hospitalOptions.value = []
    return
  }

  hospitalLoading.value = true

  try {
    const hospitals = await searchHospitals(formValue.value.hospitalKeyword)
    hospitalOptions.value = hospitals.map((hospital) => ({
      label: hospital.name,
      value: hospital.id,
    }))

    if (formValue.value.hospitalKeyword.trim().length > 0 && hospitals.length === 0) {
      info('검색 결과가 없습니다')
    }
  } catch (searchError: unknown) {
    const message = searchError instanceof Error ? searchError.message : '병원 검색에 실패했습니다'
    error(message)
  } finally {
    hospitalLoading.value = false
  }
}

function buildSignupRequest(): SignupSubmitRequest {
  if (formValue.value.role === 'admin') {
    const hospitalName = getSelectedHospitalName()

    return {
      role: 'admin',
      name: formValue.value.name.trim(),
      email: formValue.value.email.trim(),
      password: formValue.value.password,
      hospitalId: formValue.value.hospitalId ?? undefined,
      hospitalName: hospitalName || undefined,
      hospitalSource: 'data.go.kr',
      organizationSelectionMode: 'existing',
    }
  }

  return {
    role: 'user',
    name: formValue.value.name.trim(),
    email: formValue.value.email.trim(),
    password: formValue.value.password,
    inviteCode: formValue.value.inviteCode.trim(),
    organizationSelectionMode: 'existing',
  }
}

async function handleSignup() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  if (formValue.value.role === 'admin' && !getSelectedHospitalName()) {
    error('선택한 병원 정보를 다시 확인해주세요')
    return
  }

  const result = await authStore.signup(buildSignupRequest())

  if (!result.success) {
    error(result.error || '회원가입 처리 중 오류가 발생했습니다')
    return
  }

  resultNextState.value = result.nextState

  if (result.nextState === 'active') {
    success('가입이 완료되었습니다. 로그인할 수 있습니다.')
    return
  }

  success('가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.')
}

async function moveToLogin() {
  if (resultNextState.value) {
    if (authStore.user) {
      await authStore.logout()
    }

    router.push({
      path: '/login',
      query: {
        signupState: resultNextState.value,
      },
    })
    return
  }

  router.push('/login')
}

watch(
  () => formValue.value.role,
  (role) => {
    resultNextState.value = null

    if (role === 'admin') {
      formValue.value.inviteCode = ''
    } else {
      formValue.value.hospitalId = null
      hospitalOptions.value = []
    }

    formRef.value?.restoreValidation()
  }
)
</script>
