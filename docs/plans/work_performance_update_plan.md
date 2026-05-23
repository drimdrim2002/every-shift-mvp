# 근무 기록 분석 지표 개선 및 집계 기준 통일 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 야간 근무, Off 요청, 주말 근무, 공휴일 근무의 집계 기준을 전면 개선하고, 주말과 공휴일 근무를 완벽히 분리하여 4개 지표(야간 / 주말 / 공휴일 / Off)로 고도화된 근무 실적 화면을 제공한다.

**Architecture:** `src/types/workPerformance.ts`에 개선된 타입을 정의하고, `src/api/workPerformance.ts`에서 날짜 경계 조건(T-1일 및 T+1일) 데이터를 Supabase에서 안전하게 로드하며, `src/utils/workPerformanceFairness.ts`에서 순수 함수 기반으로 지표를 계산하고, `src/views/schedule/WorkPerformance.vue`에서 4개 지표 UI를 Naive UI 및 Tailwind CSS를 사용하여 구현한다.

**Tech Stack:** Vue 3 <script setup>, TypeScript, Vite, Tailwind CSS, Naive UI, Pinia, Supabase, Vitest.

---

## 검토 및 보강 분석 결과 (Critique)

기존 계획서에 대해 `writing-plans` 관점으로 상세히 분석한 결과, 구현 시 심각한 오작동이나 집계 누락을 유발할 수 있는 **2개의 핵심 엣지 케이스 버그**와 **1개의 누락된 예외 처리**를 발견하여 이를 보강하였습니다.

### 1. T-1일 배정 데이터 필터링 버그 (Off 요청 수락 조건 A 관련)

- **원인**: Off 요청 수락 판정 시 전날(T-1) 야간 근무 여부를 알기 위해 API에서 T-1일 assignments 데이터를 조회하여 집계 함수로 넘겨주지만, `computeWorkPerformanceFairness` 내부의 `assignments.forEach` 루프에서 `!requiredDateSet.has(assignment.date)` 조건에 의해 **조회 기간 밖인 T-1일의 배정 정보가 맵에 등록되지 않고 완전히 무시**됩니다. 이로 인해 조회 대상 첫째 날(예: 5월 1일)의 Off 수락 여부를 계산할 때 T-1일(4월 30일)에 야간 근무가 실제로 있었더라도 무조건 'N 근무 없음'으로 판정하는 오류가 발생합니다.
- **해결책**: `assignmentsByEmployeeDate` 맵에 데이터를 적재할 때는 `requiredDateSet.has(assignment.date)` 필터를 제거하거나, `assignment.date === getPreviousDate(period.startDate)`인 경우도 허용하도록 수정합니다.

### 2. T+1일 공휴일 데이터 필터링 버그 (공휴일 근무 조건 관련)

- **원인**: 마지막 날 야간 근무(T)가 다음 날(T+1) 공휴일에 걸치는 경우를 계산하기 위해 API에서 T+1일의 공휴일 데이터를 로드하여 `publicHolidayDates`로 전달하지만, `computeWorkPerformanceFairness` 내부에서 `const holidayDateSet = new Set(publicHolidayDates.filter((date) => requiredDateSet.has(date)))` 처리를 통해 **조회 기간 밖인 T+1일의 공휴일 날짜가 holidayDateSet에서 완전히 제거**됩니다. 이로 인해 마지막 날의 야간 근무가 다음 날 공휴일 근무로 연결되어도 집계에서 누락됩니다.
- **해결책**: `holidayDateSet` 생성 시 `requiredDateSet`에 의한 필터링을 제거하고, API가 전달한 공휴일 범위를 그대로 활용하여 `new Set(publicHolidayDates)`로 정의합니다.

### 3. 이전 달 확정 근무표가 없는 경우의 예외 처리 누락

- **원인**: 조회 범위의 첫째 날 이전(T-1)이 이전 달에 속하고, 이전 달의 확정된 근무표가 아직 존재하지 않는 경우 T-1일의 assignments 데이터를 가져올 수 없습니다. 이 경우 명시적인 처리 기준이 없으면 런타임 오류가 발생하거나 부정확한 계산이 이루어질 수 있습니다.
- **해결책**: 이전 달의 확정 근무표가 존재하지 않는 경우, T-1일의 배정 데이터는 존재하지 않는 것으로 보고(즉, N 근무 없음) 안전하게 기본값으로 폴백(Fallback)하도록 코드를 보강하고 이 기준을 명시합니다.

---

## 제안된 변경 사항 및 태스크 분할

