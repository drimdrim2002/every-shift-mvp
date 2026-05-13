<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NModal, NSelect } from 'naive-ui';
import type { Employee } from '@/types/employee';
import type {
  AssignmentMap,
  CommentMap,
  ConstraintMap,
  GridColumn,
  ScheduleOffRequestResult,
} from '@/types/schedule';
import type { ScheduleComplianceViolation } from '@/types/scheduleCompliance';
import {
  buildEmployeeOffRequestRows,
  buildEmployeeScheduleRows,
  filterEmployeeViolations,
} from '@/utils/employeeResultDetail';

const props = withDefaults(
  defineProps<{
    employees: Employee[];
    dates: GridColumn[];
    assignments: AssignmentMap;
    violations: ScheduleComplianceViolation[];
    offRequests: ConstraintMap;
    offRequestNotes: CommentMap;
    offRequestResults: ScheduleOffRequestResult[];
    selectedEmployeeId: string | null;
    shiftColors?: Record<string, string>;
  }>(),
  {
    shiftColors: () => ({}),
  }
);

const emit = defineEmits<{
  (event: 'update:selectedEmployeeId', value: string | null): void;
}>();

const isViolationOpen = ref(false);
const selectedOffRequestDate = ref<string | null>(null);

const employeeOptions = computed(() =>
  props.employees.map((employee) => ({
    label: `${employee.name} (${employee.employeeId})`,
    value: employee.id,
  }))
);

const selectedEmployee = computed(() => {
  return props.employees.find((employee) => employee.id === props.selectedEmployeeId) ?? null;
});

const selectedViolations = computed(() => {
  return filterEmployeeViolations(props.violations, props.selectedEmployeeId);
});

interface CalendarScheduleRow {
  date: string;
  day: number;
  dayOfWeek: number;
  dayName: string;
  isLastMonth: boolean;
  assignment: string;
  hasOffRequest: boolean;
  offRequestNote: string | null;
}

const calendarWeekdays = ['일', '월', '화', '수', '목', '금', '토'];

const dayOfWeekByDate = computed(() => {
  return new Map(props.dates.map((dateColumn) => [dateColumn.date, dateColumn.dayOfWeek]));
});

