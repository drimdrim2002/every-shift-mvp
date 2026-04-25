# Launch Core Slice 3 Public Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary `/` to `/app` redirect with a public Korean landing page while keeping `DefaultLayout` and app chrome restricted to `/app/*`.

**Architecture:** Treat this as a route-boundary and public-entry slice, not a product rewrite. Add a lazy public landing view at `/`, keep auth and access-state routes as top-level routes outside `DefaultLayout`, and update the auth guard so active authenticated visits to `/` first resolve to the canonical app root while login/signup continue to use the role-aware post-login matrix. The landing page should expose the launch IA structure and stable CTA hooks, but the real external inquiry URL/config remains Slice 5.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vue Router, Pinia, Naive UI, Tailwind CSS, Vitest, Vue Test Utils, Playwright

---

## Requirement Analysis

Slice 3 is currently blocked because `src/router/index.ts` still registers `/` as `redirect: APP_HOME_ROUTE_PATH`. That made sense during Slice 2, but it prevents unauthenticated users from seeing a public launch surface.

The slice must establish these behaviors:

- Logged-out `/` renders a public landing page.
- Active authenticated `/` does not render landing content and instead enters the workspace through `/app`.
- `/login`, `/signup`, `/access/pending`, and `/access/rejected` remain outside `DefaultLayout`.
- No app sidebar, app workspace header, organization switcher, or logout action appears on public/auth/access-state routes.
- Login and signup redirects stay role-aware:
  - `super_active` -> `/app/admin/approval-queue`
  - `admin_active` -> `/app`
  - `user_active` -> `/app/home/user`
- Public-root authenticated handling is separate from post-login handling:
  - `resolveAuthNavigationTarget({ toPath: '/', accessState: active })` should return `/app`.
  - A later `/app` route-access pass may still route restricted users or super users to their allowed workspace destination.

Keep out of this slice:

- `VITE_PUBLIC_INQUIRY_FORM_URL`
- `scripts/check-env.js` inquiry validation
- real Google Form wiring
- analytics
- OAuth or callback routes
- app workflow behavior changes

## File Map

- Create: `src/views/PublicLandingView.vue`
  - Public launch page for `/`.
  - Owns the hero, workflow summary, trust signals, and inquiry reinforcement section.
  - Uses Korean user-facing copy.
  - Must not import `DefaultLayout`, `Sidebar`, app stores, schedule views, or workspace data loaders.
- Create: `src/components/public/PublicHeader.vue`
  - Public-only header with brand and actions in the fixed order: `로그인`, `회원 가입`, `도입 문의`.
  - Uses route constants for login/signup destinations.
  - Emits or anchors inquiry CTA behavior without requiring Slice 5 config.
- Modify: `src/router/index.ts`
  - Replace the root redirect with a lazy `PublicLandingView` route.
  - Keep `Login`, `Signup`, `AccessPending`, and `AccessRejected` as top-level route records outside `/app`.
  - Keep `DefaultLayout` mounted only under `APP_HOME_ROUTE_PATH`.
- Modify: `src/router/guards.ts`
  - Change authenticated public-root handling from role-aware post-login redirect to `getAppHomeRoutePath()`.
  - Leave auth-page redirects and blocked-state redirects unchanged.
- Modify: `tests/unit/router-index.spec.ts`
  - Assert `/` has a component and no redirect.
  - Assert public/auth/access-state route records do not mount `DefaultLayout`.
- Modify: `tests/unit/router-auth-guards.spec.ts`
  - Update public-root active-user expectations to `/app`.
  - Keep login/signup role-aware expectations intact.
- Create: `tests/unit/public-landing.spec.ts`
  - Mount `PublicLandingView` and verify public header/action order, hero CTA destinations, workflow sections, trust signals, and absence of app chrome text.
