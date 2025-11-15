import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../App.vue'),
    meta: { title: '홈' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 동적 title 설정
router.afterEach((to) => {
  const baseTitle = 'EveryShift';
  const pageTitle = to.meta.title as string;

  document.title = pageTitle ? `${pageTitle} - ${baseTitle}` : baseTitle;
});

export default router;
