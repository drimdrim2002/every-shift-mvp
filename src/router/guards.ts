import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useScheduleStore } from '@/stores/schedule';
import { supabase } from '@/api/supabase';
import { showWarning } from '@/utils/message';
import { isSetupEntryMode } from '@/utils/scheduleEntryMode';
import type { AccessAbilities, AccessState } from '@/types/rbac';
import {
  ACCESS_PENDING_ROUTE_PATH,
  ACCESS_REJECTED_ROUTE_PATH,
  APPROVAL_QUEUE_ROUTE_PATH,
  HOME_ROUTE_PATH,
  LOGIN_ROUTE_PATH,
  USER_HOME_ROUTE_PATH,
  isAccessStateRoutePath,
  isAuthPagePath,
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

export function resolveAuthNavigationTarget({
  toPath,
  isAuthenticated,
  accessState,
  abilities,
}: ResolveAuthNavigationTargetInput): string | null {
  if (!isAuthenticated) {
    return null;
  }

  const blockedStatePath = resolveBlockedStatePath(accessState);
  if (blockedStatePath) {
    return toPath === blockedStatePath ? null : blockedStatePath;
  }

  if (toPath === HOME_ROUTE_PATH) {
    if (accessState === 'super_active' && abilities && hasOrgAdminAccess(abilities)) {
      return null;
    }

    const redirectPath = resolvePostAuthRedirectPath(accessState);
    return redirectPath === toPath ? null : redirectPath;
  }

  if (isAuthPagePath(toPath) || isAccessStateRoutePath(toPath)) {
    const redirectPath = resolvePostAuthRedirectPath(accessState);
    return redirectPath === toPath ? null : redirectPath;
  }

  return null;
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
    return APPROVAL_QUEUE_ROUTE_PATH;
  }

  if (abilities.canViewRestrictedUserHome) {
    return USER_HOME_ROUTE_PATH;
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

export function resolveRouteAccessTarget({
  toPath,
  accessState,
  abilities,
  selectedOrganizationId = null,
  requiresOrgContext = false,
  requiredOrgRole,
}: ResolveRouteAccessTargetInput): string | null {
  const fallbackPath = resolveAuthenticatedFallbackPath(accessState, abilities);

  if (toPath === HOME_ROUTE_PATH) {
    if (abilities.canViewApprovalQueue && !hasOrgAdminAccess(abilities)) {
      return APPROVAL_QUEUE_ROUTE_PATH;
    }

    if (abilities.canViewRestrictedUserHome) {
      return USER_HOME_ROUTE_PATH;
    }

    return null;
  }

  if (toPath === USER_HOME_ROUTE_PATH) {
    if (abilities.canViewRestrictedUserHome) {
      return null;
    }

    return fallbackPath === USER_HOME_ROUTE_PATH ? HOME_ROUTE_PATH : fallbackPath;
  }

  if (toPath === APPROVAL_QUEUE_ROUTE_PATH) {
    if (abilities.canViewApprovalQueue) {
      return null;
    }

    return fallbackPath === APPROVAL_QUEUE_ROUTE_PATH ? HOME_ROUTE_PATH : fallbackPath;
  }

  if (requiresOrgContext && !selectedOrganizationId) {
    return fallbackPath === toPath ? HOME_ROUTE_PATH : fallbackPath;
  }

  if (requiredOrgRole === 'admin' && !hasOrgAdminAccess(abilities)) {
    return fallbackPath === toPath ? HOME_ROUTE_PATH : fallbackPath;
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

  // Step 2 접근 시 Step 1 완료 확인
  if (to.path === '/schedule/step2') {
    if (isSetupEntry) {
      next();
      return;
    }

    if (!scheduleStore.basicInfo?.month) {
      showWarning('먼저 기본 정보를 입력해주세요.');
      next('/schedule/step1');
      return;
    }
  }

  // Step 3 (직원 정보) 접근 시 Step 2 완료 확인
  if (to.path === '/schedule/step3') {
    if (isSetupEntry) {
      next();
      return;
    }

    if (!scheduleStore.basicInfo?.month) {
      showWarning('먼저 기본 정보를 입력해주세요.');
      next('/schedule/step1');
      return;
    }
    if (!scheduleStore.siteRequirements || scheduleStore.siteRequirements.length === 0) {
      showWarning('먼저 사이트 정보를 입력해주세요.');
      next('/schedule/step2');
      return;
    }
  }

  // Step 4 (초기 데이터) 접근 시 Step 3 완료 확인
  if (to.path === '/schedule/step4') {
    if (!scheduleStore.basicInfo?.month) {
      showWarning('먼저 기본 정보를 입력해주세요.');
      next('/schedule/step1');
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
          next('/schedule/step3');
          return;
        }
      } catch (error) {
        console.warn('[stepProgressGuard] Unexpected error while checking employees:', error);
      }
    }
  }

  // Step 5 (결과 확인) 접근 시 scheduleKey 필수 (params.scheduleKey)
  if (to.path.startsWith('/schedule/step5')) {
    if (!to.params.scheduleKey) {
      showWarning('잘못된 접근입니다.');
      next('/');
      return;
    }
  }

  next();
}
