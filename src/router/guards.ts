import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useScheduleStore } from '@/stores/schedule';
import { supabase } from '@/api/supabase';

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
    if (!scheduleStore.employees || scheduleStore.employees.length === 0) {
      window.$message?.warning('먼저 직원 정보를 입력해주세요.');
      next('/schedule/step3');
      return;
    }

    // 완료된 스케줄은 Step5로 우회 (취소 후 created는 Step4 허용)
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('id, status')
        .eq('organization_id', scheduleStore.basicInfo.organizationId)
        .eq('month', scheduleStore.basicInfo.month)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error) {
        const latest = data?.[0];
        if (latest?.id && (latest.status === 'complete' || latest.status === 'changed')) {
          next(`/schedule/step5/${latest.id}`);
          return;
        }
      } else {
        console.warn('[stepProgressGuard] Failed to query latest schedule:', error);
      }
    } catch (error) {
      console.warn('[stepProgressGuard] Unexpected error while checking schedule status:', error);
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
