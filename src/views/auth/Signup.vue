<template>
  <AuthPageShell
    eyebrow="EveryShift 시작하기"
    title="회원가입"
    description="관리자는 병원을 선택해 가입 신청하고, 사용자는 초대코드로 참여합니다."
  >
    <n-card
      class="mx-auto w-full max-w-xl lg:mr-0"
      title="회원가입"
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
            <div
              ref="hospitalSearchFieldRef"
              class="flex w-full gap-2"
            >
              <n-input
                v-model:value="formValue.hospitalKeyword"
                placeholder="병원명을 2글자 이상 입력하세요"
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
          </n-form-item>

          <n-form-item
            label="병원 선택"
            path="hospitalId"
          >
            <n-select
              v-model:value="formValue.hospitalId"
              data-test="signup-hospital-select"
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
          @click="moveToLogin"
        >
          로그인으로 이동
        </n-button>
      </n-form>
    </n-card>
  </AuthPageShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import { getSignupErrorMessage, submitSignup } from '@/api/signup'
import AuthPageShell from '@/components/auth/AuthPageShell.vue'
import { LOGIN_ROUTE_PATH } from '@/constants/routes'
import type { SignupNextState, SignupRole } from '@/types/signup'
import { showError, showInfo, showSuccess } from '@/utils/message'

interface SignupFormValue {
  name: string
  email: string
  password: string
  role: SignupRole
  hospitalKeyword: string
  hospitalId: string | null
  inviteCode: string
}

function resolveInitialSignupRole(value: unknown): SignupRole {
  return value === 'user' ? 'user' : 'admin'
}

const route = useRoute()
const router = useRouter()

const formRef = ref<FormInst | null>(null)
const hospitalSearchFieldRef = ref<HTMLElement | null>(null)
const hospitalLoading = ref(false)
const submitting = ref(false)
const hospitalOptions = ref<SelectOption[]>([])
const resultNextState = ref<SignupNextState | null>(null)

const formValue = ref<SignupFormValue>({
  name: '',
  email: '',
  password: '',
  role: resolveInitialSignupRole(route.query.role),
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

const canSearchHospital = computed(() => formValue.value.hospitalKeyword.trim().length >= 2)

const isRoleSpecificFieldMissing = computed(() => {
  if (formValue.value.role === 'admin') {
    return !formValue.value.hospitalId
  }

  return formValue.value.inviteCode.trim().length === 0
})

const submitLabel = computed(() =>
  formValue.value.role === 'admin' ? '가입 신청' : '가입하기',
)

watch(
  () => formValue.value.role,
  (role) => {
    resultNextState.value = null

    if (role === 'admin') {
      formValue.value.inviteCode = ''
      return
    }

    formValue.value.hospitalKeyword = ''
    formValue.value.hospitalId = null
    hospitalOptions.value = []
  },
)

function resolveHospitalSearchKeyword(): string {
  const inputValue = hospitalSearchFieldRef.value
    ?.querySelector('input')
    ?.value

  const keyword = (inputValue ?? formValue.value.hospitalKeyword).trim()

  if (keyword !== formValue.value.hospitalKeyword) {
    formValue.value.hospitalKeyword = keyword
  }

  return keyword
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
      showInfo('검색 결과가 없습니다.')
    }
  } catch (error) {
    showError(error instanceof Error ? error.message : '병원 검색에 실패했습니다.')
  } finally {
    hospitalLoading.value = false
  }
}

async function handleSignup() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  submitting.value = true

  try {
    const request =
      formValue.value.role === 'admin'
        ? {
            role: 'admin' as const,
            name: formValue.value.name.trim(),
            email: formValue.value.email.trim(),
            password: formValue.value.password,
            hospitalId: formValue.value.hospitalId ?? undefined,
            hospitalName:
              hospitalOptions.value.find((option) => option.value === formValue.value.hospitalId)?.label?.toString() ??
              undefined,
            hospitalSource: 'data.go.kr' as const,
          }
        : {
            role: 'user' as const,
            name: formValue.value.name.trim(),
            email: formValue.value.email.trim(),
            password: formValue.value.password,
            inviteCode: formValue.value.inviteCode.trim(),
          }

    const result = await submitSignup(request)
    resultNextState.value = result.nextState

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

function moveToLogin() {
  const suffix = resultNextState.value ? `?signupState=${resultNextState.value}` : ''
  router.push(`${LOGIN_ROUTE_PATH}${suffix}`)
}
</script>
