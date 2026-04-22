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
  APPROVAL_QUEUE_ROUTE_PATH,
  HOME_ROUTE_PATH,
  USER_HOME_ROUTE_PATH,
} from '@/constants/routes'
import { useRbacStore } from '@/stores/rbac'

const router = useRouter()
const route = useRoute()
const rbacStore = useRbacStore()

const menuOptions = computed(() => {
  const items: Array<{ label: string; key: string }> = []

  if (rbacStore.abilities.canViewRestrictedUserHome) {
    items.push({ label: '내 홈', key: USER_HOME_ROUTE_PATH })
  }

  if (rbacStore.abilities.canManageOrganizationSetup) {
    items.push({ label: '운영 기본 설정', key: '/ops/organization-setup' })
  }

  if (rbacStore.abilities.canManageSchedules) {
    items.push({ label: '근무표 생성', key: '/schedule/step1' })
  }

  if (rbacStore.abilities.canViewApprovalQueue) {
    items.push({ label: '가입 승인', key: APPROVAL_QUEUE_ROUTE_PATH })
  }

  if (items.length === 0) {
    items.push({ label: '대시보드', key: HOME_ROUTE_PATH })
  }

  return items
})

const currentRoute = computed(() => {
  if (route.path.startsWith('/schedule/step')) {
    return '/schedule/step1'
  }

  if (route.path.startsWith('/ops/')) {
    return '/ops/organization-setup'
  }

  return route.path
})

function handleMenuClick(key: string) {
  router.push(key)
}
</script>
