<template>
  <div
    data-test="step4-request-composer"
    class="space-y-4"
  >
    <div class="space-y-2">
      <label class="text-sm font-medium text-slate-700">근무자 검색</label>
      <n-select
        ref="employeeSelectRef"
        :value="selectedEmployeeIds"
        :options="filteredEmployeeOptions"
        :render-label="renderEmployeeLabel"
        data-test="step4-employee-select"
        filterable
        multiple
        remote
        :show-checkmark="false"
        :virtual-scroll="false"
        max-tag-count="responsive"
        placeholder="이름 또는 사번으로 검색"
        @search="handleEmployeeSearch"
        @update:value="handleEmployeeSelect"
      />
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
import { computed, h, ref } from 'vue';
import { NButton, NCheckbox, NInput, NSelect } from 'naive-ui';

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
  selectedEmployeeIds: string[];
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
  (e: 'select-employee', employeeIds: string[]): void;
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

type EmployeeSelectValue = string | number | (string | number)[] | null;
type EmployeeSelectOption = {
  label?: unknown;
  value?: unknown;
};

const employeeSearchQuery = ref('');
const employeeSelectRef = ref<{
  focus?: () => void;
  focusInput?: () => void;
} | null>(null);
const selectionModes = [
  { id: 'single' as const, label: '하루' },
  { id: 'multi' as const, label: '여러 날' },
];

const employeeOptions = computed(() => {
  return props.employees.map((employee) => ({
    label: `${employee.name} (${employee.employeeId})`,
    value: employee.id,
  }));
});

const filteredEmployeeOptions = computed(() => {
  const query = employeeSearchQuery.value.trim().toLowerCase();
  if (!query) {
    return employeeOptions.value;
  }

  return employeeOptions.value.filter((option) => {
    return option.label.toLowerCase().includes(query);
  });
});

const existingRequestDates = computed(() => {
  return props.currentEmployeeRequests.flatMap((row) => row.dates);
});

function focusSearchInput() {
  if (employeeSelectRef.value?.focusInput) {
    employeeSelectRef.value.focusInput();
    return;
  }

  employeeSelectRef.value?.focus?.();
}

function prefillSearchQuery(value: string) {
  employeeSearchQuery.value = value;
}

function handleEmployeeSearch(query: string) {
  employeeSearchQuery.value = query;
}

function handleEmployeeSelect(value: EmployeeSelectValue) {
  if (!Array.isArray(value)) {
    return;
  }

  employeeSearchQuery.value = '';
  emit('select-employee', value.filter((employeeId): employeeId is string => typeof employeeId === 'string'));
}

function renderEmployeeLabel(option: EmployeeSelectOption, selected: boolean) {
  return h(
    'div',
    {
      class: 'flex items-center gap-2',
    },
    [
      h(NCheckbox, {
        checked: selected,
        focusable: false,
        tabindex: -1,
        'aria-hidden': true,
        class: 'pointer-events-none shrink-0',
      }),
      h('span', { class: 'min-w-0 truncate' }, String(option.label ?? '')),
    ],
  );
}

defineExpose({
  focusSearchInput,
  prefillSearchQuery,
});
</script>
