import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  completeOnboardingProgress,
  getOnboardingProgress,
  OnboardingProgressApiError,
  updateOnboardingProgress,
} from '@/api/onboarding'
import type {
  OnboardingCacheSource,
  OnboardingProgressCacheRecord,
  OnboardingProgressErrorPayload,
  OnboardingProgressScope,
  OnboardingProgressState,
  OnboardingProgressSuccessData,
  OnboardingProgressTransition,
  OnboardingStepKey,
} from '@/types/onboarding'

const ONBOARDING_PROGRESS_STORAGE_KEY_PREFIX = 'everyshift_onboarding_progress_v1:'
const ONBOARDING_PROGRESS_CACHE_VERSION = 1 as const

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function getStorageKey(organizationId: string) {
  return `${ONBOARDING_PROGRESS_STORAGE_KEY_PREFIX}${organizationId}`
}

function isOnboardingStepKey(value: unknown): value is OnboardingStepKey {
  return (
    value === 'organization_info' || value === 'employee_seed' || value === 'schedule_request'
  )
}

function isOnboardingProgressState(value: unknown): value is OnboardingProgressState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const organizationId = Reflect.get(value, 'organizationId')
  const currentStepKey = Reflect.get(value, 'currentStepKey')
  const completedStepKeys = Reflect.get(value, 'completedStepKeys')
  const isOnboardingComplete = Reflect.get(value, 'isOnboardingComplete')
  const completedAt = Reflect.get(value, 'completedAt')

  return (
    typeof organizationId === 'string' &&
    (currentStepKey === null || isOnboardingStepKey(currentStepKey)) &&
    Array.isArray(completedStepKeys) &&
    completedStepKeys.every((stepKey) => isOnboardingStepKey(stepKey)) &&
    typeof isOnboardingComplete === 'boolean' &&
    (completedAt === null || typeof completedAt === 'string')
  )
}

function isOnboardingProgressTransition(value: unknown): value is OnboardingProgressTransition {
  if (!value || typeof value !== 'object') {
    return false
  }

  const type = Reflect.get(value, 'type')
  const requestedStepKey = Reflect.get(value, 'requestedStepKey')
  const previousCurrentStepKey = Reflect.get(value, 'previousCurrentStepKey')
  const resultingCurrentStepKey = Reflect.get(value, 'resultingCurrentStepKey')
  const isOnboardingComplete = Reflect.get(value, 'isOnboardingComplete')

  return (
    (type === 'noop' || type === 'advance' || type === 'complete') &&
    (requestedStepKey === null || isOnboardingStepKey(requestedStepKey)) &&
    (previousCurrentStepKey === null || isOnboardingStepKey(previousCurrentStepKey)) &&
    (resultingCurrentStepKey === null || isOnboardingStepKey(resultingCurrentStepKey)) &&
    typeof isOnboardingComplete === 'boolean'
  )
}

function isOnboardingProgressCacheRecord(value: unknown): value is OnboardingProgressCacheRecord {
  if (!value || typeof value !== 'object') {
    return false
  }

  const version = Reflect.get(value, 'version')
  const cachedAt = Reflect.get(value, 'cachedAt')
  const action = Reflect.get(value, 'action')
  const progress = Reflect.get(value, 'progress')
  const transition = Reflect.get(value, 'transition')

  return (
    version === ONBOARDING_PROGRESS_CACHE_VERSION &&
    typeof cachedAt === 'string' &&
    (action === 'get' || action === 'update' || action === 'complete') &&
    isOnboardingProgressState(progress) &&
    (transition === null || isOnboardingProgressTransition(transition))
  )
}

function createPermissionDeniedError(message: string): OnboardingProgressApiError {
  return new OnboardingProgressApiError('PERMISSION_DENIED', message)
}

function compareIsoTimestamp(left: string | null, right: string | null) {
  if (left === right) {
    return 0
  }

  if (!left) {
    return -1
  }

  if (!right) {
    return 1
  }

  return left.localeCompare(right)
}

