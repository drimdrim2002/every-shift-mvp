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

const props = defineProps<{
  employees: Employee[];
  dates: GridColumn[];
  assignments: AssignmentMap;
  violations: ScheduleComplianceViolation[];
  offRequests: ConstraintMap;
  offRequestNotes: CommentMap;
  offRequestResults: ScheduleOffRequestResult[];
  selectedEmployeeId: string | null;
}>();

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

const scheduleRows = computed(() => {
  if (!props.selectedEmployeeId) {
    return [];
  }

  return buildEmployeeScheduleRows({
    employeeId: props.selectedEmployeeId,
    dates: props.dates,
    assignments: props.assignments,
    offRequests: props.offRequests,
    offRequestNotes: props.offRequestNotes,
  });
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
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th class="w-24 px-3 py-2 text-left">
                  날짜
                </th>
                <th class="w-16 px-3 py-2 text-left">
                  요일
                </th>
                <th class="w-20 px-3 py-2 text-left">
                  근무
                </th>
                <th class="min-w-32 px-3 py-2 text-left">
                  Off 요청
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              <tr
                v-for="row in scheduleRows"
                :key="row.date"
                :class="row.isLastMonth ? 'bg-slate-50 text-slate-500' : 'text-slate-900'"
              >
                <td class="px-3 py-2">
                  {{ formatShortDate(row.date) }}
                </td>
                <td class="px-3 py-2">
                  {{ row.dayName }}
                </td>
                <td class="px-3 py-2 font-semibold">
                  {{ formatAssignment(row.assignment) }}
                </td>
                <td class="px-3 py-2 text-slate-600">
                  <span v-if="row.hasOffRequest">
                    O<span v-if="row.offRequestNote"> · {{ row.offRequestNote }}</span>
                  </span>
                  <span v-else>-</span>
                </td>
              </tr>
              <tr v-if="scheduleRows.length === 0">
                <td
                  colspan="4"
                  class="px-3 py-8 text-center text-sm text-slate-500"
                >
                  선택된 직원이 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
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
