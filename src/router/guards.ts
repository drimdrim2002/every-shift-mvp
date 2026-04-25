import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useScheduleStore } from '@/stores/schedule';
import { supabase } from '@/api/supabase';
import { showWarning } from '@/utils/message';
import { isSetupEntryMode } from '@/utils/scheduleEntryMode';
import type { AccessAbilities, AccessState } from '@/types/rbac';
import {
  ACCESS_PENDING_ROUTE_PATH,
  ACCESS_REJECTED_ROUTE_PATH,
  LOGIN_ROUTE_PATH,
  getAppHomeRoutePath,
  getApprovalQueueRoutePath,
  getLegacyRedirectTarget,
  getScheduleStepRoutePath,
  getUserHomeRoutePath,
  isAccessStateRoutePath,
  isAuthPagePath,
  isPublicRootRoutePath,
  isScheduleStep5RoutePath,
  resolvePostAuthRedirectPath,
} from '@/constants/routes';

export function resolveBlockedStatePath(accessState: AccessState | null): string | null {
  if (accessState === 'admin_pending') {
    return ACCESS_PENDING_ROUTE_PATH;
  }

  if (accessState === 'admin_rejected') {
    return ACCESS_REJECTED_ROUTE_PATH;
  }

  return null;
}

interface ResolveAuthNavigationTargetInput {
  toPath: string;
  isAuthenticated: boolean;
  accessState: AccessState | null;
  abilities?: AccessAbilities;
}

interface ResolveRouteAccessTargetInput {
  toPath: string;
  accessState: AccessState | null;
  abilities: AccessAbilities;
  selectedOrganizationId?: string | null;
  requiresOrgContext?: boolean;
  requiredOrgRole?: 'admin';
}

function resolveAuthenticatedFallbackPath(
  accessState: AccessState | null,
  abilities: AccessAbilities,
): string {
  if (abilities.canViewApprovalQueue) {
    return getApprovalQueueRoutePath();
  }

  if (abilities.canViewRestrictedUserHome) {
    return getUserHomeRoutePath();
  }

  return resolvePostAuthRedirectPath(accessState);
}

function hasOrgAdminAccess(abilities: AccessAbilities) {
  return (
    abilities.canManageOrganizationSetup
    || abilities.canManageEmployees
    || abilities.canManageSchedules
  );
}

function normalizeAppContractPath(path: string): string {
  return getLegacyRedirectTarget(path) ?? path;
}

export function resolveAuthNavigationTarget({
  toPath,
  isAuthenticated,
  accessState,
}: ResolveAuthNavigationTargetInput): string | null {
  if (!isAuthenticated) {
    return null;
  }

  const blockedStatePath = resolveBlockedStatePath(accessState);
  if (blockedStatePath) {
    return toPath === blockedStatePath ? null : blockedStatePath;
  }

  if (isPublicRootRoutePath(toPath)) {
    const redirectPath = getAppHomeRoutePath();
    return redirectPath === normalizeAppContractPath(toPath) ? null : redirectPath;
  }

  if (isAuthPagePath(toPath) || isAccessStateRoutePath(toPath)) {
    const redirectPath = resolvePostAuthRedirectPath(accessState);
    return redirectPath === normalizeAppContractPath(toPath) ? null : redirectPath;
  }

  return null;
}

export function resolveRouteAccessTarget({
  toPath,
  accessState,
  abilities,
  selectedOrganizationId = null,
  requiresOrgContext = false,
  requiredOrgRole,
}: ResolveRouteAccessTargetInput): string | null {
  const normalizedToPath = normalizeAppContractPath(toPath);
  const fallbackPath = resolveAuthenticatedFallbackPath(accessState, abilities);

  if (normalizedToPath === getAppHomeRoutePath()) {
    if (abilities.canViewApprovalQueue && !hasOrgAdminAccess(abilities)) {
      return getApprovalQueueRoutePath();
    }

    if (abilities.canViewRestrictedUserHome) {
      return getUserHomeRoutePath();
    }

    return null;
  }

  if (normalizedToPath === getUserHomeRoutePath()) {
    if (abilities.canViewRestrictedUserHome) {
      return null;
    }

    return fallbackPath === getUserHomeRoutePath() ? getAppHomeRoutePath() : fallbackPath;
  }

  if (normalizedToPath === getApprovalQueueRoutePath()) {
    if (abilities.canViewApprovalQueue) {
      return null;
    }

    return fallbackPath === getApprovalQueueRoutePath() ? getAppHomeRoutePath() : fallbackPath;
  }

  if (requiresOrgContext && !selectedOrganizationId) {
    return fallbackPath === normalizedToPath ? getAppHomeRoutePath() : fallbackPath;
  }

  if (requiredOrgRole === 'admin' && !hasOrgAdminAccess(abilities)) {
    return fallbackPath === normalizedToPath ? getAppHomeRoutePath() : fallbackPath;
  }

  if (accessState === 'no_membership_or_inactive') {
    return LOGIN_ROUTE_PATH;
  }

  return null;
}

/**
 * Step 진행 순서 검증 가드
 * - Step 2: Step 1 완료 필요 (basicInfo.month 필수)
 * - Step 3: Step 2 완료 필요 (siteRequirements)
 * - Step 4: Step 3 완료 필요 (employees)
 * - Step 5: scheduleKey 필수 (params.scheduleKey)
 */
export async function stepProgressGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
) {
  const scheduleStore = useScheduleStore();
  const isSetupEntry = isSetupEntryMode(to.query);
  const targetPath = normalizeAppContractPath(to.path);

  if (targetPath === getScheduleStepRoutePath(2)) {
    if (isSetupEntry) {
      next();
      return;
    }

    if (!scheduleStore.basicInfo?.month) {
      showWarning('먼저 기본 정보를 입력해주세요.');
      next(getScheduleStepRoutePath(1));
      return;
    }
  }

  if (targetPath === getScheduleStepRoutePath(3)) {
    if (isSetupEntry) {
      next();
      return;
    }

    if (!scheduleStore.basicInfo?.month) {
      showWarning('먼저 기본 정보를 입력해주세요.');
      next(getScheduleStepRoutePath(1));
      return;
    }

    if (!scheduleStore.siteRequirements || scheduleStore.siteRequirements.length === 0) {
      showWarning('먼저 사이트 정보를 입력해주세요.');
      next(getScheduleStepRoutePath(2));
      return;
    }
  }

  if (targetPath === getScheduleStepRoutePath(4)) {
    if (!scheduleStore.basicInfo?.month) {
      showWarning('먼저 기본 정보를 입력해주세요.');
      next(getScheduleStepRoutePath(1));
      return;
    }

    const hasStoreEmployees = !!scheduleStore.employees && scheduleStore.employees.length > 0;
    if (!hasStoreEmployees) {
      try {
        const { count, error } = await supabase
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', scheduleStore.basicInfo.organizationId);

        if (error) {
          console.warn('[stepProgressGuard] Failed to query employees count:', error);
        } else if (!count || count === 0) {
          showWarning('먼저 직원 정보를 입력해주세요.');
          next(getScheduleStepRoutePath(3));
          return;
        }
      } catch (error) {
        console.warn('[stepProgressGuard] Unexpected error while checking employees:', error);
      }
    }
  }

  if (isScheduleStep5RoutePath(targetPath)) {
    if (!to.params.scheduleKey) {
      showWarning('잘못된 접근입니다.');
      next(getScheduleStepRoutePath(1));
      return;
    }
  }

  next();
}
