# Landing AI Preview Proof Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the public landing `ai` product preview so it still signals real large-hospital Excel schedule complexity, but reads faster and calmer by showing a smaller schedule sample plus a proof panel for constraints and expert guidance.

**Architecture:** Keep this as a presentation-only change inside the existing public landing components. `LandingProductPreview.vue` remains the only visual component touched; `publicLandingContent.ts` owns landing copy; `public-landing.spec.ts` and `public-launch.spec.ts` lock the trust signals, reduced visual scale, and responsive behavior. No schedule workflow, solver, store, route, or authenticated app behavior changes.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Tailwind CSS, Vitest with Vue Test Utils, Playwright.

---

## Product Decision

The current `ai` preview shows the real domain shape, but it makes the landing section too busy. The new direction is signal compression:

- Keep an in-component Excel-like schedule mock.
- Reduce the visible sample from `18 employees x 14 days + summary columns/footer` to approximately `12 employees x 10 days`.
- Remove the per-employee summary columns and large footer summary rows from the preview table.
- Add a compact proof panel that says what the product handles:
  - large-hospital schedule scale, using `30명 x 36일` as the MVP grid promise
  - D/E/N staffing requirements
  - Off request reflection
  - fairness/long-term balance checks
  - 현직 수간호사 자문 기준
- Make the first impression: "This is a real hospital schedule problem, and EveryShift has control over it."

## Not In Scope

- Do not wire a real AI solver.
- Do not change schedule generation app screens.
- Do not add organization/employee/shift CRUD.
- Do not change Step 3 or Step 5 behavior.
- Do not introduce new design tokens unless existing Tailwind utilities are insufficient.
- Do not add marketing-style decoration, hero imagery, gradient blobs, or card-heavy feature grids.

## File Structure

- Modify: `src/components/public/LandingProductPreview.vue`
  - Reduce the `variant === 'ai'` mock table.
  - Add the proof panel and scale note.
  - Keep the preview generated from structured arrays instead of static image assets.
  - Keep Korean user-facing text.
- Modify: `src/data/publicLandingContent.ts`
  - Rewrite the AI section copy so the headline emphasizes complex hospital scheduling, not just generic AI automation.
  - Add concise detail bullets if useful.
- Modify: `tests/unit/public-landing.spec.ts`
  - Update AI trust signal expectations.
  - Replace the large-table assertions with reduced-sample and proof-panel assertions.
  - Keep coverage that the mock is in-component, uses shift codes, highlights Off requests, and satisfies daily staffing counts.
- Modify: `tests/e2e/public-launch.spec.ts`
  - Add or extend a logged-out landing test for the AI value section on mobile/desktop so the new preview does not create horizontal page overflow.

## Target UX Shape

```text
┌─────────────────────────────────────────────────────────────────────┐
│ EveryShift                                             2026.04       │
├─────────────────────────────────────────────────────────────────────┤
│ 근무표 초안 미리보기                              대형병원 Excel 구조 │
│                                                                     │
│ ┌───────────────────────────────────────────────┐ ┌───────────────┐ │
│ │ 근무자 | 4/1 | 4/2 | ... | 4/10              │ │ 검토 기준      │ │
│ │ 김하늘 |  D  |  O  | ... |  N                │ │ 필요 인력 충족 │ │
│ │ 이서윤 |  E  |  D  | ... |  O                │ │ Off 요청 반영  │ │
│ │ ... 12명 표본 ...                            │ │ 공정성 점검    │ │
│ └───────────────────────────────────────────────┘ │ 수간호사 자문  │ │
│                                                   └───────────────┘ │
│ 표본 12명 x 10일 표시 · 실제 입력 흐름은 30명 x 36일 기준             │
└─────────────────────────────────────────────────────────────────────┘
```

## Korean Copy Direction

Use copy close to this, adjusting for fit during implementation:

- AI section nav label: `AI`
- AI section headline: `대형병원 근무표 조건까지 반영해 초안을 만듭니다`
- AI section description: `근무자, D/E/N, Off 요청, 필요 인력, 공정성 기준을 함께 계산합니다. 현직 수간호사 자문 기준으로 검토 흐름을 설계했습니다.`
- AI preview title: `근무표 초안 미리보기`
- AI preview chip: `대형병원 Excel 구조`
- Scale note: `표본 12명 x 10일 표시 · 실제 입력 흐름은 30명 x 36일 기준`
- Proof panel heading: `검토 기준`
- Proof items:
  - `D/E/N 필요 인력 충족`
  - `Off 요청 반영`
  - `야간·공휴일 균형 점검`
  - `현직 수간호사 자문 기준`

