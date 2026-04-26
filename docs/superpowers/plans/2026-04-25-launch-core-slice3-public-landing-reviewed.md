# Launch Core Slice 3 Public Landing Reviewed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary `/` to `/app` redirect with a Korean public landing page, while keeping `DefaultLayout` and app chrome restricted to `/app/*`.

**Architecture:** This is a route-boundary slice, not a product rewrite. `/` becomes a lazy public route, `/app` remains the authenticated workspace root, and authenticated visits to `/` redirect to `/app` without changing the role-aware post-login matrix for `/login` and `/signup`. The inquiry CTA is a stable Slice-3 hook only; Slice 5 owns the real `VITE_PUBLIC_INQUIRY_FORM_URL` Google Form wiring.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vue Router, Pinia, Tailwind CSS, Naive UI where already used, Vitest, Vue Test Utils, Playwright

---

## Review Result

### Alignment With `docs/launch/launch-core/launch-core-implementation-slices.md`

The previous plan at `docs/superpowers/plans/2026-04-25-launch-core-slice3-public-landing.md` matches the Slice 3 source of truth on the main behavior:

- `/` becomes a public landing page for logged-out users.
- Active authenticated users who visit `/` are redirected to `/app`.
- `/login`, `/signup`, `/access/pending`, and `/access/rejected` stay outside `DefaultLayout`.
- Post-login redirects remain role-aware:
  - `super_active` -> `/app/admin/approval-queue`
  - `admin_active` -> `/app`
  - `user_active` -> `/app/home/user`
- The landing page is isolated from app stores, schedule views, `DefaultLayout`, and app chrome.
- The Slice 3 test gate is correct:
  - `pnpm lint:check`
  - `pnpm test:unit -- tests/unit/public-landing.spec.ts tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts`
  - `pnpm test:e2e -- tests/e2e/public-launch.spec.ts`

### Differences To Fix Before Execution

1. The previous draft omitted the required landing footer from the launch IA section order. Add a simple public footer and test for it.
2. The previous `PublicHeader` snippet can overflow on narrow mobile widths because the brand plus three text actions are in one row. Use a wrapping header layout so actions remain reachable without horizontal overflow.
3. The inquiry CTA destination is ambiguous across docs:
   - Slice 3 implementation slices only require landing/header CTA structure.
   - Slice 5 explicitly owns the real inquiry CTA config and external Google Form behavior.
   - The broader launch plan says no CTA may be a dead end.
     Resolution for this plan: use `#inquiry` as a temporary, visible Slice-3 landing section hook; do not add fake external URLs or env validation. Mark Slice 5 as the required follow-up that replaces the hook with the real validated URL.
4. `tests/unit/header.spec.ts` is only relevant if the existing app `Header.vue` changes. This plan creates `src/components/public/PublicHeader.vue`, so do not touch `tests/unit/header.spec.ts` unless implementation unexpectedly modifies shared header logic.
5. The previous draft updates the Slice Progress table to Done in the final task. Keep that, but only after lint, unit, and E2E gates pass.

### Explicit Non-Goals

- Do not wire `VITE_PUBLIC_INQUIRY_FORM_URL`.
- Do not edit `scripts/check-env.js`.
- Do not add analytics, OAuth callback routes, Google login, or Kakao login.
- Do not change schedule-generation behavior.
- Do not add organization, employee, or shift CRUD.
- Do not fetch org-scoped workspace data on `/`.

## File Structure

- Create: `src/components/public/PublicHeader.vue`
  - Public-only header.
  - Owns brand and the fixed action order: `로그인`, `회원 가입`, `도입 문의`.
  - Uses route constants for login/signup.
  - Uses `#inquiry` as the temporary Slice-3 inquiry hook.
- Create: `src/views/PublicLandingView.vue`
  - Public landing page for `/`.
  - Owns hero, product preview, workflow summary, trust signals, inquiry reinforcement, and footer.
  - Uses Korean user-facing copy.
  - Must not import `DefaultLayout`, `Sidebar`, app stores, schedule views, or workspace data loaders.
