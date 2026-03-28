import { ref } from 'vue';
import { supabase } from '@/api/supabase';
import type { Employee } from '@/types/employee';
import type { AssignmentMap, GridColumn, OffReasonMap, CommentMap } from '@/types/schedule';
import { getDaysInMonth, getLastDaysOfPreviousMonth } from '@/utils/date';
import { useScheduleGridStatistics } from './useScheduleGridStatistics';

export function useScheduleGrid() {
  const employees = ref<Employee[]>([]);
  const assignments = ref<AssignmentMap>({});
  const offReasons = ref<OffReasonMap>({});
  const comments = ref<CommentMap>({});
  const dates = ref<GridColumn[]>([]);
  const loading = ref(false);
  const lastMonthDays = ref(5); // 전월 일수 (0-5, 기본값 5)

  // Supabase 응답 타입 (snake_case)
  interface EmployeeRow {
    id: string;
    organization_id: string;
    employee_id: string;
    name: string;
    available_shifts: string[];
    created_at?: string;
    updated_at?: string;
  }

  // 직원 목록 로드
  async function loadEmployees(orgId: string) {
    loading.value = true;
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('organization_id', orgId)
        .order('employee_id');

      if (error) throw error;

      // 디버깅: 조회된 직원 수 확인
      console.log('[loadEmployees] Raw data count:', data?.length);

      // Snake_case to camelCase 변환
      employees.value = (data as EmployeeRow[]).map(emp => ({
        id: emp.id,
        organizationId: emp.organization_id,
        employeeId: emp.employee_id,
        name: emp.name,
        availableShifts: emp.available_shifts,
        createdAt: emp.created_at,
        updatedAt: emp.updated_at,
      }));

      console.log('[loadEmployees] Employees count after mapping:', employees.value.length);
      console.log('[loadEmployees] Last 3 employees:', employees.value.slice(-3).map(e => ({ id: e.id, name: e.name })));

      // 초기 assignments 객체 생성
      const initialAssignments: AssignmentMap = {};
      const initialOffReasons: OffReasonMap = {};
      const initialComments: CommentMap = {};
      employees.value.forEach(emp => {
        initialAssignments[emp.id] = {};
        initialOffReasons[emp.id] = {};
        initialComments[emp.id] = {};
      });
      assignments.value = initialAssignments;
      offReasons.value = initialOffReasons;
      comments.value = initialComments;

      console.log('[loadEmployees] Initial assignments keys:', Object.keys(initialAssignments).length);
      console.log('[loadEmployees] Initial offReasons keys:', Object.keys(initialOffReasons).length);
      console.log('[loadEmployees] Initial comments keys:', Object.keys(initialComments).length);

      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    } finally {
      loading.value = false;
    }
  }

  // 날짜 목록 생성 (전월 N일 + 당월)
  function generateDates(month: string, lastMonthDaysCount?: number) {
    // 파라미터가 제공되면 lastMonthDays ref도 업데이트
    if (lastMonthDaysCount !== undefined) {
      lastMonthDays.value = lastMonthDaysCount;
    }
    
    const lastMonth = lastMonthDays.value > 0 
      ? getLastDaysOfPreviousMonth(month, lastMonthDays.value)
      : [];
    const thisMonth = getDaysInMonth(month);
    dates.value = [...lastMonth, ...thisMonth];
  }

  // 배정 설정
  function setAssignment(employeeId: string, date: string, shiftCode: string) {
    if (!assignments.value[employeeId]) {
      assignments.value[employeeId] = {};
    }
    assignments.value[employeeId][date] = shiftCode;
    // 반응성 트리거를 위해 새 객체로 교체
    assignments.value = { ...assignments.value };
  }

  // 배정 가져오기
  function getAssignment(employeeId: string, date: string): string | null {
    return assignments.value[employeeId]?.[date] || null;
  }

  // Off 사유 설정
  function setOffReason(employeeId: string, date: string, reason: string) {
    if (!offReasons.value[employeeId]) {
      offReasons.value[employeeId] = {};
    }
    offReasons.value[employeeId][date] = reason;
    // 반응성 트리거를 위해 새 객체로 교체
    offReasons.value = { ...offReasons.value };
  }

  // Off 사유 가져오기
  function getOffReason(employeeId: string, date: string): string | null {
    return offReasons.value[employeeId]?.[date] || null;
  }

  // 코멘트 설정
  function setComment(employeeId: string, date: string, comment: string) {
    if (!comments.value[employeeId]) {
      comments.value[employeeId] = {};
    }
    comments.value[employeeId][date] = comment;
    // 반응성 트리거
    comments.value = { ...comments.value };
  }

  // 코멘트 가져오기
  function getComment(employeeId: string, date: string): string | null {
    return comments.value[employeeId]?.[date] || null;
  }

  // 통계 계산
  const statistics = useScheduleGridStatistics(
    () => employees.value,
    () => dates.value,
    () => assignments.value
  );

  return {
    employees,
    assignments,
    offReasons,
    comments,
    dates,
    loading,
    lastMonthDays,
    statistics,
    loadEmployees,
    generateDates,
    setAssignment,
    getAssignment,
    setOffReason,
    getOffReason,
    setComment,
    getComment,
  };
}
