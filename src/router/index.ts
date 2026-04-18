import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useRbacStore } from '@/stores/rbac';
import { resolveAuthNavigationTarget, resolveRouteAccessTarget, stepProgressGuard } from './guards';
import {
  ACCESS_PENDING_ROUTE_PATH,
  ACCESS_REJECTED_ROUTE_PATH,
  APPROVAL_QUEUE_ROUTE_PATH,
  LOGIN_ROUTE_PATH,
  SIGNUP_ROUTE_PATH,
  USER_HOME_ROUTE_PATH,
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
    path: '/',
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
        path: APPROVAL_QUEUE_ROUTE_PATH.slice(1),
        name: 'ApprovalQueue',
        component: () => import('@/views/admin/ApprovalQueueView.vue'),
        meta: { requiresAuth: true, title: '관리자 가입 승인' },
      },
      {
        path: USER_HOME_ROUTE_PATH,
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
          title: '조직/사이트 기본 설정',
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

// 인증 가드 및 Step 진행 검증 가드
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  const rbacStore = useRbacStore();

  // 세션 확인
  if (!authStore.user) {
    await authStore.checkSession();
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  // 1. 인증 체크
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
  });

  if (authRedirect) {
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
  });

  if (routeAccessRedirect) {
    next(routeAccessRedirect);
    return;
  }

  // 2. Step 진행 순서 검증 (인증된 사용자만 해당)
  if (to.path.startsWith('/schedule/step')) {
    await stepProgressGuard(to, from, next);
    return;
  }

  next();
});

// 동적 title 설정
router.afterEach((to) => {
  const baseTitle = 'EveryShift';
  const pageTitle = to.meta.title as string;

  document.title = pageTitle ? `${pageTitle} - ${baseTitle}` : baseTitle;
});

export default router;
