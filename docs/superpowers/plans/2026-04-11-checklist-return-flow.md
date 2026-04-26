# Checklist Return Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 파일럿 준비 체크리스트에서 Step2~Step4로 진입한 사용자가 언제든지 `근무표 관리` 화면으로 돌아갈 수 있게 하고, 체크리스트 직접 진입 화면에서는 wizard용 `이전` 버튼을 숨겨 잘못된 경로 이동을 막는다.

**Architecture:** 새 전역 상태는 추가하지 않는다. 체크리스트 진입 여부는 기존 route query(`from=dashboard`)만 사용하고, Step2 -> Step3 -> Step4 이동 시 해당 query를 유지한다. 각 단계는 query가 있을 때만 `근무표 관리로 돌아가기` 액션을 노출하고, `이전`은 항상 wizard 이전 단계로 이동하게 정리한다.

**Tech Stack:** Vue 3, TypeScript, Vue Router, Naive UI, Vitest

---

## File Map

- Modify: `src/views/Dashboard.vue`
  - 체크리스트의 `Step2`, `Step3` 진입 시 `from=dashboard` query를 붙인다.
- Modify: `src/views/schedule/Step2SiteInfo.vue`
  - 일반 wizard 진입에서만 `이전`을 노출하고 `Step1`로 보낸다.
  - 체크리스트 진입 시 `근무표 관리로 돌아가기` 버튼만 노출한다.
  - `다음 단계`에서 `from=dashboard` query를 `Step3`로 전달한다.
- Modify: `src/views/schedule/Step3EmployeeInfo.vue`
  - `useRoute()`를 읽어 체크리스트 진입 여부를 계산한다.
  - `적용` 이동 시 `from=dashboard` query를 유지한다.
  - 체크리스트 진입 시 `근무표 관리로 돌아가기` 버튼만 노출한다.
- Modify: `src/views/schedule/Step4InitialData.vue`
  - `useRoute()`를 읽어 체크리스트 진입 여부를 계산한다.
  - 일반 wizard 진입에서만 `이전 단계`를 노출한다.
  - 체크리스트 진입 시 `근무표 관리로 돌아가기` 버튼만 노출한다.
- Modify: `tests/unit/dashboard.spec.ts`
  - 체크리스트 deep link가 Step2/Step3 모두 query를 붙이는지 검증한다.
- Modify: `tests/unit/step2-site-info.spec.ts`
  - 체크리스트 진입 시 별도 복귀 버튼이 노출되는지, `이전`은 Step1로 가는지, `다음 단계`가 query를 유지하는지 검증한다.
- Modify: `tests/unit/step3-employee-info.spec.ts`
  - 체크리스트 진입 시 별도 복귀 버튼이 노출되는지, `이전`/`적용` 이동이 query를 유지하는지 검증한다.
- Modify: `tests/unit/step4-initial-data.spec.ts`
  - 체크리스트 진입 시 별도 복귀 버튼이 노출되는지, `이전 단계` 이동이 query를 유지하는지 검증한다.

## Implementation Notes

- YAGNI: `scheduleStore`에 origin 상태를 추가하지 않는다.
- DRY: 공용 composable은 만들지 않는다. 각 화면에서 필요한 정도의 작은 computed/helper만 둔다.
- UX rule:
  - 일반 wizard 진입: `이전` = 이전 단계
  - 체크리스트 진입: `근무표 관리로 돌아가기`만 노출
- Out of scope:
  - Step5 복귀 UX 재설계
  - breadcrumb / global wizard shell 추가
  - 라우터 가드 구조 변경

### Task 1: Lock The Desired Flow In Tests

**Files:**

- Modify: `tests/unit/dashboard.spec.ts`
- Modify: `tests/unit/step2-site-info.spec.ts`
- Test: `tests/unit/dashboard.spec.ts`
- Test: `tests/unit/step2-site-info.spec.ts`

- [ ] **Step 1: Write the failing dashboard deep-link assertion**

```ts
expect(pushMock).toHaveBeenCalledWith({
  path: '/schedule/step3',
  query: {
    from: 'dashboard',
  },
});
```

- [ ] **Step 2: Write the failing Step2 assertions**

```ts
routeQueryMock.from = 'dashboard';

expect(wrapper.text()).toContain('근무표 관리로 돌아가기');

wrapper.vm.handlePrev();
expect(pushMock).toHaveBeenCalledWith('/schedule/step1');

await nextButton!.trigger('click');
expect(pushMock).toHaveBeenCalledWith({
  path: '/schedule/step3',
  query: {
    from: 'dashboard',
  },
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
pnpm test:unit tests/unit/dashboard.spec.ts tests/unit/step2-site-info.spec.ts
```

