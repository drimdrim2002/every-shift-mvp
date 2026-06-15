# Step4 사전 Off 요청 캘린더 — 근무자 페이징 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **상태:** ✅ 요구사항 확정 (코드 미착수)  
> **작성일:** 2026-06-15  
> **관련 화면:** `Step4InitialData.vue`, `ScheduleGrid.vue` (`mode="planning"`)  
> **선행 문서:** `docs/plans/2026-06-15-step4-calendar-sticky-header-requirements.ko.md` (세로 sticky — **본 페이징 plan으로 대체**)

**Goal:** Step4 사전 Off 요청 캘린더에서 근무자 목록의 **세로 스크롤을 제거**하고, **10명 단위 페이징**으로 전환한다. 날짜 헤더·가로 스크롤·전체 Total 집계·프리셉터 페어·드로어 연동은 유지한다.

**Architecture:** `Step4InitialData.vue`에서 `displayEmployees`를 페이지 단위로 slice하고, `n-pagination`으로 페이지를 전환한다. `ScheduleGrid`에는 현재 페이지 근무자만 `employees`로 넘기되, 하단 Total 행 집계는 **전체 근무자** 기준으로 계산되도록 `statisticsEmployees` optional prop을 추가한다. `scrollEmployeeRowIntoView`는 해당 근무자가 있는 페이지로 자동 이동하는 `focusEmployeeCalendarPage`로 교체한다.

**Tech Stack:** Vue 3.5, TypeScript 5.8, Naive UI (`n-pagination`), Tailwind CSS 3.4, Vitest

---

## 1. 요구사항 요약 (사용자 확정)

| 항목           | 결정                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| 페이징 단위    | **근무자 행만** — 날짜 열·3단 헤더는 매 페이지 동일 (당월 전체)             |
| 페이지 크기    | **10명/페이지** (Step3 `EmployeeTable` `pageSize: 10`과 동일)               |
| 하단 Total 행  | **전체 근무자 기준** 집계 (현재 페이지와 무관)                              |
| 페이지 간 이동 | 셀 선택·드로어 연동 시 **해당 근무자 페이지로 자동 이동**                   |
| 페이지 UI      | 캘린더 카드 **하단** (현재 스크롤 안내 문구 자리) — 이전/다음 + 페이지 번호 |
| 세로 스크롤    | **완전 제거** — 한 페이지 분량이 카드 안에 맞게                             |
| 가로 스크롤    | **현행 유지** — 31일 날짜 열은 그리드 내 가로 스크롤                        |
| 프리셉터 페어  | 10명 경계에서 **페어가 잘리지 않도록** 같은 페이지에 묶기 (최대 11명 허용)  |

### 제외 범위 (Scope Guard)

- Step4 외 화면(`Step5Result` 등) `ScheduleGrid` 페이징
- 모바일 반응형·i18n
- 페이지 크기 사용자 설정 UI
- 서버 사이드 페이징 (MVP: 클라이언트 slice, 최대 30명)

---

## 2. 코드베이스 현황

### 2.1 현재 구조

```text
Step4InitialData.vue
└── 캘린더 카드
    ├── [고정] 카드 헤더 — "사전 Off 요청 캘린더" + Excel 버튼
    ├── [조건부] draft 경고 n-alert
    ├── [변경] step4-calendar-scroll-region (overflow-auto — 세로+가로)
    │   └── ScheduleGrid(:employees="displayEmployees") — 전원 렌더
    └── [변경] step4-calendar-scroll-hint — "세로로 스크롤..." 문구
```

핵심 코드:

```764:764:src/views/schedule/Step4InitialData.vue
const displayEmployees = computed(() => orderEmployeesForPreceptorPairs(grid.employees.value));
```

```358:393:src/views/schedule/Step4InitialData.vue
            <div
              data-test="step4-calendar-scroll-region"
              class="relative min-h-0 flex-1 overflow-auto overscroll-y-contain"
            >
              ...
                  <ScheduleGrid
                    :employees="displayEmployees"
```

### 2.2 통계 계산

`ScheduleGrid`는 `useScheduleGridStatistics(props.employees, ...)`로 **전달된 employees만** 행·열 통계를 계산한다.

```384:389:src/components/schedule/ScheduleGrid.vue
const statistics = useScheduleGridStatistics(
  () => props.employees,
  () => props.dates,
  () => (props.mode === 'planning' ? (props.constraints as AssignmentMap) : props.assignments),
  () => props.mode
);
```

