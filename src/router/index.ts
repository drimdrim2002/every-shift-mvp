import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
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
        redirect: '/schedule/step1',
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
        component: () => import('@/views/schedule/Step3InitialData.vue'),
        meta: { title: '초기 데이터' },
      },
      {
        path: 'schedule/step4/:id',
        name: 'Step4',
        component: () => import('@/views/schedule/Step4Result.vue'),
        meta: { title: '결과 확인' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 인증 가드
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // 세션 확인
  if (!authStore.user) {
    await authStore.checkSession();
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  if (requiresAuth && !authStore.user) {
    next('/login');
  } else if (to.path === '/login' && authStore.user) {
    next('/');
  } else {
    next();
  }
});

// 동적 title 설정
router.afterEach((to) => {
  const baseTitle = 'EveryShift';
  const pageTitle = to.meta.title as string;

  document.title = pageTitle ? `${pageTitle} - ${baseTitle}` : baseTitle;
});

export default router;
