<template>
  <div class="schedule-grid-wrapper text-sm">
    <div class="schedule-grid-container overflow-x-auto">
      <table class="schedule-grid w-full">
        <!-- Column width definitions -->
        <colgroup>
          <col style="width: 150px" />
          <col v-for="date in dates" :key="date.date" style="width: var(--day-col-width)" />
          <col style="width: var(--day-col-width)" />
          <col style="width: var(--day-col-width)" />
          <col style="width: var(--day-col-width)" />
          <col style="width: var(--day-col-width)" />
        </colgroup>

        <!-- 3-level 헤더 -->
        <thead>
          <!-- Level 1: Last Month / This Month -->
          <tr>
            <th rowspan="3" class="sticky-column header-cell bg-white px-4 py-3 font-semibold">
              근무자
            </th>
            <th
              v-for="group in headerLevel1"
              :key="group.label"
              :colspan="group.count"
              class="header-level-1 bg-gray-100 px-4 py-2 text-center font-semibold"
            >
              {{ group.label }}
            </th>
            <th
              rowspan="2"
              colspan="4"
              class="header-stats sticky-right-group bg-white px-4 py-3 text-center font-semibold"
            >
              Total
            </th>
          </tr>

          <!-- Level 2: 월 이름 -->
          <tr>
            <th
              v-for="group in headerLevel2"
              :key="group.label"
              :colspan="group.count"
              class="header-level-2 bg-gray-50 px-4 py-2 text-center font-medium"
            >
              {{ group.label }}
            </th>
          </tr>

          <!-- Level 3: 날짜 + 요일 + 통계 컬럼 -->
          <tr>
            <th
              v-for="date in dates"
              :key="date.date"
              class="header-level-3 cursor-pointer bg-gray-50 px-2 py-1 text-center text-sm transition-colors hover:bg-gray-100"
              @click="handleHeaderClick(date.date)"
            >
              {{ date.day }}일<br />
              <span class="text-xs text-gray-600">({{ date.dayName }})</span>
            </th>
            <th
              class="header-level-3 sticky-right sticky-right-d bg-blue-50 px-2 py-1 text-center text-sm font-semibold"
            >
              D
            </th>
            <th
              class="header-level-3 sticky-right sticky-right-e bg-orange-50 px-2 py-1 text-center text-sm font-semibold"
            >
              E
            </th>
            <th
              class="header-level-3 sticky-right sticky-right-n bg-purple-50 px-2 py-1 text-center text-sm font-semibold"
            >
              N
            </th>
            <th
              class="header-level-3 sticky-right sticky-right-total bg-gray-100 px-2 py-1 text-center text-sm font-semibold"
            >
              Total
            </th>
          </tr>
        </thead>

        <!-- 데이터 행 -->
        <tbody>
          <tr v-for="employee in employees" :key="employee.id" class="data-row">
            <td class="sticky-column employee-cell text-center">
              <div class="font-semibold">
                {{ employee.name }}
              </div>
              <div class="text-xs text-gray-500">
                {{ employee.employeeId }}
              </div>
            </td>

            <td
              v-for="date in dates"
              :key="date.date"
              :class="getCellClass(date)"
              class="shift-cell"
            >
              <!-- Planning Mode: Constraint Selector -->
              <ConstraintSelector
                v-if="mode === 'planning'"
                :employee-id="employee.id"
                :date="date.date"
                :current-constraint="getConstraint(employee.id, date.date)"
                :has-comment="!!getComment(employee.id, date.date)"
                :comment="getComment(employee.id, date.date)"
                :readonly="readonly"
                @update:constraint="handleConstraintUpdate"
                @context-menu="handleContextMenu"
              />

              <!-- Result Mode: Shift Selector -->
              <ShiftSelector
                v-else
                :employee-id="employee.id"
                :date="date.date"
                :available-shifts="getFilteredShifts(employee.availableShifts, date.isLastMonth)"
                :current-shift="getAssignment(employee.id, date.date)"
                :off-reason="getOffReason(employee.id, date.date)"
                :readonly="readonly"
                @select="handleShiftSelect(employee.id, date.date, $event)"
                @select-off="handleSelectOff"
              />
            </td>

            <!-- 통계 컬럼 (우측) -->
            <td class="stat-cell sticky-right sticky-right-d bg-blue-50 text-center">
              {{ statistics?.rowStats[employee.id]?.D || 0 }}
            </td>
            <td class="stat-cell sticky-right sticky-right-e bg-orange-50 text-center">
              {{ statistics?.rowStats[employee.id]?.E || 0 }}
            </td>
            <td class="stat-cell sticky-right sticky-right-n bg-purple-50 text-center">
              {{ statistics?.rowStats[employee.id]?.N || 0 }}
            </td>
            <td class="stat-cell sticky-right sticky-right-total bg-gray-100 text-center font-bold">
              {{ statistics?.rowStats[employee.id]?.total || 0 }}
            </td>
          </tr>

          <!-- 통계 행 (하단 고정) -->
          <!-- Total 행 -->
          <tr class="stat-row stat-row-total bg-gray-100">
            <td class="sticky-column employee-cell text-center font-bold">Total</td>
            <td v-for="date in dates" :key="date.date" class="shift-cell text-center">
              {{ statistics?.columnStats[date.date]?.total || 0 }}
            </td>
            <td class="sticky-right sticky-right-d bg-gray-200" />
            <td class="sticky-right sticky-right-e bg-gray-200" />
            <td class="sticky-right sticky-right-n bg-gray-200" />
            <td class="sticky-right sticky-right-total bg-gray-200" />
          </tr>

          <!-- D 행 -->
          <tr class="stat-row stat-row-d bg-blue-50">
            <td class="sticky-column employee-cell text-center font-bold">D</td>
            <td v-for="date in dates" :key="date.date" class="shift-cell text-center">
              {{ statistics?.columnStats[date.date]?.D || 0 }}
            </td>
            <td class="sticky-right sticky-right-d bg-blue-100" />
            <td class="sticky-right sticky-right-e bg-blue-100" />
            <td class="sticky-right sticky-right-n bg-blue-100" />
            <td class="sticky-right sticky-right-total bg-blue-100" />
          </tr>

          <!-- E 행 -->
          <tr class="stat-row stat-row-e bg-orange-50">
            <td class="sticky-column employee-cell text-center font-bold">E</td>
            <td v-for="date in dates" :key="date.date" class="shift-cell text-center">
              {{ statistics?.columnStats[date.date]?.E || 0 }}
            </td>
            <td class="sticky-right sticky-right-d bg-orange-100" />
            <td class="sticky-right sticky-right-e bg-orange-100" />
            <td class="sticky-right sticky-right-n bg-orange-100" />
            <td class="sticky-right sticky-right-total bg-orange-100" />
          </tr>

          <!-- N 행 -->
          <tr class="stat-row stat-row-n bg-purple-50">
            <td class="sticky-column employee-cell text-center font-bold">N</td>
            <td v-for="date in dates" :key="date.date" class="shift-cell text-center">
              {{ statistics?.columnStats[date.date]?.N || 0 }}
            </td>
            <td class="sticky-right sticky-right-d bg-purple-100" />
            <td class="sticky-right sticky-right-e bg-purple-100" />
            <td class="sticky-right sticky-right-n bg-purple-100" />
            <td class="sticky-right sticky-right-total bg-purple-100" />
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUpdated } from 'vue';
import type { Employee } from '@/types/employee';
import type { GridColumn, AssignmentMap, ConstraintMap, OffReasonMap, CommentMap } from '@/types/schedule';
import { useScheduleGridStatistics } from '@/composables/useScheduleGridStatistics';
import ShiftSelector from './ShiftSelector.vue';
import ConstraintSelector from './ConstraintSelector.vue';