→ 페이징 후 하단 Total 행이 **전체 19명 기준**이 되려면, 열 집계용 전체 employee 목록을 별도로 넘겨야 한다.

### 2.3 스크롤-into-view

```2207:2231:src/views/schedule/Step4InitialData.vue
function scrollEmployeeRowIntoView(employeeId: string): void {
  ...
  const scrollRegion = document.querySelector<HTMLElement>('[data-test="step4-calendar-scroll-region"]');
  scrollRegion.scrollTo({ top: ..., behavior: 'smooth' });
}
```

→ 페이지 전환 + `nextTick` 후 행 하이라이트로 교체.

### 2.4 기존 테스트 (변경 필요)

`tests/unit/step4-initial-data.spec.ts`:

- `step4-calendar-scroll-hint` — "세로로 스크롤" 문구 assertion
- `calendar sticky scroll contract` — `overflow-auto` on scroll region
- `:deep(.step4-calendar-grid .schedule-grid-container) { overflow: visible }` — 세로 스크롤포트 분리 목적

### 2.5 선행 sticky plan과의 관계

`docs/plans/2026-06-15-step4-calendar-sticky-header-requirements.ko.md`는 **세로 스크롤 유지** 전제의 thead sticky 복구였다.  
본 페이징 plan 적용 시:

- **세로 sticky 헤더 이슈는 구조적으로 해소** (한 페이지에 행 수 제한)
- **가로 sticky** (근무자 열·Total 열·날짜 헤더)는 `ScheduleGrid` 기존 CSS 유지
- sticky plan Phase 2~4는 **보류/취소** — 페이징 완료 후 가로 정렬만 QA

---

## 3. 핵심 설계 결정

| 항목                          | 결정                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------- |
| 페이지 상태                   | `calendarPage` ref (1-based), 월·조직 변경 시 `1`로 리셋                          |
| 페이지 slice                  | `paginateEmployeesPreservingPairs(ordered, pageSize)` 유틸                        |
| Grid employees prop           | 현재 페이지 근무자만                                                              |
| Grid statisticsEmployees prop | **신규 optional** — 있으면 열 Total·하단 집계에 사용, 행 Total은 `employees` 기준 |
| 스크롤 영역 class             | `overflow-x-auto overflow-y-hidden` (세로 스크롤 제거, 가로 유지)                 |
| 페이지 UI                     | Naive UI `n-pagination` — `page`, `page-count`, `on-update:page`                  |
| 1페이지 미만                  | 근무자 ≤10명이면 pagination 숨김 또는 disabled single page                        |
| data-test                     | `step4-calendar-pagination`, `step4-calendar-page-info` 추가                      |

### 3.1 프리셉터 페어 페이지 분할 알고리즘

입력: `orderEmployeesForPreceptorPairs()` 결과 (이미 preceptor → preceptee 인접)

```typescript
// src/utils/employeeCalendarPagination.ts (신규)
export function buildEmployeeCalendarPages<T extends PairableEmployee>(
  employees: T[],
  pageSize: number
): T[][] {
  const pages: T[][] = [];
  let current: T[] = [];

  const pairMateId = (emp: T): string | null => {
    const pair = resolvePreceptorPair(employees as Employee[], emp.id);
    return pair?.peerId ?? null;
  };

  employees.forEach((employee) => {
    const last = current[current.length - 1];
    const isPairContinuation = last !== undefined && pairMateId(last) === employee.id;

    if (current.length >= pageSize && !isPairContinuation) {
      pages.push(current);
      current = [];
    }

    current.push(employee);
  });

  if (current.length > 0) pages.push(current);
  return pages;
}
```

- `isPairContinuation`: 현재 페이지 마지막이 preceptor이고 다음이 preceptee면 **10명을 넘어도 같은 페이지에 유지**
- 페이지 수: `employeeCalendarPages.length`
- 현재 페이지 employees: `employeeCalendarPages[calendarPage - 1] ?? []`

### 3.2 ScheduleGrid `statisticsEmployees` prop

```typescript
// ScheduleGrid.vue — Props 추가
statisticsEmployees?: Employee[];  // default: undefined → employees 사용

// useScheduleGridStatistics 호출 변경
const statistics = useScheduleGridStatistics(
  () => props.statisticsEmployees ?? props.employees,  // column stats
  ...
);

// rowStats는 props.employees 기준 별도 계산 또는 composable 확장
```