Expected:

```text
FAIL dashboard checklist Step3 deep link expectation
FAIL Step2 return CTA / forwarded query expectation
```

- [ ] **Step 4: Commit the red tests**

```bash
git add tests/unit/dashboard.spec.ts tests/unit/step2-site-info.spec.ts
git commit -m "test: capture checklist return flow for step2"
```

### Task 2: Implement Minimal Step2 Entry/Exit Behavior

**Files:**

- Modify: `src/views/Dashboard.vue`
- Modify: `src/views/schedule/Step2SiteInfo.vue`
- Test: `tests/unit/dashboard.spec.ts`
- Test: `tests/unit/step2-site-info.spec.ts`

- [ ] **Step 1: Update dashboard Step3 shortcut to preserve checklist origin**

```ts
if (item.route === '/schedule/step3') {
  await router.push({
    path: item.route,
    query: {
      from: 'dashboard',
    },
  });
  return;
}
```

- [ ] **Step 2: Update Step2 navigation semantics**

```ts
const cameFromDashboard = computed(() => route.query.from === 'dashboard');

function handlePrev() {
  scheduleStore.prevStep();
  router.push('/schedule/step1');
}

function handleReturnToDashboard() {
  router.push('/');
}

await router.push(
  cameFromDashboard.value
    ? { path: '/schedule/step3', query: { from: 'dashboard' } }
    : '/schedule/step3'
);
```

- [ ] **Step 3: Add the extra CTA only for checklist entry**

```vue
<div class="flex gap-3">
  <n-button
    v-if="cameFromDashboard"
    size="medium"
    @click="handleReturnToDashboard"
  >
    근무표 관리로 돌아가기
  </n-button>
  <n-button type="primary" size="medium">다음 단계 →</n-button>
</div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm test:unit tests/unit/dashboard.spec.ts tests/unit/step2-site-info.spec.ts
```

Expected:

```text
PASS tests/unit/dashboard.spec.ts
PASS tests/unit/step2-site-info.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/views/Dashboard.vue src/views/schedule/Step2SiteInfo.vue tests/unit/dashboard.spec.ts tests/unit/step2-site-info.spec.ts
git commit -m "feat: preserve checklist return path through step2"
```

### Task 3: Lock Step3 And Step4 Regression Cases In Tests

**Files:**

- Modify: `tests/unit/step3-employee-info.spec.ts`
- Modify: `tests/unit/step4-initial-data.spec.ts`
- Test: `tests/unit/step3-employee-info.spec.ts`
- Test: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: Extend the router mocks to expose `useRoute()` query**

```ts
const routeQueryMock = {} as Record<string, string>;

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
  useRoute: () => ({ query: routeQueryMock }),
}));
```

- [ ] **Step 2: Write the failing Step3 expectations**

```ts
routeQueryMock.from = 'dashboard';
expect(wrapper.text()).toContain('근무표 관리로 돌아가기');

wrapper.vm.handlePrev();
expect(pushMock).toHaveBeenCalledWith({
  path: '/schedule/step2',
  query: { from: 'dashboard' },
});
```

```ts
await warningConfig.onPositiveClick?.();
expect(pushMock).toHaveBeenCalledWith({
  path: '/schedule/step4',
  query: { from: 'dashboard' },
});
```

- [ ] **Step 3: Write the failing Step4 expectations**

```ts
routeQueryMock.from = 'dashboard';
expect(wrapper.text()).toContain('근무표 관리로 돌아가기');

wrapper.vm.handlePrev();
expect(pushMock).toHaveBeenCalledWith({
  path: '/schedule/step3',
  query: { from: 'dashboard' },
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run:

```bash
pnpm test:unit tests/unit/step3-employee-info.spec.ts tests/unit/step4-initial-data.spec.ts
```

Expected:

```text
FAIL Step3 missing return CTA / query-preserving navigation
FAIL Step4 missing return CTA / query-preserving navigation
```

- [ ] **Step 5: Commit the red tests**

```bash
git add tests/unit/step3-employee-info.spec.ts tests/unit/step4-initial-data.spec.ts
git commit -m "test: capture checklist return flow for step3 and step4"
```

### Task 4: Implement Step3 And Step4 Return Path

**Files:**

- Modify: `src/views/schedule/Step3EmployeeInfo.vue`
- Modify: `src/views/schedule/Step4InitialData.vue`
- Test: `tests/unit/step3-employee-info.spec.ts`
- Test: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: Add route-aware CTA state in Step3**

```ts
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const cameFromDashboard = computed(() => route.query.from === 'dashboard');