interface Props {
  employees: Employee[];
  dates: GridColumn[];
  assignments?: AssignmentMap;
  constraints?: ConstraintMap;
  offReasons?: OffReasonMap;
  comments?: CommentMap; // added
  readonly?: boolean;
  showLastMonth?: boolean;
  mode?: 'planning' | 'result'; // added
}

interface Emits {
  (
    e: 'update:assignment',
    payload: {
      employeeId: string;
      date: string;
      shiftCode: string;
    }
  ): void;
  (e: 'select-off', payload: { employeeId: string; date: string }): void;
  (e: 'header-click', date: string): void; // added
  (e: 'context-menu', payload: { event: MouseEvent; employeeId: string; date: string }): void; // added
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'result',
  assignments: () => ({}),
  constraints: () => ({}),
  offReasons: () => ({}),
  comments: () => ({}),
  readonly: false,
  showLastMonth: false,
});
const emit = defineEmits<Emits>();

// 성능 측정
if (import.meta.env.DEV) {
  performance.mark('schedule-grid-setup-start');
}

// 통계 계산
const statistics = useScheduleGridStatistics(
  () => props.employees,
  () => props.dates,
  () => (props.mode === 'planning' ? props.constraints : props.assignments)
);

// 성능 측정: 초기 렌더링
onMounted(() => {
  // 디버깅: 렌더링된 직원 수 확인
  console.log('[ScheduleGrid] Mounted with employees:', props.employees.length);
  console.log(
    '[ScheduleGrid] Last 3 employees:',
    props.employees.slice(-3).map((e) => ({ id: e.id, name: e.name }))
  );
  console.log('[ScheduleGrid] Assignments keys:', Object.keys(props.assignments).length);

  if (import.meta.env.DEV) {
    performance.mark('schedule-grid-mounted');
    performance.measure(
      'schedule-grid-initial-render',
      'schedule-grid-setup-start',
      'schedule-grid-mounted'
    );

    const measure = performance.getEntriesByName('schedule-grid-initial-render')[0];
    if (measure) {
      console.log(`[ScheduleGrid] Initial render: ${measure.duration.toFixed(2)}ms`);
    }
  }
});