- Modify: `src/router/index.ts`
  - Replace root redirect with lazy `PublicLandingView`.
  - Keep auth and access-state routes top-level outside `/app`.
- Modify: `src/router/guards.ts`
  - Change authenticated public-root handling to return `getAppHomeRoutePath()`.
  - Keep blocked-state handling before public-root handling.
  - Keep auth-page role-aware redirect handling unchanged.
- Modify: `tests/unit/router-index.spec.ts`
  - Assert `/` has a lazy component and no redirect.
  - Assert public/auth/access-state routes are top-level route records without children.
- Modify: `tests/unit/router-auth-guards.spec.ts`
  - Assert active authenticated `/` resolves to `/app`.
  - Preserve login role-aware expectations.
- Create: `tests/unit/public-landing.spec.ts`
  - Verify public header order/destinations, hero CTA destinations, workflow/trust/inquiry/footer content, and no app chrome text.
- Modify: `tests/e2e/public-launch.spec.ts`
  - Add logged-out `/` landing coverage.
  - Add authenticated admin `/` redirect coverage.
  - Keep existing canonical `/app` and legacy redirect coverage.
- Modify: `docs/launch/launch-core/launch-core-implementation-slices.md`
  - Mark Slice 3 Done only after verification passes.

## UX And Copy Contract

Use these labels exactly:

- Brand: `EveryShift`
- Header actions: `로그인`, `회원 가입`, `도입 문의`
- Primary hero CTA: `회원 가입`
- Secondary hero CTA: `도입 문의`
- Workflow labels:
  - `기본 정보`
  - `사이트 정보`
  - `직원 정보`
  - `초기 데이터`
  - `결과 확인 / 수정 / 내보내기`
- Trust signal labels:
  - `보호된 작업 공간`
  - `관리자 승인 절차`
  - `공개 베타 운영`

Recommended hero headline:

```text
간호사 근무표 생성을 더 빠르고 신뢰할 수 있게
```

Recommended supporting copy:

```text
EveryShift는 병동 운영자가 기본 정보, 사이트 조건, 직원 데이터를 입력하고 생성 결과를 검토해 Excel로 내보낼 수 있는 근무표 생성 도구입니다.
```

CTA routing:

- `로그인` -> `LOGIN_ROUTE_PATH`
- `회원 가입` -> `{ path: SIGNUP_ROUTE_PATH, query: { role: 'admin' } }`
- `도입 문의` -> `#inquiry` in Slice 3 only

Stable test hooks:

- `data-test="public-landing"`
- `data-test="public-header"`
- `data-test="public-header-login"`
- `data-test="public-header-signup"`
- `data-test="public-header-inquiry"`
- `data-test="public-hero"`
- `data-test="public-hero-signup"`
- `data-test="public-hero-inquiry"`
- `data-test="public-workflow-summary"`
- `data-test="public-trust-signals"`
- `data-test="public-inquiry-section"`
- `data-test="public-footer"`

## Task 1: Lock Router And Guard Expectations

**Files:**

- Modify: `tests/unit/router-index.spec.ts`
- Modify: `tests/unit/router-auth-guards.spec.ts`

- [ ] **Step 1: Update route constant imports in `tests/unit/router-index.spec.ts`**

Add:

```ts
ACCESS_PENDING_ROUTE_PATH,
ACCESS_REJECTED_ROUTE_PATH,
LOGIN_ROUTE_PATH,
SIGNUP_ROUTE_PATH,
```

- [ ] **Step 2: Replace the old root redirect expectation**

In `mounts DefaultLayout only under the canonical /app workspace root`, replace the old public-root assertions with:

```ts
expect(publicRootRoute?.redirect).toBeUndefined();
expect(publicRootRoute?.component).toBeTypeOf('function');
expect(publicRootRoute?.meta).toMatchObject({
  requiresAuth: false,
  title: 'EveryShift',
});
expect(appRoute?.component).toBeTypeOf('function');
expect(appRoute?.meta).toMatchObject({ requiresAuth: true });
```

