# Auth Login Signup Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/login` and `/signup` so the auth transition feels credible, clear, and launch-ready while preserving the existing email/password, approval, invite-code, and post-auth routing contracts.

**Architecture:** Keep auth behavior in the existing `Login.vue`, `Signup.vue`, `useAuthStore`, and route constants. Add one shared presentational shell for the auth pages, then update focused unit and E2E coverage around copy, CTAs, route handoff, disabled states, and responsive structure. Do not add new auth providers, schema changes, analytics, or app-shell routing changes.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vue Router, Pinia, Naive UI, Tailwind CSS, Vitest, Vue Test Utils, Playwright.

---

## Plan Review Summary

The original referenced plan file was not present in the workspace at `docs/plans/2026-05-01-auth-login-signup-redesign.md`, so this document is the strengthened implementation plan created at that requested path.

Current code state:

- `src/views/auth/Login.vue` and `src/views/auth/Signup.vue` already own the public auth screens.
- `src/constants/routes.ts` already centralizes `/login`, `/signup`, `/app`, access-state, and post-auth redirect paths.
- `src/router/index.ts` already mounts `/login`, `/signup`, `/access/*`, `/`, and `/app/*` with the Launch Core route boundary.
- `tests/unit/login-view.spec.ts`, `tests/unit/signup-view.spec.ts`, and `tests/e2e/signup-flow.spec.ts` already cover the critical auth handoff.
- `DESIGN.md` says auth pages are transition surfaces: title, short reassurance, form, next step.

Strengthening decisions:

- Keep the redesign frontend-only.
- Keep all user-facing text Korean.
- Reuse Naive UI form controls; do not build custom inputs.
- Introduce a small shared auth shell only if both auth pages use it immediately.
- Use route constants instead of hardcoded `/login` or `/signup`.
- Do not change `submitSignup`, `authStore.login`, RBAC hydration, approval routing, or Supabase function contracts.
- Preserve existing selectors such as `data-test="login-email"`, `data-test="login-submit"`, `data-test="signup-submit"`, and `data-test="signup-to-login"`.

## File Structure

### Create

- `src/components/auth/AuthPageShell.vue`
  - Shared two-zone auth page frame.
  - Owns background, brand/product context, responsive layout, and the form slot.
  - Takes simple string props: `title`, `description`, `eyebrow`.
  - Does not know about login, signup, RBAC, Supabase, or form state.

### Modify

- `src/views/auth/Login.vue`
  - Replace bare centered card wrapper with `AuthPageShell`.
  - Add a short Korean reassurance line.
  - Preserve existing form model, validation, login handler, `signupState` query cleanup, and route replacement behavior.
  - Keep `moveToSignup()` using `SIGNUP_ROUTE_PATH`.

- `src/views/auth/Signup.vue`
  - Replace bare centered card wrapper with `AuthPageShell`.
  - Read `route.query.role` on first load so `/signup?role=admin` explicitly starts in admin mode and `/signup?role=user` starts in user mode.
  - Keep admin as the default for missing or invalid role query.
  - Keep hospital search, invite-code split, submit payloads, and login handoff behavior.

- `tests/unit/login-view.spec.ts`
  - Update Naive UI/component mocks only as needed for the new shell.
  - Add assertions for the redesigned Korean transition copy.
  - Preserve existing redirect/access-state assertions.

- `tests/unit/signup-view.spec.ts`
  - Mock `useRoute()` so role query behavior can be tested.
  - Add assertions for admin default, `?role=admin`, invalid role fallback, and `?role=user`.
  - Preserve hospital search and login handoff assertions.

- `tests/e2e/signup-flow.spec.ts`
  - Add one route-entry assertion for `/signup?role=admin`.
  - Add one route-entry assertion for `/signup?role=user`.
  - Preserve existing admin pending and invite active handoff tests.

### Do Not Modify

- `src/stores/auth.ts`
- `src/api/signup.ts`
- `src/types/signup.ts`
- `src/router/index.ts`
- `src/router/guards.ts`
- Supabase functions or migrations

## UX Contract

### Login Page

The login page must communicate:

- Product: `EveryShift`
- Screen title: `로그인`
- Reassurance: `승인된 병원 계정으로 근무표 작업 공간에 들어갑니다.`
- Primary action: `로그인`
- Secondary action: `회원가입`

