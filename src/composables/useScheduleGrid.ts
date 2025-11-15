import { ref } from 'vue';
import { supabase } from '@/api/supabase';
import type { Employee } from '@/types/employee';
import type { AssignmentMap, GridColumn } from '@/types/schedule';
import { getDaysInMonth, getLastDaysOfPreviousMonth } from '@/utils/date';

export function useScheduleGrid() {
  const employees = ref<Employee[]>([]);
  const assignments = ref<AssignmentMap>({});
  const dates = ref<GridColumn[]>([]);
  const loading = ref(false);

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

      // 초기 assignments 객체 생성
      const initialAssignments: AssignmentMap = {};
      employees.value.forEach(emp => {
        initialAssignments[emp.id] = {};
      });
      assignments.value = initialAssignments;

      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    } finally {
      loading.value = false;
    }
  }

  // 날짜 목록 생성 (전월 5일 + 당월)
  function generateDates(month: string) {
    const lastMonth = getLastDaysOfPreviousMonth(month, 5);
    const thisMonth = getDaysInMonth(month);
    dates.value = [...lastMonth, ...thisMonth];
  }

  // 배정 설정
  function setAssignment(employeeId: string, date: string, shiftCode: string) {
    if (!assignments.value[employeeId]) {
      assignments.value[employeeId] = {};
    }
    assignments.value[employeeId][date] = shiftCode;
  }

  // 배정 가져오기
  function getAssignment(employeeId: string, date: string): string | null {
    return assignments.value[employeeId]?.[date] || null;
  }

  return {
    employees,
    assignments,
    dates,
    loading,
    loadEmployees,
    generateDates,
    setAssignment,
    getAssignment,
  };
}