- [ ] **Step 3: Add layout-boundary route assertions**

```ts
it('keeps public auth and access-state routes outside DefaultLayout', () => {
  const routes = createAppRoutes(false);

  for (const path of [
    PUBLIC_ROOT_ROUTE_PATH,
    LOGIN_ROUTE_PATH,
    SIGNUP_ROUTE_PATH,
    ACCESS_PENDING_ROUTE_PATH,
    ACCESS_REJECTED_ROUTE_PATH,
  ]) {
    const route = findTopLevelRouteByPath(routes, path);
    expect(route?.path).toBe(path);
    expect(route?.children).toBeUndefined();
  }

  expect(findTopLevelRouteByPath(routes, APP_HOME_ROUTE_PATH)?.children?.length).toBeGreaterThan(0);
});
```

- [ ] **Step 4: Update public-root active guard tests**

In `tests/unit/router-auth-guards.spec.ts`, change active public-root expectations to `/app`:

```ts
expect(
  resolveAuthNavigationTarget({
    toPath: PUBLIC_ROOT_ROUTE_PATH,
    isAuthenticated: true,
    accessState: 'user_active',
  })
).toBe(APP_HOME_ROUTE_PATH);

expect(
  resolveAuthNavigationTarget({
    toPath: PUBLIC_ROOT_ROUTE_PATH,
    isAuthenticated: true,
    accessState: 'super_active',
    abilities: {
      canViewApprovalQueue: true,
      canSwitchOrganization: true,
      canViewRestrictedUserHome: false,
      canManageOrganizationSetup: false,
      canManageEmployees: false,
      canManageSchedules: false,
    },
  })
).toBe(APP_HOME_ROUTE_PATH);
```

- [ ] **Step 5: Preserve login role-aware regression coverage**

Keep or add:

```ts
expect(
  resolveAuthNavigationTarget({
    toPath: LOGIN_ROUTE_PATH,
    isAuthenticated: true,
    accessState: 'super_active',
  })
).toBe(getApprovalQueueRoutePath());
```

- [ ] **Step 6: Run focused tests and confirm failure**

Run:

```bash
pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts
```

Expected:

- `router-index.spec.ts` fails because `/` still redirects to `/app`.
- `router-auth-guards.spec.ts` fails because active public-root visits still resolve through the post-login matrix.

## Task 2: Add Public Landing Unit Contract

**Files:**

- Create: `tests/unit/public-landing.spec.ts`

- [ ] **Step 1: Create the test with a mount helper**

```ts
import { mount, RouterLinkStub } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { LOGIN_ROUTE_PATH, SIGNUP_ROUTE_PATH } from '@/constants/routes';
import PublicLandingView from '@/views/PublicLandingView.vue';

function mountLanding() {
  return mount(PublicLandingView, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
      },
    },
  });
}
```

- [ ] **Step 2: Add header order and destination coverage**

```ts
it('renders public header actions in launch IA order', () => {
  const wrapper = mountLanding();
  const header = wrapper.get('[data-test="public-header"]');
  const headerText = header.text();

  expect(headerText).toContain('EveryShift');
  expect(headerText.indexOf('로그인')).toBeLessThan(headerText.indexOf('회원 가입'));
  expect(headerText.indexOf('회원 가입')).toBeLessThan(headerText.indexOf('도입 문의'));
  expect(wrapper.get('[data-test="public-header-login"]').props('to')).toBe(LOGIN_ROUTE_PATH);
  expect(wrapper.get('[data-test="public-header-signup"]').props('to')).toEqual({
    path: SIGNUP_ROUTE_PATH,
    query: { role: 'admin' },
  });
  expect(wrapper.get('[data-test="public-header-inquiry"]').attributes('href')).toBe('#inquiry');
});
```

- [ ] **Step 3: Add hero CTA coverage**

