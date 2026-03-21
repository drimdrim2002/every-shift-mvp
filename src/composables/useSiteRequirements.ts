import { ref } from 'vue';
import { supabase } from '@/api/supabase';
import type { SiteRequirements, DailyRequirement } from '@/types/schedule';
import { getDaysInMonth } from '@/utils/date';
import { useOrganizationStore } from '@/stores/organization';

interface ShiftInfo {
  code: string;
}

interface SiteRequirementRow {
  day_of_week: number;
  shift_id: string;
  required_count: number;
  shifts: ShiftInfo | ShiftInfo[] | null;
}

const SHIFT_CODES = ['D', 'E', 'N', 'O'] as const;

type DailyShiftCode = (typeof SHIFT_CODES)[number];

function createEmptyDailyRequirement(): DailyRequirement {
  return { D: 0, E: 0, N: 0, O: 0, total: 0 };
}

function isDailyShiftCode(value: string): value is DailyShiftCode {
  return SHIFT_CODES.includes(value as DailyShiftCode);
}

function getShiftCode(value: SiteRequirementRow['shifts']): string | null {
  if (Array.isArray(value)) {
    return value[0]?.code ?? null;
  }

  if (value && typeof value === 'object' && typeof value.code === 'string') {
    return value.code;
  }

  return null;
}

function normalizeWeeklyReqs(value: unknown): SiteRequirementRow[] {
  return Array.isArray(value) ? (value as SiteRequirementRow[]) : [];
}

export function useSiteRequirements() {
  const requirements = ref<SiteRequirements>({});
  const loading = ref(false);
  const orgStore = useOrganizationStore();

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
      const normalizedWeeklyReqs = normalizeWeeklyReqs(weeklyReqs);
      const reqs: SiteRequirements = {};

      days.forEach((day) => {
        const dailyReq = createEmptyDailyRequirement();

        // 해당 요일의 요구사항 필터링 및 적용
        normalizedWeeklyReqs
          .filter((r) => r.day_of_week === day.dayOfWeek)
          .forEach((r) => {
            const shiftCode = getShiftCode(r.shifts);
            if (shiftCode && isDailyShiftCode(shiftCode)) {
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

  /**
   * 요일별 필요 인력을 Supabase에서 로드
   * @param orgId - 조직 ID
   * @returns 요일별 필요 인력 객체
   */
  async function loadWeeklyRequirements(orgId: string) {
    loading.value = true;
    try {
      // site_requirements 테이블 조회 (요일별)
      const { data: weeklyReqs, error } = await supabase
        .from('site_requirements')
        .select('day_of_week, shift_id, required_count, shifts(code)')
        .eq('organization_id', orgId);

      if (error) throw error;

      // 요일별로 그룹화 (0: 일요일 ~ 6: 토요일)
      const weeklyData: Record<number, DailyRequirement> = {};
      const normalizedWeeklyReqs = normalizeWeeklyReqs(weeklyReqs);

      // 초기화
      for (let i = 0; i < 7; i++) {
        weeklyData[i] = createEmptyDailyRequirement();
      }

      // 데이터 매핑
      normalizedWeeklyReqs.forEach((row) => {
        const dayOfWeek = row.day_of_week;
        const shiftCode = getShiftCode(row.shifts);
        const dailyReq = weeklyData[dayOfWeek];

        if (dailyReq && shiftCode && isDailyShiftCode(shiftCode)) {
          dailyReq[shiftCode] = row.required_count;
        }
      });

      // Total 계산
      for (let i = 0; i < 7; i++) {
        const req = weeklyData[i];
        if (!req) {
          continue;
        }
        req.total = req.D + req.E + req.N + req.O;
      }

      return { success: true, data: weeklyData };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage, data: null };
    } finally {
      loading.value = false;
    }
  }

  /**
   * 요일별 필요 인력을 Supabase에 저장
   * @param weeklyReqs - 요일별 필요 인력 (0: 일요일 ~ 6: 토요일)
   * @param orgId - 조직 ID
   * @returns 성공 여부와 에러 메시지
   */
  async function saveRequirements(
    weeklyReqs: Record<number, DailyRequirement>,
    orgId: string
  ) {
    loading.value = true;
    try {
      // Supabase에 저장할 데이터 준비
      const upsertData = [];

      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const req = weeklyReqs[dayOfWeek] ?? createEmptyDailyRequirement();

        // 각 시프트별로 레코드 생성
        for (const shift of orgStore.shifts) {
          // Holiday 시프트는 제외
          if (shift.code === 'H') continue;

          const count = isDailyShiftCode(shift.code)
            ? req[shift.code]
            : 0;

          upsertData.push({
            organization_id: orgId,
            shift_id: shift.id,
            day_of_week: dayOfWeek,
            required_count: count,
          });
        }
      }

      // Supabase에 upsert (insert or update)
      const { error } = await supabase
        .from('site_requirements')
        .upsert(upsertData, {
          onConflict: 'organization_id,shift_id,day_of_week',
        });

      if (error) throw error;

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    } finally {
      loading.value = false;
    }
  }

  return {
    requirements,
    loading,
    loadRequirements,
    loadWeeklyRequirements,
    updateRequirement,
    saveRequirements,
  };
}
