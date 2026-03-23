import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useScheduleStore } from '@/stores/schedule';
import { useOnboardingStore } from '@/stores/onboarding';
import { supabase } from '@/api/supabase';
import { OnboardingProgressApiError } from '@/api/onboarding';
import type { AccessState } from '@/types/rbac';
import {
  isAccessStateRoutePath,
  isAuthPagePath,
  isOnboardingRoutePath,
  LOGIN_ROUTE_PATH,
  ONBOARDING_ROUTE_PATH,
  resolvePostAuthRedirectPath,
} from '@/constants/routes';
import {
  isAllowedOnboardingCompatibilityTarget,
  isEmployeeSeedDeepLinkTarget,
} from '@/utils/onboarding-context';

/**
 * Step 진행 순서 검증 가드
 * - Step 2: Step 1 완료 필요 (basicInfo.month 필수)
 * - Step 3: Step 2 완료 필요 (siteRequirements)
 * - Step 4: Step 3 완료 필요 (employees)
 * - Step 5: scheduleId 필수 (params.id)
 */
export async function stepProgressGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
) {
  const scheduleStore = useScheduleStore();

  // Step 2 접근 시 Step 1 완료 확인
  if (to.path === '/schedule/step2') {
    if (!scheduleStore.basicInfo?.month) {
      window.$message?.warning('먼저 기본 정보를 입력해주세요.');
      next('/schedule/step1');
      return;
    }
  }

  // Step 3 (직원 정보) 접근 시 Step 2 완료 확인
  if (to.path === '/schedule/step3') {
    if (isEmployeeSeedDeepLinkTarget(to)) {
      next();
      return;
    }

    if (!scheduleStore.basicInfo?.month) {
      window.$message?.warning('먼저 기본 정보를 입력해주세요.');
      next('/schedule/step1');
      return;
    }
    if (!scheduleStore.siteRequirements || scheduleStore.siteRequirements.length === 0) {
      window.$message?.warning('먼저 사이트 정보를 입력해주세요.');
      next('/schedule/step2');
      return;
    }
  }

  // Step 4 (초기 데이터) 접근 시 Step 3 완료 확인
  if (to.path === '/schedule/step4') {
    if (!scheduleStore.basicInfo?.month) {
      window.$message?.warning('먼저 기본 정보를 입력해주세요.');
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
          window.$message?.warning('먼저 직원 정보를 입력해주세요.');
          next('/schedule/step3');
          return;
        }
      } catch (error) {
        console.warn('[stepProgressGuard] Unexpected error while checking employees:', error);
      }
    }
  }

  // Step 5 (결과 확인) 접근 시 scheduleId 필수 (params.id)
  if (to.path.startsWith('/schedule/step5')) {
    if (!to.params.id) {
      window.$message?.warning('잘못된 접근입니다.');
      next('/');
      return;
    }
  }

  next();
}

export async function onboardingProgressGuard(
  to: RouteLocationNormalized,
  accessState: AccessState | null,
  effectiveOrganizationId: string | null,
): Promise<string | null> {
  const toPath = to.path;
  const isAuthPage = isAuthPagePath(toPath);
  const isAccessStatePage = isAccessStateRoutePath(toPath);
  const isOnboardingPage = isOnboardingRoutePath(toPath);

  if (!accessState || accessState === 'unauthenticated') {
    if (isOnboardingPage) {
      return LOGIN_ROUTE_PATH;
    }

    return null;
  }

  if (accessState === 'admin_pending' || accessState === 'admin_rejected') {
    return null;
  }

  if (accessState === 'no_membership_or_inactive') {
    return isOnboardingPage ? LOGIN_ROUTE_PATH : null;
  }

  if (accessState === 'user_active' || accessState === 'super_active') {
    if (isOnboardingPage || isAuthPage) {
      return resolvePostAuthRedirectPath(accessState);
    }

    return null;
  }

  if (!effectiveOrganizationId) {
    return null;
  }

  const onboardingStore = useOnboardingStore();

  try {
    await onboardingStore.loadProgress({
      scope: {
        accessState,
        organizationId: effectiveOrganizationId,
      },
    });
  } catch (caughtError) {
    if (caughtError instanceof OnboardingProgressApiError && caughtError.code === 'PERMISSION_DENIED') {
      return LOGIN_ROUTE_PATH;
    }

    return null;
  }

  if (!onboardingStore.shouldForceOnboarding) {
    if (isOnboardingPage || isAuthPage) {
      return resolvePostAuthRedirectPath(accessState);
    }

    return null;
  }

  const shouldForceOnboarding = isAuthPage || isAccessStatePage || to.matched.some((record) => record.meta.requiresAuth);
  if (shouldForceOnboarding && isAllowedOnboardingCompatibilityTarget(to)) {
    return null;
  }

  if (shouldForceOnboarding) {
    return ONBOARDING_ROUTE_PATH;
  }

  return null;
}