```ts
it('renders the launch hero with signup-first CTA structure', () => {
  const wrapper = mountLanding();
  const hero = wrapper.get('[data-test="public-hero"]');

  expect(hero.text()).toContain('EveryShift');
  expect(hero.text()).toContain('간호사 근무표 생성을 더 빠르고 신뢰할 수 있게');
  expect(hero.text()).toContain('회원 가입');
  expect(hero.text()).toContain('도입 문의');
  expect(wrapper.get('[data-test="public-hero-signup"]').props('to')).toEqual({
    path: SIGNUP_ROUTE_PATH,
    query: { role: 'admin' },
  });
  expect(wrapper.get('[data-test="public-hero-inquiry"]').attributes('href')).toBe('#inquiry');
});
```

- [ ] **Step 4: Add section, footer, and app-chrome isolation coverage**

```ts
it('renders landing sections and footer without app chrome', () => {
  const wrapper = mountLanding();

  expect(wrapper.get('[data-test="public-workflow-summary"]').text()).toContain('기본 정보');
  expect(wrapper.get('[data-test="public-workflow-summary"]').text()).toContain(
    '결과 확인 / 수정 / 내보내기'
  );
  expect(wrapper.get('[data-test="public-trust-signals"]').text()).toContain('보호된 작업 공간');
  expect(wrapper.get('[data-test="public-trust-signals"]').text()).toContain('관리자 승인 절차');
  expect(wrapper.get('[data-test="public-inquiry-section"]').text()).toContain('도입 문의');
  expect(wrapper.get('[data-test="public-footer"]').text()).toContain('EveryShift');

  expect(wrapper.text()).not.toContain('로그아웃');
  expect(wrapper.text()).not.toContain('조직 선택');
  expect(wrapper.text()).not.toContain('근무표 관리');
});
```

- [ ] **Step 5: Run the new unit test and confirm failure**

Run:

```bash
pnpm test:unit -- tests/unit/public-landing.spec.ts
```

Expected: FAIL because `src/views/PublicLandingView.vue` does not exist yet.

## Task 3: Implement Public Route And Guard Semantics

**Files:**

- Modify: `src/router/index.ts`
- Modify: `src/router/guards.ts`

- [ ] **Step 1: Replace the root redirect route**

In `src/router/index.ts`, replace:

```ts
{
  path: PUBLIC_ROOT_ROUTE_PATH,
  redirect: APP_HOME_ROUTE_PATH,
},
```

with:

```ts
{
  path: PUBLIC_ROOT_ROUTE_PATH,
  name: 'PublicLanding',
  component: () => import('@/views/PublicLandingView.vue'),
  meta: { requiresAuth: false, title: 'EveryShift' },
},
```

- [ ] **Step 2: Change only public-root active handling**

In `src/router/guards.ts`, replace the `isPublicRootRoutePath(toPath)` branch with:

```ts
if (isPublicRootRoutePath(toPath)) {
  const redirectPath = getAppHomeRoutePath();
  return redirectPath === normalizeAppContractPath(toPath) ? null : redirectPath;
}
```

Keep blocked-state handling above this branch. Keep the later `isAuthPagePath(toPath) || isAccessStateRoutePath(toPath)` branch role-aware.

- [ ] **Step 3: Run focused router tests**

Run:

```bash
pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts
```

Expected:

- Guard expectations pass.
- Router tests may still fail during module resolution until `PublicLandingView.vue` exists.

## Task 4: Add Public Header And Landing View

**Files:**

- Create: `src/components/public/PublicHeader.vue`
- Create: `src/views/PublicLandingView.vue`

- [ ] **Step 1: Create the public component directory**

Run:

```bash
mkdir -p src/components/public
```

- [ ] **Step 2: Add `src/components/public/PublicHeader.vue`**

Use one wrapping public header so narrow mobile widths do not overflow:

