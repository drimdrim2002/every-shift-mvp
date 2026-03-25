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
  ADMIN_DASHBOARD_ROUTE_PATH,
  ADMIN_ORGANIZATION_ROUTE_PATH,
  EMPLOYEE_DASHBOARD_ROUTE_PATH,
} from '@/constants/routes'
import { useRbacStore } from '@/stores/rbac'

const router = useRouter()
const route = useRoute()
const rbacStore = useRbacStore()

const canAccessAdminDashboard = computed(
  () => rbacStore.accessState === 'admin_active' || rbacStore.accessState === 'super_active',
)
const canAccessEmployeeDashboard = computed(
  () =>
    rbacStore.accessState === 'admin_active' ||
    rbacStore.accessState === 'super_active' ||
    rbacStore.accessState === 'user_active',
)
const canAccessScheduleCreation = computed(
  () => rbacStore.accessState === 'admin_active' || rbacStore.accessState === 'super_active',
)
const canAccessOrganizationManagement = canAccessAdminDashboard

const menuOptions = computed(() => {
  const options = []

  if (canAccessAdminDashboard.value) {
    options.push({
      label: '관리자 대시보드',
      key: ADMIN_DASHBOARD_ROUTE_PATH,
    })
  }

  if (canAccessEmployeeDashboard.value) {
    options.push({
      label: '직원 대시보드',
      key: EMPLOYEE_DASHBOARD_ROUTE_PATH,
    })
  }

  if (canAccessScheduleCreation.value) {
    options.push({
      label: '근무표 생성',
      key: '/schedule/step1',
    })
  }

  if (canAccessOrganizationManagement.value) {
    options.push({
      label: '조직 관리',
      key: ADMIN_ORGANIZATION_ROUTE_PATH,
    })
  }

  return options
})

const currentRoute = computed(() => route.path)

function handleMenuClick(key: string) {
  router.push(key)
}
</script>
