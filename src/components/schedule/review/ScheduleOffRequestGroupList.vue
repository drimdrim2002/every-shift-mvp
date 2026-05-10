<script setup lang="ts">
import { computed } from 'vue';
import type { Employee } from '@/types/employee';
import type {
  AssignmentMap,
  CommentMap,
  ConstraintMap,
  ScheduleOffRequestResult,
} from '@/types/schedule';
import {
  buildEmployeeOffRequestRows,
  type EmployeeOffRequestRow,
} from '@/utils/employeeResultDetail';

const props = defineProps<{
  employees: Employee[];
  assignments: AssignmentMap;
  offRequests: ConstraintMap;
  offRequestNotes: CommentMap;
  offRequestResults: ScheduleOffRequestResult[];
}>();

interface EmployeeOffRequestGroup {
  employee: Employee;
  rows: EmployeeOffRequestRow[];
  fulfilledCount: number;
  unfulfilledCount: number;
}

const groups = computed<EmployeeOffRequestGroup[]>(() => {
  return props.employees
    .map((employee) => {
      const rows = buildEmployeeOffRequestRows({
        employeeId: employee.id,
        assignments: props.assignments,
        offRequests: props.offRequests,
        offRequestNotes: props.offRequestNotes,
        offRequestResults: props.offRequestResults,
      });
      const fulfilledCount = rows.filter((row) => row.fulfilled).length;

      return {
        employee,
        rows,
        fulfilledCount,
        unfulfilledCount: rows.length - fulfilledCount,
      };
    })
    .filter((group) => group.rows.length > 0);
});

function formatAssignment(assignment: string) {
  return assignment.trim() === '' ? '미배정' : assignment;
}

function formatRequestNote(note: string | null) {
  return note?.trim() ? note : '요청 사유 없음';
}

function formatReflectionStatus(fulfilled: boolean) {
  return fulfilled ? '반영' : '미반영';
}
</script>

<template>
  <section
    data-test="off-request-group-list"
    class="space-y-3"
  >
    <p
      v-if="groups.length === 0"
      class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500"
    >
      표시할 Off 요청이 없습니다.
    </p>

    <article
      v-for="group in groups"
      :key="group.employee.id"
      data-test="off-request-employee-group"
      class="rounded-lg border border-slate-200 bg-white p-4"
    >
      <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 class="text-sm font-semibold text-slate-950">
            {{ group.employee.name }}
          </h3>
          <p class="mt-1 text-xs text-slate-500">
            {{ group.employee.employeeId }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2 text-xs font-medium">
          <span class="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
            요청 {{ group.rows.length }}건
          </span>
          <span class="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
            반영 {{ group.fulfilledCount }}건
          </span>
          <span class="rounded-md bg-rose-50 px-2 py-1 text-rose-700">
            미반영 {{ group.unfulfilledCount }}건
          </span>
        </div>
      </header>

      <div class="mt-3 space-y-2">
        <div
          v-for="row in group.rows"
          :key="`${row.employeeId}-${row.date}`"
          data-test="off-request-row"
          class="rounded-md border border-slate-200 bg-slate-50 p-3"
        >
          <dl class="grid gap-2 text-sm sm:grid-cols-[6rem_minmax(0,1fr)]">
            <dt class="font-medium text-slate-500">
              요청일
            </dt>
            <dd class="font-medium text-slate-900">
              {{ row.date }}
            </dd>

            <dt class="font-medium text-slate-500">
              요청 사유
            </dt>
            <dd class="text-slate-900">
              {{ formatRequestNote(row.requestNote) }}
            </dd>

            <dt class="font-medium text-slate-500">
              실제 배정
            </dt>
            <dd class="font-medium text-slate-900">
              {{ formatAssignment(row.actualAssignment) }}
            </dd>

            <dt class="font-medium text-slate-500">
              반영 상태
            </dt>
            <dd
              class="font-semibold"
              :class="row.fulfilled ? 'text-emerald-700' : 'text-rose-700'"
            >
              {{ formatReflectionStatus(row.fulfilled) }}
            </dd>

            <template v-if="row.reason">
              <dt class="font-medium text-slate-500">
                미반영 사유
              </dt>
              <dd class="text-slate-900">
                {{ row.reason }}
              </dd>
            </template>
          </dl>
        </div>
      </div>
    </article>
  </section>
</template>