## Task 1: Update Unit Tests First

**Files:**

- Modify: `tests/unit/public-landing.spec.ts`

- [ ] **Step 1: Update AI trust signals**

Change `previewTrustSignals.ai` from the old generic labels to the new proof signals.

```ts
const previewTrustSignals: Record<
  Exclude<LandingPreviewVariant, 'overview' | 'compare'>,
  readonly string[]
> = {
  ai: ['근무표 초안 미리보기', '대형병원 Excel 구조', '30명 x 36일', '수간호사 자문'],
  fairness: ['근무자별 공정성 비교', '야간 근무', '주말·공휴일', '다음 생성 기준'],
  conditions: ['반영', '검토', '사유'],
  guide: ['보건복지부 가이드라인', '충족', 'NOD', '월 야간'],
};
```

- [ ] **Step 2: Replace the AI preview test expectations**

In `renders the AI preview as an in-component schedule mock instead of a static image`, keep the same test name unless a clearer name is preferred. Replace the old table-size and summary assertions with these expectations:

```ts
const proofPanel = wrapper.get('[data-test="landing-ai-proof-panel"]');
const proofItems = proofPanel.findAll('[data-test="landing-ai-proof-item"]');

expect(wrapper.find('[data-test="landing-schedule-preview-image"]').exists()).toBe(false);
expect(scheduleMock.exists()).toBe(true);
expect(scrollWrapper.classes()).toContain('overflow-x-auto');
expect(table.classes().some((className) => className.startsWith('min-w-'))).toBe(true);
expect(text).toContain('근무표 초안 미리보기');
expect(text).toContain('대형병원 Excel 구조');
expect(text).toContain('30명 x 36일');
expect(text).toContain('현직 수간호사 자문 기준');
expect(text).not.toContain('Excel 내보내기');
expect(text).not.toContain('생성 기준 요약');

expect(dateHeaders).toHaveLength(10);
dateHeaders.forEach((header) => {
  expect(header.text()).toMatch(/^\d{1,2}\/\d{1,2}$/);
});

expect(employeeCells).toHaveLength(12);
employeeCells.forEach((cell) => {
  expect(cell.text()).not.toMatch(/\d/);
});

expect(scheduleMock.findAll('[data-test="landing-ai-employee-summary-cell"]')).toHaveLength(0);
expect(scheduleMock.findAll('[data-test="landing-ai-summary-row"]')).toHaveLength(0);
expect(proofItems.length).toBeGreaterThanOrEqual(4);
```

- [ ] **Step 3: Keep daily staffing validation**

Keep the map-based validation that counts `D`, `E`, `N`, and `O` by day, but update the expected daily counts to match the new reduced preview data. Recommended preview requirements:

```ts
const expectedDailyCounts = {
  D: 3,
  E: 4,
  N: 3,
} as const;

(['D', 'E', 'N'] as const).forEach((code) => {
  dateHeaders.forEach((header) => {
    const dayId = header.attributes('data-day-id');
    const actualCount = shiftCellCountByDay.get(dayId)?.[code] ?? 0;

    expect(actualCount).toBe(expectedDailyCounts[code]);
  });
});
```

- [ ] **Step 4: Remove per-employee summary assertions**

Delete the block that expects each employee row total to be between 7 and 8 and checks `[data-test="landing-ai-employee-summary-cell"]`, because the new preview should not spend pixels on per-row summaries.

- [ ] **Step 5: Run the focused unit test and confirm it fails**

Run:

```bash
pnpm test:unit tests/unit/public-landing.spec.ts
```

Expected: FAIL because the proof panel and reduced table do not exist yet.

## Task 2: Update Landing Copy

**Files:**

- Modify: `src/data/publicLandingContent.ts`

- [ ] **Step 1: Update only the AI section copy**

Replace the first `publicLandingSections` item with copy that foregrounds the real scheduling problem and expert guidance.

```ts
{
  id: 'ai-schedule',
  navLabel: 'AI',
  headline: '대형병원 근무표 조건까지 반영해 초안을 만듭니다',
  description:
    '근무자, D/E/N, Off 요청, 필요 인력, 공정성 기준을 함께 계산합니다. 현직 수간호사 자문 기준으로 검토 흐름을 설계했습니다.',
  details: [
    '대형병원 Excel 근무표 구조를 제품 안에서 다룰 수 있게 설계',
    'Off 요청과 필요 인력을 함께 반영한 초안 생성',
    '수간호사 검토 흐름을 기준으로 결과 확인',
  ],
  preview: 'ai',
}
```

