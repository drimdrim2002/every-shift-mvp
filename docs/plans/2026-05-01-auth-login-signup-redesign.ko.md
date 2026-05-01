# 인증 로그인/회원가입 리디자인 구현 계획

> **agentic worker용:** 필수 하위 스킬: 이 계획을 작업 단위로 구현할 때는 `superpowers:subagent-driven-development`(권장) 또는 `superpowers:executing-plans`를 사용하세요. 진행 추적은 체크박스(`- [ ]`) 문법을 사용합니다.

**목표:** 기존 이메일/비밀번호, 승인, 초대코드, 로그인 후 라우팅 계약은 유지하면서 `/login`과 `/signup` 인증 전환 화면을 더 신뢰감 있고 명확하며 출시 준비가 된 상태로 리디자인합니다.

**아키텍처:** 인증 동작은 기존 `Login.vue`, `Signup.vue`, `useAuthStore`, route constants에 그대로 둡니다. 인증 페이지용 공유 프레젠테이션 셸을 하나 추가한 뒤, 문구, CTA, route handoff, disabled state, 반응형 구조에 대한 focused unit/E2E 커버리지를 업데이트합니다. 새 인증 제공자, 스키마 변경, analytics, app-shell 라우팅 변경은 추가하지 않습니다.

**기술 스택:** Vue 3 `<script setup>`, TypeScript, Vue Router, Pinia, Naive UI, Tailwind CSS, Vitest, Vue Test Utils, Playwright.

---

## 계획 검토 요약

원래 참조된 계획 파일은 작업공간의 `docs/plans/2026-05-01-auth-login-signup-redesign.md`에 없었으므로, 이 문서는 요청된 경로에 생성한 보강 구현 계획의 한국어 번역본입니다.

현재 코드 상태:

- `src/views/auth/Login.vue`와 `src/views/auth/Signup.vue`가 이미 공개 인증 화면을 소유합니다.
- `src/constants/routes.ts`가 이미 `/login`, `/signup`, `/app`, access-state, 로그인 후 redirect 경로를 중앙화합니다.
- `src/router/index.ts`가 이미 Launch Core route boundary에 따라 `/login`, `/signup`, `/access/*`, `/`, `/app/*`를 마운트합니다.
- `tests/unit/login-view.spec.ts`, `tests/unit/signup-view.spec.ts`, `tests/e2e/signup-flow.spec.ts`가 이미 핵심 auth handoff를 다룹니다.
- `DESIGN.md`는 auth page를 전환 표면으로 정의합니다: title, 짧은 reassurance, form, next step.

보강 결정:

- 리디자인은 frontend-only로 유지합니다.
- 모든 사용자-facing 텍스트는 한국어로 유지합니다.
- Naive UI form control을 재사용하고, custom input은 만들지 않습니다.
- 작은 공유 auth shell은 두 인증 페이지가 즉시 함께 사용할 때만 도입합니다.
- hardcoded `/login` 또는 `/signup` 대신 route constants를 사용합니다.
- `submitSignup`, `authStore.login`, RBAC hydration, approval routing, Supabase function contract는 변경하지 않습니다.
- `data-test="login-email"`, `data-test="login-submit"`, `data-test="signup-submit"`, `data-test="signup-to-login"` 같은 기존 selector를 보존합니다.

## 파일 구조

### 생성

- `src/components/auth/AuthPageShell.vue`
  - 공유 2-zone auth page frame입니다.
  - 배경, brand/product context, responsive layout, form slot을 소유합니다.
  - 단순 string prop인 `title`, `description`, `eyebrow`를 받습니다.
  - login, signup, RBAC, Supabase, form state를 알지 않습니다.

### 수정

- `src/views/auth/Login.vue`
  - 단순 중앙 정렬 card wrapper를 `AuthPageShell`로 교체합니다.
  - 짧은 한국어 reassurance line을 추가합니다.
  - 기존 form model, validation, login handler, `signupState` query cleanup, route replacement behavior를 보존합니다.
  - `moveToSignup()`은 `SIGNUP_ROUTE_PATH`를 계속 사용합니다.