### Task 1: 타입 및 API 레이어 개선

**Files:**

- Modify: `src/types/workPerformance.ts`
- Modify: `src/api/workPerformance.ts`
- Test: `tests/unit/work-performance-api.spec.ts` (신설 또는 보강)

- [ ] **Step 1: `WorkPerformanceMetricKey` 및 관련 타입 변경**
      `src/types/workPerformance.ts`에서 `WorkPerformanceMetricKey`를 수정합니다.

  ```typescript
  export type WorkPerformanceMetricKey = 'night' | 'weekend' | 'holiday' | 'offRequestAccepted';
  ```

  `WorkPerformanceMetricResult` 등의 관련 타입들이 4가지 키를 정상 지원하는지 확인합니다.

- [ ] **Step 2: 날짜 연산 유틸리티 및 API 경계 조건 보강**
      `src/api/workPerformance.ts`에 ISO 데이트 스트링 기준 하루 전날(T-1)과 다음 날(T+1)을 구하는 타임존 안전 유틸리티를 추가하고, 조회 범위를 확장합니다.

  ```typescript
  export function getPreviousDate(dateStr: string): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  }

  export function getNextDate(dateStr: string): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }
  ```

  - `loadAssignments`에 전달하는 시작일은 `getPreviousDate(period.startDate)`로 확장합니다.
  - `listPublicHolidayDatesInRange`에 전달하는 종료일은 `getNextDate(period.endDate)`로 확장합니다.
  - 이전 달의 확정 버전(finalized_version_id)을 조회 범위에 포함하도록 `prevMonthLabel`을 계산하여 `finalizedVersionIds` 로드 범위를 유연하게 설계합니다. (이전 달이 없는 경우 예외 처리 적용)

- [ ] **Step 3: API 빌드 검증 및 커밋**
  ```bash
  pnpm lint:check
  git add src/types/workPerformance.ts src/api/workPerformance.ts
  git commit -m "feat: update work performance types and api for extended date boundaries"
  ```

---

### Task 2: 집계 공식 및 핵심 로직 개선 (버그 해결 포함)

**Files:**

- Modify: `src/utils/workPerformanceFairness.ts`
- Test: `tests/unit/work-performance-fairness.spec.ts`

- [ ] **Step 1: 메트릭 정의 업데이트 및 필터링 버그 핫픽스**
      `src/utils/workPerformanceFairness.ts`에서 `metricDefinitions` 상수를 4개 지표로 변경합니다.

  ```typescript
  export const metricDefinitions = [
    { key: 'night', label: '야간 근무 횟수', unit: '회', unfavorableDirection: 'aboveAverage' },
    { key: 'weekend', label: '주말 근무 횟수', unit: '회', unfavorableDirection: 'aboveAverage' },
    { key: 'holiday', label: '공휴일 근무 횟수', unit: '회', unfavorableDirection: 'aboveAverage' },
    {
      key: 'offRequestAccepted',
      label: 'Off 요청 수락 건수',
      unit: '건',
      unfavorableDirection: 'belowAverage',
    },
  ] as const satisfies readonly WorkPerformanceMetricDefinition[];
  ```

  그리고 `computeWorkPerformanceFairness` 내의 필터링 버그들을 아래와 같이 핫픽스합니다.

  ```typescript
  // 1. holidayDateSet 생성 시 requiredDateSet 필터링 제거 (T+1일 공휴일 판정 유지용)
  const holidayDateSet = new Set(publicHolidayDates);

  // 2. assignmentsByEmployeeDate 구성 시 requiredDateSet 필터링 범위 수정
  // T-1일 데이터도 맵에 보관할 수 있어야 하므로, period.startDate 하루 전날 날짜도 포함하여 보관하도록 수정합니다.
  const prevStartDate = getPreviousDate(period.startDate);
  assignments.forEach((assignment) => {
    if (!employeeById.has(assignment.employeeId)) {
      return;
    }
    // 집계 대상 기간 또는 T-1일 데이터만 맵에 보관
    if (requiredDateSet.has(assignment.date) || assignment.date === prevStartDate) {
      assignmentsByEmployeeDate.set(mapKey(assignment.employeeId, assignment.date), assignment);
    }
    // ...
  });
  ```

