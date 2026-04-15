# Dashboard Return Action Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize the `대시보드로 돌아가기` action so the three setup surfaces use the same bottom action-bar layout and the same unsaved-change exit behavior.

**Architecture:** Add one small shared bottom action-bar component and use it for the setup-mode action area instead of hand-written per-page layouts. Keep Step2 and Step3 behavior intact, but move their setup-mode return button into the left side of the bottom bar. Refactor `OrganizationProfileSetup` to use the same bottom bar and add dirty-state tracking in the two embedded forms so dashboard exit is blocked until the user saves or discards changes.

**Tech Stack:** Vue 3, TypeScript, Naive UI, Tailwind CSS, Vue Test Utils, Vitest

---

## File Map

- Create: `src/components/ui/PageActionBar.vue`
  - Reusable bottom action bar with `left` and `right` slots.
  - Encodes the shared spacing, border, wrapping, and mobile stacking behavior.
- Modify: `src/views/schedule/Step2SiteInfo.vue`
  - Replace the centered setup-mode CTA row with the shared bottom action bar.
  - Keep `대시보드로 돌아가기` as the left-side secondary action.
- Modify: `src/views/schedule/Step3EmployeeInfo.vue`
  - Mirror the same setup-mode action-bar structure as Step2.
- Modify: `src/views/ops/OrganizationProfileSetup.vue`
  - Remove the top-right dashboard return button.
  - Add the shared bottom action bar at page bottom.
  - Keep the return action available during loading and error states.
  - Aggregate form dirty state and block dashboard exit when unsaved edits exist.
- Modify: `src/components/ops/OrganizationProfileForm.vue`
  - Emit a `dirty-change` signal based on normalized local-vs-prop comparison.
- Modify: `src/components/ops/SiteFoundationForm.vue`
  - Emit a `dirty-change` signal based on normalized local-vs-prop comparison.
- Create: `tests/unit/page-action-bar.spec.ts`
  - Lock the shared slot layout contract.
- Modify: `tests/unit/step2-site-info.spec.ts`
  - Verify setup-mode return CTA sits in the shared action-bar pattern instead of centered.
- Modify: `tests/unit/step3-employee-info.spec.ts`
  - Verify the same setup-mode action-bar pattern as Step2.
- Modify: `tests/unit/organization-profile-setup.spec.ts`
  - Verify the page-level return CTA moved to the bottom bar and is blocked by unsaved form edits.
- Modify: `tests/unit/organization-profile-form.spec.ts`
  - Verify the form emits `dirty-change` when local edits diverge from props and resets after prop replacement.
- Modify: `tests/unit/site-foundation-form.spec.ts`
  - Verify the same dirty-state contract for the site form.

## UX Contract

- All three target pages should place `대시보드로 돌아가기` in the **left side of the bottom action bar**.
- The right side of the bottom action bar should keep the local page’s forward/work actions:
  - Step2 setup mode: `저장`, `저장 후 직원 정보로 이동`
  - Step3 setup mode: `저장`, `저장 후 근무표 생성 시작`
  - OrganizationProfileSetup: no new primary CTA at page level; only the dashboard return action lives in the bottom bar because save actions remain inside each card.
- `대시보드로 돌아가기` must use the same unsaved-change guard on all three pages:
  - If there are unsaved edits, show `변경된 데이터가 있습니다. 저장 후 이동하세요.`
  - If there are no unsaved edits, navigate to `/`
- `OrganizationProfileSetup` must keep the dashboard return action visible even before the setup data finishes loading and when the initial load fails.
- In `OrganizationProfileSetup`, the shared `PageActionBar` must be rendered outside the `hasLoaded` / `loading` content branch so the dashboard return action remains available in loaded, loading, and error states.
- Keep scope tight:
  - Do not change wizard-mode Step2/Step3 layout.
  - Do not remove the existing per-card save buttons inside `OrganizationProfileForm` and `SiteFoundationForm`.
  - Do not expand this plan to `OffRequestPolicySetup` yet. That is a follow-up consistency item, not part of this request.

## Implementation Notes

- The shared action bar should stay presentational:

