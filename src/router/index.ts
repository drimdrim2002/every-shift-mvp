import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useRbacStore } from '@/stores/rbac';
import { resolveAuthNavigationTarget, resolveRouteAccessTarget, stepProgressGuard } from './guards';
import {
  ACCESS_PENDING_ROUTE_PATH,
  ACCESS_REJECTED_ROUTE_PATH,
  APP_HOME_ROUTE_PATH,
  LEGACY_APP_ROUTE_REDIRECTS,
  LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX,
  LOGIN_ROUTE_PATH,
  OAUTH_CALLBACK_ROUTE_PATH,
  PUBLIC_FAQ_ROUTE_PATH,
  PUBLIC_ROOT_ROUTE_PATH,
  SIGNUP_ROUTE_PATH,
  SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH,
  getLegacyRedirectTarget,
  getScheduleStep5RoutePath,
  isScheduleRoutePath,
} from '@/constants/routes';

const devOnlyRoutes: RouteRecordRaw[] = [
  {
    path: '/test',
    name: 'TestOrganization',
    component: () => import('@/views/TestOrganization.vue'),
    meta: { requiresAuth: false, title: 'Organization Store 테스트' },
  },
  {
    path: '/test-schedule',
    name: 'TestSchedule',
    component: () => import('@/views/TestSchedule.vue'),
    meta: { requiresAuth: false, title: 'Schedule Store 테스트' },
  },
  {
    path: '/test-step-indicator',
    name: 'TestStepIndicator',
    component: () => import('@/views/TestStepIndicator.vue'),
    meta: { requiresAuth: false, title: 'StepIndicator 테스트' },
  },
  {
    path: '/test-grid',
    name: 'TestScheduleGrid',
    component: () => import('@/views/TestScheduleGrid.vue'),
    meta: { requiresAuth: false, title: 'ScheduleGrid 테스트' },
  },
];