- `src/views/auth/Signup.vue`
  - 단순 중앙 정렬 card wrapper를 `AuthPageShell`로 교체합니다.
  - 첫 로드에서 `route.query.role`을 읽어 `/signup?role=admin`은 admin mode로, `/signup?role=user`는 user mode로 명시적으로 시작하게 합니다.
  - role query가 없거나 잘못된 경우 admin을 기본값으로 유지합니다.
  - hospital search, invite-code 분기, submit payload, login handoff behavior를 유지합니다.

- `tests/unit/login-view.spec.ts`
  - 새 shell에 필요한 범위 안에서만 Naive UI/component mock을 업데이트합니다.
  - 리디자인된 한국어 transition copy assertion을 추가합니다.
  - 기존 redirect/access-state assertion을 보존합니다.

- `tests/unit/signup-view.spec.ts`
  - role query behavior를 테스트할 수 있도록 `useRoute()`를 mock합니다.
  - admin default, `?role=admin`, invalid role fallback, `?role=user` assertion을 추가합니다.
  - hospital search와 login handoff assertion을 보존합니다.

- `tests/e2e/signup-flow.spec.ts`
  - `/signup?role=admin` route-entry assertion을 하나 추가합니다.
  - `/signup?role=user` route-entry assertion을 하나 추가합니다.
  - 기존 admin pending 및 invite active handoff 테스트를 보존합니다.

### 수정하지 말 것

- `src/stores/auth.ts`
- `src/api/signup.ts`
- `src/types/signup.ts`
- `src/router/index.ts`
- `src/router/guards.ts`
- Supabase functions 또는 migrations

## UX 계약

### 로그인 페이지

로그인 페이지는 아래를 전달해야 합니다.

- Product: `EveryShift`
- Screen title: `로그인`
- Reassurance: `승인된 병원 계정으로 근무표 작업 공간에 들어갑니다.`
- Primary action: `로그인`
- Secondary action: `회원가입`

동작은 유지해야 합니다.

- successful active login은 `resolvePostAuthRedirectPath(result.accessState)`를 통해 route됩니다.
- pending admin은 `/access/pending`으로 route됩니다.
- rejected admin은 `/access/rejected`로 route됩니다.
- `no_membership_or_inactive`는 logout 후 `/login`에 머뭅니다.
- `signupState=pending_approval`과 `signupState=active`는 기존 handoff banner를 계속 보여준 뒤 query를 정리합니다.

### 회원가입 페이지

회원가입 페이지는 아래를 전달해야 합니다.

- Product: `EveryShift`
- Screen title: `회원가입`
- Reassurance: `관리자는 병원을 선택해 가입 신청하고, 사용자는 초대코드로 참여합니다.`
- Admin submit action: `가입 신청`
- User submit action: `가입하기`
- Login handoff action: `로그인으로 이동`

동작은 유지해야 합니다.

- query가 없거나 `/signup?role=admin`이면 admin이 기본값입니다.
- `/signup?role=user`는 invite-code mode로 시작합니다.
- invalid role query는 admin으로 fallback합니다.
- admin signup은 hospital selection을 요구하고 pending approval을 반환합니다.
- invite signup은 invite code를 요구하고 active login handoff를 반환합니다.

## 작업

### Task 1: 로그인 리디자인 기대 동작 고정

**Files:**

- Modify: `tests/unit/login-view.spec.ts`
- Test: `tests/unit/login-view.spec.ts`

- [ ] **Step 1: 구현 전에 shell/copy assertion 추가**

기존 login view mount test 또는 새 focused test에 assertion을 추가합니다.

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

- [ ] **Step 2: 테스트를 실행해 실패를 확인**

Run:

```bash
pnpm test:unit tests/unit/login-view.spec.ts
```

Expected: 새 reassurance copy 또는 shell content가 아직 없으므로 FAIL.