```vue
<template>
  <div
    class="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-6 md:flex-row md:items-center md:justify-between"
    data-test="page-action-bar"
  >
    <div class="flex flex-wrap gap-3" data-test="page-action-bar-left">
      <slot name="left" />
    </div>
    <div class="flex flex-wrap justify-end gap-3" data-test="page-action-bar-right">
      <slot name="right" />
    </div>
  </div>
</template>
```

- `OrganizationProfileSetup` should treat “dirty” as “either embedded form differs from the last saved prop value”.

```ts
const organizationDirty = ref(false);
const siteDirty = ref(false);

const hasUnsavedChanges = computed(() => organizationDirty.value || siteDirty.value);

function handleReturnToDashboard() {
  if (hasUnsavedChanges.value) {
    showInfo('변경된 데이터가 있습니다. 저장 후 이동하세요.');
    return;
  }

  router.push('/');
}
```

- Form dirty-state should be derived from normalized values so whitespace-only edits do not keep the page dirty.

```ts
function normalizeProfileValue(value: OrganizationProfileRequest) {
  return {
    name: value.name.trim(),
    type: value.type.trim(),
  };
}

const normalizedLocalValue = computed(() => ({
  name: localValue.name.trim(),
  type: localValue.type.trim(),
}));

const normalizedModelValue = computed(() => normalizeProfileValue(props.modelValue));

watch(
  () => JSON.stringify(normalizedLocalValue.value) !== JSON.stringify(normalizedModelValue.value),
  (value) => emit('dirty-change', value),
  { immediate: true }
);
```

- Prefer tiny inline normalization helpers instead of adding a new shared comparison utility unless the implementation genuinely duplicates more than twice.
- Add explicit `data-test` hooks to the three page-level return buttons to keep layout assertions stable:
  - `data-test="dashboard-return-button"`
  - `data-test="setup-action-bar"`

### Task 1: Lock The Visual Contract In Tests

**Files:**

- Create: `tests/unit/page-action-bar.spec.ts`
- Modify: `tests/unit/step2-site-info.spec.ts`
- Modify: `tests/unit/step3-employee-info.spec.ts`
- Modify: `tests/unit/organization-profile-setup.spec.ts`
- Modify: `tests/unit/organization-profile-form.spec.ts`
- Modify: `tests/unit/site-foundation-form.spec.ts`
- Test: `tests/unit/page-action-bar.spec.ts`
- Test: `tests/unit/step2-site-info.spec.ts`
- Test: `tests/unit/step3-employee-info.spec.ts`
- Test: `tests/unit/organization-profile-setup.spec.ts`
- Test: `tests/unit/organization-profile-form.spec.ts`
- Test: `tests/unit/site-foundation-form.spec.ts`

- [ ] **Step 1: Write the failing shared action-bar test**

```ts
import { mount } from '@vue/test-utils';
import PageActionBar from '@/components/ui/PageActionBar.vue';

const wrapper = mount(PageActionBar, {
  slots: {
    left: '<button data-test="left-action">back</button>',
    right: '<button data-test="right-action">save</button>',
  },
});

expect(wrapper.get('[data-test="page-action-bar-left"]').text()).toContain('back');
expect(wrapper.get('[data-test="page-action-bar-right"]').text()).toContain('save');
```

- [ ] **Step 2: Write the failing Step2 and Step3 setup-mode assertions**

```ts
expect(wrapper.get('[data-test="setup-action-bar"]').exists()).toBe(true);
expect(wrapper.get('[data-test="dashboard-return-button"]').text()).toContain(
  '대시보드로 돌아가기'
);
expect(wrapper.get('[data-test="page-action-bar-left"]').text()).toContain('대시보드로 돌아가기');
expect(wrapper.get('[data-test="page-action-bar-right"]').text()).toContain('저장');
expect(wrapper.findAll('[data-test="dashboard-return-button"]')).toHaveLength(1);
```

- [ ] **Step 3: Write the failing OrganizationProfileSetup assertions**

```ts
expect(wrapper.get('[data-test="setup-action-bar"]').exists()).toBe(true);
expect(wrapper.get('[data-test="dashboard-return-button"]').text()).toContain(
  '대시보드로 돌아가기'
);
expect(wrapper.findAll('[data-test="dashboard-return-button"]')).toHaveLength(1);

await wrapper.get('[data-test="dashboard-return-button"]').trigger('click');
expect(pushMock).toHaveBeenCalledWith('/');
```

