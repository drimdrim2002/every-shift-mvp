<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
    <n-card
      class="w-full max-w-lg"
      :title="content.title"
    >
      <n-alert
        :type="content.alertType"
        class="mb-4"
      >
        {{ content.description }}
      </n-alert>

      <p
        v-if="rejectionReason"
        class="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
      >
        반려 사유: {{ rejectionReason }}
      </p>

      <n-button
        type="primary"
        block
        :loading="authStore.loading"
        @click="handleLogout"
      >
        로그아웃
      </n-button>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAlert, NButton, NCard } from 'naive-ui'
import { LOGIN_ROUTE_PATH } from '@/constants/routes'
import { useGlobalMessage } from '@/composables/useGlobalMessage'
import { useAuthStore } from '@/stores/auth'
import { useRbacStore } from '@/stores/rbac'

interface AccessStateContent {
  title: string
  description: string
  alertType: 'info' | 'warning'
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const rbacStore = useRbacStore()
const { error: showError } = useGlobalMessage()

const accessStateView = computed(() => {
  const metaState = route.meta.accessStateView
  return metaState === 'rejected' ? 'rejected' : 'pending'
})

const rejectionReason = computed(() => {
  if (accessStateView.value !== 'rejected') {
    return null
  }

  return rbacStore.effectiveMembership?.rejectionReason ?? null
})

const content = computed<AccessStateContent>(() => {
  if (accessStateView.value === 'rejected') {
    return {
      title: '승인 반려',
      description:
        '관리자 가입 요청이 반려되었습니다. 반려된 요청은 재활성화되지 않으며 새 가입 요청으로 다시 신청해야 합니다.',
      alertType: 'warning',
    }
  }

  return {
    title: '승인 대기',
    description: '관리자 가입 요청이 접수되었습니다. superuser 승인 완료 후 다시 로그인해 주세요.',
    alertType: 'info',
  }
})

async function handleLogout() {
  const result = await authStore.logout()

  if (!result.success) {
    showError(result.error || '로그아웃 실패')
    return
  }

  await router.replace(LOGIN_ROUTE_PATH)
}
</script>