- [ ] **Step 2: Keep other landing sections unchanged**

Do not rewrite fairness, conditions, guide, or compare copy in this PR.

## Task 3: Rebuild the AI Preview Layout

**Files:**

- Modify: `src/components/public/LandingProductPreview.vue`

- [ ] **Step 1: Replace the top-level AI layout wrapper**

Change the `variant === 'ai'` block from a single table stack to a compact grid. Keep `data-test="landing-ai-schedule-mock"`.

Recommended structure:

```vue
<div
  v-if="variant === 'ai'"
  data-test="landing-ai-schedule-mock"
  class="p-4"
>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <p class="text-sm font-semibold text-gray-950">
        근무표 초안 미리보기
      </p>
      <p class="mt-1 text-xs leading-5 text-gray-500">
        표본 12명 x 10일 표시 · 실제 입력 흐름은 30명 x 36일 기준
      </p>
    </div>
    <span class="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      대형병원 Excel 구조
    </span>
  </div>

  <div class="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
    <!-- schedule table -->
    <!-- proof panel -->
  </div>
</div>
```

- [ ] **Step 2: Remove summary columns and footer rows from the AI table**

In the AI table:

- Keep sticky `근무자` column.
- Keep day headers.
- Keep shift cells.
- Remove the `v-for="code in aiSummaryCodes"` header columns.
- Remove row-level summary cells.
- Remove the `<tfoot>` daily summary rows.
- Reduce table min width from `min-w-[1120px]` to approximately `min-w-[680px]` or `min-w-[720px]`.

- [ ] **Step 3: Add the proof panel**

Add a sibling panel next to the table.

```vue
<aside data-test="landing-ai-proof-panel" class="rounded-md border border-gray-200 bg-gray-50 p-3">
  <p class="text-xs font-semibold text-gray-500">
    검토 기준
  </p>
  <div class="mt-3 grid gap-2">
    <div
      v-for="item in aiProofItems"
      :key="item.id"
      data-test="landing-ai-proof-item"
      class="rounded-md bg-white px-3 py-2"
    >
      <p class="text-xs font-semibold text-gray-950">
        {{ item.title }}
      </p>
      <p class="mt-1 text-xs leading-5 text-gray-600">
        {{ item.description }}
      </p>
    </div>
  </div>
</aside>
```

- [ ] **Step 4: Add `aiProofItems` data**

Add the interface and const near the other AI preview types/data.

```ts
interface AiProofItem {
  id: string;
  title: string;
  description: string;
}

const aiProofItems: readonly AiProofItem[] = [
  {
    id: 'staffing',
    title: 'D/E/N 필요 인력 충족',
    description: '일자별 필요 인력을 먼저 맞춘 뒤 배정을 검토합니다.',
  },
  {
    id: 'off-requests',
    title: 'Off 요청 반영',
    description: '사전 요청일은 표 안에서 바로 확인할 수 있게 표시합니다.',
  },
  {
    id: 'fairness',
    title: '야간·공휴일 균형 점검',
    description: '한 달 결과만이 아니라 누적 편차를 함께 봅니다.',
  },
  {
    id: 'expert-review',
    title: '현직 수간호사 자문 기준',
    description: '실제 검토자가 확인하는 순서에 맞춰 흐름을 설계했습니다.',
  },
];
```

## Task 4: Compress the AI Mock Data

**Files:**

- Modify: `src/components/public/LandingProductPreview.vue`

- [ ] **Step 1: Reduce visible days to 10**

Change `aiScheduleDays` to `4/1` through `4/10`.

- [ ] **Step 2: Reduce visible employees to 12**

Keep the first 12 employees or pick a representative 12-name sample. The sample should remain realistic Korean names without numeric IDs in visible cells.

- [ ] **Step 3: Keep daily staffing requirements as a meaningful hospital-like constraint**

Recommended:

```ts
const aiDailyStaffingRequirement: AiStaffingRequirement = {
  D: 3,
  E: 4,
  N: 3,
};
```

With 12 employees, this leaves room for Off cells while still making the table feel constrained.

- [ ] **Step 4: Update Off request keys**

Keep several Off request examples within the visible 10-day range only.