- [ ] **Step 4: Write the failing dirty-state form assertions**

```ts
expect(wrapper.emitted('dirty-change')).toEqual([[false], [true]]);
```

- [ ] **Step 5: Add the failing dirty-exit guard test for `OrganizationProfileSetup`**

```ts
await wrapper.get('[data-test="emit-profile-dirty"]').trigger('click');
await wrapper.get('[data-test="dashboard-return-button"]').trigger('click');

expect(showInfoMock).toHaveBeenCalledWith('변경된 데이터가 있습니다. 저장 후 이동하세요.');
expect(pushMock).not.toHaveBeenCalledWith('/');
```

Update the `organization-profile-setup.spec.ts` child-component mocks so the dirty events are actually triggerable:

```ts
vi.mock('@/components/ops/OrganizationProfileForm.vue', () => ({
  default: {
    props: ['modelValue', 'saving'],
    emits: ['save', 'dirty-change'],
    template: `
      <div>
        <button data-test="emit-profile-dirty" @click="$emit('dirty-change', true)">dirty-profile</button>
        <button data-test="emit-profile-pristine" @click="$emit('dirty-change', false)">clean-profile</button>
      </div>
    `,
  },
}));

vi.mock('@/components/ops/SiteFoundationForm.vue', () => ({
  default: {
    props: ['modelValue', 'saving'],
    emits: ['save', 'dirty-change'],
    template: `
      <div>
        <button data-test="emit-site-dirty" @click="$emit('dirty-change', true)">dirty-site</button>
        <button data-test="emit-site-pristine" @click="$emit('dirty-change', false)">clean-site</button>
      </div>
    `,
  },
}));
```

- [ ] **Step 6: Add the failing loading/error-state return CTA test for `OrganizationProfileSetup`**

```ts
expect(wrapper.get('[data-test="dashboard-return-button"]').exists()).toBe(true);

await wrapper.get('[data-test="dashboard-return-button"]').trigger('click');
expect(pushMock).toHaveBeenCalledWith('/');
```

- [ ] **Step 7: Run the targeted tests to verify they fail**

Run:

```bash
pnpm test:unit -- tests/unit/page-action-bar.spec.ts tests/unit/step2-site-info.spec.ts tests/unit/step3-employee-info.spec.ts tests/unit/organization-profile-setup.spec.ts tests/unit/organization-profile-form.spec.ts tests/unit/site-foundation-form.spec.ts
```

Expected:

```text
FAIL tests/unit/page-action-bar.spec.ts
FAIL tests/unit/step2-site-info.spec.ts
FAIL tests/unit/step3-employee-info.spec.ts
FAIL tests/unit/organization-profile-setup.spec.ts
FAIL tests/unit/organization-profile-form.spec.ts
FAIL tests/unit/site-foundation-form.spec.ts
```

- [ ] **Step 8: Commit the red tests**

```bash
git add tests/unit/page-action-bar.spec.ts tests/unit/step2-site-info.spec.ts tests/unit/step3-employee-info.spec.ts tests/unit/organization-profile-setup.spec.ts tests/unit/organization-profile-form.spec.ts tests/unit/site-foundation-form.spec.ts
git commit -m "test: capture dashboard return action alignment"
```

### Task 2: Add The Shared Bottom Action Bar

**Files:**

- Create: `src/components/ui/PageActionBar.vue`
- Create: `tests/unit/page-action-bar.spec.ts`
- Test: `tests/unit/page-action-bar.spec.ts`

- [ ] **Step 1: Create the presentational action-bar component**

```vue
<template>
  <div
    class="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-6 md:flex-row md:items-center md:justify-between"
    data-test="page-action-bar"
  >
    <div class="flex flex-wrap gap-3" data-test="page-action-bar-left">
      <slot name="left" />
    </div>
    <div class="flex flex-wrap justify-end gap-3" data-test="page-action-bar-right">
      <slot name="right" />
    </div>
  </div>
</template>
```

- [ ] **Step 2: Run the component test**