- Modify: `tests/e2e/public-launch.spec.ts`
  - Add logged-out `/` landing coverage.
  - Add authenticated admin `/` redirect coverage.
  - Keep existing canonical `/app` and legacy redirect tests green.
- Optional Modify: `src/style.css`
  - Only if landing needs root tokens from `DESIGN.md`.
  - Do not do broad global style cleanup in this slice.

## UX And Copy Contract

Use these Korean labels exactly where applicable:

- Brand: `EveryShift`
- Header actions: `로그인`, `회원 가입`, `도입 문의`
- Primary hero CTA: `회원 가입`
- Secondary hero CTA: `도입 문의`
- Workflow section labels:
  - `기본 정보`
  - `사이트 정보`
  - `직원 정보`
  - `초기 데이터`
  - `결과 확인 / 수정 / 내보내기`
- Trust signal labels:
  - `보호된 작업 공간`
  - `관리자 승인 절차`
  - `공개 베타 운영`

Recommended landing headline:

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
- `도입 문의` -> stable button/anchor hook only in Slice 3

For Slice 3, do not create a fake Google Form URL. Prefer an internal `#inquiry` anchor or a button that scrolls to the inquiry reinforcement section. Slice 5 will replace this with the validated public config.

## Implementation Notes

Public root route shape:

```ts
{
  path: PUBLIC_ROOT_ROUTE_PATH,
  name: 'PublicLanding',
  component: () => import('@/views/PublicLandingView.vue'),
  meta: { requiresAuth: false, title: 'EveryShift' },
}
```

Guard behavior change:

```ts
if (isPublicRootRoutePath(toPath)) {
  return getAppHomeRoutePath();
}
```

Keep this block after blocked-state handling so pending/rejected users still land on access-state screens:

```ts
const blockedStatePath = resolveBlockedStatePath(accessState);
if (blockedStatePath) {
  return toPath === blockedStatePath ? null : blockedStatePath;
}
```

Public header should use `RouterLink` for internal links and a normal button or anchor for inquiry:

```vue
<RouterLink :to="LOGIN_ROUTE_PATH">로그인</RouterLink>
<RouterLink :to="{ path: SIGNUP_ROUTE_PATH, query: { role: 'admin' } }">회원 가입</RouterLink>
<a href="#inquiry" data-test="public-header-inquiry">도입 문의</a>
```

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

## Task 1: Lock Router And Guard Expectations

**Files:**

- Modify: `tests/unit/router-index.spec.ts`
- Modify: `tests/unit/router-auth-guards.spec.ts`
- Test: `tests/unit/router-index.spec.ts`
- Test: `tests/unit/router-auth-guards.spec.ts`

- [ ] **Step 1: Write the failing router-index expectation for `/`**

```ts
it('registers the public landing route at / without app layout or redirect', () => {
  const routes = createAppRoutes(false);
  const publicRootRoute = findTopLevelRouteByPath(routes, PUBLIC_ROOT_ROUTE_PATH);

  expect(publicRootRoute?.redirect).toBeUndefined();
  expect(publicRootRoute?.component).toBeTypeOf('function');
  expect(publicRootRoute?.meta).toMatchObject({
    requiresAuth: false,
    title: 'EveryShift',
  });
});
```

- [ ] **Step 2: Replace the old root redirect assertion**

Remove the expectation that `publicRootRoute?.redirect` is `APP_HOME_ROUTE_PATH` from the existing `mounts DefaultLayout only under the canonical /app workspace root` test.

Keep this part:

```ts
expect(appRoute?.component).toBeTypeOf('function');
expect(appRoute?.meta).toMatchObject({ requiresAuth: true });
```

- [ ] **Step 3: Add route-boundary assertions**

Extend the existing `@/constants/routes` import in `tests/unit/router-index.spec.ts` with:

```ts
ACCESS_PENDING_ROUTE_PATH,
ACCESS_REJECTED_ROUTE_PATH,
LOGIN_ROUTE_PATH,
SIGNUP_ROUTE_PATH,
```

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

