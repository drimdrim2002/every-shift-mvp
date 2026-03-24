import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  DashboardApiError,
  getAdminDashboardStats,
  getEmployeeDashboardStats,
  resolveDashboardDefaultPeriodMonth,
} from '@/api/dashboard'
import { useOrganizationMasterStore } from '@/stores/organization-master'
import { useRbacStore } from '@/stores/rbac'
import type { AccessState } from '@/types/rbac'
import type { Site } from '@/types/site'
import type {
  AdminDashboardStatsResponse,
  DashboardFilterCapabilities,
  DashboardFilterOption,
  DashboardFilters,
  DashboardGrouping,
  DashboardStoreError,
  DashboardStoreStatus,
  EmployeeDashboardStatsResponse,
} from '@/types/dashboard'

const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000

interface DashboardCacheEntry<Response> {
  response: Response
  fetchedAt: number
}

function isAdminDashboardAccessState(
  accessState: AccessState | null,
): accessState is 'super_active' | 'admin_active' {
  return accessState === 'super_active' || accessState === 'admin_active'
}

function isEmployeeDashboardAccessState(
  accessState: AccessState | null,
): accessState is 'super_active' | 'admin_active' | 'user_active' {
  return (
    accessState === 'super_active' ||
    accessState === 'admin_active' ||
    accessState === 'user_active'
  )
}

function createDefaultFilters(): DashboardFilters {
  return {
    periodMonth: '',
    siteId: null,
    rankId: null,
  }
}

function createDefaultCapabilities(): DashboardFilterCapabilities {
  return {
    siteFilterVisible: false,
    rankFilterVisible: false,
  }
}

function createStoreError(error: unknown): DashboardStoreError {
  if (error instanceof DashboardApiError) {
    return {
      code: error.code,
      message: error.message,
    }
  }

  return {
    code: 'DASHBOARD_INTERNAL_ERROR',
    message: error instanceof Error ? error.message : '대시보드 데이터를 불러오지 못했습니다.',
  }
}

function toSiteOptions(sites: Site[]): DashboardFilterOption[] {
  return sites.map((site) => ({
    value: site.id,
    label: site.name,
  }))
}

function normalizeNullableFilterValue(value: string | null | undefined): string | null {
  return value ?? null
}

function normalizeFilters(filters: DashboardFilters): DashboardFilters {
  return {
    periodMonth: filters.periodMonth,
    siteId: normalizeNullableFilterValue(filters.siteId),
    rankId: normalizeNullableFilterValue(filters.rankId),
  }
}

function buildAdminDashboardQueryKey(
  organizationId: string,
  grouping: DashboardGrouping,
  filters: DashboardFilters,
): string {
  return JSON.stringify({
    dashboardScope: 'admin',
    organizationId,
    grouping,
    periodMonth: filters.periodMonth,
    siteId: normalizeNullableFilterValue(filters.siteId),
    rankId: normalizeNullableFilterValue(filters.rankId),
  })
}

function buildEmployeeDashboardQueryKey(filters: DashboardFilters): string {
  return JSON.stringify({
    dashboardScope: 'employee',
    periodMonth: filters.periodMonth,
    siteId: normalizeNullableFilterValue(filters.siteId),
    rankId: normalizeNullableFilterValue(filters.rankId),
  })
}

function isCacheStale<Response>(entry: DashboardCacheEntry<Response>): boolean {
  return Date.now() - entry.fetchedAt > DASHBOARD_CACHE_TTL_MS
}