- [ ] **Step 3: TDD commit 단위로 작업한다면 실패 테스트 commit**

```bash
git add tests/unit/login-view.spec.ts
git commit -m "test: lock login redesign expectations"
```

### Task 2: 공유 Auth Page Shell 추가

**Files:**

- Create: `src/components/auth/AuthPageShell.vue`
- Test: `tests/unit/login-view.spec.ts` 및 `tests/unit/signup-view.spec.ts`를 통해 커버

- [ ] **Step 1: 컴포넌트 생성**

구현 형태:

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

- [ ] **Step 2: `DESIGN.md`와 styling alignment 유지**

확인 항목:

- purple/blue gradient 없음
- nested card 없음
- radius는 적당히 절제
- auth transition에 충분히 dense함
- 한국어 copy가 mobile width에 맞음
- form card는 오른쪽 column 전체로 늘어나지 않고 자체 `max-w-md` 또는 `max-w-xl` width를 설정함

- [ ] **Step 3: component-specific auth logic을 추가하지 않음**

Expected: 이 파일은 router, stores, Supabase, signup APIs를 import하지 않습니다.

### Task 3: Login에 Shell 적용

**Files:**

- Modify: `src/views/auth/Login.vue`
- Test: `tests/unit/login-view.spec.ts`

- [ ] **Step 1: 기존 form card를 `AuthPageShell`로 감싸기**

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

- [ ] **Step 2: 기존 script behavior 보존**

Keep:

- `LOGIN_ROUTE_PATH`
- `SIGNUP_ROUTE_PATH`
- `resolvePostAuthRedirectPath`
- `handleLogin()`
- `moveToSignup()`
- `signupState` watcher
- `data-test` attributes

- [ ] **Step 3: focused test 실행**

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

### Task 4: Signup Role Query 기대 동작 고정

**Files:**

- Modify: `tests/unit/signup-view.spec.ts`
- Test: `tests/unit/signup-view.spec.ts`

- [ ] **Step 1: route query mock 추가**

기존 router mock 근처에 mutable route state를 추가합니다.

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

`beforeEach()`에서 reset합니다.

```ts
routeState.value = { query: {} };
```

- [ ] **Step 2: role-entry test 추가**

테스트 추가:

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

- [ ] **Step 3: signup shell/copy assertion 추가**

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

- [ ] **Step 4: 테스트를 실행해 실패를 확인**

Run:

```bash
pnpm test:unit tests/unit/signup-view.spec.ts
```

Expected: `Signup.vue`가 아직 `route.query.role`을 읽지 않고 새 shell copy도 포함하지 않으므로 FAIL.

### Task 5: Signup에 Shell 및 Role Query 적용

**Files:**

- Modify: `src/views/auth/Signup.vue`
- Test: `tests/unit/signup-view.spec.ts`

- [ ] **Step 1: route와 shell import**

Add:

```ts
import { useRoute, useRouter } from 'vue-router';
import AuthPageShell from '@/components/auth/AuthPageShell.vue';
```

`useRouter()`는 유지하고 아래를 추가합니다.

```ts
const route = useRoute();
```

- [ ] **Step 2: initial role을 안전하게 resolve**

Add:

```ts
function resolveInitialSignupRole(value: unknown): SignupRole {
  return value === 'user' ? 'user' : 'admin';
}
```

그다음 initialize:

```ts
role: resolveInitialSignupRole(route.query.role),
```

- [ ] **Step 3: 기존 signup card 감싸기**

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

- [ ] **Step 4: signup logic 보존**

Keep:

- invalid/missing query에 대한 admin default
- role radio behavior
- hospital search
- hospital source copy
- invite-code mode
- `submitSignup(request)` payload shapes
- success banners
- `moveToLogin()` query handoff

- [ ] **Step 5: focused test 실행**

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

### Task 6: E2E Entry Coverage 추가

**Files:**

- Modify: `tests/e2e/signup-flow.spec.ts`
- Test: `tests/e2e/signup-flow.spec.ts`