// 성능 측정: 업데이트
onUpdated(() => {
  if (import.meta.env.DEV) {
    performance.mark('schedule-grid-updated');
  }
});

// Helper 함수
function getAssignment(employeeId: string, date: string): string | null {
  return props.assignments[employeeId]?.[date] || null;
}

function getConstraint(employeeId: string, date: string): string | null {
  return props.constraints?.[employeeId]?.[date] || null;
}

function handleShiftSelect(employeeId: string, date: string, shiftCode: string) {
  if (import.meta.env.DEV) {
    performance.mark('shift-select-start');
  }

  emit('update:assignment', { employeeId, date, shiftCode });

  if (import.meta.env.DEV) {
    performance.mark('shift-select-end');
    performance.measure('shift-select', 'shift-select-start', 'shift-select-end');

    const measure = performance.getEntriesByName('shift-select')[0];
    if (measure) {
      console.log(`[ScheduleGrid] Shift select response: ${measure.duration.toFixed(2)}ms`);
    }
  }
}

function handleConstraintUpdate(payload: { employeeId: string; date: string; constraint: string }) {
  emit('update:assignment', {
    employeeId: payload.employeeId,
    date: payload.date,
    shiftCode: payload.constraint,
  });
}

function handleSelectOff(payload: { employeeId: string; date: string }) {
  emit('select-off', payload);
}

function getOffReason(employeeId: string, date: string): string | null {
  return props.offReasons?.[employeeId]?.[date] || null;
}

function getComment(employeeId: string, date: string): string | null {
  return props.comments?.[employeeId]?.[date] || null;
}

function handleHeaderClick(date: string) {
  emit('header-click', date);
}