Run:

```bash
pnpm test:unit -- tests/unit/page-action-bar.spec.ts
```

Expected:

```text
PASS tests/unit/page-action-bar.spec.ts
```

- [ ] **Step 3: Commit the shared component**

```bash
git add src/components/ui/PageActionBar.vue tests/unit/page-action-bar.spec.ts
git commit -m "feat: add shared page action bar"
```

### Task 3: Refactor Step2 And Step3 Setup Actions To The Shared Pattern

**Files:**

- Modify: `src/views/schedule/Step2SiteInfo.vue`
- Modify: `src/views/schedule/Step3EmployeeInfo.vue`
- Test: `tests/unit/step2-site-info.spec.ts`
- Test: `tests/unit/step3-employee-info.spec.ts`

- [ ] **Step 1: Swap Step2 setup-mode CTA row to `PageActionBar`**

```vue
<PageActionBar v-if="isSetupEntry" data-test="setup-action-bar">
  <template #left>
    <n-button
      data-test="dashboard-return-button"
      size="medium"
      secondary
      :disabled="isSaving || loading"
      @click="handleReturnToDashboard"
    >
      대시보드로 돌아가기
    </n-button>
  </template>

  <template #right>
    <n-button size="medium" :disabled="isSaving || loading" @click="handleSave">
      저장
    </n-button>
    <n-button type="primary" size="medium" :loading="isSaving || loading" @click="handleNext">
      저장 후 직원 정보로 이동
    </n-button>
  </template>
</PageActionBar>
```

- [ ] **Step 2: Swap Step3 setup-mode CTA row to `PageActionBar`**

```vue
<PageActionBar v-if="isSetupEntry" data-test="setup-action-bar">
  <template #left>
    <n-button
      data-test="dashboard-return-button"
      size="medium"
      secondary
      :disabled="isSaving"
      @click="handleReturnToDashboard"
    >
      대시보드로 돌아가기
    </n-button>
  </template>

  <template #right>
    <n-button size="medium" :disabled="isSaving" @click="handleSave">
      저장
    </n-button>
    <n-button type="primary" size="medium" :disabled="isSaving" :loading="isSaving" @click="handleNext">
      저장 후 근무표 생성 시작
    </n-button>
  </template>
</PageActionBar>
```

- [ ] **Step 3: Run the targeted Step2 and Step3 tests**

Run:

```bash
pnpm test:unit -- tests/unit/step2-site-info.spec.ts tests/unit/step3-employee-info.spec.ts
```

Expected:

```text
PASS tests/unit/step2-site-info.spec.ts
PASS tests/unit/step3-employee-info.spec.ts
```

- [ ] **Step 4: Commit the Step2 and Step3 refactor**

```bash
git add src/views/schedule/Step2SiteInfo.vue src/views/schedule/Step3EmployeeInfo.vue tests/unit/step2-site-info.spec.ts tests/unit/step3-employee-info.spec.ts
git commit -m "style: align setup return actions in step pages"
```

### Task 4: Add Dirty-State Signaling To The Ops Forms

**Files:**

- Modify: `src/components/ops/OrganizationProfileForm.vue`
- Modify: `src/components/ops/SiteFoundationForm.vue`
- Test: `tests/unit/organization-profile-form.spec.ts`
- Test: `tests/unit/site-foundation-form.spec.ts`

- [ ] **Step 1: Add `dirty-change` emission to `OrganizationProfileForm.vue`**

```ts
const emit = defineEmits<{
  save: [value: OrganizationProfileRequest];
  'dirty-change': [value: boolean];
}>();

const isDirty = computed(() => {
  return (
    localValue.name.trim() !== props.modelValue.name.trim() ||
    localValue.type.trim() !== props.modelValue.type.trim()
  );
});

watch(isDirty, (value) => emit('dirty-change', value), { immediate: true });
```

- [ ] **Step 2: Add `dirty-change` emission to `SiteFoundationForm.vue`**

```ts
const emit = defineEmits<{
  save: [value: SiteRequest];
  'dirty-change': [value: boolean];
}>();

const isDirty = computed(() => {
  return (
    localSite.code.trim() !== (props.modelValue?.code ?? '').trim() ||
    localSite.name.trim() !== (props.modelValue?.name ?? '').trim()
  );
});

watch(isDirty, (value) => emit('dirty-change', value), { immediate: true });
```

