# Schedule Navigation UX Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the current mixed dashboard/wizard navigation into clearer setup-vs-generation paths so Step2/Step3 stop feeling like forced wizard steps when opened from the dashboard, while Step4/Step5 keep a clear monthly schedule workflow.

**Architecture:** Keep the existing routes, but introduce an explicit entry-mode contract so the same Step2/Step3 pages can render either as standalone setup editors (`setup`) or wizard steps (`wizard`) without relying on implicit `from=dashboard` behavior. Reframe the dashboard around two mental models: recurring organization setup work and month-specific schedule generation work. Tighten page copy, CTA labels, and router guard rules so the UI communicates scope clearly and no longer suggests a single linear flow when the user is actually editing shared defaults.

**Tech Stack:** Vue 3, TypeScript, Vue Router, Pinia, Naive UI, Vitest

---

## File Map

- Create: `src/utils/scheduleEntryMode.ts`
  - Centralize parsing/building of `setup` vs `wizard` route mode so page logic and guards stop duplicating ad hoc query checks.
- Modify: `src/views/Dashboard.vue`
  - Reframe the dashboard into “운영 준비” and “월별 근무표 작업”.
  - Change checklist/deep-link behavior so Step2/Step3 open in setup mode, not pseudo-wizard mode.
- Modify: `src/components/ops/PilotChecklistCard.vue`
  - Update supporting copy so checklist items read like preparation tasks, not wizard steps.
- Modify: `src/components/schedule/StepIndicator.vue`
  - Fix inaccurate labels and allow hiding or softening the indicator when a page is in setup mode.
- Modify: `src/views/schedule/Step1BasicInfo.vue`
  - Ensure Step1 always enters downstream pages in wizard mode.
- Modify: `src/views/schedule/Step2SiteInfo.vue`
  - Add standalone setup-mode header/copy/CTA behavior.
  - Stop implying that this page is always part of the current month’s wizard.
- Modify: `src/views/schedule/Step3EmployeeInfo.vue`
  - Mirror Step2 setup-mode behavior and clarify org-wide impact before save.
- Modify: `src/views/schedule/Step4InitialData.vue`
  - Clarify that this is the handoff from inputs to result review.
  - Rename CTA copy away from generic “다음 단계”.
- Modify: `src/views/schedule/Step5Result.vue`
  - Rename the back action from generic “이전” to a purpose-driven “입력 수정”.
- Modify: `src/router/guards.ts`
  - Let setup-mode Step2/Step3 open from the dashboard without fake Step1 month context while keeping wizard progression rules intact.
- Modify: `tests/unit/dashboard.spec.ts`
  - Lock the new dashboard segmentation and setup-mode deep links.
- Modify: `tests/unit/router-guards.spec.ts`
  - Cover setup-mode access vs wizard-mode gating.
- Modify: `tests/unit/step1-basic-info.spec.ts`
  - Verify Step1 forwards wizard mode to Step2.
- Modify: `tests/unit/step2-site-info.spec.ts`
  - Cover setup-mode copy, hidden wizard affordances, and save/close behavior.
- Modify: `tests/unit/step3-employee-info.spec.ts`
  - Cover setup-mode copy, return behavior, and explicit impact messaging.
- Modify: `tests/unit/step4-initial-data.spec.ts`
  - Cover renamed CTA copy and wizard handoff wording.
- Modify: `tests/unit/step5-result.spec.ts`
  - Cover renamed back CTA and copy that explains when the user should go back.
- Create: `tests/unit/schedule-entry-mode.spec.ts`
  - Unit-test the new entry-mode utility so query semantics stay stable.

## UX Decisions To Implement

- Treat `OrganizationProfileSetup`, `OffRequestPolicySetup`, `Step2SiteInfo`, and `Step3EmployeeInfo` as **setup surfaces** when entered from the dashboard.
- Treat `Step1BasicInfo`, `Step4InitialData`, and `Step5Result` as the **month-specific generation flow**.
- Remove ambiguous language such as “이 단계는 저장만 해도 되고, 바로 다음 단계로 이어서 진행할 수도 있습니다.”
- Replace generic CTAs with intent-specific labels:
  - Step2 setup mode: `저장`, `저장 후 직원 정보로 이동`, `대시보드로 돌아가기`
  - Step3 setup mode: `저장`, `저장 후 근무표 생성 시작`, `대시보드로 돌아가기`
  - Step4 wizard mode: `임시 저장`, `결과 확인으로 이동`
  - Step5 result mode: `입력 수정`