const baseRoutes: RouteRecordRaw[] = [
  {
    path: LOGIN_ROUTE_PATH,
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { requiresAuth: false, title: '로그인', manageTitle: false },
  },
  {
    path: SIGNUP_ROUTE_PATH,
    name: 'Signup',
    component: () => import('@/views/auth/Signup.vue'),
    meta: { requiresAuth: false, title: '회원가입', manageTitle: false },
  },
  {
    path: OAUTH_CALLBACK_ROUTE_PATH,
    name: 'OAuthCallback',
    component: () => import('@/views/auth/OAuthCallback.vue'),
    meta: { requiresAuth: false, title: '인증 처리', allowsNoMembership: true },
  },
  {
    path: SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH,
    name: 'SocialSignupComplete',
    component: () => import('@/views/auth/SocialSignupComplete.vue'),
    meta: { requiresAuth: true, title: '가입 완료', allowsNoMembership: true },
  },
  {
    path: ACCESS_PENDING_ROUTE_PATH,
    name: 'AccessPending',
    component: () => import('@/views/auth/AccessState.vue'),
    meta: { requiresAuth: true, title: '승인 대기', accessStateView: 'pending' },
  },
  {
    path: ACCESS_REJECTED_ROUTE_PATH,
    name: 'AccessRejected',
    component: () => import('@/views/auth/AccessState.vue'),
    meta: { requiresAuth: true, title: '승인 반려', accessStateView: 'rejected' },
  },
  {
    path: PUBLIC_ROOT_ROUTE_PATH,
    name: 'PublicLanding',
    component: () => import('@/views/PublicLandingView.vue'),
    meta: { requiresAuth: false, title: 'EveryShift | 교대 근무표 AI 솔루션', manageTitle: false },
  },
  {
    path: PUBLIC_FAQ_ROUTE_PATH,
    name: 'PublicFaq',
    component: () => import('@/views/PublicFaqView.vue'),
    meta: { requiresAuth: false, title: 'EveryShift | FAQ', manageTitle: false },
  },
  {
    path: APP_HOME_ROUTE_PATH,
    component: () => import('@/components/layout/DefaultLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '대시보드' },
      },
      {
        path: 'admin/approval-queue',
        name: 'ApprovalQueue',
        component: () => import('@/views/admin/ApprovalQueueView.vue'),
        meta: { requiresAuth: true, title: '관리자 가입 승인' },
      },
      {
        path: 'home/user',
        name: 'UserHome',
        component: () => import('@/views/UserHome.vue'),
        meta: { requiresAuth: true, title: '내 홈' },
      },
      {
        path: 'ops/organization-setup',
        name: 'OrganizationProfileSetup',
        component: () => import('@/views/ops/OrganizationProfileSetup.vue'),
        meta: {
          requiresAuth: true,
          title: '운영 기본 설정',
          requiresOrgContext: true,
          requiredOrgRole: 'admin',
        },
      },
      {
        path: 'ops/off-request-policy-setup',
        name: 'OffRequestPolicySetup',
        component: () => import('@/views/ops/OffRequestPolicySetup.vue'),
        meta: {
          requiresAuth: true,
          title: 'Off 사용 기준 설정',
          requiresOrgContext: true,
          requiredOrgRole: 'admin',
        },
      },
      {
        path: 'schedule-results',
        name: 'ScheduleResults',
        component: () => import('@/views/schedule/ScheduleResults.vue'),
        meta: {
          requiresAuth: true,
          title: '생성된 근무표',
          requiresOrgContext: true,
          requiredOrgRole: 'admin',
        },
      },
      {
        path: 'work-performance',
        name: 'WorkPerformance',
        component: () => import('@/views/schedule/WorkPerformance.vue'),
        meta: {
          requiresAuth: true,
          title: '근무 기록',
          requiresOrgContext: true,
          requiredOrgRole: 'admin',
        },
      },
      {
        path: 'schedule/step1',
        name: 'Step1',
        component: () => import('@/views/schedule/Step1BasicInfo.vue'),
        meta: {
          requiresAuth: true,
          title: '기본 정보',
          requiresOrgContext: true,
          requiredOrgRole: 'admin',
        },
      },
      {
        path: 'schedule/step2',
        name: 'Step2',
        component: () => import('@/views/schedule/Step2SiteInfo.vue'),
        meta: {
          requiresAuth: true,
          title: '사이트 정보',
          requiresOrgContext: true,
          requiredOrgRole: 'admin',
        },
      },
      {
        path: 'schedule/step3',
        name: 'Step3',
        component: () => import('@/views/schedule/Step3EmployeeInfo.vue'),
        meta: {
          requiresAuth: true,
          title: '직원 정보',
          requiresOrgContext: true,
          requiredOrgRole: 'admin',
        },
      },
      {
        path: 'schedule/step4',
        name: 'Step4',
        component: () => import('@/views/schedule/Step4InitialData.vue'),
        meta: {
          requiresAuth: true,
          title: '초기 데이터',
          requiresOrgContext: true,
          requiredOrgRole: 'admin',
        },
      },
      {
        path: 'schedule/step5/:scheduleKey',
        name: 'Step5',
        component: () => import('@/views/schedule/Step5Result.vue'),
        meta: {
          requiresAuth: true,
          title: '결과 확인',
          requiresOrgContext: true,
          requiredOrgRole: 'admin',
        },
      },
    ],
  },
  ...Object.entries(LEGACY_APP_ROUTE_REDIRECTS).map(([legacyPath, canonicalPath]) => ({
    path: legacyPath,
    redirect: (to) => ({
      path: getLegacyRedirectTarget(to.path) ?? canonicalPath,
      query: to.query,
      hash: to.hash,
      replace: true,
    }),
  } satisfies RouteRecordRaw)),
  {
    path: `${LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX}:scheduleKey`,
    redirect: (to) => ({
      path: getScheduleStep5RoutePath(String(to.params.scheduleKey)),
      query: to.query,
      hash: to.hash,
      replace: true,
    }),
  },
];

export function createAppRoutes(isDev = import.meta.env.DEV): RouteRecordRaw[] {
  if (!isDev) {
    return [...baseRoutes];
  }

  return [...baseRoutes, ...devOnlyRoutes];
}