Behavior must remain:

- Successful active login routes through `resolvePostAuthRedirectPath(result.accessState)`.
- Pending admin routes to `/access/pending`.
- Rejected admin routes to `/access/rejected`.
- `no_membership_or_inactive` logs out and remains on `/login`.
- `signupState=pending_approval` and `signupState=active` still show the existing handoff banners and then clear the query.

### Signup Page

The signup page must communicate:

- Product: `EveryShift`
- Screen title: `회원가입`
- Reassurance: `관리자는 병원을 선택해 가입 신청하고, 사용자는 초대코드로 참여합니다.`
- Admin submit action: `가입 신청`
- User submit action: `가입하기`
- Login handoff action: `로그인으로 이동`

Behavior must remain:

- Missing query or `/signup?role=admin` defaults to admin.
- `/signup?role=user` starts in invite-code mode.
- Invalid role query falls back to admin.
- Admin signup requires hospital selection and returns pending approval.
- Invite signup requires invite code and returns active login handoff.

## Tasks

### Task 1: Lock Login Redesign Expectations

**Files:**

- Modify: `tests/unit/login-view.spec.ts`
- Test: `tests/unit/login-view.spec.ts`

- [ ] **Step 1: Add shell/copy assertions before implementation**

Add assertions to the existing login view mount test or a new focused test:

```ts
it('shows the launch-ready login context without changing form selectors', () => {
  const wrapper = mount(Login);

  expect(wrapper.text()).toContain('EveryShift');
  expect(wrapper.text()).toContain('승인된 병원 계정으로 근무표 작업 공간에 들어갑니다.');
  expect(wrapper.get('[data-test="login-email"]').exists()).toBe(true);
  expect(wrapper.get('[data-test="login-password"]').exists()).toBe(true);
  expect(wrapper.get('[data-test="login-submit"]').text()).toContain('로그인');
  expect(wrapper.get('[data-test="login-to-signup"]').text()).toContain('회원가입');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test:unit tests/unit/login-view.spec.ts
```

Expected: FAIL because the new reassurance copy or shell content is not present yet.

- [ ] **Step 3: Commit the failing test if working in TDD commits**

```bash
git add tests/unit/login-view.spec.ts
git commit -m "test: lock login redesign expectations"
```

### Task 2: Add Shared Auth Page Shell

**Files:**

- Create: `src/components/auth/AuthPageShell.vue`
- Test: covered through `tests/unit/login-view.spec.ts` and `tests/unit/signup-view.spec.ts`

- [ ] **Step 1: Create the component**

Implementation shape:

```vue
<template>
  <main class="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
    <div
      class="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl gap-8 lg:grid-cols-[0.9fr_1fr] lg:items-center"
    >
      <section class="space-y-5">
        <p class="text-sm font-semibold text-teal-700">
          {{ eyebrow }}
        </p>
        <div class="space-y-3">
          <p class="text-3xl font-bold leading-tight sm:text-4xl">EveryShift</p>
          <h1 class="text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
            {{ title }}
          </h1>
          <p class="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            {{ description }}
          </p>
        </div>
      </section>

      <section class="w-full">
        <slot />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  description: string;
}>();
</script>
```

- [ ] **Step 2: Keep styling aligned with `DESIGN.md`**

Check:

- no purple/blue gradient
- no nested cards
- radius stays modest
- dense enough for auth transition
- Korean copy fits mobile width
- form cards set their own `max-w-md` or `max-w-xl` width instead of stretching across the whole right column

- [ ] **Step 3: Do not add component-specific auth logic**

Expected: the file contains no imports from router, stores, Supabase, or signup APIs.

### Task 3: Apply Shell to Login

**Files:**

- Modify: `src/views/auth/Login.vue`
- Test: `tests/unit/login-view.spec.ts`

- [ ] **Step 1: Wrap the existing form card with `AuthPageShell`**

Use:

```vue
<AuthPageShell
  eyebrow="EveryShift 계정"
  title="로그인"
  description="승인된 병원 계정으로 근무표 작업 공간에 들어갑니다."
>
  <n-card class="mx-auto w-full max-w-md lg:mr-0" title="로그인">
    <!-- existing alerts and form -->
  </n-card>
</AuthPageShell>
```