- [ ] **Step 2: 4대 지표 상세 집계 계산식 구현**
      `requiredDates.forEach((date) => { ... })` 내에서 각 지표를 엄밀히 연산합니다.
  - **야간 근무 (`night`)**:
    ```typescript
    if (normalizeShiftCode(assignment?.shiftCode) === NIGHT_SHIFT_CODE) {
      nightEvidenceDates.push(date);
    }
    ```
  - **주말 근무 (`weekend`)**:
    금요일 `N` 근무, 토요일 `D/E/N` 근무, 일요일 `D/E` 근무 여부에 따라 주말 근무 증빙에 추가합니다.
    ```typescript
    const dayOfWeek = getIsoDayOfWeek(date);
    const isWorked = isWorkedAssignment(assignment);
    if (isWorked) {
      const shift = normalizeShiftCode(assignment?.shiftCode);
      if (
        (dayOfWeek === 5 && shift === NIGHT_SHIFT_CODE) || // 금요일 야간
        (dayOfWeek === 6 && (shift === 'D' || shift === 'E' || shift === NIGHT_SHIFT_CODE)) || // 토요일 전체
        (dayOfWeek === 0 && (shift === 'D' || shift === 'E')) // 일요일 주간/이브닝
      ) {
        weekendEvidenceDates.push(date);
      }
    }
    ```
  - **공휴일 근무 (`holiday`)**:
    당일(T) 공휴일의 `D/E` 근무 또는 내일(T+1) 공휴일의 `N` 근무 여부에 따라 공휴일 근무 증빙에 추가합니다.
    ```typescript
    const isHoliday = holidayDateSet.has(date);
    const nextDateStr = getNextDate(date);
    const isNextDayHoliday = holidayDateSet.has(nextDateStr);
    const isWorked = isWorkedAssignment(assignment);
    if (isWorked) {
      const shift = normalizeShiftCode(assignment?.shiftCode);
      if (
        (isHoliday && (shift === 'D' || shift === 'E')) || // 공휴일 당일 D/E
        (isNextDayHoliday && shift === NIGHT_SHIFT_CODE) // 공휴일 전날 야간 N
      ) {
        holidayEvidenceDates.push(date);
      }
    }
    ```
  - **Off 요청 수락 (`offRequestAccepted`)**:
    해당일에 Off 신청(`'O'`)이 존재하고, 조건 A(전날 N 근무 없음) & 조건 B(당일 D/E/N 근무 없음)를 모두 만족하는 경우 수락 건수로 가산합니다.
    ```typescript
    if (offRequestDates.has(date)) {
      const prevDateStr = getPreviousDate(date);
      const prevAssignment = assignmentsByEmployeeDate.get(mapKey(employee.id, prevDateStr));
      const hasPrevNight = normalizeShiftCode(prevAssignment?.shiftCode) === NIGHT_SHIFT_CODE;
      const hasCurrentWork = isWorkedAssignment(assignment); // D, E, N 근무 배정이 없어야 함 (즉, 휴무 형태여야 함)

      if (!hasPrevNight && !hasCurrentWork) {
        offAcceptedEvidenceDates.push(date);
      }
    }
    ```

- [ ] **Step 3: 우선순위 점수 및 정렬 로직 업데이트**
      4개 지표에 대해 가중치를 분산 반영하도록 `priorityScore` 및 `sort` 로직을 수정합니다.

  ```typescript
  const priorityScore =
    getUnfavorableDeviation('night', metrics.night) +
    getUnfavorableDeviation('weekend', metrics.weekend) +
    getUnfavorableDeviation('holiday', metrics.holiday) +
    getUnfavorableDeviation('offRequestAccepted', metrics.offRequestAccepted);
  ```

  동률 발생 시의 정렬 우선순위 조건도 `night` -> `weekend` -> `holiday` -> `offRequestAccepted` 순으로 업데이트합니다.

- [ ] **Step 4: 로직 커밋 및 테스트 실행**
  ```bash
  pnpm lint:check
  git add src/utils/workPerformanceFairness.ts
  git commit -m "feat: implement 4 metrics and fix boundary date filtering bugs in fairness calculator"
  ```

---

### Task 3: 단위 테스트 코드 보강 (TDD)

**Files:**

- Modify: `tests/unit/work-performance-fairness.spec.ts`

- [ ] **Step 1: 신규 4개 지표 및 경계 조건 테스트 작성**
      `tests/unit/work-performance-fairness.spec.ts`에 다음 테스트 케이스를 추가하고 실행합니다.
  - **테스트 A**: 주말 근무(`weekend`)와 공휴일 근무(`holiday`)가 완전히 독립적으로 분류 및 산출되는지 검증
  - **테스트 B**: Off 요청 전날(T-1) 야간 근무 배정 시 Off 수락 일수에서 완벽하게 차감 및 미수락 분류되는지 검증
  - **테스트 C**: 마지막 날(T) 야간 근무 배정 상태에서 다음 날(T+1)이 공휴일일 때 공휴일 근무로 정상 집계되는지 검증
  - **테스트 D**: 이전 달 확정 근무표가 존재하지 않는 엣지 케이스에서 런타임 오류 없이 T-1일 N 근무 없음으로 안전하게 폴백 동작하는지 검증

