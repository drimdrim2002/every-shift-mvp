# Work Performance Month Range Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `근무 실적` 화면의 `연도 / 시작 월 / 종료 월` 입력을 하나의 월 범위 캘린더 선택기로 바꿔, 같은 연도 안의 조회 기간을 더 직관적으로 고르게 한다.

**Architecture:** `WorkPerformance.vue`의 조회 데이터 흐름과 API 계약은 유지한다. 월 범위 입력만 `WorkPerformanceMonthRangePicker.vue`로 분리하고, 선택값은 `yyyy-MM` 문자열 튜플로 관리한 뒤 기존 `year`, `startMonth`, `endMonth` 요청 값으로 변환한다. Naive UI의 `NDatePicker type="monthrange"`를 캘린더 엔진으로 사용하되, 닫힌 상태의 표시 형식과 같은 연도 제한은 얇은 controlled wrapper에서 보장한다.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vite, Tailwind CSS, Naive UI `NDatePicker`, Vitest, Vue Test Utils, Playwright.

---

## 결정 사항

- 조회 범위는 **같은 연도 내 월 범위**만 지원한다.
- UI는 **하나의 월 범위 캘린더**로 제공한다.
- 선택 가능 기간은 기존과 동일하게 **2000년 1월부터 2100년 12월까지** 허용한다.
- 조회 실행은 기존처럼 **`조회` 버튼 클릭**으로 수행한다.
- 닫힌 상태의 표시 형식은 **`2026년 3월 ~ 5월`**이다.
- 구현은 **Naive UI 컴포넌트를 우선 사용**한다.
- 연도를 넘는 범위는 **선택 상태로 반영되지 않게 막는다**.
- 캘린더는 **일자 없는 월 선택 전용 UI**여야 한다.

## 로컬 확인 결과

- `package.json` 기준 Naive UI 버전은 `^2.43.1`이다.
- `node_modules/naive-ui/es/date-picker/src/config.d.ts`에 `DatePickerType`으로 `monthrange`가 존재한다.
- `src/views/Dashboard.vue`는 이미 `NDatePicker type="month"`를 사용한다.
- Naive UI의 range input은 시작/종료 값에 같은 `format`을 적용하므로, 기본 입력창만으로는 `2026년 3월 ~ 5월`처럼 종료 쪽 연도만 생략하기 어렵다.
- Naive UI `monthrange` panel 내부의 month item disabled 처리는 현재 `disabled = false`로 고정되어 있으므로, 같은 연도 제한은 `is-date-disabled`만 믿지 말고 controlled update guard로 처리해야 한다.

## 파일 구조

- Create: `src/components/schedule/WorkPerformanceMonthRangePicker.vue`
  - 월 범위 선택 UI만 담당한다.
  - `modelValue: [string, string]` 형식의 `yyyy-MM` 값을 받고 `update:modelValue`를 emit한다.
  - 닫힌 상태에서는 `2026년 3월 ~ 5월` 형식의 버튼/입력형 trigger를 렌더링한다.
  - 팝오버 안에서 Naive UI `NDatePicker`의 `panel` + `type="monthrange"`를 렌더링한다.
  - 2000~2100 범위와 같은 연도 범위만 반영하는 guard를 둔다.
- Modify: `src/views/schedule/WorkPerformance.vue`
  - 기존 `연도`, `시작 월`, `종료 월` 입력을 제거한다.
  - 새 월 범위 picker를 연결한다.
  - 기존 `loadPerformance()` API 요청 구조는 `year`, `startMonth`, `endMonth` 그대로 유지한다.
  - 기존 로딩, 오류, 빈 상태, 누락 월 안내, 정렬, 상세 행 동작은 변경하지 않는다.
- Create: `tests/unit/work-performance-month-range-picker.spec.ts`
  - picker의 표시 형식, emit, 같은 연도 guard, 범위 guard를 검증한다.
- Modify: `tests/unit/work-performance.spec.ts`
  - 기존 세 입력 기반 테스트를 월 범위 picker 기반 테스트로 갱신한다.
- Modify: `tests/e2e/work-performance.spec.ts`
  - 기존 `work-performance-year`, `work-performance-start-month`, `work-performance-end-month` 조작을 새 picker 흐름으로 갱신한다.