```ts
const aiOffRequestCellKeys = new Set<string>([
  'employee-kim-haneul:day-apr-03',
  'employee-choi-yujin:day-apr-05',
  'employee-han-jimin:day-apr-07',
  'employee-lim-subin:day-apr-09',
]);
```

- [ ] **Step 5: Remove unused AI summary helpers**

After removing summary columns/footer, delete now-unused code:

- `AiSummaryCode`
- `AiEmployeeShiftSummary`
- `AiDailyStaffingSummaryCell`
- `AiDailyStaffingSummaryRow`
- `aiSummaryCodes`
- `aiDailySummaryCodes`
- `buildEmptyAiEmployeeShiftSummary`
- `buildEmployeeShiftSummary`
- `buildDailySummaryValues`
- `buildDailyStaffingSummary`
- `employeeShiftSummary`
- `dailyStaffingSummary`
- `getAiEmployeeSummaryValue`

Keep only the scheduling row generator and the shift-code helpers needed by the table.

## Task 5: Add Responsive E2E Coverage

**Files:**

- Modify: `tests/e2e/public-launch.spec.ts`

- [ ] **Step 1: Add a mobile AI preview overflow test**

Add a logged-out test that scrolls to the AI section and checks the document does not overflow horizontally.

```ts
test('logged-out mobile landing keeps the AI preview contained', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().clearCookies();
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/#ai-schedule');

  const section = page.locator('#ai-schedule');
  await expect(section.getByTestId('landing-ai-schedule-mock')).toBeVisible();
  await expect(section.getByTestId('landing-ai-proof-panel')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );

  expect(hasHorizontalOverflow).toBe(false);
});
```

- [ ] **Step 2: Add a desktop proof signal test only if the mobile test is not enough**

This is optional. Do it only if the implementation changes the desktop layout in a way that unit tests cannot catch.

## Task 6: Verify the Focused Change

**Files:**

- No additional files.

- [ ] **Step 1: Run the focused unit test**

Run:

```bash
pnpm test:unit tests/unit/public-landing.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run the focused E2E test file**

Run:

```bash
pnpm test:e2e -- tests/e2e/public-launch.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm lint:check
```

Expected: no ESLint errors.

- [ ] **Step 4: Run build**

Run:

```bash
pnpm run build
```

Expected: successful `vue-tsc` and Vite production build.

## Task 7: Visual QA

**Files:**

- No additional files unless fixes are found.

- [ ] **Step 1: Start the local app**

Run:

```bash
pnpm dev
```

- [ ] **Step 2: Open the public landing page**

Use the browser tool or gstack browse at the dev URL, usually:

```text
http://127.0.0.1:5173/
```

- [ ] **Step 3: Inspect desktop**

At `1440 x 900`, verify:

- The AI section reads as a product proof point, not a full working grid.
- The schedule sample and proof panel align in one row.
- The proof panel is not visually louder than the schedule sample.
- The `30명 x 36일` scale note is visible without requiring table interpretation.
- No nested-card clutter appears.

- [ ] **Step 4: Inspect mobile**

At `390 x 844`, verify:

- The section does not create page-level horizontal overflow.
- Only the table itself scrolls horizontally if needed.
- Proof items stack below or above the table cleanly.
- Text does not overlap or truncate awkwardly.

- [ ] **Step 5: Fix any visual issues and rerun checks**

If visual fixes touch `.vue` or `.ts`, rerun:

```bash
pnpm test:unit tests/unit/public-landing.spec.ts
pnpm lint:check
pnpm run build
```

## Acceptance Criteria

- The `ai` preview no longer presents a large full-width operational table as the main visual burden.
- The preview still unmistakably communicates a real hospital schedule grid, not a generic AI dashboard.
- The visible table is around `12 employees x 10 days`.
- The UI explicitly says the actual flow handles `30명 x 36일`.
- The proof panel includes staffing requirements, Off requests, fairness, and 현직 수간호사 자문 기준.
- Korean user-facing text is polished and concise.
- `tests/unit/public-landing.spec.ts` passes.
- `tests/e2e/public-launch.spec.ts` passes or any skipped E2E reason is documented.
- `pnpm lint:check` passes.
- `pnpm run build` passes.

## Commit Guidance

Use one commit for this scoped change:

```bash
git add src/components/public/LandingProductPreview.vue src/data/publicLandingContent.ts tests/unit/public-landing.spec.ts tests/e2e/public-launch.spec.ts
git commit -m "refine landing ai preview proof panel"
```

Do not include unrelated local changes.
