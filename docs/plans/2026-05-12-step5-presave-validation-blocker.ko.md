# Step5 Pre-Save Validation Blocker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step5 결과 화면에서 수동 수정한 근무표를 저장하기 전에 현재 화면 grid 기준 로컬 검증을 실행하고, 가이드라인 확인 필요/위반 또는 인력 부족이 있으면 저장 dialog와 저장 API 호출을 차단한다.

**Architecture:** `Step5Result.vue`의 기존 live `complianceResult`를 저장 전 blocker의 가이드라인 입력으로 재사용한다. 서버 평가 snapshot은 안내 패널에만 남기고, 저장 차단용 staffing shortfall은 `grid.assignments.value`, `grid.dates.value`, `grid.employees.value`, `scheduleStore.siteRequirements`로 현재월 날짜만 다시 계산한다.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Pinia store mocks, Vitest, Vue Test Utils, Naive UI discrete dialog/message mocks.

---

## Scope

이번 변경은 Step5 frontend pre-save blocker만 다룬다.

- Server API 변경 없음
- DB schema 변경 없음
- `reviewAttentionSummary` / `reviewAttentionMessages` 표시 로직 변경 없음
- 저장 전 차단만 추가
- `weeklyHoursViolations`는 현재 server engine에서 항상 0이므로 저장 전 blocker 계산 대상에서 제외
- 서버 stale `latestEvaluation.proofSummary.staffingShortfalls`는 저장 차단에 사용하지 않음

## File Structure

**Modify: `src/views/schedule/Step5Result.vue`**

- `handleSave()`에 저장 전 validation gate 추가
- `complianceResult` 기반 저장 차단 메시지 helper 추가
- 현재 화면 grid 기준 staffing shortfall 계산 helper 추가
- 기존 저장 dialog/API 흐름은 validation 통과 후 그대로 유지

**Modify: `tests/unit/step5-result.spec.ts`**

- Step5 save regression tests 추가/보강
- 수동 수정 후 저장 버튼 클릭 시 dialog/API 호출 여부와 `showInfo` 메시지 검증
- stale server staffing shortfall이 저장 차단에 쓰이지 않는지 검증

## Design Details

### Validation Order

저장 전 차단 우선순위는 아래 순서로 고정한다.

1. `complianceResult.value.checkRequiredCount > 0`
2. `complianceResult.value.mandatoryViolationCount > 0`
3. 현재 grid 기준 staffing shortfall count `> 0`

첫 번째로 걸린 blocker만 사용자에게 표시한다.

### User Messages

정확히 아래 문구를 사용한다.

```ts
'보건복지부 가이드라인을 확인한 뒤 저장할 수 있습니다.'`보건복지부 가이드라인 위반 ${mandatoryViolationCount}건을 해결한 뒤 저장할 수 있습니다.``인력 부족 ${staffingShortfallCount}건이 있어 저장할 수 없습니다. 배정을 수정한 뒤 다시 저장해주세요.`;
```

### Staffing Shortfall Semantics

`staffingShortfallCount`는 부족 인원 수 합계가 아니라, 서버의 `staffingShortfalls`와 같은 의미로 "날짜 + 근무 shift 조합별 부족 건수"로 센다.

예:

- 2025-12-01 D 필요 2명, 배정 1명: 1건
- 2025-12-01 N 필요 1명, 배정 0명: 1건
- 총 부족 인원은 2명이어도 shortfall count는 2건

### Staffing Input Rules

- 대상 날짜는 `grid.dates.value` 중 현재월이고 `isLastMonth !== true`인 날짜만 사용한다.
- 전월 표시 row는 staffing pre-save 계산에서 제외한다.
- 빈 셀, `''`, 공백, `null`에 준하는 값은 근무 배정 없음으로 본다.
- `O`는 Off로 취급하고 staffing 배정 수에 포함하지 않는다.
- `siteRequirements`의 `requiredCount <= 0`은 제외한다.
- `shiftCode`는 `trim().toUpperCase()`로 비교한다.
- `dayOfWeek`는 기존 코드와 맞춰 `new Date(`${date}T00:00:00`).getDay()` 또는 `dayjs(date).day()` 중 하나를 사용한다. 이 파일은 이미 `dayjs`를 import하므로 `dayjs(date).day()`를 권장한다.
- `organizationStore.shifts`는 요구사항에는 언급되어 있지만, count 계산에는 site requirement의 `shiftCode`와 grid assignment의 shift code 비교만 있으면 충분하다. 저장 API payload 변환은 기존 `organizationStore.shifts.find((s) => s.code === shiftCode)` 흐름을 유지한다.