- [ ] **Step 3: Run the form tests**

Run:

```bash
pnpm test:unit -- tests/unit/organization-profile-form.spec.ts tests/unit/site-foundation-form.spec.ts
```

Expected:

```text
PASS tests/unit/organization-profile-form.spec.ts
PASS tests/unit/site-foundation-form.spec.ts
```

- [ ] **Step 4: Commit the form dirty-state contract**

```bash
git add src/components/ops/OrganizationProfileForm.vue src/components/ops/SiteFoundationForm.vue tests/unit/organization-profile-form.spec.ts tests/unit/site-foundation-form.spec.ts
git commit -m "feat: emit dirty state from ops setup forms"
```

### Task 5: Move OrganizationProfileSetup Return Navigation To The Shared Bottom Bar

**Files:**

- Modify: `src/views/ops/OrganizationProfileSetup.vue`
- Modify: `tests/unit/organization-profile-setup.spec.ts`
- Test: `tests/unit/organization-profile-setup.spec.ts`

- [ ] **Step 1: Remove the top-right return button and wire bottom-bar dirty aggregation**

```vue
<template>
  <div class="mx-auto max-w-4xl space-y-6 px-4">
    <div>
      <h1 class="text-2xl font-bold">조직/사이트 기본 설정</h1>
      <p class="mt-1 text-sm text-gray-500">
        대시보드와 Step2에서 공통으로 사용할 기본 설정을 관리합니다.
      </p>
    </div>

    <n-alert v-if="loadErrorMessage" type="error">...</n-alert>
    <template v-if="hasLoaded">...</template>
    <n-spin v-else-if="loading" :show="loading">...</n-spin>

    <PageActionBar data-test="setup-action-bar">
      <template #left>
        <n-button
          data-test="dashboard-return-button"
          secondary
          :disabled="organizationSaving || siteSaving"
          @click="handleReturnToDashboard"
        >
          대시보드로 돌아가기
        </n-button>
      </template>
    </PageActionBar>
  </div>
</template>
```

```vue
<div>
  <h1 class="text-2xl font-bold">조직/사이트 기본 설정</h1>
  <p class="mt-1 text-sm text-gray-500">대시보드와 Step2에서 공통으로 사용할 기본 설정을 관리합니다.</p>
</div>

<OrganizationProfileForm
  :model-value="organizationProfile"
  :saving="organizationSaving"
  @save="handleSaveOrganizationProfile"
  @dirty-change="organizationDirty = $event"
/>

<SiteFoundationForm
  :model-value="siteSetup.site"
  :saving="siteSaving"
  @save="handleSaveSites"
  @dirty-change="siteDirty = $event"
/>

<PageActionBar data-test="setup-action-bar">
  <template #left>
    <n-button
      data-test="dashboard-return-button"
      secondary
      :disabled="organizationSaving || siteSaving"
      @click="handleReturnToDashboard"
    >
      대시보드로 돌아가기
    </n-button>
  </template>
</PageActionBar>
```

- [ ] **Step 2: Add the guarded dashboard-return handler**

```ts
const organizationDirty = ref(false);
const siteDirty = ref(false);

const hasUnsavedChanges = computed(() => organizationDirty.value || siteDirty.value);

function handleReturnToDashboard() {
  if (hasUnsavedChanges.value) {
    showInfo('변경된 데이터가 있습니다. 저장 후 이동하세요.');
    return;
  }

  router.push('/');
}
```

- [ ] **Step 3: Extend the page-level spec to cover dirty exit blocking**

```ts
await wrapper.get('[data-test="emit-site-dirty"]').trigger('click');
await wrapper.get('[data-test="dashboard-return-button"]').trigger('click');

expect(showInfoMock).toHaveBeenCalledWith('변경된 데이터가 있습니다. 저장 후 이동하세요.');
expect(pushMock).not.toHaveBeenCalledWith('/');
```

- [ ] **Step 4: Extend the page-level spec to cover loading/error-state return availability**