- Show a scope banner on Step2/Step3 setup mode:
  - “이 설정은 이번 달만이 아니라 조직의 기본값에 적용됩니다.”
- Keep YAGNI boundaries:
  - Do not add new routes.
  - Do not move Step2/Step3 into new pages yet.
  - Do not rewrite the schedule store shape unless the guard logic truly requires it.

## Implementation Notes

- Use a typed query contract instead of scattered string literals:

```ts
export type ScheduleEntryMode = 'wizard' | 'setup';

export function normalizeScheduleEntryMode(value: unknown): ScheduleEntryMode {
  return value === 'setup' ? 'setup' : 'wizard';
}

export function buildScheduleEntryQuery(
  mode: ScheduleEntryMode
): Record<string, string> | undefined {
  return mode === 'wizard' ? undefined : { entry: mode };
}
```

- Wizard mode should remain strict:
  - Step1 required before Step2
  - Step2 data required before Step3
  - Employees required before Step4
- Setup mode should rely on organization context, not fake monthly context seeded from “next month”.
- Step2/Step3 page headers should branch by mode:

```ts
const entryMode = computed(() => normalizeScheduleEntryMode(route.query.entry));
const isSetupEntry = computed(() => entryMode.value === 'setup');

const pageTitle = computed(() =>
  isSetupEntry.value ? '운영 준비 - 사이트 기준 설정' : '근무표 생성 - 요일별 인력 설정'
);
```

- Step indicator should be absent in setup mode:

```vue
<StepIndicator v-if="!isSetupEntry" :current-step="2" />
```

- Update Step5 back copy without changing the actual navigation target:

```vue
<n-button size="medium" @click="handleBack">
  입력 수정
</n-button>
```

### Task 1: Lock Entry-Mode Semantics In Tests

**Files:**

- Create: `tests/unit/schedule-entry-mode.spec.ts`
- Modify: `tests/unit/dashboard.spec.ts`
- Modify: `tests/unit/router-guards.spec.ts`
- Test: `tests/unit/schedule-entry-mode.spec.ts`
- Test: `tests/unit/dashboard.spec.ts`
- Test: `tests/unit/router-guards.spec.ts`

- [ ] **Step 1: Write the failing utility tests**

```ts
import { normalizeScheduleEntryMode, buildScheduleEntryQuery } from '@/utils/scheduleEntryMode';

expect(normalizeScheduleEntryMode(undefined)).toBe('wizard');
expect(normalizeScheduleEntryMode('setup')).toBe('setup');
expect(buildScheduleEntryQuery('wizard')).toBeUndefined();
expect(buildScheduleEntryQuery('setup')).toEqual({ entry: 'setup' });
```

- [ ] **Step 2: Write the failing dashboard deep-link assertions**

```ts
expect(pushMock).toHaveBeenCalledWith({
  path: '/schedule/step2',
  query: { entry: 'setup' },
});

expect(pushMock).toHaveBeenCalledWith({
  path: '/schedule/step3',
  query: { entry: 'setup' },
});
```

- [ ] **Step 3: Write the failing router-guard assertions**

```ts
await stepProgressGuard(
  { path: '/schedule/step2', query: { entry: 'setup' } } as never,
  {} as never,
  nextMock
);

expect(nextMock).toHaveBeenCalledWith();
expect(showWarningMock).not.toHaveBeenCalled();
```

- [ ] **Step 4: Run tests to verify they fail**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-entry-mode.spec.ts tests/unit/dashboard.spec.ts tests/unit/router-guards.spec.ts
```

Expected:

```text
FAIL tests/unit/schedule-entry-mode.spec.ts
FAIL tests/unit/dashboard.spec.ts
FAIL tests/unit/router-guards.spec.ts
```

- [ ] **Step 5: Commit the red tests**

```bash
git add tests/unit/schedule-entry-mode.spec.ts tests/unit/dashboard.spec.ts tests/unit/router-guards.spec.ts
git commit -m "test: capture schedule entry mode semantics"
```

### Task 2: Implement Entry-Mode Plumbing

**Files:**

- Create: `src/utils/scheduleEntryMode.ts`
- Modify: `src/views/Dashboard.vue`
- Modify: `src/views/schedule/Step1BasicInfo.vue`
- Modify: `src/router/guards.ts`
- Test: `tests/unit/schedule-entry-mode.spec.ts`
- Test: `tests/unit/dashboard.spec.ts`
- Test: `tests/unit/router-guards.spec.ts`

- [ ] **Step 1: Add the entry-mode utility**

```ts
export type ScheduleEntryMode = 'wizard' | 'setup';