```vue
<template>
  <header
    class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur"
    data-test="public-header"
  >
    <div
      class="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:px-6 lg:px-8"
    >
      <RouterLink class="text-lg font-bold text-slate-950" :to="PUBLIC_ROOT_ROUTE_PATH">
        EveryShift
      </RouterLink>

      <nav
        class="flex w-full items-center justify-end gap-1 text-sm font-medium text-slate-700 sm:w-auto sm:gap-2"
        aria-label="공개 페이지"
      >
        <RouterLink
          data-test="public-header-login"
          class="rounded px-2 py-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 sm:px-3"
          :to="LOGIN_ROUTE_PATH"
        >
          로그인
        </RouterLink>
        <RouterLink
          data-test="public-header-signup"
          class="rounded px-2 py-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 sm:px-3"
          :to="adminSignupLocation"
        >
          회원 가입
        </RouterLink>
        <a
          data-test="public-header-inquiry"
          class="rounded border border-teal-700 px-2 py-2 text-teal-800 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-600 sm:px-3"
          href="#inquiry"
        >
          도입 문의
        </a>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import { LOGIN_ROUTE_PATH, PUBLIC_ROOT_ROUTE_PATH, SIGNUP_ROUTE_PATH } from '@/constants/routes';

const adminSignupLocation: RouteLocationRaw = {
  path: SIGNUP_ROUTE_PATH,
  query: { role: 'admin' },
};
</script>
```

- [ ] **Step 3: Add `src/views/PublicLandingView.vue`**

Use a public-only surface with required section order: hero, workflow summary, trust signals, inquiry reinforcement, footer.

```vue
<template>
  <div class="min-h-screen bg-slate-50 text-slate-900" data-test="public-landing">
    <PublicHeader />

    <main>
      <section
        class="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8"
        data-test="public-hero"
      >
        <div class="max-w-3xl">
          <p class="mb-3 text-sm font-semibold text-teal-800">EveryShift</p>
          <h1 class="max-w-2xl text-4xl font-bold leading-tight text-slate-950">
            간호사 근무표 생성을 더 빠르고 신뢰할 수 있게
          </h1>
          <p class="mt-5 max-w-2xl text-base leading-7 text-slate-700">
            EveryShift는 병동 운영자가 기본 정보, 사이트 조건, 직원 데이터를 입력하고 생성 결과를
            검토해 Excel로 내보낼 수 있는 근무표 생성 도구입니다.
          </p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <RouterLink
              data-test="public-hero-signup"
              class="inline-flex min-h-11 items-center justify-center rounded bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
              :to="adminSignupLocation"
            >
              회원 가입
            </RouterLink>
            <a
              data-test="public-hero-inquiry"
              class="inline-flex min-h-11 items-center justify-center rounded border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
              href="#inquiry"
            >
              도입 문의
            </a>
          </div>
        </div>

        <div
          class="border border-slate-200 bg-white p-5 shadow-sm"
          aria-label="근무표 생성 흐름 미리보기"
        >
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <span class="text-sm font-semibold text-slate-950">2026년 5월 근무표</span>
            <span class="rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800"
              >검토 중</span
            >
          </div>
          <div class="mt-4 grid grid-cols-7 gap-2 text-center text-xs text-slate-600">
            <span v-for="day in weekdays" :key="day">{{ day }}</span>
          </div>
          <div class="mt-2 grid grid-cols-7 gap-2">
            <span
              v-for="cell in previewCells"
              :key="cell.key"
              class="flex aspect-square items-center justify-center rounded border text-xs font-semibold"
              :class="cell.className"
            >
              {{ cell.label }}
            </span>
          </div>
        </div>
      </section>

      <section class="border-y border-slate-200 bg-white py-12" data-test="public-workflow-summary">
        <div class="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 class="text-2xl font-bold text-slate-950">근무표 생성 흐름</h2>
          <div class="mt-6 grid gap-3 md:grid-cols-5">
            <div
              v-for="item in workflowItems"
              :key="item"
              class="border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-800"
            >
              {{ item }}
            </div>
          </div>
        </div>
      </section>

      <section
        class="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8"
        data-test="public-trust-signals"
      >
        <h2 class="text-2xl font-bold text-slate-950">출시 기준</h2>
        <div class="mt-6 grid gap-4 md:grid-cols-3">
          <article
            v-for="signal in trustSignals"
            :key="signal.title"
            class="border border-slate-200 bg-white p-5"
          >
            <h3 class="text-base font-bold text-slate-950">{{ signal.title }}</h3>
            <p class="mt-2 text-sm leading-6 text-slate-600">{{ signal.description }}</p>
          </article>
        </div>
      </section>

      <section id="inquiry" class="bg-teal-950 py-12 text-white" data-test="public-inquiry-section">
        <div class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 sm:px-6 lg:px-8">
          <h2 class="text-2xl font-bold">도입 문의</h2>
          <p class="max-w-2xl text-sm leading-6 text-teal-50">
            소개 자료, 무료 사용, 병동 적용 방식이 궁금하다면 공개 문의 경로로 이어집니다. 실제 문의
            폼 연결은 다음 런칭 슬라이스에서 검증된 설정값으로 고정됩니다.
          </p>
        </div>
      </section>
    </main>

    <footer
      class="border-t border-slate-200 bg-white py-6 text-sm text-slate-600"
      data-test="public-footer"
    >
      <div class="mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <span class="font-semibold text-slate-900">EveryShift</span>
        <span>공개 베타</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import PublicHeader from '@/components/public/PublicHeader.vue';
import { SIGNUP_ROUTE_PATH } from '@/constants/routes';

const adminSignupLocation: RouteLocationRaw = {
  path: SIGNUP_ROUTE_PATH,
  query: { role: 'admin' },
};

const weekdays = ['월', '화', '수', '목', '금', '토', '일'];

const workflowItems = [
  '기본 정보',
  '사이트 정보',
  '직원 정보',
  '초기 데이터',
  '결과 확인 / 수정 / 내보내기',
];

const trustSignals = [
  {
    title: '보호된 작업 공간',
    description: '공개 페이지와 실제 근무표 작업 공간을 분리합니다.',
  },
  {
    title: '관리자 승인 절차',
    description: '병원 관리자 신청은 승인 상태에 따라 접근 화면이 달라집니다.',
  },
  {
    title: '공개 베타 운영',
    description: '런칭 기간에는 핵심 근무표 생성 흐름을 우선 검증합니다.',
  },
];

const previewCells = [
  { key: '1', label: 'D', className: 'border-green-200 bg-green-50 text-green-800' },
  { key: '2', label: 'E', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  { key: '3', label: 'N', className: 'border-blue-200 bg-blue-50 text-blue-800' },
  { key: '4', label: 'Off', className: 'border-slate-200 bg-slate-100 text-slate-700' },
  { key: '5', label: 'D', className: 'border-green-200 bg-green-50 text-green-800' },
  { key: '6', label: 'E', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  { key: '7', label: 'N', className: 'border-blue-200 bg-blue-50 text-blue-800' },
];
</script>
```

