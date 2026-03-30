import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { stepProgressGuard } from './guards';

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
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { requiresAuth: false, title: '로그인' },
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

  // 세션 확인
  if (!authStore.user) {
    await authStore.checkSession();
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  // 1. 인증 체크
  if (requiresAuth && !authStore.user) {
    next('/login');
    return;
  }

  if (to.path === '/login' && authStore.user) {
    next('/');
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
