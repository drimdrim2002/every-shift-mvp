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
    meta: { requiresAuth: false, title: '로그인' },
  },
  {
    path: SIGNUP_ROUTE_PATH,
    name: 'Signup',
    component: () => import('@/views/auth/Signup.vue'),
    meta: { requiresAuth: false, title: '회원가입' },
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
    meta: { requiresAuth: false, title: 'everyshift' },
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
  const baseTitle = 'everyshift';
  const pageTitle = to.meta.title as string;

  document.title = pageTitle ? `${pageTitle} - ${baseTitle}` : baseTitle;
});

export default router;
