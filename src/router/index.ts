import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useRbacStore } from '@/stores/rbac';
import { resolveAuthNavigationTarget, resolveRouteAccessTarget, stepProgressGuard } from './guards';
import {
  ACCESS_PENDING_ROUTE_PATH,
  ACCESS_REJECTED_ROUTE_PATH,
  APP_HOME_ROUTE_PATH,
  LEGACY_APPROVAL_QUEUE_ROUTE_PATH,
  LEGACY_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH,
  LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH,
  LEGACY_SCHEDULE_STEP1_ROUTE_PATH,
  LEGACY_SCHEDULE_STEP2_ROUTE_PATH,
  LEGACY_SCHEDULE_STEP3_ROUTE_PATH,
  LEGACY_SCHEDULE_STEP4_ROUTE_PATH,
  LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX,
  LEGACY_USER_HOME_ROUTE_PATH,
  LOGIN_ROUTE_PATH,
  PUBLIC_ROOT_ROUTE_PATH,
  SIGNUP_ROUTE_PATH,
  getAppHomeRoutePath,
  getApprovalQueueRoutePath,
  getOpsOffRequestPolicySetupRoutePath,
  getOpsOrganizationSetupRoutePath,
  getScheduleStepRoutePath,
  getUserHomeRoutePath,
  isAppRoutePath,
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
        path: LEGACY_APPROVAL_QUEUE_ROUTE_PATH.slice(1),
        name: 'ApprovalQueue',
        component: () => import('@/views/admin/ApprovalQueueView.vue'),
        meta: { requiresAuth: true, title: '관리자 가입 승인' },
      },
      {
        path: LEGACY_USER_HOME_ROUTE_PATH.slice(1),
        name: 'UserHome',
        component: () => import('@/views/UserHome.vue'),
        meta: { requiresAuth: true, title: '내 홈' },
      },
      {
        path: LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH.slice(1),
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
        path: LEGACY_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH.slice(1),
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
        path: LEGACY_SCHEDULE_STEP1_ROUTE_PATH.slice(1),
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
        path: LEGACY_SCHEDULE_STEP2_ROUTE_PATH.slice(1),
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
        path: LEGACY_SCHEDULE_STEP3_ROUTE_PATH.slice(1),
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
        path: LEGACY_SCHEDULE_STEP4_ROUTE_PATH.slice(1),
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
        path: `${LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX.slice(1)}:scheduleKey`,
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

function resolveTemporarilyMountedPath(path: string): string | null {
  if (!isAppRoutePath(path)) {
    return null;
  }

  if (path === getAppHomeRoutePath()) {
    return PUBLIC_ROOT_ROUTE_PATH;
  }

  if (path === getApprovalQueueRoutePath()) {
    return LEGACY_APPROVAL_QUEUE_ROUTE_PATH;
  }

  if (path === getUserHomeRoutePath()) {
    return LEGACY_USER_HOME_ROUTE_PATH;
  }

  if (path === getOpsOrganizationSetupRoutePath()) {
    return LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH;
  }

  if (path === getOpsOffRequestPolicySetupRoutePath()) {
    return LEGACY_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH;
  }

  if (path === getScheduleStepRoutePath(1)) {
    return LEGACY_SCHEDULE_STEP1_ROUTE_PATH;
  }

  if (path === getScheduleStepRoutePath(2)) {
    return LEGACY_SCHEDULE_STEP2_ROUTE_PATH;
  }

  if (path === getScheduleStepRoutePath(3)) {
    return LEGACY_SCHEDULE_STEP3_ROUTE_PATH;
  }

  if (path === getScheduleStepRoutePath(4)) {
    return LEGACY_SCHEDULE_STEP4_ROUTE_PATH;
  }

  if (path.startsWith(`${APP_HOME_ROUTE_PATH}/schedule/step5/`)) {
    const scheduleKey = path.slice(`${APP_HOME_ROUTE_PATH}/schedule/step5/`.length);
    return scheduleKey ? `${LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX}${scheduleKey}` : null;
  }

  return null;
}

function normalizeRedirectTarget(targetPath: string): string {
  return resolveTemporarilyMountedPath(targetPath) ?? targetPath;
}

router.beforeEach(async (to, from, next) => {
  const temporaryMountedPath = resolveTemporarilyMountedPath(to.path);
  if (temporaryMountedPath && temporaryMountedPath !== to.path) {
    next({
      path: temporaryMountedPath,
      query: to.query,
      hash: to.hash,
      replace: true,
    });
    return;
  }

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
    const nextPath = normalizeRedirectTarget(authRedirect);
    if (nextPath === to.path) {
      next();
      return;
    }

    next(nextPath);
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
  });

  if (routeAccessRedirect) {
    const nextPath = normalizeRedirectTarget(routeAccessRedirect);
    if (nextPath === to.path) {
      next();
      return;
    }

    next(nextPath);
    return;
  }

  if (to.path.startsWith('/schedule/step')) {
    await stepProgressGuard(to, from, next);
    return;
  }

  next();
});

router.afterEach((to) => {
  const baseTitle = 'EveryShift';
  const pageTitle = to.meta.title as string;

  document.title = pageTitle ? `${pageTitle} - ${baseTitle}` : baseTitle;
});

export default router;