**권장:** `useScheduleGridStatistics`에 `columnEmployees` optional 5번째 인자 추가 — 열 집계만 전체, 행 집계는 표시 employees.

---

## 4. 파일 구조

### Create

| File                                              | Responsibility                                       |
| ------------------------------------------------- | ---------------------------------------------------- |
| `src/utils/employeeCalendarPagination.ts`         | 페어 보존 페이지 chunk 빌드, `findEmployeePageIndex` |
| `tests/unit/employee-calendar-pagination.spec.ts` | 페이징 유틸 단위 테스트                              |

### Modify

| File                                           | Responsibility                                       |
| ---------------------------------------------- | ---------------------------------------------------- |
| `src/views/schedule/Step4InitialData.vue`      | 페이지 state, slice, pagination UI, scroll→page 전환 |
| `src/components/schedule/ScheduleGrid.vue`     | `statisticsEmployees` prop (또는 composable 확장)    |
| `src/composables/useScheduleGridStatistics.ts` | 열/행 통계 employee 소스 분리 (필요 시)              |
| `tests/unit/step4-initial-data.spec.ts`        | 스크롤 hint → pagination assertion                   |

### Unchanged (동작 유지)

| File                                     | Note                                          |
| ---------------------------------------- | --------------------------------------------- |
| `src/utils/preceptorPairDisplayOrder.ts` | `orderEmployeesForPreceptorPairs` 그대로 사용 |
| `src/components/layout/*`                | 변경 없음                                     |

---

## 5. UI 스펙

### 5.1 페이지 네비게이션 (카드 하단)

현재 `step4-calendar-scroll-hint` 영역을 교체:

```vue
<div
  v-if="grid.employees.value.length > 0"
  data-test="step4-calendar-pagination"
  class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-3"
>
  <p
    data-test="step4-calendar-page-info"
    class="text-xs text-slate-500"
  >
    근무자 {{ grid.employees.value.length }}명 · {{ calendarPage }}/{{ totalCalendarPages }}페이지
    ({{ paginatedEmployeeRangeLabel }})
  </p>
  <n-pagination
    v-if="totalCalendarPages > 1"
    size="small"
    :page="calendarPage"
    :page-count="totalCalendarPages"
    @update:page="handleCalendarPageChange"
  />
</div>
```

- `paginatedEmployeeRangeLabel` 예: `1–10번째` / `11–19번째`
- `DESIGN.md` 톤: slate 배경, compact density

### 5.2 스크롤 영역

```diff
- class="relative min-h-0 flex-1 overflow-auto overscroll-y-contain"
+ class="relative min-h-0 flex-1 overflow-x-auto overflow-y-hidden"
```

`:deep` 오버라이드는 가로 스크롤포트가 grid container일 수 있도록 검토 — 필요 시 `overflow-x: auto` on `.schedule-grid-container`로 복귀.

---

## 6. Implementation Tasks

### Task 1: 페이징 유틸 + 단위 테스트 (TDD)

**Files:**

- Create: `src/utils/employeeCalendarPagination.ts`
- Create: `tests/unit/employee-calendar-pagination.spec.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
import { describe, expect, it } from 'vitest';
import {
  buildEmployeeCalendarPages,
  findEmployeePageIndex,
} from '@/utils/employeeCalendarPagination';

describe('employeeCalendarPagination', () => {
  const employees = [
    { id: 'a', employeeId: '001', name: 'A', preceptorId: null },
    { id: 'b', employeeId: '002', name: 'B', preceptorId: 'a' },
    // ... 12명 fixture including pair at page boundary
  ];

  it('keeps preceptor pair on the same page when pageSize would split them', () => {
    const pages = buildEmployeeCalendarPages(employees, 10);
    const pageWithPreceptor = pages.find((page) => page.some((e) => e.id === 'a'));
    expect(pageWithPreceptor?.some((e) => e.id === 'b')).toBe(true);
  });

  it('finds page index for employee id', () => {
    expect(findEmployeePageIndex(employees, 10, 'emp-on-page-2')).toBe(2);
  });
});
```

- [ ] **Step 2: 테스트 실행 — FAIL**

```bash
pnpm vitest run tests/unit/employee-calendar-pagination.spec.ts
```

- [ ] **Step 3: 유틸 구현**