- [ ] **Step 4: Run import scope scan**

Run:

```bash
rg -n "DefaultLayout|Sidebar|useAuthStore|useRbacStore|useScheduleStore|Dashboard|Step[1-5]" src/views/PublicLandingView.vue src/components/public/PublicHeader.vue
```

Expected: no matches.

- [ ] **Step 5: Run landing and router unit tests**

Run:

```bash
pnpm test:unit -- tests/unit/public-landing.spec.ts tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts
```

Expected: PASS.

## Task 5: Add Public Launch E2E Coverage

**Files:**

- Modify: `tests/e2e/public-launch.spec.ts`

- [ ] **Step 1: Add logged-out landing coverage near the top of the describe block**

```ts
test('logged-out visitor sees public landing at root without app chrome', async ({ page }) => {
  await page.context().clearCookies();
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/');

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('public-landing')).toBeVisible();
  await expect(page.getByRole('link', { name: '로그인' })).toBeVisible();
  await expect(page.getByRole('link', { name: '회원 가입' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: '도입 문의' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '로그아웃' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '근무표 관리', exact: true })).toHaveCount(0);
});
```

- [ ] **Step 2: Add authenticated root redirect coverage**

```ts
test('authenticated admin visiting root enters the canonical app workspace', async ({ page }) => {
  await seedPlaywrightAuthState(page);
  await mockRbacContext(page, 'admin_active');

  await page.goto('/');

  await expect(page).toHaveURL(new RegExp(`${APP_HOME_ROUTE_PATH}$`));
  await expect(
    page.getByRole('heading', { name: '근무표 관리', exact: true }).last()
  ).toBeVisible();
});
```