function handleReturnToDashboard() {
  router.push('/');
}
```

- [ ] **Step 2: Preserve the query in Step3 navigation**

```ts
function handlePrev() {
  scheduleStore.prevStep();
  router.push(
    cameFromDashboard.value
      ? { path: '/schedule/step2', query: { from: 'dashboard' } }
      : '/schedule/step2'
  );
}

router.push(
  cameFromDashboard.value
    ? { path: '/schedule/step4', query: { from: 'dashboard' } }
    : '/schedule/step4'
);
```

- [ ] **Step 3: Add route-aware CTA state in Step4**

```ts
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const cameFromDashboard = computed(() => route.query.from === 'dashboard');

function handleReturnToDashboard() {
  router.push('/');
}
```

- [ ] **Step 4: Preserve the query in Step4 back navigation**

```ts
function handlePrev() {
  scheduleStore.setAssignments(constraints.value);
  scheduleStore.setComments(constraintNotes.value);
  scheduleStore.prevStep();
  router.push(
    cameFromDashboard.value
      ? { path: '/schedule/step3', query: { from: 'dashboard' } }
      : '/schedule/step3'
  );
}
```

- [ ] **Step 5: Render the CTA in both templates**

```vue
<n-button v-if="cameFromDashboard" size="medium" @click="handleReturnToDashboard">
  근무표 관리로 돌아가기
</n-button>
```

- [ ] **Step 6: Run tests to verify they pass**

Run:

```bash
pnpm test:unit tests/unit/step3-employee-info.spec.ts tests/unit/step4-initial-data.spec.ts
```

Expected:

```text
PASS tests/unit/step3-employee-info.spec.ts
PASS tests/unit/step4-initial-data.spec.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/views/schedule/Step3EmployeeInfo.vue src/views/schedule/Step4InitialData.vue tests/unit/step3-employee-info.spec.ts tests/unit/step4-initial-data.spec.ts
git commit -m "feat: add checklist return path to step3 and step4"
```

### Task 5: Final Verification

**Files:**

- Verify: `src/views/Dashboard.vue`
- Verify: `src/views/schedule/Step2SiteInfo.vue`
- Verify: `src/views/schedule/Step3EmployeeInfo.vue`
- Verify: `src/views/schedule/Step4InitialData.vue`
- Verify: `tests/unit/dashboard.spec.ts`
- Verify: `tests/unit/step2-site-info.spec.ts`
- Verify: `tests/unit/step3-employee-info.spec.ts`
- Verify: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: Run the focused unit suite**

Run:

```bash
pnpm test:unit tests/unit/dashboard.spec.ts tests/unit/step2-site-info.spec.ts tests/unit/step3-employee-info.spec.ts tests/unit/step4-initial-data.spec.ts
```

Expected:

```text
All 4 spec files PASS
```

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint:check
```

Expected:

```text
ESLint exits 0
```

- [ ] **Step 3: Manual smoke checklist**

```text
1. Dashboard checklist -> 사이트/근무 기본 설정 열기
2. Step2에서 "근무표 관리로 돌아가기" 확인
3. Step2의 "이전"이 Step1로 이동하는지 확인
4. Step2의 "다음 단계" 후 Step3에서도 복귀 CTA가 유지되는지 확인
5. Step4까지 이동 후 복귀 CTA가 유지되는지 확인
```

- [ ] **Step 4: Commit verification-safe final state**

```bash
git add src/views/Dashboard.vue src/views/schedule/Step2SiteInfo.vue src/views/schedule/Step3EmployeeInfo.vue src/views/schedule/Step4InitialData.vue tests/unit/dashboard.spec.ts tests/unit/step2-site-info.spec.ts tests/unit/step3-employee-info.spec.ts tests/unit/step4-initial-data.spec.ts
git commit -m "fix: restore dashboard return path in checklist flow"
```

## Acceptance Criteria

- 체크리스트에서 Step2로 들어가면 `이전`은 `Step1`로 간다.
- 체크리스트에서 Step2~Step4로 들어간 상태에서는 항상 `근무표 관리로 돌아가기` 액션이 보인다.
- Step2 -> Step3 -> Step4 이동 중 `from=dashboard` query가 유지된다.
- 체크리스트에서 Step3로 직접 열어도 복귀 CTA가 보인다.
- 기존 단계 저장/적용 동작은 유지된다.
- `pnpm lint:check`가 통과한다.