- [ ] **Step 2: 테스트 실행 및 통과 확인**
  ```bash
  pnpm test:unit tests/unit/work-performance-fairness.spec.ts
  ```
  결과: **PASS** 확인 후 커밋합니다.
  ```bash
  git add tests/unit/work-performance-fairness.spec.ts
  git commit -m "test: add robust unit tests for 4 metrics and critical date boundary edge cases"
  ```

---

### Task 4: Vue 뷰 컴포넌트 UI 개선

**Files:**

- Modify: `src/views/schedule/WorkPerformance.vue`

- [ ] **Step 1: 계산 기준 영역 및 헬퍼 정보 고도화**
  - `WorkPerformance.vue` 내 `metricKeys` 배열을 `['night', 'weekend', 'holiday', 'offRequestAccepted']`로 수정합니다.
  - 계산 기준 상세 카드 구조를 3개에서 **4개 카드**로 재배치하고, 각각에 매칭되는 한글 상세 가이드 및 툴팁 설명을 신규 집계 기준에 걸맞게 업데이트합니다.
  - 주말 근무 설명: "금요일 야간(N), 토요일 전체(D/E/N), 일요일 주간/이브닝(D/E) 근무 횟수입니다."
  - 공휴일 근무 설명: "공휴일 당일 주간/이브닝(D/E) 및 공휴일 전날 야간(N) 근무 횟수입니다."

- [ ] **Step 2: 직원별 근무 기록 비교 테이블 열 확장 및 정렬 연동**
  - 테이블 열 헤더 구조에 `weekend`와 `holiday` 열을 별도로 선언하고, 각 열 헤더마다 `changeSort` 트리거가 정상적으로 걸릴 수 있게 탭 버튼 및 `aria-sort` 상태를 분리 갱신합니다.
  - 직원별 행(`sortedRows`) 렌더링 시, 4개 열로 나누어 일수, 전체 평균, 평균 대비 차이(Signed delta) 정보와 차이 비교 그래픽 바(Visual Comparison Bar)가 올바르게 렌더링되도록 수정합니다.

- [ ] **Step 3: 상세 확인(Expanded Row) 날짜 렌더링 분리**
  - 특정 직원의 상세 보기 행을 펼쳤을 때 나타나는 증빙 날짜 카드 영역을 주말 근무와 공휴일 근무로 온전히 분리하여 각각의 날짜 목록(`evidenceDates`)이 요일/공휴일 태그와 함께 명확히 출력되도록 개편합니다.

- [ ] **Step 4: 뷰 컴포넌트 빌드 검증 및 커밋**
  ```bash
  pnpm lint:check
  pnpm run build
  git add src/views/schedule/WorkPerformance.vue
  git commit -m "feat: complete WorkPerformance view layout expansion to support 4 metrics"
  ```

---

## 검증 계획

### 1. 자동화 빌드 및 린트 검증

구현 완료 후 아래 검증 스크립트를 차례대로 기동하여 빌드 및 코드 컨벤션의 완전한 무결성을 입증합니다.

- `pnpm lint:check`
- `pnpm run build`

### 2. 시나리오 기반 수동 검증 계획

1. **야간 근무 집계 수동 교차 검증**:
   - 임의 직원의 야간 근무 횟수가 실제 근무표상 `'N'` 배정 일수와 정확히 일치하는지 증빙 날짜를 대조합니다.
2. **주말 및 공휴일 근무 분리 판정 검증**:
   - 금요일 야간(N), 토요일 D/E/N, 일요일 D/E 근무가 주말 근무에 포함되는지 확인합니다.
   - 신정(1/1) 등 공휴일 전날 야간(N) 및 당일 D/E 근무가 공휴일 근무로 정상 귀속되는지 증빙 날짜를 비교합니다.
3. **Off 요청 수락 엣지 케이스 검증**:
   - Off 신청일의 전날 야간(N) 근무가 있는 경우 수락 건수에서 차감(미수락)되는지 확인합니다.
   - 전날 야간 근무가 없고 당일에 휴무인 경우에만 수락 건수로 온전히 반영되는지 확인합니다.
