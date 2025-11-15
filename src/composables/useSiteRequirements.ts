import { ref } from 'vue';
import { supabase } from '@/api/supabase';
import type { SiteRequirements, DailyRequirement } from '@/types/schedule';
import { getDaysInMonth } from '@/utils/date';

interface ShiftInfo {
  code: string;
}

interface SiteRequirementRow {
  day_of_week: number;
  shift_id: string;
  required_count: number;
  shifts: ShiftInfo;
}

export function useSiteRequirements() {
  const requirements = ref<SiteRequirements>({});
  const loading = ref(false);

  /**
   * 사이트 필요 인력 데이터를 로드하여 날짜별로 매핑
   * @param orgId - 조직 ID
   * @param month - 대상 월 (YYYY-MM)
   * @returns 성공 여부와 에러 메시지
   */
  async function loadRequirements(orgId: string, month: string) {
    loading.value = true;
    try {
      // 1. site_requirements 테이블 조회 (요일별)
      const { data: weeklyReqs, error } = await supabase
        .from('site_requirements')
        .select('day_of_week, shift_id, required_count, shifts(code)')
        .eq('organization_id', orgId);

      if (error) throw error;

      // 2. 월의 각 날짜에 매핑
      const days = getDaysInMonth(month);
      const reqs: SiteRequirements = {};

      days.forEach((day) => {
        const dailyReq: DailyRequirement = { D: 0, E: 0, N: 0, O: 0, total: 0 };

        // 해당 요일의 요구사항 필터링 및 적용
        (weeklyReqs as SiteRequirementRow[])
          ?.filter((r) => r.day_of_week === day.dayOfWeek)
          .forEach((r) => {
            const shiftCode = r.shifts?.code as keyof Omit<DailyRequirement, 'total'>;
            if (shiftCode && shiftCode in dailyReq) {
              dailyReq[shiftCode] = r.required_count;
            }
          });

        // 합계 계산
        dailyReq.total = dailyReq.D + dailyReq.E + dailyReq.N + dailyReq.O;
        reqs[day.date] = dailyReq;
      });

      requirements.value = reqs;
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    } finally {
      loading.value = false;
    }
  }

  /**
   * 특정 날짜의 특정 교대조 필요 인력 수 업데이트
   * @param date - 날짜 (YYYY-MM-DD)
   * @param shiftCode - 교대조 코드 (D, E, N, O)
   * @param count - 필요 인력 수
   */
  function updateRequirement(date: string, shiftCode: string, count: number) {
    if (!requirements.value[date]) return;

    const shiftKey = shiftCode as keyof Omit<DailyRequirement, 'total'>;
    if (shiftKey in requirements.value[date]) {
      requirements.value[date][shiftKey] = count;

      // 합계 재계산
      const req = requirements.value[date];
      req.total = req.D + req.E + req.N + req.O;
    }
  }

  return {
    requirements,
    loading,
    loadRequirements,
    updateRequirement,
  };
}
