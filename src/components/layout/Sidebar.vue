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
  isApprovalQueueRoutePath,
  isOpsRoutePath,
  isScheduleRoutePath,
  isUserHomeRoutePath,
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
  if (isScheduleRoutePath(route.path)) {
    return getScheduleStepRoutePath(1)
  }

  if (isOpsRoutePath(route.path)) {
    return getOpsOrganizationSetupRoutePath()
  }

  if (isUserHomeRoutePath(route.path)) {
    return getUserHomeRoutePath()
  }

  if (isApprovalQueueRoutePath(route.path)) {
    return getApprovalQueueRoutePath()
  }

  return getAppHomeRoutePath()
})

function handleMenuClick(key: string) {
  router.push(key)
}
</script>
