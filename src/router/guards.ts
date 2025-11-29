import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useScheduleStore } from '@/stores/schedule';

/**
 * Step 진행 순서 검증 가드
 * - Step 2: Step 1 완료 필요 (basicInfo.month 필수)
 * - Step 3: Step 2 완료 필요 (siteRequirements)
 * - Step 4: Step 3 완료 필요 (employees)
 * - Step 5: scheduleId 필수 (params.id)
 */
export function stepProgressGuard(
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

  // Step 3 (직원 정보) 접근 시 Step 1 완료 확인
  if (to.path === '/schedule/step3') {
    if (!scheduleStore.basicInfo?.month) {
      window.$message?.warning('먼저 기본 정보를 입력해주세요.');
      next('/schedule/step1');
      return;
    }
  }

  // Step 4 (초기 데이터) 접근 시 Step 1 완료 확인
  if (to.path === '/schedule/step4') {
    if (!scheduleStore.basicInfo?.month) {
      window.$message?.warning('먼저 기본 정보를 입력해주세요.');
      next('/schedule/step1');
      return;
    }
  }

  // Step 5 접근 시 scheduleId 필수 (params.id)
  if (to.path.startsWith('/schedule/step5')) {
    if (!to.params.id) {
      window.$message?.warning('잘못된 접근입니다.');
      next('/schedule/step4');
      return;
    }
  }

  next();
}