const scheduleRows = computed<CalendarScheduleRow[]>(() => {
  if (!props.selectedEmployeeId) {
    return [];
  }

  return buildEmployeeScheduleRows({
    employeeId: props.selectedEmployeeId,
    dates: props.dates,
    assignments: props.assignments,
    offRequests: props.offRequests,
    offRequestNotes: props.offRequestNotes,
  })
    .map((row) => ({
      ...row,
      dayOfWeek: dayOfWeekByDate.value.get(row.date) ?? 0,
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
});

const calendarTitle = computed(() => {
  const titleRow = scheduleRows.value.find((row) => !row.isLastMonth) ?? scheduleRows.value[0];

  if (!titleRow) {
    return '';
  }

  const [year, month] = titleRow.date.split('-');

  if (!year || !month) {
    return titleRow.date;
  }

  return `${year}년 ${Number(month)}월`;
});

const calendarMatrix = computed(() => {
  if (scheduleRows.value.length === 0) {
    return [] as Array<Array<CalendarScheduleRow | null>>;
  }

  const leadingNullCount = Math.max(0, Math.min(6, scheduleRows.value[0]?.dayOfWeek ?? 0));
  const paddedCells: Array<CalendarScheduleRow | null> = [
    ...Array.from({ length: leadingNullCount }, () => null),
    ...scheduleRows.value,
  ];

  while (paddedCells.length % 7 !== 0) {
    paddedCells.push(null);
  }

  const weeks: Array<Array<CalendarScheduleRow | null>> = [];

  for (let index = 0; index < paddedCells.length; index += 7) {
    weeks.push(paddedCells.slice(index, index + 7));
  }

  return weeks;
});

const offRequestRows = computed(() => {
  if (!props.selectedEmployeeId) {
    return [];
  }

  return buildEmployeeOffRequestRows({
    employeeId: props.selectedEmployeeId,
    assignments: props.assignments,
    offRequests: props.offRequests,
    offRequestNotes: props.offRequestNotes,
    offRequestResults: props.offRequestResults,
  });
});

const selectedOffRequestRow = computed(() => {
  if (!selectedOffRequestDate.value) {
    return null;
  }

  return offRequestRows.value.find((row) => row.date === selectedOffRequestDate.value) ?? null;
});

const selectedViolationSignature = computed(() => {
  return selectedViolations.value
    .map((violation) => `${violation.id}:${violation.message}:${violation.dates.join(',')}`)
    .join('|');
});

const guidelineStatusText = computed(() => {
  const count = selectedViolations.value.length;

  if (count > 0) {
    return `보건복지부 가이드라인 위반 ${count}건`;
  }

  return '보건복지부 가이드라인 충족';
});

const selectedOffRequestModalVisible = computed({
  get: () => selectedOffRequestDate.value !== null && selectedOffRequestRow.value !== null,
  set: (show) => {
    if (!show) {
      selectedOffRequestDate.value = null;
    }
  },
});

watch(
  () => [props.selectedEmployeeId, selectedViolationSignature.value] as const,
  () => {
    isViolationOpen.value = selectedViolations.value.length > 0;
  },
  { immediate: true }
);

watch(
  () => props.selectedEmployeeId,
  () => {
    selectedOffRequestDate.value = null;
  }
);

watch(selectedOffRequestRow, (row) => {
  if (selectedOffRequestDate.value && !row) {
    selectedOffRequestDate.value = null;
  }
});

function handleEmployeeUpdate(value: string | null) {
  emit('update:selectedEmployeeId', value);
}

function toggleViolationOpen() {
  isViolationOpen.value = !isViolationOpen.value;
}

function openOffRequestDetail(date: string) {
  selectedOffRequestDate.value = date;
}

function formatShortDate(date: string) {
  const [, month, day] = date.split('-');

  if (!month || !day) {
    return date;
  }

  return `${Number(month)}/${Number(day)}`;
}

function formatDateRange(dates: string[]) {
  if (dates.length === 0) {
    return '날짜 확인 필요';
  }

  if (dates.length === 1) {
    return dates[0];
  }

  return `${dates[0]} ~ ${dates[dates.length - 1]}`;
}

function formatAssignment(assignment: string) {
  return assignment.trim() === '' ? '미배정' : assignment;
}

function getAssignmentBadgeStyle(assignment: string) {
  const color = props.shiftColors[assignment];

  if (!color) {
    return undefined;
  }

  return {
    backgroundColor: color,
    color: '#0f172a',
  };
}

function formatReflectionStatus(fulfilled: boolean) {
  return fulfilled ? '반영' : '미반영';
}
</script>

<template>
  <section
    data-test="employee-result-detail"
    class="rounded-xl border border-slate-200 bg-white p-4"
  >
    <header class="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h3 class="text-base font-semibold text-slate-950">
          직원별 결과 검토
        </h3>
        <p
          v-if="selectedEmployee"
          class="mt-1 text-sm text-slate-600"
        >
          {{ selectedEmployee.name }}님의 배정 결과와 Off 요청 반영 상태입니다.
        </p>
      </div>

      <NSelect
        data-test="employee-result-select"
        class="w-full lg:w-64"
        aria-label="직원 선택"
        :value="selectedEmployeeId"
        :options="employeeOptions"
        placeholder="직원 선택"
        clearable
        filterable
        @update:value="handleEmployeeUpdate"
      />
    </header>

    <div class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="min-w-0">
        <div
          data-test="employee-guideline-status"
          class="rounded-lg border px-4 py-3 text-sm font-semibold"
          :class="
            selectedViolations.length > 0
              ? 'border-rose-200 bg-rose-50 text-rose-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          "
        >
          {{ guidelineStatusText }}
        </div>

        <div
          data-test="employee-result-schedule"
          class="mt-4 overflow-x-auto rounded-lg border border-slate-200"
        >
          <div
            v-if="scheduleRows.length === 0"
            class="px-3 py-8 text-center text-sm text-slate-500"
          >
            선택된 직원이 없습니다.
          </div>
          <div
            v-else
            class="min-w-[44rem]"
          >
            <div class="border-b border-slate-200 px-4 py-3">
              <h4
                data-test="employee-calendar-title"
                class="text-sm font-semibold text-slate-900"
              >
                {{ calendarTitle }}
              </h4>
            </div>
            <div class="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              <div
                v-for="weekday in calendarWeekdays"
                :key="weekday"
                data-test="employee-calendar-weekday"
                class="px-3 py-2 text-center text-xs font-semibold text-slate-600"
              >
                {{ weekday }}
              </div>
            </div>
            <div class="grid grid-cols-7">
              <template
                v-for="(cell, cellIndex) in calendarMatrix.flat()"
                :key="cell ? cell.date : `empty-${cellIndex}`"
              >
                <div
                  v-if="!cell"
                  data-test="employee-calendar-empty-cell"
                  aria-hidden="true"
                  class="min-h-28 border-b border-r border-slate-100 bg-slate-50/50"
                />
                <div
                  v-else
                  data-test="employee-calendar-date-cell"
                  :data-date="cell.date"
                  class="flex min-h-28 flex-col gap-2 border-b border-r border-slate-100 px-3 py-2"
                  :class="cell.isLastMonth ? 'bg-slate-50 text-slate-500' : 'bg-white text-slate-900'"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-medium">
                      {{ formatShortDate(cell.date) }}
                    </span>
                    <span class="text-xs">
                      {{ cell.dayName }}
                    </span>
                  </div>
                  <span
                    data-test="employee-assignment-badge"
                    :data-assignment="formatAssignment(cell.assignment)"
                    class="inline-flex w-fit rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
                    :style="getAssignmentBadgeStyle(cell.assignment)"
                  >
                    {{ formatAssignment(cell.assignment) }}
                  </span>
                  <button
                    v-if="cell.hasOffRequest"
                    type="button"
                    data-test="employee-calendar-off-request-button"
                    class="mt-auto w-fit rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    :aria-label="`${cell.date} Off 요청 상세`"
                    @click="openOffRequestDetail(cell.date)"
                  >
                    Off 요청
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <aside class="space-y-4">
        <section
          data-test="employee-violation-section"
          class="rounded-lg border border-slate-200 p-4"
        >
          <div class="flex items-center justify-between gap-3">
            <h4 class="text-sm font-semibold text-slate-950">
              가이드라인 위반 상세
            </h4>
            <button
              v-if="selectedViolations.length > 0"
              type="button"
              data-test="employee-violation-reveal"
              class="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              :aria-expanded="isViolationOpen ? 'true' : 'false'"
              @click="toggleViolationOpen"
            >
              {{ isViolationOpen ? '접기' : '펼치기' }}
            </button>
          </div>

          <ul
            v-if="selectedViolations.length > 0 && isViolationOpen"
            class="mt-3 space-y-2"
          >
            <li
              v-for="violation in selectedViolations"
              :key="violation.id"
              class="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-900"
            >
              <p class="font-medium">
                {{ violation.message }}
              </p>
              <p class="mt-1 text-xs text-rose-700">
                {{ formatDateRange(violation.dates) }}
              </p>
            </li>
          </ul>
          <p
            v-else-if="selectedViolations.length === 0"
            class="mt-3 text-sm text-slate-500"
          >
            선택한 직원의 위반 내역이 없습니다.
          </p>
        </section>

        <section class="rounded-lg border border-slate-200 p-4">
          <h4 class="text-sm font-semibold text-slate-950">
            Off 요청 반영
          </h4>
          <div class="mt-3 space-y-2">
            <div
              v-for="row in offRequestRows"
              :key="row.date"
              data-test="employee-off-request-row"
              class="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <div class="min-w-0">
                <p class="font-medium text-slate-900">
                  {{ row.date }}
                </p>
                <p class="truncate text-xs text-slate-500">
                  {{ row.requestNote ?? '요청 사유 없음' }}
                </p>
              </div>
              <button
                type="button"
                data-test="employee-off-request-detail-button"
                class="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                :aria-label="`${row.date} Off 요청 상세`"
                @click="openOffRequestDetail(row.date)"
              >
                상세
              </button>
            </div>
            <p
              v-if="offRequestRows.length === 0"
              class="text-sm text-slate-500"
            >
              Off 요청이 없습니다.
            </p>
          </div>
        </section>
      </aside>
    </div>

    <NModal
      v-model:show="selectedOffRequestModalVisible"
      preset="card"
      class="max-w-lg"
    >
      <section
        v-if="selectedOffRequestRow"
        data-test="employee-off-request-detail-modal"
        class="space-y-3"
      >
        <h4 class="text-base font-semibold text-slate-950">
          Off 요청 상세
        </h4>
        <dl class="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
          <dt class="text-slate-500">
            요청일
          </dt>
          <dd class="font-medium text-slate-900">
            {{ selectedOffRequestRow.date }}
          </dd>
          <dt class="text-slate-500">
            요청 사유
          </dt>
          <dd class="text-slate-900">
            {{ selectedOffRequestRow.requestNote ?? '요청 사유 없음' }}
          </dd>
          <dt class="text-slate-500">
            실제 배정
          </dt>
          <dd class="font-medium text-slate-900">
            {{ formatAssignment(selectedOffRequestRow.actualAssignment) }}
          </dd>
          <dt class="text-slate-500">
            반영 상태
          </dt>
          <dd
            class="font-semibold"
            :class="selectedOffRequestRow.fulfilled ? 'text-emerald-700' : 'text-rose-700'"
          >
            {{ formatReflectionStatus(selectedOffRequestRow.fulfilled) }}
          </dd>
          <dt
            v-if="selectedOffRequestRow.reason"
            class="text-slate-500"
          >
            미반영 사유
          </dt>
          <dd
            v-if="selectedOffRequestRow.reason"
            class="text-slate-900"
          >
            {{ selectedOffRequestRow.reason }}
          </dd>
        </dl>
      </section>
    </NModal>
  </section>
</template>