- [ ] **Step 3: Keep existing launch route coverage**

Do not remove existing tests for:

- authenticated admin canonical `/app`
- legacy approval queue redirect
- legacy schedule step1 redirect
- legacy schedule step5 redirect

- [ ] **Step 4: Run focused E2E**

Run:

```bash
pnpm test:e2e -- tests/e2e/public-launch.spec.ts
```

Expected: PASS.

If Playwright reports that the dev server is unavailable, start the app in another terminal with:

```bash
pnpm dev
```

Then rerun the focused E2E command.

## Task 6: Run Slice 3 Gate And Update Slice Progress

**Files:**

- Modify: `docs/launch/launch-core/launch-core-implementation-slices.md`
- Optional Modify: `docs/launch/launch-core/launch-core-implementation-slices.ko.md`

- [ ] **Step 1: Run lint**

Run:

```bash
pnpm lint:check
```

Expected: PASS.

If ESLint reports fixable issues:

```bash
pnpm lint:fix
pnpm lint:check
```

- [ ] **Step 2: Run the Slice 3 unit gate**

Run:

```bash
pnpm test:unit -- tests/unit/public-landing.spec.ts tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Run the Slice 3 E2E gate**

Run:

```bash
pnpm test:e2e -- tests/e2e/public-launch.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Run build if lazy route import or CSS behavior is suspicious**

Run only if route lazy-loading, Tailwind classes, or E2E first-paint behavior looks risky:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Update Slice Progress**

In `docs/launch/launch-core/launch-core-implementation-slices.md`, update:

```md
| Slice 3: Public landing + layout boundary | Done | `/` renders the public landing surface for logged-out users, active authenticated root visits enter `/app`, and app chrome stays scoped to `/app/*`. |
```

Only update `docs/launch/launch-core/launch-core-implementation-slices.ko.md` if the branch is intentionally maintaining the Korean mirror in the same change.

- [ ] **Step 6: Commit only Slice 3 files**

Run:

```bash
git status --short
git add src/router/index.ts src/router/guards.ts src/views/PublicLandingView.vue src/components/public/PublicHeader.vue tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/public-landing.spec.ts tests/e2e/public-launch.spec.ts docs/launch/launch-core/launch-core-implementation-slices.md
git commit -m "feat: add public launch landing route"
```

Add `docs/launch/launch-core/launch-core-implementation-slices.ko.md` only if intentionally updated.

## Final Verification Checklist

- [ ] `/` logged out renders `PublicLandingView`.
- [ ] `/` logged in does not show landing and enters `/app`.
- [ ] `/login` renders without `Sidebar`, workspace header controls, organization switcher, or `로그아웃`.
- [ ] `/signup` renders without app chrome.
- [ ] `/access/pending` renders without app chrome.
- [ ] `/access/rejected` renders without app chrome.
- [ ] `DefaultLayout` remains mounted only under `/app`.
- [ ] Public landing imports no app stores or schedule views.
- [ ] Header action order is `로그인` -> `회원 가입` -> `도입 문의`.
- [ ] Signup CTAs point to `/signup?role=admin`.
- [ ] Inquiry CTAs are stable `#inquiry` hooks only; no fake Google Form URL is introduced before Slice 5.
- [ ] The footer is present.
- [ ] Mobile header actions do not overflow at narrow widths.
- [ ] `pnpm lint:check` passes.
- [ ] Slice 3 unit gate passes.
- [ ] `tests/e2e/public-launch.spec.ts` passes.

## Known Follow-Ups For Later Slices

- Slice 4: Broader legacy redirect hardening.
- Slice 5: Replace `#inquiry` hooks with one validated `VITE_PUBLIC_INQUIRY_FORM_URL` destination and real Google Form behavior.
- Slice 6: Vercel SPA deep-link contract, environment validation gate, and full launch regression gate.