## 데이터 계약

새 picker의 외부 계약은 아래처럼 둔다.

```ts
type WorkPerformanceMonthRangeValue = [string, string];
```

값 예시:

```ts
const value: WorkPerformanceMonthRangeValue = ['2026-03', '2026-05'];
```

`WorkPerformance.vue`는 이 값을 기존 조회 파라미터로 변환한다.

```ts
interface WorkPerformanceQuery {
  year: number;
  startMonth: number;
  endMonth: number;
}
```

변환 결과 예시:

```ts
{
  year: 2026,
  startMonth: 3,
  endMonth: 5,
}
```

API 파일 `src/api/workPerformance.ts`와 타입 파일 `src/types/workPerformance.ts`는 변경하지 않는다.

## Task 1: Picker 단위 테스트 추가

**Files:**

- Create: `tests/unit/work-performance-month-range-picker.spec.ts`
- Create later: `src/components/schedule/WorkPerformanceMonthRangePicker.vue`

- [ ] **Step 1: 실패하는 테스트 파일을 추가한다**

`tests/unit/work-performance-month-range-picker.spec.ts`를 만들고 Naive UI 컴포넌트는 얇게 stub한다.

```ts
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import WorkPerformanceMonthRangePicker from '@/components/schedule/WorkPerformanceMonthRangePicker.vue';

function createWrapper(modelValue: [string, string] = ['2026-03', '2026-05']) {
  return mount(WorkPerformanceMonthRangePicker, {
    props: {
      modelValue,
    },
    global: {
      stubs: {
        NPopover: {
          props: ['show'],
          template:
            '<div><slot name="trigger" /><div data-test="month-range-popover"><slot /></div></div>',
        },
        NButton: {
          name: 'NButton',
          template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>',
        },
        NDatePicker: {
          name: 'NDatePicker',
          props: ['formattedValue', 'type', 'format', 'valueFormat', 'yearRange', 'panel'],
          emits: ['update:formattedValue'],
          template:
            "<div data-test=\"month-range-panel\" @click=\"$emit('update:formattedValue', ['2026-01', '2026-03'])\" />",
        },
      },
    },
  });
}

describe('WorkPerformanceMonthRangePicker', () => {
  it('formats the selected same-year range as Korean year plus month range', () => {
    const wrapper = createWrapper(['2026-03', '2026-05']);

    expect(wrapper.get('[data-test="work-performance-month-range-trigger"]').text()).toContain(
      '2026년 3월 ~ 5월'
    );
  });

  it('emits the updated same-year month range', async () => {
    const wrapper = createWrapper(['2026-03', '2026-05']);

    await wrapper.get('[data-test="month-range-panel"]').trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['2026-01', '2026-03']]);
  });

  it('does not emit a range crossing years', async () => {
    const wrapper = createWrapper(['2026-03', '2026-05']);
    const picker = wrapper.getComponent({ name: 'NDatePicker' });

    await picker.vm.$emit('update:formattedValue', ['2025-12', '2026-02']);

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.get('[data-test="work-performance-month-range-trigger"]').text()).toContain(
      '2026년 3월 ~ 5월'
    );
  });

  it('does not emit a range outside the existing 2000 to 2100 window', async () => {
    const wrapper = createWrapper(['2026-03', '2026-05']);
    const picker = wrapper.getComponent({ name: 'NDatePicker' });

    await picker.vm.$emit('update:formattedValue', ['2101-01', '2101-03']);

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
pnpm test:unit -- tests/unit/work-performance-month-range-picker.spec.ts
```

Expected: FAIL because `src/components/schedule/WorkPerformanceMonthRangePicker.vue` does not exist.

## Task 2: `WorkPerformanceMonthRangePicker.vue` 구현

**Files:**

- Create: `src/components/schedule/WorkPerformanceMonthRangePicker.vue`
- Test: `tests/unit/work-performance-month-range-picker.spec.ts`

- [ ] **Step 1: 최소 구현을 추가한다**

구현 핵심은 아래 구조를 따른다.