## Task 1: Add Failing Save Blocker Tests

**Files:**

- Modify: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Add a helper for auto-confirming save dialogs**

기존 save test의 local `dialogInfoMock` 패턴을 재사용하거나 아래 helper를 test file 안에 추가한다.

```ts
function installAutoConfirmDialog() {
  const dialogInfoMock = vi.fn((options: { onPositiveClick?: () => Promise<void> | void }) => {
    options.onPositiveClick?.();
  });

  (window as unknown as { $dialog?: Record<string, unknown> }).$dialog = {
    info: dialogInfoMock,
    warning: vi.fn(),
  };

  return dialogInfoMock;
}
```

- [ ] **Step 2: Add test for guideline violation save blocker**

테스트 의도: 수동 수정 후 현재 화면 기준 `mandatoryViolationCount > 0`이면 저장 dialog가 뜨지 않고 저장 API도 호출되지 않는다.

권장 fixture:

- `mockSingleFinalizeReview()` 또는 기존 preview-version save fixture 사용
- `grid.dates.value`를 `2025-12-01`, `2025-12-02`, `2025-12-03`으로 구성
- 현재 grid 배정을 `N`, `O`, `D`로 구성해 NOD 위반을 만들기
- 변경 상태는 grid edit event 또는 직접 수동 수정 흐름으로 만든다

Expected assertions:

```ts
expect(showInfoMock).toHaveBeenCalledWith(
  '보건복지부 가이드라인 위반 1건을 해결한 뒤 저장할 수 있습니다.'
);
expect(dialogInfoMock).not.toHaveBeenCalled();
expect(patchPhase2ScheduleVersionAssignmentsMock).not.toHaveBeenCalled();
```

- [ ] **Step 3: Add test for staffing shortfall save blocker**

테스트 의도: 수동 수정 후 현재 화면 기준 staffing이 부족하면 저장 dialog가 뜨지 않고 `patchPhase2ScheduleVersionAssignments`가 호출되지 않는다.

권장 fixture:

```ts
scheduleStoreMock.siteRequirements = [
  {
    dayOfWeek: 1,
    dayName: '월요일',
    shiftCode: 'D',
    requiredCount: 2,
  },
];

gridMock.employees.value = [
  { id: 'emp-1', employeeId: 'emp-1', name: 'Kim' },
  { id: 'emp-2', employeeId: 'emp-2', name: 'Lee' },
];

gridMock.dates.value = [
  { date: '2025-11-30', isLastMonth: true },
  { date: '2025-12-01', isLastMonth: false },
];
```

현재월 `2025-12-01`에는 D 1명만 배정한다. 전월 `2025-11-30`에 D가 있어도 staffing 계산에서는 제외되어야 한다.

Expected assertions:

```ts
expect(showInfoMock).toHaveBeenCalledWith(
  '인력 부족 1건이 있어 저장할 수 없습니다. 배정을 수정한 뒤 다시 저장해주세요.'
);
expect(dialogInfoMock).not.toHaveBeenCalled();
expect(patchPhase2ScheduleVersionAssignmentsMock).not.toHaveBeenCalled();
```

- [ ] **Step 4: Add test for successful save when guideline and staffing both pass**

기존 `"saves manual changes through preview-version patch route"` 테스트를 유지하되, `scheduleStoreMock.siteRequirements`를 명시적으로 통과 상태로 설정한다.

```ts
scheduleStoreMock.siteRequirements = [
  {
    dayOfWeek: 1,
    dayName: '월요일',
    shiftCode: 'D',
    requiredCount: 1,
  },
];
```

Expected assertions:

```ts
expect(dialogInfoMock).toHaveBeenCalledTimes(1);
expect(patchPhase2ScheduleVersionAssignmentsMock).toHaveBeenCalledTimes(1);
```