const router = createRouter({
  history: createWebHistory(),
  routes: createAppRoutes(),
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  const rbacStore = useRbacStore();

  if (!authStore.user) {
    await authStore.checkSession();
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  if (requiresAuth && !authStore.user) {
    next(LOGIN_ROUTE_PATH);
    return;
  }

  if (authStore.user) {
    await rbacStore.ensureAccessContextLoaded();
  }

  const authRedirect = resolveAuthNavigationTarget({
    toPath: to.path,
    isAuthenticated: Boolean(authStore.user),
    accessState: rbacStore.accessState,
    abilities: rbacStore.abilities,
  });

  if (authRedirect) {
    if (authRedirect === to.path) {
      next();
      return;
    }

    next(authRedirect);
    return;
  }

  const routeAccessRedirect = resolveRouteAccessTarget({
    toPath: to.path,
    accessState: rbacStore.accessState,
    abilities: rbacStore.abilities,
    selectedOrganizationId: rbacStore.selectedOrganizationId,
    requiresOrgContext: to.matched.some((record) => record.meta.requiresOrgContext),
    requiredOrgRole: to.matched.some((record) => record.meta.requiredOrgRole === 'admin')
      ? 'admin'
      : undefined,
    allowsNoMembership: to.matched.some((record) => record.meta.allowsNoMembership),
  });

  if (routeAccessRedirect) {
    if (routeAccessRedirect === to.path) {
      next();
      return;
    }

    next(routeAccessRedirect);
    return;
  }

  if (isScheduleRoutePath(to.path)) {
    await stepProgressGuard(to, from, next);
    return;
  }

  next();
});

router.afterEach((to) => {
  if (to.matched.some((record) => record.meta.manageTitle === false)) {
    return;
  }

  const baseTitle = 'everyshift';
  const pageTitle = to.meta.title as string | undefined;

  document.title = pageTitle ? `${pageTitle} - ${baseTitle}` : baseTitle;
});

const handleChunkError = (error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error || '');
  const isChunkLoadFailed =
    errorMessage.includes('Failed to fetch dynamically imported module') ||
    errorMessage.includes('Failed to load module script') ||
    errorMessage.includes('Expected a JavaScript-or-Wasm module script') ||
    errorMessage.includes('Failed to load stylesheet');

  if (isChunkLoadFailed) {
    const now = Date.now();
    const lastReload = sessionStorage.getItem('last-chunk-error-reload');

    // 15초 이내에 이미 재시도(reload)를 한 적이 있다면, 무한 루프 방지를 위해 리로드하지 않고 콘솔에만 기록합니다.
    if (lastReload && now - parseInt(lastReload, 10) < 15000) {
      console.error('Infinite reload loop prevented. Actual dynamic import error:', error);
      return;
    }

    sessionStorage.setItem('last-chunk-error-reload', String(now));
    window.location.reload();
  }
};

router.onError((error) => {
  handleChunkError(error);
});

if (typeof window !== 'undefined') {
  // Global error listener for resource loading failures (capture phase)
  window.addEventListener(
    'error',
    (event) => {
      const target = event.target || event.srcElement;
      
      // 1. Script loading errors (JS Chunks)
      if (target instanceof HTMLScriptElement) {
        const src = target.src || '';
        // 외부 서드파티 스크립트(애드블록 등으로 인한 차단)가 아닌, 앱 자체 애셋(청크) 로드 실패만 감지
        const isAppAsset = src.includes('/assets/') || src.includes('/src/') || src.startsWith(window.location.origin);
        if (isAppAsset) {
          handleChunkError(new Error(`Failed to load module script: ${src}`));
        }
      }
      // 2. Stylesheet loading errors (CSS Chunks)
      else if (target instanceof HTMLLinkElement && target.rel === 'stylesheet') {
        const href = target.href || '';
        const isAppAsset = href.includes('/assets/') || href.startsWith(window.location.origin);
        if (isAppAsset) {
          handleChunkError(new Error(`Failed to load stylesheet: ${href}`));
        }
      }
      // 3. General errors with text matching
      else if (event.message) {
        handleChunkError(event.message);
      }
    },
    true
  );

  // Global unhandled promise rejection listener (for dynamic imports that fail to resolve)
  window.addEventListener('unhandledrejection', (event) => {
    handleChunkError(event.reason);
  });
}

export default router;