export function normalizeScheduleEntryMode(value: unknown): ScheduleEntryMode {
  return value === 'setup' ? 'setup' : 'wizard';
}

export function isSetupEntryMode(value: unknown): boolean {
  return normalizeScheduleEntryMode(value) === 'setup';
}

export function buildScheduleEntryQuery(mode: ScheduleEntryMode) {
  return mode === 'setup' ? { entry: 'setup' } : undefined;
}
```

- [ ] **Step 2: Update dashboard shortcuts to use setup mode for setup surfaces**

```ts
if (item.route === '/schedule/step2' || item.route === '/schedule/step3') {
  await router.push({
    path: item.route,
    query: buildScheduleEntryQuery('setup'),
  });
  return;
}
```

- [ ] **Step 3: Update Step1 to push wizard mode explicitly**

```ts
router.push({
  path: '/schedule/step2',
  query: buildScheduleEntryQuery('wizard'),
});
```

- [ ] **Step 4: Split guard behavior by entry mode**

```ts
const isSetupEntry = isSetupEntryMode(to.query.entry);

if (to.path === '/schedule/step2' && isSetupEntry) {
  next();
  return;
}

if (to.path === '/schedule/step3' && isSetupEntry) {
  next();
  return;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-entry-mode.spec.ts tests/unit/dashboard.spec.ts tests/unit/router-guards.spec.ts
```

Expected:

```text
PASS tests/unit/schedule-entry-mode.spec.ts
PASS tests/unit/dashboard.spec.ts
PASS tests/unit/router-guards.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/utils/scheduleEntryMode.ts src/views/Dashboard.vue src/views/schedule/Step1BasicInfo.vue src/router/guards.ts tests/unit/schedule-entry-mode.spec.ts tests/unit/dashboard.spec.ts tests/unit/router-guards.spec.ts
git commit -m "feat: add explicit schedule entry mode"
```

### Task 3: Reframe Step2 As A Setup Surface When Opened From Dashboard

**Files:**

- Modify: `src/views/schedule/Step2SiteInfo.vue`
- Modify: `src/components/schedule/StepIndicator.vue`
- Modify: `tests/unit/step2-site-info.spec.ts`
- Create or Modify: `tests/unit/step-indicator.spec.ts`
- Test: `tests/unit/step2-site-info.spec.ts`
- Test: `tests/unit/step-indicator.spec.ts`

- [ ] **Step 1: Write the failing Step2 setup-mode assertions**

```ts
routeQueryMock.entry = 'setup';

expect(wrapper.text()).toContain('운영 준비');
expect(wrapper.text()).toContain('이 설정은 이번 달만이 아니라 조직의 기본값에 적용됩니다.');
expect(wrapper.text()).toContain('대시보드로 돌아가기');
expect(wrapper.text()).not.toContain('이전');
expect(wrapper.text()).not.toContain('이 단계는 저장만 해도 되고');
expect(wrapper.findComponent({ name: 'StepIndicator' }).exists()).toBe(false);
```

- [ ] **Step 2: Write the failing Step indicator copy assertions**

```ts
expect(wrapper.text()).toContain('사이트 기준');
expect(wrapper.text()).toContain('직원 기준');
expect(wrapper.text()).toContain('오프 입력');
expect(wrapper.text()).toContain('결과 검토');
```

- [ ] **Step 3: Implement setup-mode title, banner, and CTA behavior**

```ts
const pageTitle = computed(() =>
  isSetupEntry.value ? '운영 준비 - 사이트 기준 설정' : '근무표 생성 - 요일별 인력 설정'
);

function handleClose() {
  if (hasChanges.value) {
    showInfo('변경된 데이터가 있습니다. 저장 후 이동하세요.');
    return;
  }

  scheduleStore.reset();
  router.push('/');
}
```

```vue
<n-alert v-if="isSetupEntry" type="warning" class="mb-4">
  이 설정은 이번 달만이 아니라 조직의 기본값에 적용됩니다.
</n-alert>
```

- [ ] **Step 4: Keep wizard-only progression wording**

```vue
<n-button v-if="!isSetupEntry" type="primary" @click="handleNext">
  저장 후 직원 정보로 이동
</n-button>
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
pnpm test:unit -- tests/unit/step2-site-info.spec.ts tests/unit/step-indicator.spec.ts
```

Expected:

```text
PASS tests/unit/step2-site-info.spec.ts
PASS tests/unit/step-indicator.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/views/schedule/Step2SiteInfo.vue src/components/schedule/StepIndicator.vue tests/unit/step2-site-info.spec.ts tests/unit/step-indicator.spec.ts
git commit -m "feat: reframe step2 as setup surface"
```

### Task 4: Reframe Step3 And Make Org-Wide Impact Explicit

**Files:**

- Modify: `src/views/schedule/Step3EmployeeInfo.vue`
- Modify: `tests/unit/step3-employee-info.spec.ts`
- Test: `tests/unit/step3-employee-info.spec.ts`

- [ ] **Step 1: Write the failing Step3 setup-mode assertions**

```ts
routeQueryMock.entry = 'setup';

expect(wrapper.text()).toContain('운영 준비');
expect(wrapper.text()).toContain('조직의 직원 기본 정보를 관리합니다.');
expect(wrapper.text()).toContain('대시보드로 돌아가기');
expect(wrapper.text()).not.toContain('이전');
expect(wrapper.text()).not.toContain('이 단계는 저장만 해도 되고');
```

- [ ] **Step 2: Write the failing save-dialog copy assertion**

```ts
expect(dialogMock.warning).toHaveBeenCalledWith(
  expect.objectContaining({
    title: '직원 기준 저장 확인',
    content: expect.stringContaining('조직의 공통 직원 기준이 변경됩니다.'),
  })
);
```

- [ ] **Step 3: Implement setup-mode copy and CTA branching**

```ts
const pageTitle = computed(() =>
  isSetupEntry.value ? '운영 준비 - 직원 기준 설정' : '근무표 생성 - 직원 정보 입력'
);
```

```vue
<n-button v-if="isSetupEntry" size="medium" @click="handleReturnToDashboard">
  대시보드로 돌아가기
</n-button>
<n-button v-if="!isSetupEntry" type="primary" @click="handleNext">
  저장 후 근무표 생성 시작
</n-button>
```

- [ ] **Step 4: Update save-confirmation language to explain scope**

```ts
title: isSetupEntry.value ? '직원 기준 저장 확인' : '직원 정보 저장 확인',
content:
  isSetupEntry.value
    ? '조직의 공통 직원 기준이 변경됩니다. 현재 월의 비교안이 있다면 다시 확인이 필요할 수 있습니다. 계속 저장하시겠습니까?'
    : existingWizardContent,
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
pnpm test:unit -- tests/unit/step3-employee-info.spec.ts
```

Expected:

```text
PASS tests/unit/step3-employee-info.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/views/schedule/Step3EmployeeInfo.vue tests/unit/step3-employee-info.spec.ts
git commit -m "feat: clarify step3 setup mode and impact"
```

### Task 5: Clarify Step4 And Step5 As The Monthly Review Flow

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue`
- Modify: `src/views/schedule/Step5Result.vue`
- Modify: `tests/unit/step4-initial-data.spec.ts`
- Modify: `tests/unit/step5-result.spec.ts`
- Test: `tests/unit/step4-initial-data.spec.ts`
- Test: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Write the failing Step4 CTA-copy assertions**

```ts
expect(wrapper.text()).toContain('결과 확인으로 이동');
expect(wrapper.text()).not.toContain('다음 단계');
```

- [ ] **Step 2: Write the failing Step5 back-action assertions**

```ts
expect(wrapper.text()).toContain('입력 수정');
expect(wrapper.text()).not.toContain('← 이전');
expect(wrapper.text()).toContain('입력을 바꿔 비교안을 만들려면 입력 수정으로 돌아가세요.');
```

- [ ] **Step 3: Update Step4 copy to describe the handoff**

```vue
<n-button type="primary" size="large" @click="handleNext">
  결과 확인으로 이동
</n-button>
```

- [ ] **Step 4: Update Step5 back copy without changing the destination**

```vue
<n-button size="medium" @click="handleBack">
  입력 수정
</n-button>
```

```vue
<p v-if="isFinished" class="text-xs leading-5 text-slate-500">
  같은 안을 다시 생성하려면 더 개선하기를 사용하고, 입력을 바꿔 비교안을 만들려면 입력 수정으로 돌아가세요.
</p>
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
pnpm test:unit -- tests/unit/step4-initial-data.spec.ts tests/unit/step5-result.spec.ts
```

Expected:

```text
PASS tests/unit/step4-initial-data.spec.ts
PASS tests/unit/step5-result.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue src/views/schedule/Step5Result.vue tests/unit/step4-initial-data.spec.ts tests/unit/step5-result.spec.ts
git commit -m "feat: clarify monthly review flow actions"
```

### Task 6: Reframe Dashboard Messaging Around Setup Vs Monthly Work

**Files:**

- Modify: `src/views/Dashboard.vue`
- Modify: `src/components/ops/PilotChecklistCard.vue`
- Modify: `tests/unit/dashboard.spec.ts`
- Test: `tests/unit/dashboard.spec.ts`

- [ ] **Step 1: Write the failing dashboard copy assertions**

```ts
expect(wrapper.text()).toContain('운영 준비');
expect(wrapper.text()).toContain('월별 근무표 작업');
expect(wrapper.text()).toContain('조직 공통 기준을 먼저 정리하세요.');
```

- [ ] **Step 2: Add section framing in the dashboard**

```vue
<section>
  <h2 class="text-lg font-semibold text-gray-900">운영 준비</h2>
  <p class="text-sm text-gray-500">조직 공통 기준을 먼저 정리하세요.</p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900">월별 근무표 작업</h2>
  <p class="text-sm text-gray-500">월별 오프 입력과 결과 검토는 여기서 이어집니다.</p>
</section>
```

- [ ] **Step 3: Update checklist card copy to read like readiness work**

```vue
<p class="text-sm text-gray-500">
  조직 공통 기준과 최종 검토 진입 상태를 확인합니다.
</p>
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm test:unit -- tests/unit/dashboard.spec.ts
```

Expected:

```text
PASS tests/unit/dashboard.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/views/Dashboard.vue src/components/ops/PilotChecklistCard.vue tests/unit/dashboard.spec.ts
git commit -m "feat: separate dashboard setup and monthly work"
```

### Task 7: Full Regression, Lint, And Handoff

**Files:**

- Verify only:
  - `src/utils/scheduleEntryMode.ts`
  - `src/components/ops/PilotChecklistCard.vue`
  - `src/components/schedule/StepIndicator.vue`
  - `src/views/Dashboard.vue`
  - `src/views/schedule/Step1BasicInfo.vue`
  - `src/views/schedule/Step2SiteInfo.vue`
  - `src/views/schedule/Step3EmployeeInfo.vue`
  - `src/views/schedule/Step4InitialData.vue`
  - `src/views/schedule/Step5Result.vue`
  - `src/router/guards.ts`
  - `tests/unit/schedule-entry-mode.spec.ts`
  - `tests/unit/dashboard.spec.ts`
  - `tests/unit/router-guards.spec.ts`
  - `tests/unit/step1-basic-info.spec.ts`
  - `tests/unit/step2-site-info.spec.ts`
  - `tests/unit/step3-employee-info.spec.ts`
  - `tests/unit/step4-initial-data.spec.ts`
  - `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Run the focused unit suite**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-entry-mode.spec.ts tests/unit/dashboard.spec.ts tests/unit/router-guards.spec.ts tests/unit/step1-basic-info.spec.ts tests/unit/step2-site-info.spec.ts tests/unit/step3-employee-info.spec.ts tests/unit/step4-initial-data.spec.ts tests/unit/step5-result.spec.ts
```

Expected:

```text
PASS focused navigation UX regression suite
```

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint:check
```

Expected:

```text
ESLint found 0 errors
```

- [ ] **Step 3: Smoke-test the key paths manually**

Run:

```bash
pnpm dev
```

Verify:

```text
1. Dashboard checklist Step2 opens as standalone setup page with no step indicator.
2. Dashboard checklist Step3 opens as standalone setup page with no step indicator.
3. Step1 -> Step2 still behaves like wizard mode.
4. Step4 primary CTA reads "결과 확인으로 이동".
5. Step5 back CTA reads "입력 수정".
```

- [ ] **Step 4: Commit the verified UX change set**

```bash
git add src tests
git commit -m "feat: clarify setup and wizard navigation ux"
```

## Review Checklist For The Implementer

- Do not keep `from=dashboard` as the main UX mode flag once `entry=setup` exists.
- Do not leave Step2/Step3 explanatory copy in a mixed state where setup mode still mentions “다음 단계”.
- Do not silently bypass wizard guards for Step4 or Step5.
- Preserve existing save behavior unless the UX text explicitly changes it.
- Finish only after `pnpm lint:check` passes and the focused unit suite is green.