export const useOnboardingStore = defineStore('onboarding', () => {
  const sessionUserId = ref<string | null>(null)
  const accessState = ref<OnboardingProgressScope['accessState']>(null)
  const organizationId = ref<string | null>(null)
  const progress = ref<OnboardingProgressState | null>(null)
  const transition = ref<OnboardingProgressTransition | null>(null)
  const error = ref<OnboardingProgressErrorPayload | null>(null)
  const lastAction = ref<OnboardingProgressSuccessData['action'] | null>(null)
  const pendingAction = ref<OnboardingProgressSuccessData['action'] | 'restore' | null>(null)
  const cacheSource = ref<OnboardingCacheSource>('empty')
  const initialized = ref(false)
  const hasRemoteSnapshot = ref(false)
  const lastRemoteSyncAt = ref<string | null>(null)
  const lastCacheSyncAt = ref<string | null>(null)
  const storageSyncInitialized = ref(false)

  const currentStepKey = computed(() => progress.value?.currentStepKey ?? null)
  const completedStepKeys = computed(() => progress.value?.completedStepKeys ?? [])
  const isOnboardingComplete = computed(() => progress.value?.isOnboardingComplete ?? false)
  const isAdminScoped = computed(
    () =>
      Boolean(sessionUserId.value) &&
      accessState.value === 'admin_active' &&
      Boolean(organizationId.value),
  )
  const isLoading = computed(
    () => pendingAction.value === 'get' || pendingAction.value === 'restore',
  )
  const isSaving = computed(
    () => pendingAction.value === 'update' || pendingAction.value === 'complete',
  )
  const isReadyForGuard = computed(() => {
    if (!sessionUserId.value) {
      return true
    }

    if (accessState.value !== 'admin_active' || !organizationId.value) {
      return initialized.value
    }

    return initialized.value && hasRemoteSnapshot.value && Boolean(progress.value)
  })
  const shouldForceOnboarding = computed(() => {
    if (!isReadyForGuard.value || accessState.value !== 'admin_active') {
      return false
    }

    return !isOnboardingComplete.value
  })

  function setError(nextError: OnboardingProgressErrorPayload | null) {
    error.value = nextError
  }

  function clearRuntimeState() {
    progress.value = null
    transition.value = null
    error.value = null
    lastAction.value = null
    pendingAction.value = null
    cacheSource.value = 'empty'
    initialized.value = false
    hasRemoteSnapshot.value = false
    lastRemoteSyncAt.value = null
    lastCacheSyncAt.value = null
  }

  function setSessionUserId(nextSessionUserId: string | null) {
    if (sessionUserId.value === nextSessionUserId) {
      return
    }

    sessionUserId.value = nextSessionUserId
    accessState.value = null
    organizationId.value = null
    clearRuntimeState()
  }

  function normalizeScope(scope: OnboardingProgressScope) {
    return {
      accessState: scope.accessState,
      organizationId: scope.organizationId,
    }
  }

  function setScope(scope: OnboardingProgressScope) {
    const normalizedScope = normalizeScope(scope)
    const scopeChanged =
      accessState.value !== normalizedScope.accessState ||
      organizationId.value !== normalizedScope.organizationId

    accessState.value = normalizedScope.accessState
    organizationId.value = normalizedScope.organizationId

    if (!scopeChanged) {
      return false
    }

    clearRuntimeState()

    if (accessState.value !== 'admin_active' || !organizationId.value) {
      initialized.value = true
    }

    return true
  }

  function applySnapshot(
    data: OnboardingProgressSuccessData,
    source: Exclude<OnboardingCacheSource, 'empty'>,
  ) {
    progress.value = data.progress
    transition.value = data.transition
    lastAction.value = data.action
    cacheSource.value = source
    initialized.value = true
    setError(null)
  }

  function createCacheRecord(data: OnboardingProgressSuccessData): OnboardingProgressCacheRecord {
    return {
      version: ONBOARDING_PROGRESS_CACHE_VERSION,
      cachedAt: new Date().toISOString(),
      action: data.action,
      progress: data.progress,
      transition: data.transition,
    }
  }

  function writeCacheRecord(record: OnboardingProgressCacheRecord) {
    if (!canUseLocalStorage()) {
      return
    }

    window.localStorage.setItem(getStorageKey(record.progress.organizationId), JSON.stringify(record))
    lastCacheSyncAt.value = record.cachedAt
  }

  function removeCacheRecord(targetOrganizationId: string | null) {
    if (!targetOrganizationId || !canUseLocalStorage()) {
      return
    }

    window.localStorage.removeItem(getStorageKey(targetOrganizationId))

    if (organizationId.value === targetOrganizationId) {
      lastCacheSyncAt.value = null
      if (cacheSource.value === 'local_storage' || cacheSource.value === 'storage_event') {
        cacheSource.value = 'empty'
      }
    }
  }

  function persistRemoteSnapshot(data: OnboardingProgressSuccessData) {
    writeCacheRecord(createCacheRecord(data))
  }

  function readCacheRecord(targetOrganizationId: string): OnboardingProgressCacheRecord | null {
    if (!canUseLocalStorage()) {
      return null
    }

    const rawValue = window.localStorage.getItem(getStorageKey(targetOrganizationId))
    if (!rawValue) {
      return null
    }

    try {
      const parsed = JSON.parse(rawValue) as unknown
      if (!isOnboardingProgressCacheRecord(parsed)) {
        removeCacheRecord(targetOrganizationId)
        return null
      }

      if (parsed.progress.organizationId !== targetOrganizationId) {
        removeCacheRecord(targetOrganizationId)
        return null
      }

      return parsed
    } catch {
      removeCacheRecord(targetOrganizationId)
      return null
    }
  }

  function restoreProgressFromCache() {
    if (!organizationId.value || accessState.value !== 'admin_active') {
      return null
    }

    const cacheRecord = readCacheRecord(organizationId.value)
    if (!cacheRecord) {
      return null
    }

    pendingAction.value = 'restore'

    applySnapshot(
      {
        action: cacheRecord.action,
        progress: cacheRecord.progress,
        transition: cacheRecord.transition,
      },
      'local_storage',
    )

    hasRemoteSnapshot.value = false
    lastCacheSyncAt.value = cacheRecord.cachedAt
    pendingAction.value = null

    return cacheRecord.progress
  }

  function handleStorageEvent(event: StorageEvent) {
    if (
      !organizationId.value ||
      accessState.value !== 'admin_active' ||
      event.storageArea !== window.localStorage ||
      event.key !== getStorageKey(organizationId.value)
    ) {
      return
    }

    if (!event.newValue) {
      lastCacheSyncAt.value = null
      if (cacheSource.value === 'local_storage' || cacheSource.value === 'storage_event') {
        cacheSource.value = 'empty'
      }
      return
    }

    try {
      const parsed = JSON.parse(event.newValue) as unknown
      if (!isOnboardingProgressCacheRecord(parsed)) {
        return
      }

      if (parsed.progress.organizationId !== organizationId.value) {
        return
      }

      if (compareIsoTimestamp(parsed.cachedAt, lastCacheSyncAt.value) <= 0) {
        return
      }

      applySnapshot(
        {
          action: parsed.action,
          progress: parsed.progress,
          transition: parsed.transition,
        },
        'storage_event',
      )

      hasRemoteSnapshot.value = false
      lastCacheSyncAt.value = parsed.cachedAt
    } catch {
      // Ignore malformed cross-tab writes and keep the latest known in-memory snapshot.
    }
  }

  function ensureStorageSync() {
    if (storageSyncInitialized.value || typeof window === 'undefined') {
      return
    }

    window.addEventListener('storage', handleStorageEvent)
    storageSyncInitialized.value = true
  }

  function invalidateProgress(options: { clearPersistedCache?: boolean } = {}) {
    const currentOrganizationId = organizationId.value
    const currentAccessState = accessState.value

    progress.value = null
    transition.value = null
    error.value = null
    lastAction.value = null
    pendingAction.value = null
    cacheSource.value = 'empty'
    initialized.value = currentAccessState !== 'admin_active'
    hasRemoteSnapshot.value = false
    lastRemoteSyncAt.value = null
    lastCacheSyncAt.value = null

    if (options.clearPersistedCache) {
      removeCacheRecord(currentOrganizationId)
    }
  }

  async function loadProgress(options: {
    scope: OnboardingProgressScope
    force?: boolean
  }): Promise<OnboardingProgressState | null> {
    ensureStorageSync()

    if (!sessionUserId.value) {
      clearRuntimeState()
      return null
    }

    const scopeChanged = setScope(options.scope)

    if (accessState.value !== 'admin_active' || !organizationId.value) {
      return null
    }

    if (scopeChanged) {
      restoreProgressFromCache()
    }

    if (hasRemoteSnapshot.value && !options.force) {
      return progress.value
    }

    pendingAction.value = 'get'

    try {
      const result = await getOnboardingProgress()
      applySnapshot(result, 'remote')
      hasRemoteSnapshot.value = true
      lastRemoteSyncAt.value = new Date().toISOString()
      persistRemoteSnapshot(result)
      return result.progress
    } catch (caughtError) {
      if (caughtError instanceof OnboardingProgressApiError) {
        const nextError = {
          code: caughtError.code,
          message: caughtError.message,
          details: caughtError.details,
        }

        if (caughtError.code === 'PERMISSION_DENIED') {
          invalidateProgress({
            clearPersistedCache: true,
          })
          setError(nextError)
        } else {
          setError(nextError)
        }
      }

      throw caughtError
    } finally {
      pendingAction.value = null
    }
  }

  function assertAdminScope() {
    if (!sessionUserId.value) {
      throw createPermissionDeniedError('Authenticated user is required to access onboarding.')
    }

    if (accessState.value !== 'admin_active' || !organizationId.value) {
      throw createPermissionDeniedError('Only admin_active users can update onboarding progress.')
    }
  }

  async function updateStep(stepKey: OnboardingStepKey): Promise<OnboardingProgressState> {
    ensureStorageSync()
    assertAdminScope()
    pendingAction.value = 'update'

    try {
      const result = await updateOnboardingProgress(stepKey)
      applySnapshot(result, 'remote')
      hasRemoteSnapshot.value = true
      lastRemoteSyncAt.value = new Date().toISOString()
      persistRemoteSnapshot(result)
      return result.progress
    } catch (caughtError) {
      if (caughtError instanceof OnboardingProgressApiError) {
        const nextError = {
          code: caughtError.code,
          message: caughtError.message,
          details: caughtError.details,
        }

        if (caughtError.code === 'PERMISSION_DENIED') {
          invalidateProgress({
            clearPersistedCache: true,
          })
          setError(nextError)
        } else {
          setError(nextError)
        }
      }

      throw caughtError
    } finally {
      pendingAction.value = null
    }
  }

  async function complete(): Promise<OnboardingProgressState> {
    ensureStorageSync()
    assertAdminScope()
    pendingAction.value = 'complete'

    try {
      const result = await completeOnboardingProgress()
      applySnapshot(result, 'remote')
      hasRemoteSnapshot.value = true
      lastRemoteSyncAt.value = new Date().toISOString()
      persistRemoteSnapshot(result)
      return result.progress
    } catch (caughtError) {
      if (caughtError instanceof OnboardingProgressApiError) {
        const nextError = {
          code: caughtError.code,
          message: caughtError.message,
          details: caughtError.details,
        }

        if (caughtError.code === 'PERMISSION_DENIED') {
          invalidateProgress({
            clearPersistedCache: true,
          })
          setError(nextError)
        } else {
          setError(nextError)
        }
      }

      throw caughtError
    } finally {
      pendingAction.value = null
    }
  }

  function clearContext() {
    sessionUserId.value = null
    accessState.value = null
    organizationId.value = null
    clearRuntimeState()
  }

  return {
    sessionUserId,
    accessState,
    organizationId,
    progress,
    transition,
    error,
    lastAction,
    pendingAction,
    cacheSource,
    initialized,
    hasRemoteSnapshot,
    lastRemoteSyncAt,
    lastCacheSyncAt,
    currentStepKey,
    completedStepKeys,
    isOnboardingComplete,
    isAdminScoped,
    isLoading,
    isSaving,
    isReadyForGuard,
    shouldForceOnboarding,
    setSessionUserId,
    setScope,
    invalidateProgress,
    loadProgress,
    updateStep,
    complete,
    clearContext,
  }
})