- [ ] **Step 5: Add test that stale server staffing does not block save**

테스트 의도: `latestEvaluation.proofSummary.staffingShortfalls = 1`과 `violationDetails`의 `staffing_shortfall`이 남아 있어도 현재 grid staffing이 통과하면 저장은 차단되지 않는다.

권장 fixture:

- `createReviewResponse('version-1', { latestEvaluation: { proofSummary: { staffingShortfalls: 1, weeklyHoursViolations: 0, ... }, violationDetails: [{ code: 'staffing_shortfall', ... }] } })`
- `scheduleStoreMock.siteRequirements`는 `D requiredCount: 1`
- 현재월 grid에는 D 1명 배정
- 저장 dialog는 auto-confirm

Expected assertions:

```ts
expect(dialogInfoMock).toHaveBeenCalledTimes(1);
expect(patchPhase2ScheduleVersionAssignmentsMock).toHaveBeenCalledTimes(1);
expect(showInfoMock).not.toHaveBeenCalledWith(
  '인력 부족 1건이 있어 저장할 수 없습니다. 배정을 수정한 뒤 다시 저장해주세요.'
);
```

- [ ] **Step 6: Run targeted tests and confirm they fail before implementation**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts -t "save|staffing|guideline"
```

Expected:

- New blocker tests fail because `handleSave()` still opens the save dialog/API without pre-save validation.

## Task 2: Implement Pre-Save Validation Helpers

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`

- [ ] **Step 1: Add a small type alias near existing local interfaces**

Add near `Step5SummaryCard` or another local type block:

```ts
interface StaffingRequirementForSave {
  dayOfWeek: number;
  shiftCode: string;
  requiredCount: number;
}
```

- [ ] **Step 2: Add normalization helper**

Place near existing assignment/compliance helper functions.

```ts
function normalizeShiftCodeForCount(value: string | null | undefined): string {
  return value?.trim().toUpperCase() ?? '';
}
```

- [ ] **Step 3: Add current-month date helper for staffing**

Use `grid.dates.value`, not server review data.

```ts
function getCurrentMonthStaffingDates(): string[] {
  const month = scheduleStore.basicInfo?.month;
  if (!month) {
    return [];
  }

  return grid.dates.value
    .filter((dateColumn) => !dateColumn.isLastMonth && dateColumn.date.startsWith(month))
    .map((dateColumn) => dateColumn.date)
    .sort();
}
```

- [ ] **Step 4: Add staffing shortfall counter**

```ts
function countCurrentGridStaffingShortfalls(): number {
  const currentMonthDates = getCurrentMonthStaffingDates();
  if (currentMonthDates.length === 0) {
    return 0;
  }

  const requirements = (scheduleStore.siteRequirements || []) as StaffingRequirementForSave[];
  if (requirements.length === 0) {
    return 0;
  }

  const relevantShiftCodes = new Set(
    requirements
      .map((requirement) => normalizeShiftCodeForCount(requirement.shiftCode))
      .filter(Boolean)
  );

  const assignedCountByDateShift = new Map<string, number>();

  for (const employee of grid.employees.value) {
    const dateMap = grid.assignments.value[employee.id] || {};

    for (const date of currentMonthDates) {
      const shiftCode = normalizeShiftCodeForCount(dateMap[date]);
      if (!shiftCode || shiftCode === 'O' || !relevantShiftCodes.has(shiftCode)) {
        continue;
      }

      const key = `${date}_${shiftCode}`;
      assignedCountByDateShift.set(key, (assignedCountByDateShift.get(key) ?? 0) + 1);
    }
  }

  let shortfallCount = 0;
  for (const requirement of requirements) {
    const requiredCount = Number(requirement.requiredCount);
    const shiftCode = normalizeShiftCodeForCount(requirement.shiftCode);

    if (
      !Number.isFinite(requiredCount) ||
      requiredCount <= 0 ||
      !shiftCode ||
      requirement.dayOfWeek < 0 ||
      requirement.dayOfWeek > 6
    ) {
      continue;
    }

    for (const date of currentMonthDates) {
      if (dayjs(date).day() !== requirement.dayOfWeek) {
        continue;
      }

      const assignedCount = assignedCountByDateShift.get(`${date}_${shiftCode}`) ?? 0;
      if (assignedCount < requiredCount) {
        shortfallCount += 1;
      }
    }
  }

  return shortfallCount;
}
```