- [ ] **Step 2: Preserve the existing script behavior**

Keep:

- `LOGIN_ROUTE_PATH`
- `SIGNUP_ROUTE_PATH`
- `resolvePostAuthRedirectPath`
- `handleLogin()`
- `moveToSignup()`
- `signupState` watcher
- `data-test` attributes

- [ ] **Step 3: Run focused test**

Run:

```bash
pnpm test:unit tests/unit/login-view.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/AuthPageShell.vue src/views/auth/Login.vue tests/unit/login-view.spec.ts
git commit -m "feat: redesign login transition screen"
```

### Task 4: Lock Signup Role Query Expectations

**Files:**

- Modify: `tests/unit/signup-view.spec.ts`
- Test: `tests/unit/signup-view.spec.ts`

- [ ] **Step 1: Add a route query mock**

Add a mutable route state near the existing router mock:

```ts
const routeState = ref({
  query: {} as Record<string, string>,
});

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useRoute: () => routeState.value,
}));
```

Reset it in `beforeEach()`:

```ts
routeState.value = { query: {} };
```

- [ ] **Step 2: Add role-entry tests**

Add tests:

```ts
it('defaults signup to admin when role query is missing', () => {
  const wrapper = mount(Signup);

  expect(wrapper.text()).toContain('병원 목록 출처: 공공데이터포털(data.go.kr)');
  expect(wrapper.find('input[placeholder="초대코드 입력"]').exists()).toBe(false);
});

it('opens invite-code signup when role=user is provided', () => {
  routeState.value = { query: { role: 'user' } };

  const wrapper = mount(Signup);

  expect(wrapper.find('input[placeholder="초대코드 입력"]').exists()).toBe(true);
  expect(wrapper.text()).not.toContain('병원 목록 출처: 공공데이터포털(data.go.kr)');
});

it('falls back to admin when role query is invalid', () => {
  routeState.value = { query: { role: 'operator' } };

  const wrapper = mount(Signup);

  expect(wrapper.text()).toContain('병원 목록 출처: 공공데이터포털(data.go.kr)');
});
```

- [ ] **Step 3: Add signup shell/copy assertion**

```ts
it('shows the launch-ready signup context', () => {
  const wrapper = mount(Signup);

  expect(wrapper.text()).toContain('EveryShift');
  expect(wrapper.text()).toContain(
    '관리자는 병원을 선택해 가입 신청하고, 사용자는 초대코드로 참여합니다.'
  );
  expect(wrapper.get('[data-test="signup-submit"]').exists()).toBe(true);
  expect(wrapper.get('[data-test="signup-to-login"]').text()).toContain('로그인으로 이동');
});
```

- [ ] **Step 4: Run test to verify it fails**

Run:

```bash
pnpm test:unit tests/unit/signup-view.spec.ts
```

Expected: FAIL because `Signup.vue` does not read `route.query.role` and does not include the new shell copy yet.

### Task 5: Apply Shell and Role Query to Signup

**Files:**

- Modify: `src/views/auth/Signup.vue`
- Test: `tests/unit/signup-view.spec.ts`

- [ ] **Step 1: Import route and shell**

Add:

```ts
import { useRoute, useRouter } from 'vue-router';
import AuthPageShell from '@/components/auth/AuthPageShell.vue';
```

Keep `useRouter()` and add:

```ts
const route = useRoute();
```

- [ ] **Step 2: Resolve initial role safely**

Add:

```ts
function resolveInitialSignupRole(value: unknown): SignupRole {
  return value === 'user' ? 'user' : 'admin';
}
```

Then initialize:

```ts
role: resolveInitialSignupRole(route.query.role),
```

- [ ] **Step 3: Wrap existing signup card**

Use:

```vue
<AuthPageShell
  eyebrow="EveryShift 시작하기"
  title="회원가입"
  description="관리자는 병원을 선택해 가입 신청하고, 사용자는 초대코드로 참여합니다."
>
  <n-card class="mx-auto w-full max-w-xl lg:mr-0" title="회원가입">
    <!-- existing alerts and form -->
  </n-card>
</AuthPageShell>
```

- [ ] **Step 4: Preserve signup logic**

Keep:

- admin default for invalid/missing query
- role radio behavior
- hospital search
- hospital source copy
- invite-code mode
- `submitSignup(request)` payload shapes
- success banners
- `moveToLogin()` query handoff

