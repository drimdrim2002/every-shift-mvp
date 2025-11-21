import { ref, computed } from 'vue';
import { useOrganizationStore } from '@/stores/organization';
import { useScheduleStore } from '@/stores/schedule';
import { getDaysInMonth, getLastDaysOfPreviousMonth } from '@/utils/date';
import type { Employee } from '@/types/employee';
import type { GridColumn, AssignmentMap } from '@/types/schedule';

/**
 * 스케줄 그리드 초기화 composable
 *
 * Step 2, 3, 4에서 재사용 가능한 그리드 초기화 로직 제공
 * - 직원 데이터 로드
 * - 날짜 컬럼 생성 (전월 포함 옵션)
 * - Assignment 맵 초기화
 * - TanStack Table 컬럼 정의 생성
 */
export function useScheduleGridInit() {
  const orgStore = useOrganizationStore();
  const scheduleStore = useScheduleStore();

  const employees = ref<Employee[]>([]);
  const dates = ref<GridColumn[]>([]);
  const assignments = ref<AssignmentMap>({});
  const isInitialized = ref(false);

  /**
   * 그리드 초기화
   * @param includeLastMonth - 전월 데이터 포함 여부 (Step 3에서만 true)
   * @throws {Error} 월 정보가 없을 경우
   */
  async function initializeGrid(includeLastMonth = false) {
    if (isInitialized.value) {
      console.warn('Grid already initialized');
      return;
    }

    // 1. Employees 로드
    if (orgStore.employees.length === 0) {
      // Organization store는 loadOrganization으로 직원을 함께 로드함
      const orgId = scheduleStore.basicInfo?.organizationId;
      if (!orgId) {
        throw new Error('Organization ID not found in Schedule Store');
      }

      const result = await orgStore.loadOrganization(orgId);
      if (!result.success) {
        throw new Error(`Failed to load organization: ${result.error}`);
      }
    }
    employees.value = orgStore.employees;

    // 2. Dates 생성
    const month = scheduleStore.basicInfo?.month;
    if (!month) {
      throw new Error('Month not selected in Schedule Store');
    }

    if (includeLastMonth) {
      // Step 3: 전월 5일 + 당월 전체
      const lastMonth = getLastDaysOfPreviousMonth(month, 5);
      const thisMonth = getDaysInMonth(month);
      dates.value = [...lastMonth, ...thisMonth];
    } else {
      // Step 2, Step 4: 당월만
      dates.value = getDaysInMonth(month);
    }

    // 3. Assignments 초기화 (빈 객체)
    const newAssignments: AssignmentMap = {};
    for (const emp of employees.value) {
      newAssignments[emp.id] = {};
    }
    assignments.value = newAssignments;

    isInitialized.value = true;

    console.log(`Grid initialized: ${employees.value.length} employees, ${dates.value.length} dates`);
  }

  /**
   * 그리드 리셋 (다른 월로 변경 시)
   */
  function resetGrid() {
    employees.value = [];
    dates.value = [];
    assignments.value = {};
    isInitialized.value = false;
  }

  /**
   * TanStack Table용 컬럼 정의 생성
   *
   * 날짜 컬럼만 반환 (이름 컬럼은 각 컴포넌트에서 추가)
   */
  const columns = computed(() => {
    return dates.value.map((date) => ({
      accessorKey: date.date,
      header: `${date.day}일`,
      meta: {
        date: date.date,
        dayOfWeek: date.dayOfWeek,
        dayName: date.dayName,
        isLastMonth: date.isLastMonth,
      },
    }));
  });

  return {
    // State
    employees,
    dates,
    assignments,
    isInitialized,

    // Computed
    columns,

    // Methods
    initializeGrid,
    resetGrid,
  };
}
