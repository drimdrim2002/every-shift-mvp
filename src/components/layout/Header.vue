<template>
  <div class="grid size-full max-w-[1480px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-8">
    <div class="flex min-w-0 items-center">
      <h1 class="shrink-0 text-2xl font-bold text-slate-900">
        everyshift
      </h1>
    </div>

    <nav
      aria-label="주요 메뉴"
      class="flex h-full min-w-0 items-center justify-start gap-12 pl-8"
      @keydown.escape="closeOpenNavigationItem"
    >
      <div
        v-for="item in navigationItems"
        :key="item.key"
        data-test="primary-navigation-item"
        class="relative"
        @mouseenter="openNavigationItem(item)"
        @mouseleave="scheduleCloseOpenNavigationItem"
        @focusin="openNavigationItem(item)"
        @focusout="handleNavigationGroupFocusout"
      >
        <button
          type="button"
          class="relative inline-flex h-16 cursor-pointer items-center rounded-none border-0 bg-transparent p-0 text-[20px] font-semibold text-slate-800 transition-colors hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          :class="{
            'text-teal-800 after:absolute after:inset-x-0 after:bottom-1 after:h-0.5 after:rounded-full after:bg-teal-600 after:content-[\'\']': activeNavigationKey === item.key,
          }"
          :aria-current="activeNavigationKey === item.key ? 'page' : undefined"
          :aria-expanded="hasNavigationChildren(item) ? openNavigationKey === item.key : undefined"
          :aria-controls="hasNavigationChildren(item) ? getSubmenuId(item.key) : undefined"
          @click="handleNavigationItemClick(item)"
        >
          {{ item.label }}
        </button>

        <div
          v-if="hasNavigationChildren(item) && openNavigationKey === item.key"
          :id="getSubmenuId(item.key)"
          role="group"
          :aria-label="`${item.label} 하위 메뉴`"
          class="absolute left-0 top-full z-20 min-w-44 rounded-md border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/60"
          @mouseenter="cancelScheduledNavigationClose"
          @mouseleave="scheduleCloseOpenNavigationItem"
        >
          <button
            v-for="child in item.children"
            :key="child.key"
            type="button"
            class="block w-full cursor-pointer px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800 focus:bg-teal-50 focus:text-teal-800 focus:outline-none"
            @click="handleNavigationChildClick(child.key)"
          >
            {{ child.label }}
          </button>
        </div>
      </div>
    </nav>

    <div class="flex min-w-0 shrink items-center justify-end gap-4">
      <OrganizationSwitcher v-if="canShowOrganizationSwitcher" />
      <span
        v-else-if="currentOrganizationName"
        data-test="current-organization-name"
        class="min-w-0 max-w-[180px] truncate text-sm font-semibold text-slate-700"
      >
        {{ currentOrganizationName }}
      </span>
      <span class="min-w-0 truncate text-sm text-gray-600">{{ accessLabel }}</span>
      <n-button
        text
        class="shrink-0"
        @click="handleLogout"
      >
        로그아웃
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton } from 'naive-ui'
import { useRouter } from 'vue-router'
import OrganizationSwitcher from '@/components/layout/OrganizationSwitcher.vue'
import { useAppNavigation, type AppNavigationItem } from '@/components/layout/useAppNavigation'
import { LOGIN_ROUTE_PATH } from '@/constants/routes'
import { useAuthStore } from '@/stores/auth'
import { useRbacStore } from '@/stores/rbac'
import { showError, showSuccess } from '@/utils/message'

const router = useRouter()
const authStore = useAuthStore()
const rbacStore = useRbacStore()
const {
  navigationItems,
  activeNavigationKey,
  navigateToNavigationItem,
} = useAppNavigation()
const openNavigationKey = ref<string | null>(null)
let navigationCloseTimer: number | null = null

const canShowOrganizationSwitcher = computed(
  () =>
    rbacStore.accessState === 'super_active' &&
    rbacStore.abilities.canSwitchOrganization,
)

const currentOrganizationName = computed(() => {
  const selectedOptionName = rbacStore.organizationOptions.find(
    (option) => option.id === rbacStore.selectedOrganizationId,
  )?.name

  return selectedOptionName ?? rbacStore.effectiveMembership?.organizationName ?? null
})

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

function hasNavigationChildren(item: AppNavigationItem): item is AppNavigationItem & { children: AppNavigationItem[] } {
  return Boolean(item.children?.length)
}

function getSubmenuId(key: string): string {
  return `header-submenu-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function openNavigationItem(item: AppNavigationItem): void {
  cancelScheduledNavigationClose()
  openNavigationKey.value = hasNavigationChildren(item) ? item.key : null
}

function scheduleCloseOpenNavigationItem(event: MouseEvent): void {
  const currentTarget = event.currentTarget
  const nextTarget = event.relatedTarget

  if (
    currentTarget instanceof HTMLElement &&
    nextTarget instanceof Node &&
    currentTarget.contains(nextTarget)
  ) {
    return
  }

  cancelScheduledNavigationClose()
  navigationCloseTimer = window.setTimeout(() => {
    closeOpenNavigationItem()
  }, 500)
}

function cancelScheduledNavigationClose(): void {
  if (navigationCloseTimer === null) {
    return
  }

  window.clearTimeout(navigationCloseTimer)
  navigationCloseTimer = null
}

function handleNavigationGroupFocusout(event: FocusEvent): void {
  const currentTarget = event.currentTarget
  const nextTarget = event.relatedTarget

  if (
    currentTarget instanceof HTMLElement &&
    nextTarget instanceof Node &&
    currentTarget.contains(nextTarget)
  ) {
    return
  }

  closeOpenNavigationItem()
}

async function handleNavigationItemClick(item: AppNavigationItem): Promise<void> {
  cancelScheduledNavigationClose()
  if (hasNavigationChildren(item)) {
    openNavigationKey.value = openNavigationKey.value === item.key ? null : item.key
    return
  }

  await navigateToNavigationItem(item.key)
  closeOpenNavigationItem()
}

async function handleNavigationChildClick(key: string): Promise<void> {
  cancelScheduledNavigationClose()
  await navigateToNavigationItem(key)
  closeOpenNavigationItem()
}

function closeOpenNavigationItem(): void {
  cancelScheduledNavigationClose()
  openNavigationKey.value = null
}
</script>