function handleContextMenu(event: MouseEvent, payload: { employeeId: string; date: string }) {
  emit('context-menu', { event, ...payload });
}

// Level 1 헤더: 전월/당월 그룹
const headerLevel1 = computed(() => {
  const lastMonthCount = props.dates.filter((d) => d.isLastMonth).length;
  const thisMonthCount = props.dates.filter((d) => !d.isLastMonth).length;

  const groups = [];
  if (props.showLastMonth && lastMonthCount > 0) {
    groups.push({ label: '전월', count: lastMonthCount });
  }
  groups.push({ label: '당월', count: thisMonthCount });

  return groups;
});

// Level 2 헤더: 월 이름 그룹
const headerLevel2 = computed(() => {
  const groups: Array<{ label: string; count: number }> = [];
  let currentMonth = '';
  let count = 0;

  props.dates.forEach((date, index) => {
    const month = date.date.substring(5, 7) + '월';

    if (month !== currentMonth) {
      if (count > 0) {
        groups.push({ label: currentMonth, count });
      }
      currentMonth = month;
      count = 1;
    } else {
      count++;
    }

    if (index === props.dates.length - 1) {
      groups.push({ label: currentMonth, count });
    }
  });

  return groups;
});

function getCellClass(date: GridColumn) {
  return {
    'bg-gray-50': date.isLastMonth,
    'bg-white': !date.isLastMonth,
  };
}

// 전월 날짜일 때 'O' (Off) 제외
function getFilteredShifts(availableShifts: string[], isLastMonth: boolean): string[] {
  if (isLastMonth) {
    return availableShifts.filter((shift) => shift !== 'O');
  }
  return availableShifts;
}
</script>

<style scoped>
/* Wrapper: 전체 그리드 영역 */
.schedule-grid-wrapper {
  display: flex;
  flex-direction: column;
  position: relative;
  --summary-row-height: 40px;
  --day-col-width: 60px;
  --stat-col-width: var(--day-col-width);
}

/* Container: 스크롤 가능한 메인 그리드 */
.schedule-grid-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  position: relative;
}

/* Custom Scrollbar for Webkit */
.schedule-grid-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.schedule-grid-container::-webkit-scrollbar-track {
  background: #f0fdf4; /* green-50 */
  border-radius: 4px;
}

.schedule-grid-container::-webkit-scrollbar-thumb {
  background: #86efac; /* green-300 */
  border-radius: 4px;
}

.schedule-grid-container::-webkit-scrollbar-thumb:hover {
  background: #4ade80; /* green-400 */
}

/* 메인 그리드 테이블 */
.schedule-grid {
  border-collapse: separate;
  border-spacing: 0;
  table-layout: auto;
  min-width: max-content;
}

.sticky-column {
  position: sticky;
  left: 0;
  z-index: 20;
  background: white;
  border-right: 2px solid #e5e7eb;
}

.employee-cell {
  padding: 0.75rem;
  min-width: 150px;
  width: 150px;
}

/* 헤더 스타일 */
/* Sticky header: 세로 스크롤 시 고정 */
.schedule-grid thead {
  position: sticky;
  top: 0;
  z-index: 30;
  background-color: white; /* tr 사이 간격 배경 (비침 방지 1단계) */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 시각적 구분 강화 */
}

/* tr 배경 추가 (비침 방지 2단계) */
.schedule-grid thead tr {
  background-color: white;
}

/* 코너 셀: sticky column + sticky header 교차점 */
.schedule-grid thead .sticky-column {
  position: sticky; /* 명시적 sticky 재선언 */
  left: 0; /* 왼쪽 고정 */
  z-index: 31; /* thead(30)와 sticky-column(20)보다 높음 */
  background-color: white; /* 명시적 배경 */
}

