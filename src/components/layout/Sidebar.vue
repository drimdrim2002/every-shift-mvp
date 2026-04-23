<template>
  <div class="flex h-full flex-col">
    <div class="border-b p-4 text-center font-bold">
      메뉴
    </div>
    <n-menu
      :options="menuOptions"
      :default-value="currentRoute"
      @update:value="handleMenuClick"
    />
  </div>
</template>

<script setup lang="ts">
import { NMenu } from 'naive-ui'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getAppHomeRoutePath,
  getApprovalQueueRoutePath,
  getOpsOrganizationSetupRoutePath,
  getScheduleStepRoutePath,
  getUserHomeRoutePath,
  isLegacyAppRoutePath,
} from '@/constants/routes'
import { useRbacStore } from '@/stores/rbac'

const router = useRouter()
const route = useRoute()
const rbacStore = useRbacStore()

const menuOptions = computed(() => {
  const items: Array<{ label: string; key: string }> = []

  if (rbacStore.abilities.canViewRestrictedUserHome) {
    items.push({ label: '내 홈', key: getUserHomeRoutePath() })
  }

  if (rbacStore.abilities.canManageOrganizationSetup) {
    items.push({ label: '운영 기본 설정', key: getOpsOrganizationSetupRoutePath() })
  }

  if (rbacStore.abilities.canManageSchedules) {
    items.push({ label: '근무표 생성', key: getScheduleStepRoutePath(1) })
  }

  if (rbacStore.abilities.canViewApprovalQueue) {
    items.push({ label: '가입 승인', key: getApprovalQueueRoutePath() })
  }

  if (items.length === 0) {
    items.push({ label: '대시보드', key: getAppHomeRoutePath() })
  }

  return items
})

const currentRoute = computed(() => {
  if (route.path.startsWith('/app/schedule/step') || route.path.startsWith('/schedule/step')) {
    return getScheduleStepRoutePath(1)
  }

  if (route.path.startsWith('/app/ops/') || route.path.startsWith('/ops/')) {
    return getOpsOrganizationSetupRoutePath()
  }

  if (route.path === '/home/user') {
    return getUserHomeRoutePath()
  }

  if (route.path === '/admin/approval-queue') {
    return getApprovalQueueRoutePath()
  }

  if (route.path === '/' || route.path === '/app' || !isLegacyAppRoutePath(route.path)) {
    return getAppHomeRoutePath()
  }

  return route.path
})

function handleMenuClick(key: string) {
  router.push(key)
}
</script>
