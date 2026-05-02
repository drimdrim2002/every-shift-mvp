<template>
  <div
    data-test="step4-request-composer"
    class="space-y-4"
  >
    <div class="space-y-2">
      <label class="text-sm font-medium text-slate-700">근무자 검색</label>
      <div ref="searchContainerRef">
        <n-input
          v-model:value="searchQuery"
          data-test="step4-employee-search"
          placeholder="이름 또는 사번으로 검색"
        />
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="employee in filteredEmployees"
          :key="employee.id"
          type="button"
          class="rounded-2xl border px-3 py-2 text-left text-sm transition-colors"
          :class="employee.id === selectedEmployeeId
            ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'"
          :data-test="`employee-option-${employee.id}`"
          @click="emit('select-employee', employee.id)"
        >
          <span class="block font-medium">{{ employee.name }}</span>
          <span class="block text-xs text-slate-500">{{ employee.employeeId }}</span>
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <label class="text-sm font-medium text-slate-700">요청 유형</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="requestType in requestCatalog"
          :key="requestType.id"
          type="button"
          class="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
          :class="requestType.id === draftRequestTypeId
            ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'"
          :data-test="`request-type-${requestType.id}`"
          @click="emit('update:request-type', requestType.id)"
        >
          {{ requestType.label }} ({{ requestType.shortCode }})
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <label class="text-sm font-medium text-slate-700">날짜 선택 모드</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="mode in selectionModes"
          :key="mode.id"
          type="button"
          class="rounded-full border px-3 py-1.5 text-sm transition-colors"
          :class="mode.id === draftSelectionMode
            ? 'border-sky-400 bg-sky-50 text-sky-900'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'"
          :data-test="`selection-mode-${mode.id}`"
          @click="emit('update:selection-mode', mode.id)"
        >
          {{ mode.label }}
        </button>
      </div>
    </div>

    <Step4MonthCalendar
      v-if="dates.length > 0"
      :dates="dates"
      :selection-mode="draftSelectionMode"
      :selected-dates="draftSelectedDates"
      :existing-request-dates="existingRequestDates"
      :transition-blocked="false"
      @update:selected-dates="emit('update:selected-dates', $event)"
    />

    <div class="space-y-2">
      <div class="flex items-center justify-between gap-2">
        <label class="text-sm font-medium text-slate-700">메모</label>
        <span class="text-xs text-slate-500">
          {{ selectedDateSummary || '날짜를 선택해 주세요' }}
        </span>
      </div>
      <n-input
        :value="draftNote"
        type="textarea"
        placeholder="요청 메모를 입력해 주세요."
        data-test="step4-request-note"
        @update:value="emit('update:note', $event)"
      />
    </div>

    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      <p
        v-if="blockedTransitionReason"
        class="font-medium text-amber-700"
      >
        {{ blockedTransitionReason }}
      </p>
      <p v-else-if="applyDisabledReason">
        {{ applyDisabledReason }}
      </p>
      <p v-else-if="hasUnappliedDraft">
        미반영 draft가 있습니다. `요청 반영` 후 페이지 저장을 진행해 주세요.
      </p>
      <p v-else-if="hasUnpersistedAppliedChanges">
        요청은 로컬에 반영되었습니다. 하단 `임시 저장` 또는 `다음 단계`로 서버 저장을 진행해 주세요.
      </p>
      <p v-else>
        요청 반영 전까지는 월간 검토 워크스페이스와 목록이 바뀌지 않습니다.
      </p>
    </div>

    <div class="flex gap-2">
      <n-button
        type="primary"
        data-test="apply-request"
        :disabled="Boolean(applyDisabledReason)"
        @click="emit('apply-request')"
      >
        요청 반영
      </n-button>
      <n-button
        data-test="reset-draft"
        @click="emit('reset-draft')"
      >
        선택 초기화
      </n-button>
    </div>

    <EmployeeRequestList
      :rows="currentEmployeeRequests"
      @edit-request="emit('edit-request', $event)"
      @delete-request="emit('delete-request', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NButton, NInput } from 'naive-ui';

import type { Employee } from '@/types/employee';
import type { GridColumn } from '@/types/schedule';
import Step4MonthCalendar from '@/components/schedule/request-entry/Step4MonthCalendar.vue';
import EmployeeRequestList from '@/components/schedule/request-entry/EmployeeRequestList.vue';
import type { Step4SelectionMode } from '@/components/schedule/request-entry/requestEntryUtils';

type Step4RequestTypeId = 'off';

interface RequestCatalogItem {
  id: Step4RequestTypeId;
  label: string;
  shortCode: 'O';
}

interface EmployeeRequestRowVM {
  requestKey: string;
  employeeId: string;
  dates: string[];
  requestTypeId: Step4RequestTypeId;
  requestCode: 'O';
  note: string;
  status: 'local-pending' | 'persisted' | 'policy-checking' | 'policy-rejected';
  policyRejectionReason: string | null;
}

interface Props {
  employees: Employee[];
  dates: GridColumn[];
  selectedEmployeeId: string | null;
  selectedEmployeeName: string;
  requestCatalog: RequestCatalogItem[];
  draftRequestTypeId: Step4RequestTypeId;
  draftSelectionMode: Step4SelectionMode;
  draftSelectedDates: string[];
  draftNote: string;
  selectedDateSummary: string;
  currentEmployeeRequests: EmployeeRequestRowVM[];
  hasUnappliedDraft: boolean;
  hasUnpersistedAppliedChanges: boolean;
  applyDisabledReason: string | null;
  blockedTransitionReason: string | null;
}

interface Emits {
  (e: 'select-employee', employeeId: string): void;
  (e: 'update:request-type', requestTypeId: Step4RequestTypeId): void;
  (e: 'update:selection-mode', mode: Step4SelectionMode): void;
  (e: 'update:selected-dates', dates: string[]): void;
  (e: 'update:note', note: string): void;
  (e: 'apply-request'): void;
  (e: 'reset-draft'): void;
  (e: 'edit-request', requestKey: string): void;
  (e: 'delete-request', requestKey: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const searchQuery = ref('');
const searchContainerRef = ref<HTMLElement | null>(null);
const selectionModes = [
  { id: 'single' as const, label: '하루' },
  { id: 'range' as const, label: '연속 기간' },
  { id: 'multi' as const, label: '개별 여러 날' },
];

const filteredEmployees = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const employees = props.employees.map((employee) => ({
    ...employee,
    requestCount: props.currentEmployeeRequests.reduce((total, row) => total + row.dates.length, 0),
  }));

  if (!query) {
    return employees.slice(0, 8);
  }

  return employees
    .filter((employee) => {
      return (
        employee.name.toLowerCase().includes(query)
        || employee.employeeId.toLowerCase().includes(query)
      );
    })
    .slice(0, 8);
});

const existingRequestDates = computed(() => {
  return props.currentEmployeeRequests.flatMap((row) => row.dates);
});

function focusSearchInput() {
  searchContainerRef.value?.querySelector('input')?.focus();
}

function prefillSearchQuery(value: string) {
  searchQuery.value = value;
}

defineExpose({
  focusSearchInput,
  prefillSearchQuery,
});
</script>