export const useAdminDashboardStore = defineStore('admin-dashboard', () => {
  const rbacStore = useRbacStore()
  const masterStore = useOrganizationMasterStore()

  const filters = ref<DashboardFilters>(createDefaultFilters())
  const grouping = ref<DashboardGrouping>('employee')
  const response = ref<AdminDashboardStatsResponse | null>(null)
  const status = ref<DashboardStoreStatus>('idle')
  const error = ref<DashboardStoreError | null>(null)
  const lastFetchedAt = ref<string | null>(null)
  const capabilities = ref<DashboardFilterCapabilities>(createDefaultCapabilities())
  const siteOptions = ref<DashboardFilterOption[]>([])
  const rankOptions = ref<DashboardFilterOption[]>([])
  const cache = ref(new Map<string, DashboardCacheEntry<AdminDashboardStatsResponse>>())
  const hydratedSiteOrganizationId = ref<string | null>(null)

  const resolvedOrganizationId = computed(() => {
    if (rbacStore.accessState === 'admin_active') {
      return rbacStore.effectiveMembership?.organizationId ?? null
    }

    if (rbacStore.accessState === 'super_active') {
      return rbacStore.selectedOrganizationId ?? null
    }

    return null
  })

  const requiresOrganizationSelection = computed(
    () => rbacStore.accessState === 'super_active' && !resolvedOrganizationId.value,
  )
  const isReady = computed(() => status.value === 'ready')
  const isEmpty = computed(() => status.value === 'empty')
  const currentQueryKey = computed(() => {
    if (!filters.value.periodMonth || !resolvedOrganizationId.value) {
      return null
    }

    return buildAdminDashboardQueryKey(
      resolvedOrganizationId.value,
      grouping.value,
      filters.value,
    )
  })

  function clearFilterOptions() {
    siteOptions.value = []
    rankOptions.value = []
    hydratedSiteOrganizationId.value = null
    capabilities.value = createDefaultCapabilities()
    filters.value.siteId = null
    filters.value.rankId = null
  }

  function clearRuntimeState(clearPeriodMonth = false) {
    response.value = null
    status.value = 'idle'
    error.value = null
    lastFetchedAt.value = null
    cache.value.clear()
    clearFilterOptions()

    if (clearPeriodMonth) {
      filters.value.periodMonth = ''
    }
  }

  async function hydrateSiteOptions(organizationId: string | null) {
    if (!organizationId) {
      clearFilterOptions()
      return
    }

    if (hydratedSiteOrganizationId.value === organizationId) {
      return
    }

    const result = await masterStore.loadSites(organizationId)
    if (!result.success) {
      throw new Error(result.error ?? '사이트 목록을 불러오지 못했습니다.')
    }

    hydratedSiteOrganizationId.value = organizationId
    siteOptions.value = toSiteOptions(masterStore.sites)
    capabilities.value = {
      siteFilterVisible: masterStore.sites.length >= 2,
      rankFilterVisible: false,
    }

    if (
      filters.value.siteId &&
      !siteOptions.value.some((option) => option.value === filters.value.siteId)
    ) {
      filters.value.siteId = null
    }

    if (!capabilities.value.siteFilterVisible) {
      filters.value.siteId = null
    }

    filters.value.rankId = null
  }

  async function ensurePeriodMonth(periodMonth?: string | null) {
    if (periodMonth) {
      filters.value.periodMonth = periodMonth
      return periodMonth
    }

    if (filters.value.periodMonth) {
      return filters.value.periodMonth
    }

    const resolvedPeriodMonth = await resolveDashboardDefaultPeriodMonth(
      resolvedOrganizationId.value,
    )
    filters.value.periodMonth = resolvedPeriodMonth
    return resolvedPeriodMonth
  }

  async function load(forceRefresh = false) {
    if (!isAdminDashboardAccessState(rbacStore.accessState)) {
      response.value = null
      status.value = 'error'
      error.value = createStoreError(
        new DashboardApiError('DASHBOARD_ACCESS_DENIED'),
      )
      lastFetchedAt.value = null
      return null
    }

    try {
      await ensurePeriodMonth()
    } catch (caughtError) {
      response.value = null
      status.value = 'error'
      error.value = createStoreError(caughtError)
      lastFetchedAt.value = null
      return null
    }

    if (requiresOrganizationSelection.value) {
      response.value = null
      status.value = 'blocked'
      error.value = null
      lastFetchedAt.value = null
      clearFilterOptions()
      return null
    }

    const organizationId = resolvedOrganizationId.value
    if (!organizationId) {
      response.value = null
      status.value = 'blocked'
      error.value = null
      lastFetchedAt.value = null
      clearFilterOptions()
      return null
    }

    try {
      await hydrateSiteOptions(organizationId)
    } catch (caughtError) {
      response.value = null
      status.value = 'error'
      error.value = createStoreError(caughtError)
      lastFetchedAt.value = null
      return null
    }

    const queryKey = buildAdminDashboardQueryKey(
      organizationId,
      grouping.value,
      filters.value,
    )
    const cachedEntry = cache.value.get(queryKey)
    if (!forceRefresh && cachedEntry && !isCacheStale(cachedEntry)) {
      response.value = cachedEntry.response
      status.value = cachedEntry.response.state
      error.value = null
      lastFetchedAt.value = new Date(cachedEntry.fetchedAt).toISOString()
      return cachedEntry.response
    }

    status.value = 'loading'
    error.value = null

    try {
      const nextResponse = await getAdminDashboardStats({
        filters: normalizeFilters(filters.value),
        scope: {
          organizationId:
            rbacStore.accessState === 'super_active' ? organizationId : null,
          grouping: grouping.value,
        },
      })

      const fetchedAt = Date.now()
      cache.value.set(queryKey, {
        response: nextResponse,
        fetchedAt,
      })
      response.value = nextResponse
      status.value = nextResponse.state
      error.value = null
      lastFetchedAt.value = new Date(fetchedAt).toISOString()
      return nextResponse
    } catch (caughtError) {
      response.value = null
      status.value = 'error'
      error.value = createStoreError(caughtError)
      lastFetchedAt.value = null
      return null
    }
  }

  async function initialize(options: { periodMonth?: string | null; eagerLoad?: boolean } = {}) {
    try {
      await ensurePeriodMonth(options.periodMonth ?? null)
      await hydrateSiteOptions(resolvedOrganizationId.value)
    } catch (caughtError) {
      response.value = null
      status.value = 'error'
      error.value = createStoreError(caughtError)
      lastFetchedAt.value = null
      return null
    }

    if (options.eagerLoad === false) {
      return response.value
    }

    return load()
  }

  async function refresh() {
    return load(true)
  }

  function invalidate() {
    cache.value.clear()
    response.value = null
    status.value = 'idle'
    error.value = null
    lastFetchedAt.value = null
  }

  function reset() {
    filters.value = createDefaultFilters()
    grouping.value = 'employee'
    clearRuntimeState(true)
  }

  async function setPeriodMonth(nextPeriodMonth: string) {
    filters.value.periodMonth = nextPeriodMonth
    return load()
  }

  async function setSiteId(nextSiteId: string | null) {
    filters.value.siteId = capabilities.value.siteFilterVisible
      ? normalizeNullableFilterValue(nextSiteId)
      : null
    return load()
  }

  async function setRankId(nextRankId: string | null) {
    filters.value.rankId = capabilities.value.rankFilterVisible
      ? normalizeNullableFilterValue(nextRankId)
      : null
    return load()
  }

  async function setGrouping(nextGrouping: DashboardGrouping) {
    grouping.value = nextGrouping
    return load()
  }

  async function setOrganizationScope(nextOrganizationId: string | null) {
    if (rbacStore.accessState === 'super_active') {
      rbacStore.setSelectedOrganizationId(nextOrganizationId)
    }

    return load()
  }

  watch(
    () =>
      [
        rbacStore.sessionUserId,
        rbacStore.accessState,
        resolvedOrganizationId.value,
      ] as const,
    (current, previous) => {
      if (!previous) {
        return
      }

      const [currentSessionUserId, currentAccessState, currentOrganizationId] = current
      const [previousSessionUserId, previousAccessState, previousOrganizationId] = previous

      if (
        currentSessionUserId === previousSessionUserId &&
        currentAccessState === previousAccessState &&
        currentOrganizationId === previousOrganizationId
      ) {
        return
      }

      const shouldClearPeriodMonth =
        currentSessionUserId !== previousSessionUserId ||
        currentAccessState !== previousAccessState

      clearRuntimeState(shouldClearPeriodMonth)
    },
  )

  return {
    filters,
    grouping,
    response,
    status,
    error,
    lastFetchedAt,
    capabilities,
    siteOptions,
    rankOptions,
    cacheTtlMs: DASHBOARD_CACHE_TTL_MS,
    resolvedOrganizationId,
    requiresOrganizationSelection,
    isReady,
    isEmpty,
    currentQueryKey,
    initialize,
    load,
    refresh,
    invalidate,
    reset,
    setPeriodMonth,
    setSiteId,
    setRankId,
    setGrouping,
    setOrganizationScope,
  }
})