- [ ] **Step 4: 테스트 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/utils/employeeCalendarPagination.ts tests/unit/employee-calendar-pagination.spec.ts
git commit -m "feat: add Step4 calendar employee pagination utils with pair preservation"
```

---

### Task 2: ScheduleGrid 전체 Total 집계 분리

**Files:**

- Modify: `src/composables/useScheduleGridStatistics.ts`
- Modify: `src/components/schedule/ScheduleGrid.vue`
- Test: `tests/unit/schedule-grid.spec.ts` (존재 시) 또는 신규

- [ ] **Step 1: composable에 `columnEmployees` optional 인자 추가**

```typescript
export function useScheduleGridStatistics(
  employees: () => Employee[],
  dates: () => GridColumn[],
  assignments: () => AssignmentMap,
  mode: () => 'planning' | 'result' = () => 'result',
  columnEmployees: () => Employee[] = employees
) {
  // rowStats: employees()
  // columnStats: columnEmployees()
}
```

- [ ] **Step 2: ScheduleGrid prop 추가**

```typescript
statisticsEmployees?: Employee[];
// ...
useScheduleGridStatistics(
  () => props.employees,
  () => props.dates,
  () => ...,
  () => props.mode,
  () => props.statisticsEmployees ?? props.employees,
)
```

- [ ] **Step 3: planning 모드 — paginated employees + full statisticsEmployees 테스트**

```bash
pnpm vitest run tests/unit/schedule-grid.spec.ts
# 또는 해당 컴포넌트 테스트 파일
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: allow ScheduleGrid column stats from full employee roster"
```

---

### Task 3: Step4InitialData 페이징 UI + 상태 (TDD)

**Files:**

- Modify: `tests/unit/step4-initial-data.spec.ts`
- Modify: `src/views/schedule/Step4InitialData.vue`

- [ ] **Step 1: 실패 테스트 — pagination replaces scroll hint**

```typescript
it('paginates calendar employees instead of vertical scroll guidance', async () => {
  // mock 12+ employees
  expect(wrapper.find('[data-test="step4-calendar-pagination"]').exists()).toBe(true);
  expect(wrapper.find('[data-test="step4-calendar-scroll-hint"]').exists()).toBe(false);
  expect(wrapper.get('[data-test="step4-calendar-scroll-region"]').classes()).toContain(
    'overflow-y-hidden'
  );
});
```

- [ ] **Step 2: FAIL 확인**

```bash
pnpm vitest run tests/unit/step4-initial-data.spec.ts -t "paginates calendar"
```

- [ ] **Step 3: Step4 상태·computed 추가**

```typescript
const CALENDAR_PAGE_SIZE = 10;
const calendarPage = ref(1);

const employeeCalendarPages = computed(() =>
  buildEmployeeCalendarPages(displayEmployees.value, CALENDAR_PAGE_SIZE)
);
const totalCalendarPages = computed(() => Math.max(1, employeeCalendarPages.value.length));
const paginatedDisplayEmployees = computed(
  () => employeeCalendarPages.value[calendarPage.value - 1] ?? []
);