- [ ] **Step 4: Update public-root active auth guard expectations**

Replace tests that expect active public-root visits to resolve to role-specific destinations:

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

- [ ] **Step 5: Add a regression assertion that login remains role-aware**

```ts
expect(
  resolveAuthNavigationTarget({
    toPath: LOGIN_ROUTE_PATH,
    isAuthenticated: true,
    accessState: 'super_active',
  })
).toBe(getApprovalQueueRoutePath());
```

- [ ] **Step 6: Run focused unit tests and confirm failure**

Run:

```bash
pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts
```

Expected:

- `router-index.spec.ts` fails because `/` still redirects to `/app`.
- `router-auth-guards.spec.ts` fails where public-root active users still resolve through the post-login matrix.

## Task 2: Implement Public Route And Authenticated Root Semantics

**Files:**

- Modify: `src/router/index.ts`
- Modify: `src/router/guards.ts`
- Test: `tests/unit/router-index.spec.ts`
- Test: `tests/unit/router-auth-guards.spec.ts`

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

This will not compile until `PublicLandingView.vue` exists. That is acceptable for the focused failing step.

- [ ] **Step 2: Update the guard import**

In `src/router/guards.ts`, make sure `getAppHomeRoutePath` is imported from `@/constants/routes`. It is already imported in the current file; do not add a duplicate import.

- [ ] **Step 3: Change only public-root active handling**

In `resolveAuthNavigationTarget`, replace:

```ts
if (isPublicRootRoutePath(toPath)) {
  const redirectPath = resolvePostAuthRedirectPath(accessState);
  return redirectPath === normalizeAppContractPath(toPath) ? null : redirectPath;
}
```

with:

```ts
if (isPublicRootRoutePath(toPath)) {
  const redirectPath = getAppHomeRoutePath();
  return redirectPath === normalizeAppContractPath(toPath) ? null : redirectPath;
}
```

Do not change the later `isAuthPagePath(toPath) || isAccessStateRoutePath(toPath)` branch.

- [ ] **Step 4: Run focused unit tests and confirm remaining failure is only missing view**

Run:

```bash
pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts
```

Expected:

- Guard assertions should pass.
- Router test may still fail during module resolution until `src/views/PublicLandingView.vue` is added.

## Task 3: Add Public Header Component

**Files:**

- Create: `src/components/public/PublicHeader.vue`
- Test: `tests/unit/public-landing.spec.ts` in Task 5

- [ ] **Step 1: Create the public component directory**

Run:

```bash
mkdir -p src/components/public
```

- [ ] **Step 2: Add `PublicHeader.vue`**

Use this structure:

```vue
<template>
  <header
    class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur"
    data-test="public-header"
  >
    <div
      class="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8"
    >
      <RouterLink class="text-lg font-bold text-slate-950" :to="PUBLIC_ROOT_ROUTE_PATH">
        EveryShift
      </RouterLink>

      <nav
        class="flex items-center gap-2 text-sm font-medium text-slate-700 sm:gap-3"
        aria-label="공개 페이지"
      >
        <RouterLink
          data-test="public-header-login"
          class="rounded px-3 py-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
          :to="LOGIN_ROUTE_PATH"
        >
          로그인
        </RouterLink>
        <RouterLink
          data-test="public-header-signup"
          class="rounded px-3 py-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
          :to="adminSignupLocation"
        >
          회원 가입
        </RouterLink>
        <a
          data-test="public-header-inquiry"
          class="rounded border border-teal-700 px-3 py-2 text-teal-800 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-600"
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

- [ ] **Step 3: Keep the header independent**

Verify `PublicHeader.vue` does not import:

```bash
rg -n "DefaultLayout|Sidebar|useAuthStore|useRbacStore|useScheduleStore" src/components/public/PublicHeader.vue
```

Expected: no matches.

## Task 4: Add Public Landing View

**Files:**

- Create: `src/views/PublicLandingView.vue`
- Test: `tests/unit/public-landing.spec.ts`
- Test: `tests/e2e/public-launch.spec.ts`

- [ ] **Step 1: Add `PublicLandingView.vue`**

Use a single public surface with semantic landmarks and no app-store imports:

```vue
<template>
  <div class="min-h-screen bg-slate-50 text-slate-900" data-test="public-landing">
    <PublicHeader />

    <main>
      <section
        class="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8"
        data-test="public-hero"
      >
        <div class="max-w-3xl">
          <p class="mb-4 text-sm font-semibold text-teal-800">
            병원 간호 운영을 위한 근무표 생성 도구
          </p>
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
          <div class="space-y-3">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
              <span class="text-sm font-semibold text-slate-950">2026년 5월 근무표</span>
              <span class="rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800"
                >검토 중</span
              >
            </div>
            <div class="grid grid-cols-7 gap-2 text-center text-xs text-slate-600">
              <span>월</span>
              <span>화</span>
              <span>수</span>
              <span>목</span>
              <span>금</span>
              <span>토</span>
              <span>일</span>
            </div>
            <div class="grid grid-cols-7 gap-2">
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

- [ ] **Step 2: Check scope by import scan**

Run:

```bash
rg -n "DefaultLayout|Sidebar|useAuthStore|useRbacStore|useScheduleStore|Dashboard|Step[1-5]" src/views/PublicLandingView.vue src/components/public/PublicHeader.vue
```

Expected: no matches.

- [ ] **Step 3: Run focused router tests**

Run:

```bash
pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts
```

Expected: PASS.

## Task 5: Add Public Landing Unit Tests

**Files:**

- Create: `tests/unit/public-landing.spec.ts`
- Test: `tests/unit/public-landing.spec.ts`

- [ ] **Step 1: Write the landing mount helper**