export const useEmployeeDashboardStore = defineStore('employee-dashboard', () => {
  const rbacStore = useRbacStore()
  const masterStore = useOrganizationMasterStore()

  const filters = ref<DashboardFilters>(createDefaultFilters())
  const response = ref<EmployeeDashboardStatsResponse | null>(null)
  const status = ref<DashboardStoreStatus>('idle')
  const error = ref<DashboardStoreError | null>(null)
  const lastFetchedAt = ref<string | null>(null)
  const capabilities = ref<DashboardFilterCapabilities>(createDefaultCapabilities())
  const siteOptions = ref<DashboardFilterOption[]>([])
  const rankOptions = ref<DashboardFilterOption[]>([])
  const cache = ref(new Map<string, DashboardCacheEntry<EmployeeDashboardStatsResponse>>())
  const hydratedSiteOrganizationId = ref<string | null>(null)

  const bootstrapOrganizationId = computed(
    () => rbacStore.effectiveMembership?.organizationId ?? null,
  )
  const resolvedOrganizationId = computed(
    () => response.value?.resolvedScope.organizationId ?? bootstrapOrganizationId.value,
  )
  const isReady = computed(() => status.value === 'ready')
  const isEmpty = computed(() => status.value === 'empty')
  const isDependency = computed(() => status.value === 'dependency')
  const currentQueryKey = computed(() => {
    if (!filters.value.periodMonth) {
      return null
    }

    return buildEmployeeDashboardQueryKey(filters.value)
  })

  function clearFilterOptions() {
    siteOptions.value = []
    rankOptions.value = []
    hydratedSiteOrganizationId.value = null
    capabilities.value = createDefaultCapabilities()
    filters.value.siteId = null
    filters.value.rankId = null
  }

  function clearRuntimeState(clearPeriodMonth = false) {
    response.value = null
    status.value = 'idle'
    error.value = null
    lastFetchedAt.value = null
    cache.value.clear()
    clearFilterOptions()

    if (clearPeriodMonth) {
      filters.value.periodMonth = ''
    }
  }

  async function hydrateSiteOptions(organizationId: string | null) {
    if (!organizationId) {
      clearFilterOptions()
      return
    }

    if (hydratedSiteOrganizationId.value === organizationId) {
      return
    }

    const result = await masterStore.loadSites(organizationId)
    if (!result.success) {
      throw new Error(result.error ?? '사이트 목록을 불러오지 못했습니다.')
    }

    hydratedSiteOrganizationId.value = organizationId
    siteOptions.value = toSiteOptions(masterStore.sites)
    capabilities.value = {
      siteFilterVisible: masterStore.sites.length >= 2,
      rankFilterVisible: false,
    }

    if (
      filters.value.siteId &&
      !siteOptions.value.some((option) => option.value === filters.value.siteId)
    ) {
      filters.value.siteId = null
    }

    if (!capabilities.value.siteFilterVisible) {
      filters.value.siteId = null
    }

    filters.value.rankId = null
  }

  async function ensurePeriodMonth(periodMonth?: string | null) {
    if (periodMonth) {
      filters.value.periodMonth = periodMonth
      return periodMonth
    }

    if (filters.value.periodMonth) {
      return filters.value.periodMonth
    }

    const resolvedPeriodMonth = await resolveDashboardDefaultPeriodMonth(
      bootstrapOrganizationId.value,
    )
    filters.value.periodMonth = resolvedPeriodMonth
    return resolvedPeriodMonth
  }

  async function load(forceRefresh = false) {
    if (!isEmployeeDashboardAccessState(rbacStore.accessState)) {
      response.value = null
      status.value = 'error'
      error.value = createStoreError(
        new DashboardApiError('DASHBOARD_ACCESS_DENIED'),
      )
      lastFetchedAt.value = null
      return null
    }

    try {
      await ensurePeriodMonth()
      await hydrateSiteOptions(bootstrapOrganizationId.value)
    } catch (caughtError) {
      response.value = null
      status.value = 'error'
      error.value = createStoreError(caughtError)
      lastFetchedAt.value = null
      return null
    }

    const queryKey = buildEmployeeDashboardQueryKey(filters.value)
    const cachedEntry = cache.value.get(queryKey)
    if (!forceRefresh && cachedEntry && !isCacheStale(cachedEntry)) {
      response.value = cachedEntry.response
      status.value = cachedEntry.response.state
      error.value = null
      lastFetchedAt.value = new Date(cachedEntry.fetchedAt).toISOString()
      return cachedEntry.response
    }

    status.value = 'loading'
    error.value = null

    try {
      const nextResponse = await getEmployeeDashboardStats({
        filters: normalizeFilters(filters.value),
      })

      const fetchedAt = Date.now()
      cache.value.set(queryKey, {
        response: nextResponse,
        fetchedAt,
      })
      response.value = nextResponse
      status.value = nextResponse.state
      error.value = null
      lastFetchedAt.value = new Date(fetchedAt).toISOString()

      await hydrateSiteOptions(nextResponse.resolvedScope.organizationId)

      return nextResponse
    } catch (caughtError) {
      response.value = null
      status.value = 'error'
      error.value = createStoreError(caughtError)
      lastFetchedAt.value = null
      return null
    }
  }

  async function initialize(options: { periodMonth?: string | null; eagerLoad?: boolean } = {}) {
    try {
      await ensurePeriodMonth(options.periodMonth ?? null)
      await hydrateSiteOptions(bootstrapOrganizationId.value)
    } catch (caughtError) {
      response.value = null
      status.value = 'error'
      error.value = createStoreError(caughtError)
      lastFetchedAt.value = null
      return null
    }

    if (options.eagerLoad === false) {
      return response.value
    }

    return load()
  }

  async function refresh() {
    return load(true)
  }

  function invalidate() {
    cache.value.clear()
    response.value = null
    status.value = 'idle'
    error.value = null
    lastFetchedAt.value = null
  }

  function reset() {
    filters.value = createDefaultFilters()
    clearRuntimeState(true)
  }

  async function setPeriodMonth(nextPeriodMonth: string) {
    filters.value.periodMonth = nextPeriodMonth
    return load()
  }

  async function setSiteId(nextSiteId: string | null) {
    filters.value.siteId = capabilities.value.siteFilterVisible
      ? normalizeNullableFilterValue(nextSiteId)
      : null
    return load()
  }

  async function setRankId(nextRankId: string | null) {
    filters.value.rankId = capabilities.value.rankFilterVisible
      ? normalizeNullableFilterValue(nextRankId)
      : null
    return load()
  }

  watch(
    () =>
      [
        rbacStore.sessionUserId,
        rbacStore.accessState,
        bootstrapOrganizationId.value,
      ] as const,
    (current, previous) => {
      if (!previous) {
        return
      }

      const [currentSessionUserId, currentAccessState, currentOrganizationId] = current
      const [previousSessionUserId, previousAccessState, previousOrganizationId] = previous

      if (
        currentSessionUserId === previousSessionUserId &&
        currentAccessState === previousAccessState &&
        currentOrganizationId === previousOrganizationId
      ) {
        return
      }

      const shouldClearPeriodMonth =
        currentSessionUserId !== previousSessionUserId ||
        currentAccessState !== previousAccessState

      clearRuntimeState(shouldClearPeriodMonth)
    },
  )

  return {
    filters,
    response,
    status,
    error,
    lastFetchedAt,
    capabilities,
    siteOptions,
    rankOptions,
    cacheTtlMs: DASHBOARD_CACHE_TTL_MS,
    resolvedOrganizationId,
    isReady,
    isEmpty,
    isDependency,
    currentQueryKey,
    initialize,
    load,
    refresh,
    invalidate,
    reset,
    setPeriodMonth,
    setSiteId,
    setRankId,
  }
})
