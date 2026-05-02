<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import type {
  ScheduleComplianceResult,
  ScheduleComplianceRuleStatus,
  ScheduleComplianceRuleSummary,
} from '@/types/scheduleCompliance';

const props = withDefaults(
  defineProps<{
    result: ScheduleComplianceResult;
    initialDetailLimit?: number;
  }>(),
  {
    initialDetailLimit: 5,
  },
);

const showAllViolations = ref(false);
const violationListId = `compliance-violation-list-${useId()}`;

const normalizedDetailLimit = computed(() => Math.max(1, Math.floor(props.initialDetailLimit)));

const decisionTone = computed<'pass' | 'fail' | 'check'>(() => {
  if (props.result.checkRequiredCount > 0) {
    return 'check';
  }

  if (props.result.mandatoryViolationCount > 0) {
    return 'fail';
  }

  return 'pass';
});

const decisionTitle = computed(() => {
  if (decisionTone.value === 'check') {
    return '법적 기준 확인 필요';
  }

  if (decisionTone.value === 'fail') {
    return `법적 기준 위반 ${props.result.mandatoryViolationCount}건`;
  }

  return '법적 기준 충족';
});

const decisionDescription = computed(() => {
  if (decisionTone.value === 'check') {
    return '일부 기준을 안전하게 계산하지 못했습니다. 확인 후 확정하세요.';
  }

  if (decisionTone.value === 'fail') {
    return '위반 항목을 수정한 뒤 확정할 수 있습니다.';
  }

  return '확정 전 필수 기준을 모두 확인했습니다.';
});

const decisionClasses = computed(() => {
  if (decisionTone.value === 'check') {
    return {
      shell: 'border-amber-200 bg-amber-50',
      title: 'text-amber-950',
      copy: 'text-amber-800',
    };
  }

  if (decisionTone.value === 'fail') {
    return {
      shell: 'border-rose-200 bg-rose-50',
      title: 'text-rose-950',
      copy: 'text-rose-800',
    };
  }

  return {
    shell: 'border-emerald-200 bg-emerald-50',
    title: 'text-emerald-950',
    copy: 'text-emerald-800',
  };
});

const visibleViolations = computed(() => {
  if (showAllViolations.value) {
    return props.result.violations;
  }

  return props.result.violations.slice(0, normalizedDetailLimit.value);
});

const hiddenViolationCount = computed(() => {
  return Math.max(0, props.result.violations.length - visibleViolations.value.length);
});

const offRequestText = computed(() => {
  const { totalRequests, fulfilledRequests, reflectionRate } = props.result.offRequests;

  if (totalRequests === 0) {
    return '요청 없음';
  }

  const baseText = `Off 요청 반영 ${fulfilledRequests} / 요청 ${totalRequests}일`;
  return reflectionRate === null ? baseText : `${baseText} (${reflectionRate}%)`;
});

watch(
  () => props.result,
  () => {
    showAllViolations.value = false;
  },
);

function formatRuleStatus(summary: ScheduleComplianceRuleSummary) {
  if (summary.status === 'failed') {
    return `위반 ${summary.violationCount}건`;
  }

  if (summary.status === 'check_required') {
    return '확인 필요';
  }

  return '충족';
}

function ruleToneClasses(status: ScheduleComplianceRuleStatus) {
  if (status === 'failed') {
    return {
      shell: 'border-rose-200 bg-rose-50',
      status: 'text-rose-800',
      message: 'text-rose-700',
    };
  }

  if (status === 'check_required') {
    return {
      shell: 'border-amber-200 bg-amber-50',
      status: 'text-amber-800',
      message: 'text-amber-700',
    };
  }

  return {
    shell: 'border-slate-200 bg-white',
    status: 'text-emerald-700',
    message: 'text-slate-600',
  };
}

function formatViolationDates(dates: string[]) {
  if (dates.length === 0) {
    return '날짜 확인 필요';
  }

  if (dates.length === 1) {
    return dates[0];
  }

  return `${dates[0]} ~ ${dates[dates.length - 1]}`;
}

function toggleViolationReveal() {
  showAllViolations.value = !showAllViolations.value;
}
</script>

<template>
  <section
    data-test="compliance-panel"
    class="rounded-xl border border-slate-200 bg-slate-50 p-4"
  >
    <header
      class="rounded-lg border p-4"
      :class="decisionClasses.shell"
    >
      <h3 class="text-sm font-semibold text-slate-900">
        법적 기준 검증
      </h3>
      <p
        data-test="compliance-decision-status"
        class="mt-2 text-lg font-semibold"
        :class="decisionClasses.title"
      >
        {{ decisionTitle }}
      </p>
      <p
        class="mt-1 text-sm leading-6"
        :class="decisionClasses.copy"
      >
        {{ decisionDescription }}
      </p>
    </header>

    <div
      role="list"
      aria-label="필수 기준 검증 결과"
      class="mt-4 grid gap-2 md:grid-cols-2"
    >
      <div
        v-for="summary in result.summaries"
        :key="summary.code"
        role="listitem"
        :data-test="`compliance-rule-${summary.code}`"
        class="rounded-lg border p-3"
        :class="ruleToneClasses(summary.status).shell"
      >
        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <span class="text-sm font-medium text-slate-900">
            {{ summary.label }}
          </span>
          <strong
            class="shrink-0 text-sm font-semibold"
            :class="ruleToneClasses(summary.status).status"
          >
            {{ formatRuleStatus(summary) }}
          </strong>
        </div>
        <p
          class="mt-1 text-sm leading-6"
          :class="ruleToneClasses(summary.status).message"
        >
          {{ summary.message }}
        </p>
      </div>
    </div>

    <div
      v-if="result.violations.length > 0"
      class="mt-4 rounded-lg border border-slate-200 bg-white p-3"
    >
      <h4 class="text-sm font-semibold text-slate-900">
        위반 상세
      </h4>
      <ul
        :id="violationListId"
        data-test="compliance-violation-list"
        class="mt-2 space-y-2"
      >
        <li
          v-for="violation in visibleViolations"
          :key="violation.id"
          class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700"
        >
          <span class="font-medium text-slate-900">
            {{ violation.employeeName }}
          </span>
          <span class="mx-1 text-slate-400">·</span>
          <span class="font-mono text-xs text-slate-700">
            {{ formatViolationDates(violation.dates) }}
          </span>
          <span class="mx-1 text-slate-400">·</span>
          <span>{{ violation.message }}</span>
        </li>
      </ul>

      <button
        v-if="hiddenViolationCount > 0 || showAllViolations"
        type="button"
        data-test="compliance-violation-reveal"
        :aria-controls="violationListId"
        :aria-expanded="showAllViolations"
        class="mt-3 min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        @click="toggleViolationReveal"
      >
        {{ showAllViolations ? '위반 상세 접기' : `${hiddenViolationCount}건 더 보기` }}
      </button>
    </div>

    <div
      data-test="compliance-off-summary"
      class="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-slate-800"
    >
      <span class="font-medium text-slate-900">Off 요청</span>
      <span class="mx-1 text-slate-400">·</span>
      <span>{{ offRequestText }}</span>
    </div>
  </section>
</template>
