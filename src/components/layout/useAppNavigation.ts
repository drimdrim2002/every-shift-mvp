import type { ComputedRef } from 'vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getAppHomeRoutePath,
  getApprovalQueueRoutePath,
  getOpsOrganizationSetupRoutePath,
  getScheduleResultsRoutePath,
  getScheduleStepRoutePath,
  getUserHomeRoutePath,
  getWorkPerformanceRoutePath,
  isApprovalQueueRoutePath,
  isOpsRoutePath,
  isScheduleLookupRoutePath,
  isScheduleRoutePath,
  isUserHomeRoutePath,
} from '@/constants/routes'
import { useRbacStore } from '@/stores/rbac'

export interface AppNavigationItem {
  label: string
  key: string
  children?: AppNavigationItem[]
}

export function useAppNavigation(): {
  navigationItems: ComputedRef<AppNavigationItem[]>
  activeNavigationKey: ComputedRef<string>
  navigateToNavigationItem: (key: string) => Promise<void>
} {
  const route = useRoute()
  const router = useRouter()
  const rbacStore = useRbacStore()

  const navigationItems = computed<AppNavigationItem[]>(() => {
    const items: AppNavigationItem[] = []

    if (rbacStore.abilities.canViewRestrictedUserHome) {
      items.push({ label: '내 홈', key: getUserHomeRoutePath() })
    }

    if (rbacStore.abilities.canManageOrganizationSetup) {
      const organizationSetupPath = getOpsOrganizationSetupRoutePath()
      items.push({
        label: '운영 기준',
        key: organizationSetupPath,
        children: [
          { label: '병원 정보', key: `${organizationSetupPath}#hospital-info` },
          { label: '병동/근무 기준', key: `${organizationSetupPath}#site-shift-rules` },
          { label: '직원 정보', key: `${organizationSetupPath}#employee-info` },
        ],
      })
    }

    if (rbacStore.abilities.canManageSchedules) {
      const scheduleGenerationPath = getScheduleStepRoutePath(1)
      items.push({
        label: '근무표 생성',
        key: scheduleGenerationPath,
        children: [
          { label: '새 근무표 생성', key: scheduleGenerationPath },
        ],
      })
      items.push({
        label: '근무표 분석',
        key: getScheduleResultsRoutePath(),
        children: [
          { label: '생성된 근무표', key: getScheduleResultsRoutePath() },
          { label: '근무 기록', key: getWorkPerformanceRoutePath() },
        ],
      })
    }

    if (rbacStore.abilities.canViewApprovalQueue) {
      items.push({ label: '가입 승인', key: getApprovalQueueRoutePath() })
    }

    if (items.length === 0) {
      items.push({ label: '대시보드', key: getAppHomeRoutePath() })
    }

    return items
  })

  const activeNavigationKey = computed(() => {
    if (isScheduleLookupRoutePath(route.path)) {
      return getScheduleResultsRoutePath()
    }

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

  async function navigateToNavigationItem(key: string): Promise<void> {
    await router.push(key)
  }

  return {
    navigationItems,
    activeNavigationKey,
    navigateToNavigationItem,
  }
}
