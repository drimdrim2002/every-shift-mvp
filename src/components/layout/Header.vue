<template>
  <div class="flex w-full items-center justify-between">
    <div class="flex items-center gap-4">
      <h1 class="text-xl font-bold">
        EveryShift
      </h1>
    </div>
    <div class="flex items-center gap-4">
      <OrganizationSwitcher v-if="rbacStore.abilities.canSwitchOrganization" />
      <span class="text-sm text-gray-600">{{ accessLabel }}</span>
      <n-button
        text
        @click="handleLogout"
      >
        로그아웃
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'
import { useRouter } from 'vue-router'
import OrganizationSwitcher from '@/components/layout/OrganizationSwitcher.vue'
import { LOGIN_ROUTE_PATH } from '@/constants/routes'
import { useAuthStore } from '@/stores/auth'
import { useRbacStore } from '@/stores/rbac'
import { showError, showSuccess } from '@/utils/message'

const router = useRouter()
const authStore = useAuthStore()
const rbacStore = useRbacStore()

const accessLabel = computed(() => {
  switch (rbacStore.accessState) {
    case 'super_active':
      return '슈퍼 관리자'
    case 'admin_active':
      return '운영 관리자'
    case 'user_active':
      return '일반 사용자'
    case 'admin_pending':
      return '관리자 승인 대기'
    case 'admin_rejected':
      return '관리자 승인 반려'
    default:
      return '인증 사용자'
  }
})

async function handleLogout() {
  try {
    await authStore.logout()
    showSuccess('로그아웃되었습니다')
    await router.push(LOGIN_ROUTE_PATH)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '로그아웃 중 오류가 발생했습니다'
    showError(message)
  }
}
</script>