watch(
  () => [grid.employees.value.length, scheduleStore.selectedMonth] as const,
  () => {
    calendarPage.value = 1;
  }
);
```

- [ ] **Step 4: ScheduleGrid 바인딩 변경**

```vue
<ScheduleGrid :employees="paginatedDisplayEmployees" :statistics-employees="displayEmployees" ... />
```

- [ ] **Step 5: pagination UI + scroll region class 변경**

- [ ] **Step 6: `scrollEmployeeRowIntoView` → `focusEmployeeCalendarPage`**

```typescript
function focusEmployeeCalendarPage(employeeId: string): void {
  const page = findEmployeePageIndex(displayEmployees.value, CALENDAR_PAGE_SIZE, employeeId);
  if (page > 0) calendarPage.value = page;
  // optional: nextTick 후 row highlight scroll 없음 (세로 스크롤 없음)
}
```

- [ ] **Step 7: 테스트 PASS**

```bash
pnpm vitest run tests/unit/step4-initial-data.spec.ts
```

- [ ] **Step 8: 기존 sticky scroll contract 테스트 업데이트 또는 제거**

`calendar sticky scroll contract` describe 블록을 pagination contract로 교체:

- `overflow-y-hidden` on scroll region
- page 2에서 employee 11번째 visible

- [ ] **Step 9: Commit**

```bash
git commit -m "feat: paginate Step4 calendar employees ten per page"
```

---

### Task 4: 회귀 테스트 + 문서

**Files:**

- Modify: `docs/plans/2026-06-15-step4-calendar-sticky-header-requirements.ko.md`

- [ ] **Step 1: sticky plan 상단에 superseded 안내 추가**

```markdown
> **상태:** ⏸️ 보류 — `docs/plans/2026-06-15-step4-calendar-pagination.ko.md`로 대체
```

- [ ] **Step 2: 전체 unit 테스트**

```bash
pnpm vitest run tests/unit/step4-initial-data.spec.ts tests/unit/employee-calendar-pagination.spec.ts
```

- [ ] **Step 3: Workflow Checks**

```bash
pnpm lint:check
pnpm run build
```

- [ ] **Step 4: Commit**

```bash
git commit -m "docs: mark Step4 sticky header plan superseded by pagination"
```

---

## 7. 수동 QA 시나리오

| #   | 시나리오                      | 기대 결과                                  |
| --- | ----------------------------- | ------------------------------------------ |
| 1   | 근무자 19명, 1페이지          | 10명 표시, pagination `1/2`                |
| 2   | 2페이지 이동                  | 9명 표시, 날짜 헤더 동일                   |
| 3   | 프리셉터 페어가 10번째·11번째 | 같은 페이지에 11명                         |
| 4   | 2페이지 근무자 셀 클릭        | 2페이지로 자동 이동 + 드로어 열림          |
| 5   | 하단 Total 행                 | 1·2페이지 모두 **전체 19명** Off 합계 동일 |
| 6   | 가로 스크롤 31일              | 날짜 헤더·본문 열 정렬 유지                |
| 7   | 세로 스크롤                   | 캘린더 영역 **세로 스크롤바 없음**         |
| 8   | Excel 업/다운로드             | 전체 근무자 데이터 영향 없음               |
| 9   | 월 변경                       | 페이지 1로 리셋                            |

---

## 8. 리스크 & 완화

| 리스크                                         | 완화                                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Total 행이 페이지 employees만 집계             | `statisticsEmployees` prop + 테스트                                                                |
| 페어 분리                                      | `buildEmployeeCalendarPages` + 경계 fixture 테스트                                                 |
| `:deep` overflow 오버라이드와 가로 스크롤 충돌 | Task 3에서 grid container overflow 재검토                                                          |
| `n-pagination` 미사용 이력                     | Naive UI 공식 `NPagination` — `docs/naive/03-data-tables.md` pagination 패턴 참고                  |
| 10명도 카드 높이 초과 (작은 뷰포트)            | 사용자 확정: 세로 스크롤 없음 — 행 높이·카드 `min-h` 조정으로 대응 (fallback 스크롤 추가하지 않음) |

---

## 9. 완료 기준 (Definition of Done)

- [ ] 근무자 10명 단위 페이징, 프리셉터 페어 동일 페이지
- [ ] 세로 스크롤 제거, 가로 스크롤 유지
- [ ] 하단 Total 행 전체 근무자 집계
- [ ] cross-page 근무자 선택 시 자동 페이지 이동
- [ ] `tests/unit/employee-calendar-pagination.spec.ts` 통과
- [ ] `tests/unit/step4-initial-data.spec.ts` pagination assertion 통과
- [ ] `pnpm lint:check` / `pnpm run build` 통과

---

## 10. 새 세션 시작 프롬프트 (복사용)

```text
/docs/plans/2026-06-15-step4-calendar-pagination.ko.md 플랜을 따라 Step4 캘린더 페이징을 구현해주세요.

순서:
1. Task 1 — employeeCalendarPagination 유틸 + 테스트
2. Task 2 — ScheduleGrid statisticsEmployees / column stats 분리
3. Task 3 — Step4InitialData 페이징 UI + scroll→page 전환
4. Task 4 — 문서 + lint/build

확정 요구:
- 10명/페이지, 세로 스크롤 제거, 가로 유지
- Total 행은 전체 근무자 집계
- 프리셉터 페어 같은 페이지 유지

참고: @src/views/schedule/Step4InitialData.vue, @src/components/schedule/ScheduleGrid.vue
```

---

## Execution Handoff

**Plan saved to:** `docs/plans/2026-06-15-step4-calendar-pagination.ko.md`

**실행 옵션:**

1. **Subagent-Driven (권장)** — Task마다 새 서브에이전트 + 단계별 리뷰
2. **Inline Execution** — 이 세션에서 Task 1부터 순차 구현

원하시면 바로 Task 1부터 구현을 시작할 수 있습니다.