Notes:

- This intentionally does not read `review.value?.latestEvaluation`.
- This intentionally excludes previous-month display dates.
- This treats blank cells as no assignment for staffing.

- [ ] **Step 5: Add pre-save message helper**

```ts
function getPreSaveBlockMessage(): string | null {
  const { checkRequiredCount, mandatoryViolationCount } = complianceResult.value;

  if (checkRequiredCount > 0) {
    return '보건복지부 가이드라인을 확인한 뒤 저장할 수 있습니다.';
  }

  if (mandatoryViolationCount > 0) {
    return `보건복지부 가이드라인 위반 ${mandatoryViolationCount}건을 해결한 뒤 저장할 수 있습니다.`;
  }

  const staffingShortfallCount = countCurrentGridStaffingShortfalls();
  if (staffingShortfallCount > 0) {
    return `인력 부족 ${staffingShortfallCount}건이 있어 저장할 수 없습니다. 배정을 수정한 뒤 다시 저장해주세요.`;
  }

  return null;
}
```

## Task 3: Wire the Blocker into `handleSave()`

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`

- [ ] **Step 1: Insert blocker after `changedCells` check**

In `handleSave()`, keep the existing editability and no-change guards first.

Change this area:

```ts
if (changedCells.value.size === 0) {
  showInfo('변경사항이 없습니다');
  return;
}

window.$dialog?.info({
```

to:

```ts
if (changedCells.value.size === 0) {
  showInfo('변경사항이 없습니다');
  return;
}

const preSaveBlockMessage = getPreSaveBlockMessage();
if (preSaveBlockMessage) {
  showInfo(preSaveBlockMessage);
  return;
}

window.$dialog?.info({
```

- [ ] **Step 2: Do not change the existing dialog/API body**

The existing `window.$dialog?.info({ ... onPositiveClick ... patchPhase2ScheduleVersionAssignments ... })` block should remain behaviorally unchanged.

- [ ] **Step 3: Run targeted tests**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts -t "save|staffing|guideline"
```

Expected:

- All targeted save/staffing/guideline tests pass.

## Task 4: Full Regression Verification

**Files:**

- Verify only; no additional file edits unless tests reveal failures.

- [ ] **Step 1: Run full Step5 unit test file**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts
```

Expected:

- All tests in `tests/unit/step5-result.spec.ts` pass.

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint:check
```

Expected:

- ESLint passes with no errors.

- [ ] **Step 3: Run production build**

Run:

```bash
pnpm run build
```

Expected:

- TypeScript/Vite build completes successfully.

## Task 5: Final Review Checklist

Before final response or commit, verify:

- [ ] `handleSave()` blocks before `window.$dialog?.info`
- [ ] Blocked guideline check-required save shows `보건복지부 가이드라인을 확인한 뒤 저장할 수 있습니다.`
- [ ] Blocked guideline violation save shows `보건복지부 가이드라인 위반 N건을 해결한 뒤 저장할 수 있습니다.`
- [ ] Blocked staffing save shows `인력 부족 N건이 있어 저장할 수 없습니다. 배정을 수정한 뒤 다시 저장해주세요.`
- [ ] `patchPhase2ScheduleVersionAssignments` is not called in blocker cases
- [ ] Stale server `staffingShortfalls` does not block when current grid staffing passes
- [ ] Previous-month display dates are excluded from staffing pre-save calculation
- [ ] Empty current-month cells are Off for compliance but no assignment for staffing
- [ ] No server API or DB schema files changed
- [ ] Existing `reviewAttentionSummary` / `reviewAttentionMessages` behavior remains display-only

## Commit Guidance

Use one focused commit after verification passes:

```bash
git add src/views/schedule/Step5Result.vue tests/unit/step5-result.spec.ts
git commit -m "fix: block invalid step5 manual saves"
```

Do not include unrelated local changes in the commit.