- [ ] **Step 1: `/signup?role=admin` entry assertion 추가**

```ts
test('opens admin signup from role query', async ({ page }) => {
  await page.goto('/signup?role=admin');

  await expect(page.getByText('병원 목록 출처: 공공데이터포털(data.go.kr)')).toBeVisible();
  await expect(page.getByPlaceholder('초대코드 입력')).toHaveCount(0);
});
```

- [ ] **Step 2: `/signup?role=user` entry assertion 추가**

```ts
test('opens invite signup from role query', async ({ page }) => {
  await page.goto('/signup?role=user');

  await expect(page.getByPlaceholder('초대코드 입력')).toBeVisible();
  await expect(page.getByText('병원 목록 출처: 공공데이터포털(data.go.kr)')).toHaveCount(0);
});
```

- [ ] **Step 3: focused E2E 실행**

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

- 수정이 필요한 경우가 아니면 verify only.

- [ ] **Step 1: focused unit tests 실행**

Run:

```bash
pnpm test:unit tests/unit/login-view.spec.ts tests/unit/signup-view.spec.ts
```

Expected: PASS.

- [ ] **Step 2: focused auth E2E 실행**

Run:

```bash
pnpm test:e2e tests/e2e/signup-flow.spec.ts
```

Expected: PASS.

- [ ] **Step 3: lint 실행**

Run:

```bash
pnpm lint:check
```

Expected: exit 0. 저장소가 warning을 최대 9999개까지 허용하므로 warning은 있을 수 있지만 ESLint error는 없어야 합니다.

- [ ] **Step 4: 선택적 visual check**

앱 실행:

```bash
pnpm dev
```

수동 확인:

- `/login`
- `/signup`
- `/signup?role=admin`
- `/signup?role=user`
- mobile width around 390px
- desktop width around 1440px

Expected:

- text overlap 없음
- auth pages에 app sidebar/header 없음
- button이 horizontal scrolling 없이 계속 보임
- signup handoff 후 banner가 계속 표시됨

- [ ] **Step 5: verification fix가 필요했다면 final commit**

```bash
git add src tests
git commit -m "fix: harden auth redesign regressions"
```

## Acceptance Criteria

- `/login`과 `/signup`이 일관된 launch-ready auth shell을 공유합니다.
- 기존 login 및 signup behavior가 변경되지 않습니다.
- `/signup?role=admin`이 admin signup을 엽니다.
- `/signup?role=user`가 invite-code signup을 엽니다.
- invalid signup role query는 admin으로 fallback합니다.
- 기존 `signupState` login handoff banner가 계속 동작합니다.
- 기존 auth route constants가 source of truth로 유지됩니다.
- 새 provider login, analytics, registration approval, database scope가 추가되지 않습니다.
- `pnpm test:unit tests/unit/login-view.spec.ts tests/unit/signup-view.spec.ts`가 통과합니다.
- `pnpm test:e2e tests/e2e/signup-flow.spec.ts`가 통과합니다.
- `pnpm lint:check`가 ESLint error 없이 통과합니다.

## 명시적 Non-Goals

- Google login, Kakao login, OAuth callback UX를 추가하지 않습니다.
- Supabase auth, signup-submit, hospital-search, approval API를 변경하지 않습니다.
- `/app` route tree를 변경하지 않습니다.
- organization CRUD를 추가하지 않습니다.
- mobile-only navigation 또는 analytics를 추가하지 않습니다.
- 이 slice에서 public landing page를 리디자인하지 않습니다.

## 구현 메모

- `AuthPageShell.vue` 때문에 unit test가 번거로워지면, 영향받는 test에서 slot passthrough로 mock합니다.

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

- 구현은 시각적으로 절제된 상태를 유지합니다. 이 제품은 병원 운영 제품이지 장식적인 SaaS splash page가 아닙니다.
- auth page copy는 짧게 유지합니다. form이 주요 interaction이어야 합니다.
- E2E test와 향후 QA가 의존하므로 현재 `data-test` attributes를 보존합니다.