/* 모든 헤더 th 기본 스타일 */
.schedule-grid thead th {
  font-weight: 600;
  position: relative; /* 배경 렌더링 보장 */
  border-right: 1px solid #d1d5db; /* 오른쪽 border */
  border-bottom: 1px solid #d1d5db; /* 아래쪽 border */
}

/* 헤더의 우측 고정 통계 셀은 sticky 유지 (thead th 기본값보다 우선) */
.schedule-grid thead th.sticky-right,
.schedule-grid thead th.sticky-right-group {
  position: sticky;
}

/* 첫 번째 row: 위쪽 border 추가 */
.schedule-grid thead tr:first-child th {
  border-top: 1px solid #d1d5db;
}

/* 첫 번째 column: 왼쪽 border 추가 */
.schedule-grid thead th:first-child {
  border-left: 1px solid #d1d5db;
}

/* Body 셀 border */
.schedule-grid tbody td {
  border-right: 1px solid #d1d5db;
  border-bottom: 1px solid #d1d5db;
}

.schedule-grid tbody tr:first-child td {
  border-top: 1px solid #d1d5db;
}

.schedule-grid tbody td:first-child {
  border-left: 1px solid #d1d5db;
}

.header-cell {
  min-width: 150px;
}

.header-stats {
  min-width: calc(var(--day-col-width) * 4);
}

/* 우측 통계 컬럼 고정 */
.sticky-right-group {
  position: sticky;
  right: 0;
  z-index: 32;
  border-left: 2px solid #e5e7eb;
}

.sticky-right {
  position: sticky;
  z-index: 21;
}

.sticky-right-d {
  right: calc(var(--stat-col-width) * 3);
  border-left: 2px solid #e5e7eb;
}

.sticky-right-e {
  right: calc(var(--stat-col-width) * 2);
}

.sticky-right-n {
  right: var(--stat-col-width);
}

.sticky-right-total {
  right: 0;
}

.schedule-grid thead .sticky-right {
  z-index: 33;
}

.header-level-1,
.header-level-2,
.header-level-3 {
  white-space: nowrap;
}

/* Shift selector 셀 스타일 */
.shift-cell {
  padding: 0.5rem;
  min-width: var(--day-col-width);
  width: var(--day-col-width);
  max-width: var(--day-col-width);
}

/* 통계 셀 스타일 */
.stat-cell {
  padding: 0.5rem;
  min-width: var(--day-col-width);
  width: var(--day-col-width);
  max-width: var(--day-col-width);
}

/* 통계 행 - 하단 고정 */
.stat-row {
  font-weight: 500;
}

.stat-row td {
  position: sticky;
  min-height: var(--summary-row-height);
  height: var(--summary-row-height);
  border-right: 1px solid #d1d5db;
  border-bottom: 1px solid #d1d5db;
}

.stat-row td.sticky-right {
  z-index: 27;
}

.stat-row td:first-child {
  border-left: 1px solid #d1d5db;
}

.stat-row-total td {
  bottom: calc(var(--summary-row-height) * 3);
  z-index: 25;
  background-color: #f3f4f6; /* gray-100 */
  border-top: 3px solid #374151;
}

.stat-row-d td {
  bottom: calc(var(--summary-row-height) * 2);
  z-index: 24;
  background-color: #eff6ff; /* blue-50 */
}

.stat-row-e td {
  bottom: var(--summary-row-height);
  z-index: 23;
  background-color: #fff7ed; /* orange-50 */
}

.stat-row-n td {
  bottom: 0;
  z-index: 22;
  background-color: #faf5ff; /* purple-50 */
}

/* 통계 행 첫 번째 셀 (sticky left + sticky bottom) */
.stat-row .sticky-column {
  position: sticky;
  left: 0;
  background: white;
}

.stat-row-total .sticky-column {
  z-index: 26;
}

.stat-row-d .sticky-column {
  z-index: 25;
}

.stat-row-e .sticky-column {
  z-index: 24;
}

.stat-row-n .sticky-column {
  z-index: 23;
}
</style>
