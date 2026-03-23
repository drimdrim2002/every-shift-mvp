import { createRouter, createWebHistory } from 'vue-router';
import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useRbacStore } from '@/stores/rbac';
import type { AccessState } from '@/types/rbac';
import {
  ADMIN_DASHBOARD_ROUTE_PATH,
  ACCESS_PENDING_ROUTE_PATH,
  ACCESS_REJECTED_ROUTE_PATH,
  isAccessStateRoutePath,
  LOGIN_ROUTE_PATH,
  ONBOARDING_ROUTE_PATH,
  SIGNUP_ROUTE_PATH,
  isAuthPagePath,
  isPublicRoutePath,
  resolvePostAuthRedirectPath,
} from '@/constants/routes';
import { onboardingProgressGuard, stepProgressGuard } from './guards';

const BLOCKED_ACCESS_STATE_SET = new Set<AccessState>(['admin_pending', 'admin_rejected']);

function getAllowedAccessStates(to: RouteLocationNormalized): AccessState[] | null {
  for (const record of to.matched) {
    const states = record.meta.allowedAccessStates;
    if (Array.isArray(states)) {
      return states as AccessState[];
    }
  }

  return null;
}

function resolveBlockedStatePath(accessState: AccessState | null): string | null {
  if (accessState === 'admin_pending') {
    return ACCESS_PENDING_ROUTE_PATH;
  }

  if (accessState === 'admin_rejected') {
    return ACCESS_REJECTED_ROUTE_PATH;
  }

  return null;
}

const routes: RouteRecordRaw[] = [
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
    meta: {
      requiresAuth: true,
      title: '승인 대기',
      allowedAccessStates: ['admin_pending'],
      accessStateView: 'pending',
    },
  },
  {
    path: ACCESS_REJECTED_ROUTE_PATH,
    name: 'AccessRejected',
    component: () => import('@/views/auth/AccessState.vue'),
    meta: {
      requiresAuth: true,
      title: '승인 반려',
      allowedAccessStates: ['admin_rejected'],
      accessStateView: 'rejected',
    },
  },
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
  {
    path: '/test-p5',
    name: 'TestP5Master',
    component: () => import('@/views/TestP5Master.vue'),
    meta: { requiresAuth: false, title: 'P5 Organization Master 테스트' },
  },
  {
    path: ONBOARDING_ROUTE_PATH,
    name: 'Onboarding',
    component: () => import('@/views/Onboarding.vue'),
    meta: {
      requiresAuth: true,
      title: '온보딩',
      allowedAccessStates: ['admin_active'],
    },
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
        path: ADMIN_DASHBOARD_ROUTE_PATH.slice(1),
        name: 'AdminDashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '관리자 대시보드' },
      },
      {
        path: 'schedule/step1',
        name: 'Step1',
        component: () => import('@/views/schedule/Step1BasicInfo.vue'),
        meta: { title: '기본 정보' },
      },
      {
        path: 'schedule/step2',
        name: 'Step2',
        component: () => import('@/views/schedule/Step2SiteInfo.vue'),
        meta: { title: '사이트 정보' },
      },
      {
        path: 'schedule/step3',
        name: 'Step3',
        component: () => import('@/views/schedule/Step3EmployeeInfo.vue'),
        meta: { title: '직원 정보' },
      },
      {
        path: 'schedule/step4',
        name: 'Step4',
        component: () => import('@/views/schedule/Step4InitialData.vue'),
        meta: { title: '초기 데이터' },
      },
      {
        path: 'schedule/step5/:id',
        name: 'Step5',
        component: () => import('@/views/schedule/Step5Result.vue'),
        meta: { title: '결과 확인' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
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
    await authStore.ensureAccessContext();
  }

  const accessState = rbacStore.accessState;
  const blockedStatePath = resolveBlockedStatePath(accessState);

  if (isAuthPagePath(to.path) && authStore.user && accessState !== 'admin_active') {
    const redirectPath = resolvePostAuthRedirectPath(accessState);
    if (redirectPath !== to.path) {
      next(redirectPath);
      return;
    }
  }

  if (authStore.user && blockedStatePath && to.path !== blockedStatePath) {
    next(blockedStatePath);
    return;
  }

  if (authStore.user && accessState && BLOCKED_ACCESS_STATE_SET.has(accessState) && to.path === blockedStatePath) {
    next();
    return;
  }

  if (authStore.user && accessState === 'no_membership_or_inactive' && !isPublicRoutePath(to.path)) {
    next(LOGIN_ROUTE_PATH);
    return;
  }

  const allowedAccessStates = getAllowedAccessStates(to);
  if (
    authStore.user &&
    allowedAccessStates &&
    accessState &&
    !allowedAccessStates.includes(accessState) &&
    !(accessState === 'admin_active' && isAccessStateRoutePath(to.path))
  ) {
    next(resolvePostAuthRedirectPath(accessState));
    return;
  }

  const onboardingRedirect = await onboardingProgressGuard(
    to,
    accessState,
    rbacStore.effectiveMembership?.organizationId ?? null,
  );
  if (onboardingRedirect && onboardingRedirect !== to.path) {
    next(onboardingRedirect);
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