```ts
expect(wrapper.get('[data-test="dashboard-return-button"]').exists()).toBe(true);

await wrapper.get('[data-test="dashboard-return-button"]').trigger('click');
expect(pushMock).toHaveBeenCalledWith('/');
```

- [ ] **Step 5: Run the OrganizationProfileSetup test file**

Run:

```bash
pnpm test:unit -- tests/unit/organization-profile-setup.spec.ts
```

Expected:

```text
PASS tests/unit/organization-profile-setup.spec.ts
```

- [ ] **Step 6: Commit the page-level alignment**

```bash
git add src/views/ops/OrganizationProfileSetup.vue tests/unit/organization-profile-setup.spec.ts
git commit -m "style: align organization setup return action"
```

### Task 6: Final Verification

**Files:**

- Modify: `src/components/ui/PageActionBar.vue`
- Modify: `src/views/schedule/Step2SiteInfo.vue`
- Modify: `src/views/schedule/Step3EmployeeInfo.vue`
- Modify: `src/views/ops/OrganizationProfileSetup.vue`
- Modify: `src/components/ops/OrganizationProfileForm.vue`
- Modify: `src/components/ops/SiteFoundationForm.vue`
- Modify: `tests/unit/page-action-bar.spec.ts`
- Modify: `tests/unit/step2-site-info.spec.ts`
- Modify: `tests/unit/step3-employee-info.spec.ts`
- Modify: `tests/unit/organization-profile-setup.spec.ts`
- Modify: `tests/unit/organization-profile-form.spec.ts`
- Modify: `tests/unit/site-foundation-form.spec.ts`

- [ ] **Step 1: Run the full targeted unit suite**

Run:

```bash
pnpm test:unit -- tests/unit/page-action-bar.spec.ts tests/unit/step2-site-info.spec.ts tests/unit/step3-employee-info.spec.ts tests/unit/organization-profile-setup.spec.ts tests/unit/organization-profile-form.spec.ts tests/unit/site-foundation-form.spec.ts
```

Expected:

```text
PASS tests/unit/page-action-bar.spec.ts
PASS tests/unit/step2-site-info.spec.ts
PASS tests/unit/step3-employee-info.spec.ts
PASS tests/unit/organization-profile-setup.spec.ts
PASS tests/unit/organization-profile-form.spec.ts
PASS tests/unit/site-foundation-form.spec.ts
```

- [ ] **Step 2: Run a rendered visual verification pass for the three pages**

Run:

```bash
pnpm dev
```

Then verify on the running app:

```text
1. /schedule/step2?entry=setup
2. /schedule/step3?entry=setup
3. /ops/organization-setup
```

Expected:

```text
- Each page shows exactly one dashboard return button
- The button sits inside the bottom action bar, not the header or a centered CTA row
- Step2 and Step3 setup pages show the return action on the left and work actions on the right
- OrganizationProfileSetup shows the return action only in the bottom bar
```

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm lint:check
```

Expected:

```text
ESLint found 0 problems
```

- [ ] **Step 4: Commit the verification pass if follow-up tweaks were needed**

```bash
git add src/components/ui/PageActionBar.vue src/views/schedule/Step2SiteInfo.vue src/views/schedule/Step3EmployeeInfo.vue src/views/ops/OrganizationProfileSetup.vue src/components/ops/OrganizationProfileForm.vue src/components/ops/SiteFoundationForm.vue tests/unit/page-action-bar.spec.ts tests/unit/step2-site-info.spec.ts tests/unit/step3-employee-info.spec.ts tests/unit/organization-profile-setup.spec.ts tests/unit/organization-profile-form.spec.ts tests/unit/site-foundation-form.spec.ts
git commit -m "test: verify dashboard return action alignment"
```

## Handoff Notes

- The plan deliberately keeps the existing inner save buttons in the two ops cards. The bottom action bar standardizes navigation placement, not save ownership.
- If implementation reveals that `OrganizationProfileSetup` needs a real discard/confirm modal instead of the current info toast, stop and write a small follow-up plan rather than widening this one.
- After this plan lands, `OffRequestPolicySetup.vue` will still have a top-right dashboard return button. Treat that as a separate consistency cleanup after the requested three pages are stable.