```vue
<template>
  <div class="space-y-1">
    <span class="text-sm font-medium text-slate-700">조회 기간</span>
    <n-popover
      trigger="click"
      placement="bottom-start"
      :show="showPanel"
      @update:show="showPanel = $event"
    >
      <template #trigger>
        <n-button
          data-test="work-performance-month-range-trigger"
          size="large"
          class="min-h-11 w-full justify-center tabular-nums"
          @click="showPanel = true"
        >
          {{ formattedLabel }}
        </n-button>
      </template>

      <n-date-picker
        data-test="work-performance-month-range-panel"
        panel
        type="monthrange"
        format="yyyy-MM"
        value-format="yyyy-MM"
        :formatted-value="modelValue"
        :year-range="[2000, 2100]"
        @update:formatted-value="handleFormattedValueUpdate"
      />
    </n-popover>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NButton, NDatePicker, NPopover } from 'naive-ui';

type MonthRangeValue = [string, string];

const props = defineProps<{
  modelValue: MonthRangeValue;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: MonthRangeValue];
}>();

const showPanel = ref(false);

const formattedLabel = computed(() => formatMonthRangeLabel(props.modelValue));

function handleFormattedValueUpdate(value: string | [string, string] | null) {
  if (!Array.isArray(value) || !isValidMonthRange(value)) {
    return;
  }

  emit('update:modelValue', value);
}

function isValidMonthRange(value: [string, string]): boolean {
  const start = parseYearMonth(value[0]);
  const end = parseYearMonth(value[1]);

  return (
    Boolean(start && end) &&
    start.year === end.year &&
    start.year >= 2000 &&
    end.year <= 2100 &&
    start.month <= end.month
  );
}

function parseYearMonth(value: string): { year: number; month: number } | null {
  const match = /^(\\d{4})-(\\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

function formatMonthRangeLabel(value: [string, string]): string {
  const start = parseYearMonth(value[0]);
  const end = parseYearMonth(value[1]);

  if (!start || !end || start.year !== end.year) {
    return '조회 기간 선택';
  }

  return `${start.year}년 ${start.month}월 ~ ${end.month}월`;
}
</script>
```

- [ ] **Step 2: 단위 테스트 통과 확인**

Run:

```bash
pnpm test:unit -- tests/unit/work-performance-month-range-picker.spec.ts
```

Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add src/components/schedule/WorkPerformanceMonthRangePicker.vue tests/unit/work-performance-month-range-picker.spec.ts
git commit -m "feat: add work performance month range picker"
```

## Task 3: `WorkPerformance.vue`에 picker 연결

**Files:**

- Modify: `src/views/schedule/WorkPerformance.vue`
- Test: `tests/unit/work-performance.spec.ts`

- [ ] **Step 1: 기존 세 입력 기반 테스트를 실패하도록 갱신한다**

`tests/unit/work-performance.spec.ts`에서 아래 기대를 제거한다.

- `work-performance-year`
- `work-performance-start-month`
- `work-performance-end-month`

대신 새 picker stub을 추가한다.

```ts
WorkPerformanceMonthRangePicker: {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<button data-test="work-performance-month-range" @click="$emit(\'update:modelValue\', [\'2026-01\', \'2026-03\'])">{{ modelValue.join(\' ~ \') }}</button>',
},
```

초기화 테스트는 아래처럼 바꾼다.

```ts
expect(wrapper.get('[data-test="work-performance-month-range"]').text()).toContain(
  '2026-04 ~ 2026-04'
);
```

늦게 끝나는 최신 월 조회 보호 테스트는 아래 흐름으로 바꾼다.

```ts
await wrapper.get('[data-test="work-performance-month-range"]').trigger('click');

deferredLatest.resolve({ year: 2026, month: 4 });
await flush();

expect(wrapper.get('[data-test="work-performance-month-range"]').text()).toContain(
  '2026-01 ~ 2026-03'
);
```

조회 파라미터 테스트는 기존처럼 아래 결과를 검증한다.

```ts
expect(loadWorkPerformancePeriodMock).toHaveBeenCalledWith({
  organizationId: 'org-1',
  year: 2026,
  startMonth: 1,
  endMonth: 3,
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
pnpm test:unit -- tests/unit/work-performance.spec.ts
```

Expected: FAIL because `WorkPerformance.vue` still renders the old controls.

- [ ] **Step 3: `WorkPerformance.vue` 템플릿을 교체한다**

기존 grid:

```vue
<div class="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"></div>
```

새 grid:

```vue
<div class="grid gap-3 sm:grid-cols-[minmax(16rem,1fr)_auto] sm:items-end">
  <WorkPerformanceMonthRangePicker
    v-model="draftMonthRange"
    data-test="work-performance-month-range-picker"
    @update:model-value="markDraftPeriodTouched"
  />
  <n-button
    data-test="work-performance-query"
    type="primary"
    size="large"
    :loading="loading"
    :disabled="isInvalidRange"
    @click="loadPerformance"
  >
    조회
  </n-button>
</div>
```

주의: Vue의 `v-model`과 `@update:model-value`를 동시에 쓰면 update handler 순서가 헷갈릴 수 있다. 더 명확하게 하려면 아래처럼 직접 핸들러를 둔다.

```vue
<WorkPerformanceMonthRangePicker
  :model-value="draftMonthRange"
  data-test="work-performance-month-range-picker"
  @update:model-value="updateDraftMonthRange"
/>
```

- [ ] **Step 4: script 상태를 월 범위 값으로 바꾼다**

기존:

```ts
const monthOptions = Array.from({ length: 12 }, (_value, index) => index + 1);
const draftYear = ref(currentDate.getFullYear());
const draftStartMonth = ref(currentDate.getMonth() + 1);
const draftEndMonth = ref(currentDate.getMonth() + 1);
```

새 구조:

```ts
type MonthRangeValue = [string, string];

const draftMonthRange = ref<MonthRangeValue>([
  formatYearMonth(currentDate.getFullYear(), currentDate.getMonth() + 1),
  formatYearMonth(currentDate.getFullYear(), currentDate.getMonth() + 1),
]);

const draftQuery = computed<WorkPerformanceQuery | null>(() =>
  parseWorkPerformanceMonthRange(draftMonthRange.value)
);

const isInvalidRange = computed(() => draftQuery.value === null);
```

헬퍼:

```ts
function updateDraftMonthRange(value: MonthRangeValue) {
  draftMonthRange.value = value;
  markDraftPeriodTouched();
}

function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseWorkPerformanceMonthRange(value: MonthRangeValue): WorkPerformanceQuery | null {
  const start = parseYearMonth(value[0]);
  const end = parseYearMonth(value[1]);

  if (!start || !end || start.year !== end.year || start.month > end.month) {
    return null;
  }

  return {
    year: start.year,
    startMonth: start.month,
    endMonth: end.month,
  };
}

function parseYearMonth(value: string): { year: number; month: number } | null {
  const match = /^(\\d{4})-(\\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}
```

`initializeDefaultPeriod()`의 최신 확정 월 반영:

```ts
draftMonthRange.value = [
  formatYearMonth(latestFinalizedMonth.year, latestFinalizedMonth.month),
  formatYearMonth(latestFinalizedMonth.year, latestFinalizedMonth.month),
];
```

`loadPerformance()`의 query 생성:

```ts
const query = draftQuery.value;

if (!query || loading.value) {
  return;
}
```

- [ ] **Step 5: 단위 테스트 통과 확인**

Run:

```bash
pnpm test:unit -- tests/unit/work-performance.spec.ts
```

Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/views/schedule/WorkPerformance.vue tests/unit/work-performance.spec.ts
git commit -m "feat: use month range picker for work performance"
```

## Task 4: E2E 흐름 갱신

**Files:**

- Modify: `tests/e2e/work-performance.spec.ts`

- [ ] **Step 1: 기존 세 입력 조작 helper를 제거한다**

기존 helper:

```ts
async function selectJanuary2026(page: Page, endMonth = '1') {
  await page.getByTestId('work-performance-year').fill('2026');
  await page.getByTestId('work-performance-start-month').selectOption('1');
  await page.getByTestId('work-performance-end-month').selectOption(endMonth);
}
```

새 helper는 기본 latest finalized month가 fixture 기간과 맞도록 fixture를 사용하거나, picker trigger label을 검증한 뒤 조회한다.

```ts
async function expectSelectedWorkPerformanceRange(page: Page, label: string) {
  await expect(page.getByTestId('work-performance-month-range-trigger')).toContainText(label);
}
```

필요한 경우 Naive UI panel interaction helper를 추가한다. DOM이 불안정하면 E2E에서는 기본값 조회만 확인하고, 월 변경 동작은 picker unit test에 맡긴다.

```ts
async function openWorkPerformanceMonthRangePicker(page: Page) {
  await page.getByTestId('work-performance-month-range-trigger').click();
  await expect(page.getByTestId('work-performance-month-range-panel')).toBeVisible();
}
```

- [ ] **Step 2: 기존 text-align 기대값을 새 trigger 기준으로 바꾼다**

제거:

```ts
await expect(page.getByTestId('work-performance-year')).toHaveCSS('text-align', 'center');
await expect(page.getByTestId('work-performance-start-month')).toHaveCSS('text-align', 'center');
await expect(page.getByTestId('work-performance-end-month')).toHaveCSS('text-align', 'center');
```

추가:

```ts
await expect(page.getByTestId('work-performance-month-range-trigger')).toContainText(
  '2026년 1월 ~ 1월'
);
```

- [ ] **Step 3: E2E 통과 확인**

Run:

```bash
pnpm test:e2e -- tests/e2e/work-performance.spec.ts
```

Expected: PASS.

- [ ] **Step 4: 커밋**

```bash
git add tests/e2e/work-performance.spec.ts
git commit -m "test: update work performance range picker e2e"
```

## Task 5: 전체 검증

**Files:**

- Verify only.

- [ ] **Step 1: 관련 단위 테스트 실행**

Run:

```bash
pnpm test:unit -- tests/unit/work-performance-month-range-picker.spec.ts tests/unit/work-performance.spec.ts
```

Expected: PASS.

- [ ] **Step 2: 관련 E2E 실행**

Run:

```bash
pnpm test:e2e -- tests/e2e/work-performance.spec.ts
```

Expected: PASS.

- [ ] **Step 3: lint 실행**

Run:

```bash
pnpm lint:check
```

Expected: exits 0.

- [ ] **Step 4: build 실행**

Run:

```bash
pnpm run build
```

Expected: exits 0.

## 완료 기준

- `WorkPerformance.vue`에서 기존 `연도`, `시작 월`, `종료 월` 입력이 사라진다.
- 화면에는 하나의 월 범위 선택 trigger가 보인다.
- trigger는 선택된 기간을 `2026년 3월 ~ 5월` 형식으로 표시한다.
- trigger를 열면 일자 없는 월 범위 선택 UI가 나타난다.
- 선택 가능 연도 범위는 기존과 동일하게 2000~2100이다.
- 같은 연도 내 범위만 model에 반영된다.
- 연도를 넘는 범위는 조회 가능한 선택 상태로 남지 않는다.
- `조회` 버튼을 눌렀을 때 기존 `loadWorkPerformancePeriod({ organizationId, year, startMonth, endMonth })` 구조로 호출된다.
- 기존 로딩, 오류, 확정 근무표 없음, 누락 월 안내, 직원별 비교 테이블, 상세 펼침 동작은 유지된다.
- `pnpm lint:check`와 `pnpm run build`가 통과한다.

## 제외 범위

- `src/api/workPerformance.ts` API 쿼리 구조 변경.
- 연도를 넘는 조회 지원.
- 확정된 근무표가 있는 월만 선택 가능하게 제한.
- 조회 버튼 제거 또는 자동 조회.
- 실적 계산 로직 변경.
- 모바일 전용 재설계.
- AWS 콘솔과 동일한 시각 디자인을 직접 복제하는 커스텀 캘린더 구현.

## 열린 리스크

- Naive UI `monthrange` panel의 내부 DOM은 테스트에서 안정적인 selector가 적다. E2E에서 월 선택 자체를 직접 클릭하기 어렵다면, 월 선택 guard는 unit test에서 검증하고 E2E는 표시/조회 흐름 중심으로 유지한다.
- Naive UI 기본 range input만 쓰면 `2026년 3월 ~ 2026년 5월`처럼 종료 월에도 연도가 반복된다. 이 요구사항 때문에 custom trigger + `NDatePicker panel` 구조를 사용한다.
- `NDatePicker monthrange` panel은 `isDateDisabled`로 개별 month item을 비활성화하지 않으므로, 같은 연도 제한은 update handler에서 reject하는 방식으로 구현한다.