- [ ] **Step 5: Run focused test**

Run:

```bash
pnpm test:unit tests/unit/signup-view.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/auth/Signup.vue tests/unit/signup-view.spec.ts
git commit -m "feat: redesign signup transition screen"
```

### Task 6: Add E2E Entry Coverage

**Files:**

- Modify: `tests/e2e/signup-flow.spec.ts`
- Test: `tests/e2e/signup-flow.spec.ts`

- [ ] **Step 1: Add `/signup?role=admin` entry assertion**

```ts
test('opens admin signup from role query', async ({ page }) => {
  await page.goto('/signup?role=admin');

  await expect(page.getByText('병원 목록 출처: 공공데이터포털(data.go.kr)')).toBeVisible();
  await expect(page.getByPlaceholder('초대코드 입력')).toHaveCount(0);
});
```

- [ ] **Step 2: Add `/signup?role=user` entry assertion**

```ts
test('opens invite signup from role query', async ({ page }) => {
  await page.goto('/signup?role=user');

  await expect(page.getByPlaceholder('초대코드 입력')).toBeVisible();
  await expect(page.getByText('병원 목록 출처: 공공데이터포털(data.go.kr)')).toHaveCount(0);
});
```

- [ ] **Step 3: Run focused E2E**

Run:

```bash
pnpm test:e2e tests/e2e/signup-flow.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/signup-flow.spec.ts
git commit -m "test: cover signup role entry routes"
```

### Task 7: Regression Gate

**Files:**

- Verify only unless fixes are needed.

- [ ] **Step 1: Run focused unit tests**

Run:

```bash
pnpm test:unit tests/unit/login-view.spec.ts tests/unit/signup-view.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run focused auth E2E**

Run:

```bash
pnpm test:e2e tests/e2e/signup-flow.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm lint:check
```

Expected: exits 0. Warnings may exist because the repository allows up to 9999 warnings, but there must be no ESLint errors.

- [ ] **Step 4: Optional visual check**

Run the app:

```bash
pnpm dev
```

Manually check:

- `/login`
- `/signup`
- `/signup?role=admin`
- `/signup?role=user`
- mobile width around 390px
- desktop width around 1440px

Expected:

- no text overlap
- no app sidebar/header on auth pages
- buttons remain visible without horizontal scrolling
- banners still appear after signup handoff

- [ ] **Step 5: Final commit if any verification fixes were required**

```bash
git add src tests
git commit -m "fix: harden auth redesign regressions"
```

## Acceptance Criteria

- `/login` and `/signup` share a consistent launch-ready auth shell.
- Existing login and signup behavior is unchanged.
- `/signup?role=admin` opens admin signup.
- `/signup?role=user` opens invite-code signup.
- Invalid signup role query falls back to admin.
- Existing `signupState` login handoff banners still work.
- Existing auth route constants remain the source of truth.
- No new provider login, analytics, registration approval, or database scope is added.
- `pnpm test:unit tests/unit/login-view.spec.ts tests/unit/signup-view.spec.ts` passes.
- `pnpm test:e2e tests/e2e/signup-flow.spec.ts` passes.
- `pnpm lint:check` passes with no ESLint errors.

## Explicit Non-Goals

- Do not add Google login, Kakao login, or OAuth callback UX.
- Do not change Supabase auth, signup-submit, hospital-search, or approval APIs.
- Do not change the `/app` route tree.
- Do not add organization CRUD.
- Do not add mobile-only navigation or analytics.
- Do not redesign the public landing page in this slice.

## Implementation Notes

- If `AuthPageShell.vue` makes unit tests awkward, mock it as a slot passthrough in affected tests:

```ts
vi.mock('@/components/auth/AuthPageShell.vue', () => ({
  default: defineComponent({
    props: {
      eyebrow: String,
      title: String,
      description: String,
    },
    setup(props, { slots }) {
      return () =>
        h('main', {}, [props.eyebrow, props.title, props.description, slots.default?.()]);
    },
  }),
}));
```

- Keep the implementation visually restrained. This is a hospital operations product, not a decorative SaaS splash page.
- Keep auth page copy short. The form should remain the primary interaction.
- Preserve current `data-test` attributes because E2E tests and future QA depend on them.