```ts
import { mount, RouterLinkStub } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PublicLandingView from '@/views/PublicLandingView.vue';
import { LOGIN_ROUTE_PATH, SIGNUP_ROUTE_PATH } from '@/constants/routes';

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

- [ ] **Step 2: Assert public header action order and destinations**

```ts
it('renders public header actions in launch IA order', () => {
  const wrapper = mountLanding();
  const header = wrapper.get('[data-test="public-header"]');

  expect(header.text()).toContain('EveryShift');
  expect(header.text().indexOf('로그인')).toBeLessThan(header.text().indexOf('회원 가입'));
  expect(header.text().indexOf('회원 가입')).toBeLessThan(header.text().indexOf('도입 문의'));

  expect(wrapper.get('[data-test="public-header-login"]').props('to')).toBe(LOGIN_ROUTE_PATH);
  expect(wrapper.get('[data-test="public-header-signup"]').props('to')).toEqual({
    path: SIGNUP_ROUTE_PATH,
    query: { role: 'admin' },
  });
  expect(wrapper.get('[data-test="public-header-inquiry"]').attributes('href')).toBe('#inquiry');
});
```

- [ ] **Step 3: Assert hero CTA and content contract**

```ts
it('renders the launch hero with signup-first CTA structure', () => {
  const wrapper = mountLanding();
  const hero = wrapper.get('[data-test="public-hero"]');

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

- [ ] **Step 4: Assert workflow and trust sections**

```ts
it('renders workflow and trust sections without app chrome', () => {
  const wrapper = mountLanding();

  expect(wrapper.get('[data-test="public-workflow-summary"]').text()).toContain('기본 정보');
  expect(wrapper.get('[data-test="public-workflow-summary"]').text()).toContain(
    '결과 확인 / 수정 / 내보내기'
  );
  expect(wrapper.get('[data-test="public-trust-signals"]').text()).toContain('보호된 작업 공간');
  expect(wrapper.get('[data-test="public-trust-signals"]').text()).toContain('관리자 승인 절차');

  expect(wrapper.text()).not.toContain('로그아웃');
  expect(wrapper.text()).not.toContain('조직');
  expect(wrapper.text()).not.toContain('근무표 관리');
});
```

- [ ] **Step 5: Run the new unit test and confirm pass**

Run:

```bash
pnpm test:unit -- tests/unit/public-landing.spec.ts
```

Expected: PASS.

## Task 6: Add Public Launch E2E Coverage

**Files:**

- Modify: `tests/e2e/public-launch.spec.ts`
- Test: `tests/e2e/public-launch.spec.ts`

- [ ] **Step 1: Add logged-out landing test**

Append near the top of `test.describe('public launch route contract', ...)`:

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

- [ ] **Step 2: Add authenticated root redirect test**

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

- [ ] **Step 3: Keep existing E2E route coexistence tests**

Do not remove the existing tests for:

- canonical `/app` dashboard
- legacy approval queue redirect
- legacy schedule step1 redirect
- legacy schedule step5 redirect

- [ ] **Step 4: Run focused E2E spec**

Run:

```bash
pnpm test:e2e -- tests/e2e/public-launch.spec.ts
```

Expected: PASS.

If this fails because the dev server is unavailable, start the project in another terminal with:

```bash
pnpm dev
```

Then rerun the focused E2E command.

## Task 7: Run Slice 3 Gate And Update Slice Progress

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

- [ ] **Step 4: Build check if E2E or lazy import behavior is suspicious**

Run when route lazy-loading or CSS changes look risky:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Update slice progress**

In `docs/launch/launch-core/launch-core-implementation-slices.md`, update the Slice Progress table:

```md
| Slice 3: Public landing + layout boundary | Done | `/` renders the public landing surface for logged-out users, active authenticated root visits enter `/app`, and app chrome stays scoped to `/app/*`. |
```

If the Korean mirror is maintained in the same branch, make the equivalent status change in `docs/launch/launch-core/launch-core-implementation-slices.ko.md`.

- [ ] **Step 6: Commit only Slice 3 files**

Run:

```bash
git status --short
git add src/router/index.ts src/router/guards.ts src/views/PublicLandingView.vue src/components/public/PublicHeader.vue tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/public-landing.spec.ts tests/e2e/public-launch.spec.ts docs/launch/launch-core/launch-core-implementation-slices.md
git commit -m "feat: add public launch landing route"
```

Add `docs/launch/launch-core/launch-core-implementation-slices.ko.md` to the commit only if it was intentionally updated.

## Final Verification Checklist

- [ ] `/` logged out renders `PublicLandingView`.
- [ ] `/` logged in does not show landing and starts at `/app`.
- [ ] `/login` renders without `Sidebar`, workspace `Header`, organization switcher, or `로그아웃`.
- [ ] `/signup` renders without app chrome.
- [ ] `/access/pending` renders without app chrome.
- [ ] `/access/rejected` renders without app chrome.
- [ ] `DefaultLayout` remains mounted only under `/app`.
- [ ] Public landing imports no app stores or schedule views.
- [ ] Header action order is `로그인` -> `회원 가입` -> `도입 문의`.
- [ ] Signup CTAs point to `/signup?role=admin`.
- [ ] Inquiry CTAs are stable hooks only; no fake Google Form URL is introduced before Slice 5.
- [ ] `pnpm lint:check` passes.
- [ ] Slice 3 unit gate passes.
- [ ] `tests/e2e/public-launch.spec.ts` passes.

## Known Follow-Ups For Later Slices

- Slice 4: Broader legacy redirect hardening.
- Slice 5: Replace inquiry CTA hooks with one validated `VITE_PUBLIC_INQUIRY_FORM_URL` config and real Google Form behavior.
- Slice 6: Vercel SPA deep-link contract, `pnpm check-env`, and full launch regression gate.
