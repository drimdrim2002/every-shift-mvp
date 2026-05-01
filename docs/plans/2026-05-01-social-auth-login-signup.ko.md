# 소셜 인증 로그인/회원가입 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/login`과 `/signup`에 카카오, 네이버, Google 소셜 인증 시작 UI를 추가하고, OAuth로 생성된 Supabase session을 기존 가입 신청/초대코드 플로우에 안전하게 연결한다.

**Architecture:** Vue auth 화면은 공통 `SocialAuthOptions` 시작 선택 컴포넌트를 공유한다. OAuth 시작과 callback 처리는 `useAuthStore`와 `/auth/callback` route에 모으고, social signup 완료는 별도 `/auth/signup-complete` route에서 기존 signup submit contract를 `existing_session` 모드로 재사용한다. Edge Function은 password signup과 existing session signup을 분리해 OAuth 사용자를 새로 만들거나 실패 시 삭제하지 않는다.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vue Router, Pinia, Naive UI, Tailwind CSS, Supabase Auth, Supabase Edge Functions, Vitest, Vue Test Utils, Playwright.

---

## Review Summary

현재 초안의 방향은 맞지만, 바로 구현하기에는 아래 공백이 있었다.

- 파일별 책임과 작업 순서가 부족했다.
- OAuth callback route와 no-membership guard 예외가 구체화되지 않았다.
- social signup backend가 기존 password signup처럼 `auth.admin.createUser()`를 호출하면 안 된다는 점이 명확하지 않았다.
- 기존 signup form을 `/signup`과 `/auth/signup-complete`에서 어떻게 공유할지 결정이 필요했다.
- 테스트가 범위 목록 수준이라, 실패 테스트와 기대 결과가 작업 단위로 쪼개져 있지 않았다.

이 보강안은 구현자가 현재 코드베이스를 모른다는 전제로, 작은 TDD task로 실행할 수 있게 작성한다.

## Scope

In scope:

- `/login`, `/signup` 첫 화면에 소셜 시작 선택 UI 추가
- `아이디로 시작하기` 클릭 시 기존 이메일/비밀번호 form을 같은 화면에서 펼침
- Kakao, Google built-in OAuth provider 연결
- Naver Supabase Custom OAuth provider `custom:naver` 연결
- `/auth/callback`에서 OAuth 결과 처리
- `/auth/signup-complete`에서 OAuth session 기반 가입 신청/초대코드 완료
- `signup-submit` Edge Function의 `existing_session` contract 추가

Out of scope:

- Apple 로그인
- 계정 연결 UI
- 신규 organization/employee CRUD
- 실제 AI solver 변경
- 모바일 전용 UI 최적화
- Supabase dashboard/provider secret 자동 설정

## File Structure

Create:

- `src/components/auth/SocialAuthOptions.vue`: Kakao/ID/Naver/Google 시작 버튼 UI. OAuth provider 선택 이벤트만 emit하고 인증 로직은 갖지 않는다.
- `src/components/auth/SignupApplicationForm.vue`: admin/user 가입 신청 form. `mode="password" | "existing_session"`에 따라 email/password 입력과 submit payload를 분기한다.
- `src/views/auth/OAuthCallback.vue`: Supabase OAuth redirect 결과를 처리하고 post-auth route를 결정한다.
- `src/views/auth/SocialSignupComplete.vue`: social session 사용자의 가입 신청/초대코드 완료 화면.
- `src/types/auth.ts`: social provider, social intent, OAuth result type.

Modify:

- `src/components/auth/AuthPageShell.vue`: compact auth 시작 화면 variant 추가. 기존 기본 layout은 유지한다.
- `src/views/auth/Login.vue`: social options를 첫 화면으로 표시하고, ID login form은 펼침 상태로 전환한다.
- `src/views/auth/Signup.vue`: social options를 첫 화면으로 표시하고, ID signup form은 `SignupApplicationForm`으로 위임한다.
- `src/stores/auth.ts`: `startOAuth()`, `handleOAuthCallback()`, `refreshSessionContext()` 추가.
- `src/constants/routes.ts`: OAuth callback/signup-complete route constants와 helper 추가.
- `src/router/index.ts`: `/auth/callback`, `/auth/signup-complete` route 등록.
- `src/router/guards.ts`: no-membership social user가 `/auth/signup-complete`에 접근할 수 있도록 예외 추가.
- `src/types/signup.ts`: password signup과 existing session signup을 discriminated union으로 확장.
- `src/api/signup.ts`: existing session signup 시 현재 Supabase access token을 Edge Function Authorization header에 전달.
- `supabase/functions/signup-submit/service.ts`: password signup과 existing session signup 처리 분리.
- `supabase/functions/signup-submit/index.ts`: Authorization header를 service layer에 전달.

Tests:

- `tests/unit/auth-page-shell.spec.ts`
- `tests/unit/login-view.spec.ts`
- `tests/unit/signup-view.spec.ts`
- `tests/unit/auth-store.spec.ts`
- `tests/unit/router-index.spec.ts`
- `tests/unit/router-auth-guards.spec.ts`
- `tests/unit/signup-api.spec.ts`
- `tests/unit/signup-submit-edge.spec.ts`
- `tests/e2e/signup-flow.spec.ts`

## Provider Contract

Use these provider ids in client code:

```ts
export type SocialAuthProviderId = 'kakao' | 'custom:naver' | 'google';
export type SocialAuthIntent = 'login' | 'signup';
```

Supabase OAuth calls:

```ts
await supabase.auth.signInWithOAuth({
  provider,
  options: {
    redirectTo: `${window.location.origin}${OAUTH_CALLBACK_ROUTE_PATH}?intent=${intent}`,
  },
});
```

Notes:

- Supabase custom OAuth provider identifiers use the `custom:` prefix, so Naver must be called as `provider: 'custom:naver'`.
- The app callback URL used in `redirectTo` must be present in Supabase Auth redirect allow list.
- Naver Developer Console callback remains the Supabase Auth callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`.

## Task 1: Route Constants And Guards

**Files:**

- Modify: `src/constants/routes.ts`
- Modify: `src/router/index.ts`
- Modify: `src/router/guards.ts`
- Test: `tests/unit/router-index.spec.ts`
- Test: `tests/unit/router-auth-guards.spec.ts`

- [ ] **Step 1: Write failing route constant tests**

Add expectations in `tests/unit/router-index.spec.ts`:

```ts
import { OAUTH_CALLBACK_ROUTE_PATH, SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH } from '@/constants/routes';

it('registers OAuth callback and social signup completion outside DefaultLayout', () => {
  const routes = createAppRoutes(false);

  expect(findTopLevelRouteByPath(routes, OAUTH_CALLBACK_ROUTE_PATH)?.meta).toMatchObject({
    requiresAuth: false,
    title: '인증 처리',
  });
  expect(findTopLevelRouteByPath(routes, SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH)?.meta).toMatchObject({
    requiresAuth: true,
    title: '가입 완료',
    allowsNoMembership: true,
  });
});
```

- [ ] **Step 2: Write failing guard test**

Add to `tests/unit/router-auth-guards.spec.ts`:

```ts
import { SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH } from '@/constants/routes';

it('allows no-membership social users to complete signup', () => {
  const redirect = resolveRouteAccessTarget({
    toPath: SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH,
    accessState: 'no_membership_or_inactive',
    abilities: {
      canViewApprovalQueue: false,
      canSwitchOrganization: false,
      canViewRestrictedUserHome: false,
      canManageOrganizationSetup: false,
      canManageEmployees: false,
      canManageSchedules: false,
    },
    allowsNoMembership: true,
  });

  expect(redirect).toBeNull();
});
```

Expected before implementation: FAIL because constants, route, and `allowsNoMembership` input do not exist.

- [ ] **Step 3: Add route constants**

In `src/constants/routes.ts`:

```ts
export const OAUTH_CALLBACK_ROUTE_PATH = '/auth/callback';
export const SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH = '/auth/signup-complete';
```

Add helper:

```ts
export function isSocialSignupCompleteRoutePath(path: string): boolean {
  return path === SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH;
}
```

- [ ] **Step 4: Register routes**

In `src/router/index.ts`, add top-level routes near login/signup:

```ts
{
  path: OAUTH_CALLBACK_ROUTE_PATH,
  name: 'OAuthCallback',
  component: () => import('@/views/auth/OAuthCallback.vue'),
  meta: { requiresAuth: false, title: '인증 처리' },
},
{
  path: SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH,
  name: 'SocialSignupComplete',
  component: () => import('@/views/auth/SocialSignupComplete.vue'),
  meta: { requiresAuth: true, title: '가입 완료', allowsNoMembership: true },
},
```

- [ ] **Step 5: Update route access guard**

In `src/router/guards.ts`, extend `ResolveRouteAccessTargetInput`:

```ts
allowsNoMembership?: boolean;
```

Then change the no-membership branch:

```ts
if (accessState === 'no_membership_or_inactive') {
  return allowsNoMembership ? null : LOGIN_ROUTE_PATH;
}
```

In `src/router/index.ts`, pass route meta:

```ts
allowsNoMembership: to.matched.some((record) => record.meta.allowsNoMembership),
```

- [ ] **Step 6: Run route tests**

Run:

```bash
pnpm test:unit tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/constants/routes.ts src/router/index.ts src/router/guards.ts tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts
git commit -m "feat: add social auth routes"
```

## Task 2: Auth Store OAuth API

**Files:**

- Create: `src/types/auth.ts`
- Modify: `src/stores/auth.ts`
- Test: `tests/unit/auth-store.spec.ts`

- [ ] **Step 1: Write failing OAuth store tests**

Extend the Supabase mock in `tests/unit/auth-store.spec.ts`:

```ts
const signInWithOAuthMock = vi.fn()

supabase: {
  auth: {
    signInWithPassword: signInWithPasswordMock,
    signInWithOAuth: signInWithOAuthMock,
    signOut: signOutMock,
    getSession: getSessionMock,
  },
}
```

Add tests:

```ts
it('starts Kakao signup OAuth with the callback intent', async () => {
  signInWithOAuthMock.mockResolvedValue({ data: {}, error: null });
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } });

  const store = useAuthStore();
  const result = await store.startOAuth('kakao', 'signup');

  expect(result).toEqual({ success: true });
  expect(signInWithOAuthMock).toHaveBeenCalledWith({
    provider: 'kakao',
    options: {
      redirectTo: 'http://localhost:5173/auth/callback?intent=signup',
    },
  });
});

it('hydrates RBAC context when handling an OAuth callback session', async () => {
  const user = createAuthUser();
  getSessionMock.mockResolvedValue({ data: { session: { user } } });
  rbacStoreState.accessState = 'no_membership_or_inactive';

  const store = useAuthStore();
  const result = await store.handleOAuthCallback('signup');

  expect(result).toEqual({
    success: true,
    intent: 'signup',
    accessState: 'no_membership_or_inactive',
  });
  expect(ensureAccessContextLoadedMock).toHaveBeenCalledTimes(1);
});
```

Expected before implementation: FAIL because `startOAuth()` and `handleOAuthCallback()` do not exist.

- [ ] **Step 2: Add social auth types**

Create `src/types/auth.ts`:

```ts
import type { AccessState } from '@/types/rbac';

export type SocialAuthProviderId = 'kakao' | 'custom:naver' | 'google';
export type SocialAuthIntent = 'login' | 'signup';

export type OAuthCallbackResult =
  | {
      success: true;
      intent: SocialAuthIntent;
      accessState: AccessState;
    }
  | {
      success: false;
      error: string;
    };
```

- [ ] **Step 3: Add store methods**

In `src/stores/auth.ts`, import:

```ts
import { OAUTH_CALLBACK_ROUTE_PATH } from '@/constants/routes';
import type { OAuthCallbackResult, SocialAuthIntent, SocialAuthProviderId } from '@/types/auth';
```

Add helper:

```ts
function buildOAuthRedirectTo(intent: SocialAuthIntent): string {
  const origin = window.location.origin;
  return `${origin}${OAUTH_CALLBACK_ROUTE_PATH}?intent=${intent}`;
}
```

Add methods:

```ts
async function startOAuth(provider: SocialAuthProviderId, intent: SocialAuthIntent) {
  loading.value = true;
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: buildOAuthRedirectTo(intent),
      },
    });

    if (error) {
      throw error;
    }

    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : '소셜 인증을 시작하지 못했습니다.',
    };
  } finally {
    loading.value = false;
  }
}

async function refreshSessionContext() {
  const rbacStore = useRbacStore();
  await checkSession();
  return rbacStore.accessState as AccessState;
}

async function handleOAuthCallback(intent: SocialAuthIntent): Promise<OAuthCallbackResult> {
  try {
    const accessState = await refreshSessionContext();

    if (!user.value) {
      return { success: false, error: '인증 세션을 확인할 수 없습니다.' };
    }

    return {
      success: true,
      intent,
      accessState,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '소셜 인증 처리에 실패했습니다.',
    };
  }
}
```

Return new methods from the store.

- [ ] **Step 4: Run auth store tests**

Run:

```bash
pnpm test:unit tests/unit/auth-store.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/auth.ts src/stores/auth.ts tests/unit/auth-store.spec.ts
git commit -m "feat: add OAuth auth store flow"
```

## Task 3: Auth Shell And Social Options UI

**Files:**

- Modify: `src/components/auth/AuthPageShell.vue`
- Create: `src/components/auth/SocialAuthOptions.vue`
- Test: `tests/unit/auth-page-shell.spec.ts`
- Test: `tests/unit/login-view.spec.ts`
- Test: `tests/unit/signup-view.spec.ts`

- [ ] **Step 1: Write failing shell variant test**

In `tests/unit/auth-page-shell.spec.ts`, add:

```ts
it('supports a compact auth start layout without changing the default shell', () => {
  const wrapper = mount(AuthPageShell, {
    props: {
      eyebrow: 'EveryShift 시작하기',
      title: '로그인/회원가입',
      description: '간편하게 시작하세요.',
      variant: 'compact',
    },
    slots: {
      default: '<div data-test="slot">content</div>',
    },
  });

  expect(wrapper.get('[data-test="auth-shell-root"]').classes()).toContain('bg-white');
  expect(wrapper.get('[data-test="auth-shell-product"]').text()).toBe('EveryShift');
});
```

- [ ] **Step 2: Write failing social options UI tests**

In `tests/unit/login-view.spec.ts` and `tests/unit/signup-view.spec.ts`, add initial screen expectations:

```ts
expect(wrapper.get('[data-test="social-auth-kakao"]').text()).toContain('카카오로 시작하기');
expect(wrapper.get('[data-test="social-auth-id"]').text()).toContain('아이디로 시작하기');
expect(wrapper.get('[data-test="social-auth-naver"]').text()).toContain('Naver');
expect(wrapper.get('[data-test="social-auth-google"]').text()).toContain('Google');
```

Expected before implementation: FAIL because component and selectors do not exist.

- [ ] **Step 3: Add compact shell props**

In `src/components/auth/AuthPageShell.vue`:

```ts
const props = withDefaults(
  defineProps<{
    eyebrow: string;
    title: string;
    description: string;
    variant?: 'default' | 'compact';
  }>(),
  {
    variant: 'default',
  }
);
```

Bind root classes with `data-test="auth-shell-root"`:

```vue
<main
  data-test="auth-shell-root"
  :class="[
    'min-h-screen px-5 text-slate-950 sm:px-6 lg:px-8',
    props.variant === 'compact' ? 'bg-white py-8' : 'bg-slate-50 py-10',
  ]"
></main>
```

Keep existing default visual behavior for callers without `variant`.

- [ ] **Step 4: Create SocialAuthOptions**

Create `src/components/auth/SocialAuthOptions.vue`:

```vue
<template>
  <div class="mx-auto w-full max-w-sm space-y-4" data-test="social-auth-options">
    <n-button
      data-test="social-auth-kakao"
      block
      size="large"
      class="!bg-[#FEE500] !text-[#191919]"
      :loading="loadingProvider === 'kakao'"
      :disabled="disabled"
      @click="$emit('start-social', 'kakao')"
    >
      카카오로 시작하기
    </n-button>

    <n-button
      data-test="social-auth-id"
      block
      size="large"
      secondary
      :disabled="disabled"
      @click="$emit('start-id')"
    >
      아이디로 시작하기
    </n-button>

    <div class="flex items-center justify-center gap-4">
      <n-button
        data-test="social-auth-naver"
        circle
        size="large"
        class="!bg-[#03C75A] !text-white"
        :loading="loadingProvider === 'custom:naver'"
        :disabled="disabled"
        @click="$emit('start-social', 'custom:naver')"
      >
        Naver
      </n-button>

      <n-button
        data-test="social-auth-google"
        circle
        size="large"
        :loading="loadingProvider === 'google'"
        :disabled="disabled"
        @click="$emit('start-social', 'google')"
      >
        Google
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui';
import type { SocialAuthProviderId } from '@/types/auth';

defineProps<{
  disabled?: boolean;
  loadingProvider?: SocialAuthProviderId | null;
}>();

defineEmits<{
  'start-id': [];
  'start-social': [provider: SocialAuthProviderId];
}>();
</script>
```

Implementation note: text labels are acceptable here because these are primary auth choices. Do not add Apple.

- [ ] **Step 5: Run focused component/view tests**

Run:

```bash
pnpm test:unit tests/unit/auth-page-shell.spec.ts tests/unit/login-view.spec.ts tests/unit/signup-view.spec.ts
```

Expected: tests that depend on Login/Signup integration may still fail until Tasks 4-5 are complete. Shell-specific test should PASS.

- [ ] **Step 6: Commit shell/options component**

```bash
git add src/components/auth/AuthPageShell.vue src/components/auth/SocialAuthOptions.vue tests/unit/auth-page-shell.spec.ts tests/unit/login-view.spec.ts tests/unit/signup-view.spec.ts
git commit -m "feat: add social auth start components"
```

## Task 4: Login Social Start Flow

**Files:**

- Modify: `src/views/auth/Login.vue`
- Test: `tests/unit/login-view.spec.ts`

- [ ] **Step 1: Write failing login behavior tests**

Add tests:

```ts
it('shows social choices first and expands the ID login form on request', async () => {
  const wrapper = mount(Login);

  expect(wrapper.get('[data-test="social-auth-options"]').exists()).toBe(true);
  expect(wrapper.find('[data-test="login-email"]').exists()).toBe(false);

  await wrapper.get('[data-test="social-auth-id"]').trigger('click');

  expect(wrapper.get('[data-test="login-email"]').exists()).toBe(true);
  expect(wrapper.get('[data-test="login-password"]').exists()).toBe(true);
});

it('starts Google login OAuth from the login screen', async () => {
  startOAuthMock.mockResolvedValue({ success: true });

  const wrapper = mount(Login);
  await wrapper.get('[data-test="social-auth-google"]').trigger('click');

  expect(startOAuthMock).toHaveBeenCalledWith('google', 'login');
});
```

Update the auth store mock to expose `startOAuth`.

- [ ] **Step 2: Integrate SocialAuthOptions**

In `src/views/auth/Login.vue`:

- Use `AuthPageShell` `variant="compact"`.
- Initial state: `const isIdLoginOpen = ref(false)`.
- Render `SocialAuthOptions` when ID form is closed.
- Render existing `n-card` login form when ID form is open.
- Keep existing `data-test="login-email"`, `login-password`, `login-submit`, and redirect behavior unchanged.

- [ ] **Step 3: Add social start handler**

```ts
const loadingProvider = ref<SocialAuthProviderId | null>(null);

async function handleSocialStart(provider: SocialAuthProviderId) {
  loadingProvider.value = provider;
  const result = await authStore.startOAuth(provider, 'login');
  loadingProvider.value = null;

  if (!result.success) {
    showError(result.error);
  }
}
```

- [ ] **Step 4: Preserve signup handoff alerts**

When `signupState` is present, show the existing alert above the social options. Do not force-open the ID form.

- [ ] **Step 5: Run login tests**

Run:

```bash
pnpm test:unit tests/unit/login-view.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/auth/Login.vue tests/unit/login-view.spec.ts
git commit -m "feat: add social login start screen"
```

## Task 5: Shared Signup Application Form

**Files:**

- Create: `src/components/auth/SignupApplicationForm.vue`
- Modify: `src/views/auth/Signup.vue`
- Test: `tests/unit/signup-view.spec.ts`

- [ ] **Step 1: Write failing signup expansion tests**

Add tests:

```ts
it('shows social choices first and expands ID signup on request', async () => {
  const wrapper = mount(Signup);

  expect(wrapper.get('[data-test="social-auth-options"]').exists()).toBe(true);
  expect(wrapper.find('[data-test="signup-submit"]').exists()).toBe(false);

  await wrapper.get('[data-test="social-auth-id"]').trigger('click');

  expect(wrapper.get('[data-test="signup-submit"]').exists()).toBe(true);
  expect(wrapper.find('input[placeholder="name@example.com"]').exists()).toBe(true);
  expect(wrapper.find('input[placeholder="8자 이상 입력"]').exists()).toBe(true);
});

it('starts Kakao signup OAuth from the signup screen', async () => {
  startOAuthMock.mockResolvedValue({ success: true });

  const wrapper = mount(Signup);
  await wrapper.get('[data-test="social-auth-kakao"]').trigger('click');

  expect(startOAuthMock).toHaveBeenCalledWith('kakao', 'signup');
});
```

- [ ] **Step 2: Extract current signup form**

Move the form logic currently in `src/views/auth/Signup.vue` into `src/components/auth/SignupApplicationForm.vue`.

Component props:

```ts
const props = withDefaults(
  defineProps<{
    mode?: 'password' | 'existing_session';
    sessionEmail?: string | null;
    initialRole?: SignupRole;
  }>(),
  {
    mode: 'password',
    sessionEmail: null,
    initialRole: 'admin',
  }
);
```

Component emits:

```ts
defineEmits<{
  completed: [nextState: SignupNextState];
  cancel: [];
}>();
```

- [ ] **Step 3: Keep password mode behavior unchanged**

For `mode="password"`:

- Show name, email, password, role, hospital/invite fields.
- Submit the same request shape currently sent by `Signup.vue`.
- Keep `data-test="signup-submit"`, `signup-search`, `signup-hospital-select`.
- Keep login handoff in `Signup.vue`, not inside the form.

- [ ] **Step 4: Update Signup.vue**

`Signup.vue` should become a thin page:

- Compact `AuthPageShell`
- `SocialAuthOptions` first
- `SignupApplicationForm mode="password"` after ID start
- Existing result alert and login handoff behavior

- [ ] **Step 5: Run signup tests**

Run:

```bash
pnpm test:unit tests/unit/signup-view.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/SignupApplicationForm.vue src/views/auth/Signup.vue tests/unit/signup-view.spec.ts
git commit -m "feat: add social signup start screen"
```

## Task 6: OAuth Callback View

**Files:**

- Create: `src/views/auth/OAuthCallback.vue`
- Modify: `tests/unit/router-index.spec.ts` if import stubbing is needed
- Test: `tests/unit/auth-store.spec.ts`
- Test: add `tests/unit/oauth-callback-view.spec.ts` if the repo accepts a new focused view spec

- [ ] **Step 1: Write failing callback view tests**

Create `tests/unit/oauth-callback-view.spec.ts`:

```ts
it('routes signup users without membership to social signup completion', async () => {
  handleOAuthCallbackMock.mockResolvedValue({
    success: true,
    intent: 'signup',
    accessState: 'no_membership_or_inactive',
  });

  mount(OAuthCallback);
  await flushPromises();

  expect(replaceMock).toHaveBeenCalledWith('/auth/signup-complete');
});

it('routes active login users through the existing post-auth resolver', async () => {
  handleOAuthCallbackMock.mockResolvedValue({
    success: true,
    intent: 'login',
    accessState: 'user_active',
  });

  mount(OAuthCallback);
  await flushPromises();

  expect(replaceMock).toHaveBeenCalledWith('/app/home/user');
});
```

Expected before implementation: FAIL because view does not exist.

- [ ] **Step 2: Implement callback view**

Create `src/views/auth/OAuthCallback.vue`:

```vue
<template>
  <AuthPageShell
    eyebrow="EveryShift"
    title="인증 처리 중"
    description="잠시만 기다려주세요."
    variant="compact"
  >
    <div class="text-center text-sm text-slate-500" data-test="oauth-callback-loading">
      인증 정보를 확인하고 있습니다.
    </div>
  </AuthPageShell>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthPageShell from '@/components/auth/AuthPageShell.vue';
import {
  LOGIN_ROUTE_PATH,
  SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH,
  resolvePostAuthRedirectPath,
} from '@/constants/routes';
import { useAuthStore } from '@/stores/auth';
import type { SocialAuthIntent } from '@/types/auth';
import { showError } from '@/utils/message';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

function resolveIntent(value: unknown): SocialAuthIntent {
  return value === 'signup' ? 'signup' : 'login';
}

onMounted(async () => {
  const error =
    typeof route.query.error_description === 'string'
      ? route.query.error_description
      : typeof route.query.error === 'string'
        ? route.query.error
        : null;

  if (error) {
    showError('소셜 인증이 취소되었거나 실패했습니다.');
    await router.replace(LOGIN_ROUTE_PATH);
    return;
  }

  const result = await authStore.handleOAuthCallback(resolveIntent(route.query.intent));

  if (!result.success) {
    showError(result.error);
    await router.replace(LOGIN_ROUTE_PATH);
    return;
  }

  if (result.intent === 'signup' && result.accessState === 'no_membership_or_inactive') {
    await router.replace(SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH);
    return;
  }

  await router.replace(resolvePostAuthRedirectPath(result.accessState));
});
</script>
```

- [ ] **Step 3: Run callback tests**

Run:

```bash
pnpm test:unit tests/unit/oauth-callback-view.spec.ts tests/unit/auth-store.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/views/auth/OAuthCallback.vue tests/unit/oauth-callback-view.spec.ts
git commit -m "feat: handle OAuth callback routing"
```

## Task 7: Signup API Contract For Existing Session

**Files:**

- Modify: `src/types/signup.ts`
- Modify: `src/api/signup.ts`
- Test: `tests/unit/signup-api.spec.ts`

- [ ] **Step 1: Write failing API tests**

Extend `tests/unit/signup-api.spec.ts` Supabase mock:

```ts
supabase: {
  auth: {
    getSession: vi.fn(),
  },
  functions: {
    invoke: vi.fn(),
  },
}
```

Add:

```ts
it('sends the current access token for existing session signup', async () => {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { access_token: 'jwt-1' } },
  } as never);
  vi.mocked(supabase.functions.invoke).mockResolvedValue({
    data: {
      success: true,
      data: {
        path: 'admin_submit',
        signupRequestStatus: 'pending',
        membershipStatus: 'none',
      },
    },
    error: null,
  });

  await submitSignup({
    authMode: 'existing_session',
    role: 'admin',
    name: '소셜 관리자',
    hospitalId: 'hospital-1',
    hospitalName: '세브란스병원',
    hospitalSource: 'data.go.kr',
  });

  expect(supabase.functions.invoke).toHaveBeenCalledWith('signup-submit', {
    body: expect.objectContaining({
      authMode: 'existing_session',
      role: 'admin',
      name: '소셜 관리자',
    }),
    headers: {
      Authorization: 'Bearer jwt-1',
    },
  });
});
```

Expected before implementation: FAIL because request type requires email/password and no header is sent.

- [ ] **Step 2: Extend signup request types**

In `src/types/signup.ts`:

```ts
export type SignupAuthMode = 'password' | 'existing_session';

interface SignupSubmitBaseRequest {
  role: SignupRole;
  requestedRole?: SignupRole;
  name: string;
  inviteCode?: string;
  organizationSelectionMode?: 'existing';
  hospitalId?: string;
  hospitalName?: string;
  hospitalSource?: 'data.go.kr';
  organizationId?: string;
}

export type PasswordSignupSubmitRequest = SignupSubmitBaseRequest & {
  authMode?: 'password';
  email: string;
  password: string;
};

export type ExistingSessionSignupSubmitRequest = SignupSubmitBaseRequest & {
  authMode: 'existing_session';
};

export type SignupSubmitRequest = PasswordSignupSubmitRequest | ExistingSessionSignupSubmitRequest;
```

Add error codes:

```ts
| 'OAUTH_EMAIL_REQUIRED'
| 'AUTH_SESSION_REQUIRED'
```

Add Korean messages:

```ts
OAUTH_EMAIL_REQUIRED: '소셜 계정에서 이메일을 확인할 수 없습니다.',
AUTH_SESSION_REQUIRED: '인증 세션이 만료되었습니다. 다시 로그인해 주세요.',
```

- [ ] **Step 3: Send Authorization header**

In `src/api/signup.ts`, add:

```ts
async function resolveExistingSessionHeaders(request: SignupSubmitRequest) {
  if (request.authMode !== 'existing_session') {
    return undefined;
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new SignupSubmitApiError('AUTH_SESSION_REQUIRED');
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}
```

Use it:

```ts
const headers = await resolveExistingSessionHeaders(normalizedRequest);

const { data, error } = await supabase.functions.invoke<SignupSubmitResponse>('signup-submit', {
  body: normalizedRequest,
  ...(headers ? { headers } : {}),
});
```

- [ ] **Step 4: Keep password signup compatibility**

`normalizeSignupRequest()` must preserve existing password requests where `authMode` is omitted.

- [ ] **Step 5: Run signup API tests**

Run:

```bash
pnpm test:unit tests/unit/signup-api.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types/signup.ts src/api/signup.ts tests/unit/signup-api.spec.ts
git commit -m "feat: support existing session signup api"
```

## Task 8: Edge Function Existing Session Signup

**Files:**

- Modify: `supabase/functions/signup-submit/service.ts`
- Modify: `supabase/functions/signup-submit/index.ts`
- Test: `tests/unit/signup-submit-edge.spec.ts`

- [ ] **Step 1: Write failing service tests**

Add test for existing session admin signup:

```ts
it('uses the bearer token user for existing session admin signup without creating auth user', async () => {
  const { createClient, spies } = createServiceClients();
  spies.getUser.mockResolvedValue({
    data: {
      user: {
        id: 'oauth-user-1',
        email: 'social@example.com',
      },
    },
    error: null,
  });
  spies.updateUserById.mockResolvedValue({ data: { user: { id: 'oauth-user-1' } }, error: null });
  spies.rpc.mockResolvedValue({
    data: [{ signup_request_id: 'request-1', organization_id: 'org-1' }],
    error: null,
  });

  const response = await processSignupSubmit(
    createClient as never,
    {
      authMode: 'existing_session',
      role: 'admin',
      name: '소셜 관리자',
      hospitalId: 'org-1',
      hospitalName: '세브란스병원',
      hospitalSource: 'data.go.kr',
    },
    {},
    { accessToken: 'jwt-1' }
  );

  expect(spies.getUser).toHaveBeenCalledWith('jwt-1');
  expect(spies.createUser).not.toHaveBeenCalled();
  expect(spies.deleteUser).not.toHaveBeenCalled();
  expect(spies.rpc).toHaveBeenCalledWith(
    'submit_admin_signup_atomic',
    expect.objectContaining({
      p_user_id: 'oauth-user-1',
      p_requester_email: 'social@example.com',
    })
  );
  expect(response.nextState).toBe('pending_approval');
});
```

Add test for missing provider email:

```ts
it('rejects existing session signup when the provider email is missing', async () => {
  const { createClient, spies } = createServiceClients();
  spies.getUser.mockResolvedValue({
    data: { user: { id: 'oauth-user-1', email: null } },
    error: null,
  });

  await expect(
    processSignupSubmit(
      createClient as never,
      { authMode: 'existing_session', role: 'user', name: '소셜 사용자', inviteCode: 'INV-1' },
      {},
      { accessToken: 'jwt-1' }
    )
  ).rejects.toMatchObject({ code: 'OAUTH_EMAIL_REQUIRED' });

  expect(spies.createUser).not.toHaveBeenCalled();
});
```

Expected before implementation: FAIL because `getUser`, `updateUserById`, `authMode`, and context do not exist.

- [ ] **Step 2: Extend service error codes and client interface**

In `supabase/functions/signup-submit/service.ts`, add:

```ts
type SignupAuthMode = 'password' | 'existing_session';
```

Extend `SignupErrorCode` with:

```ts
| 'OAUTH_EMAIL_REQUIRED'
| 'AUTH_SESSION_REQUIRED'
```

Extend `ServiceClient.auth`:

```ts
getUser(jwt: string): Promise<{
  data: { user: { id?: string; email?: string | null } | null }
  error: ServiceErrorLike | null
}>
admin: {
  createUser(...)
  deleteUser(...)
  updateUserById(userId: string, payload: Record<string, unknown>): Promise<{
    data: { user: AuthAdminUser | null }
    error: ServiceErrorLike | null
  }>
}
```

- [ ] **Step 3: Add process context**

```ts
interface SignupSubmitContext {
  accessToken?: string | null;
}
```

Change signature:

```ts
export async function processSignupSubmit(
  client: ServiceClient,
  payload: SignupSubmitRequest,
  dependencies: SignupSubmitDependencies = {},
  context: SignupSubmitContext = {}
): Promise<SignupSubmitSuccessData>;
```

- [ ] **Step 4: Split identity resolution**

Add:

```ts
function resolveAuthMode(payload: SignupSubmitRequest): SignupAuthMode {
  return payload.authMode === 'existing_session' ? 'existing_session' : 'password';
}
```

Keep `requireCommonFields()` for password signup only. Add:

```ts
function requireExistingSessionFields(payload: SignupSubmitRequest) {
  const name = asNonEmptyString(payload.name);

  if (!name) {
    throw new SignupSubmitServiceError(
      'VALIDATION_ERROR',
      SIGNUP_ERROR_MESSAGES.VALIDATION_ERROR,
      400,
      {
        field: 'name',
      }
    );
  }

  return { name };
}
```

Add:

```ts
async function resolveExistingSessionUser(
  client: ServiceClient,
  accessToken: string | null | undefined
) {
  if (!accessToken) {
    throw new SignupSubmitServiceError(
      'AUTH_SESSION_REQUIRED',
      SIGNUP_ERROR_MESSAGES.AUTH_SESSION_REQUIRED,
      401
    );
  }

  const { data, error } = await client.auth.getUser(accessToken);

  if (error || !data.user?.id) {
    throw new SignupSubmitServiceError(
      'AUTH_SESSION_REQUIRED',
      SIGNUP_ERROR_MESSAGES.AUTH_SESSION_REQUIRED,
      401
    );
  }

  const email = asNonEmptyString(data.user.email);
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new SignupSubmitServiceError(
      'OAUTH_EMAIL_REQUIRED',
      SIGNUP_ERROR_MESSAGES.OAUTH_EMAIL_REQUIRED,
      400
    );
  }

  return {
    userId: data.user.id,
    email,
  };
}
```

- [ ] **Step 5: Reuse RPC logic but change auth user lifecycle**

Refactor `processSignupSubmit()` so role-specific organization/invite resolution and RPC parameter construction are shared.

For password mode:

- Validate email/password/name.
- Call `auth.admin.createUser()`.
- If RPC fails, rollback with `deleteUser()`.

For existing session mode:

- Validate `name`.
- Resolve user with bearer token.
- Do not call `createUser()`.
- Do not call `deleteUser()` on RPC failure.
- After RPC succeeds, call `auth.admin.updateUserById(userId, { user_metadata, app_metadata })` to align metadata.

Required metadata:

```ts
{
  user_metadata: {
    display_name: name,
    name,
  },
  app_metadata: buildAppMetadata(organizationId, role, membershipStatus),
}
```

- [ ] **Step 6: Pass Authorization header from index**

In `supabase/functions/signup-submit/index.ts`:

```ts
function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim() || null;
}
```

Call:

```ts
const data = await processSignupSubmit(
  client as never,
  payload,
  {},
  {
    accessToken: getBearerToken(request),
  }
);
```

- [ ] **Step 7: Run Edge Function unit tests**

Run:

```bash
pnpm test:unit tests/unit/signup-submit-edge.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/signup-submit/service.ts supabase/functions/signup-submit/index.ts tests/unit/signup-submit-edge.spec.ts
git commit -m "feat: support social signup in signup-submit"
```

## Task 9: Social Signup Completion Page

**Files:**

- Create: `src/views/auth/SocialSignupComplete.vue`
- Modify: `src/components/auth/SignupApplicationForm.vue`
- Test: `tests/unit/signup-view.spec.ts`
- Test: add `tests/unit/social-signup-complete-view.spec.ts`

- [ ] **Step 1: Write failing social completion tests**

Create `tests/unit/social-signup-complete-view.spec.ts`:

```ts
it('shows the session email and omits password input for social signup completion', () => {
  authStoreState.user = {
    id: 'user-1',
    email: 'social@example.com',
  };

  const wrapper = mount(SocialSignupComplete);

  expect(wrapper.text()).toContain('social@example.com');
  expect(wrapper.find('input[placeholder="8자 이상 입력"]').exists()).toBe(false);
  expect(wrapper.get('[data-test="signup-submit"]').exists()).toBe(true);
});

it('submits existing session signup and routes by next state', async () => {
  submitSignupMock.mockResolvedValue({ nextState: 'pending_approval' });

  const wrapper = mount(SocialSignupComplete);
  await fillAdminSignupForm(wrapper);
  await wrapper.get('[data-test="signup-submit"]').trigger('click');

  expect(submitSignupMock).toHaveBeenCalledWith(
    expect.objectContaining({
      authMode: 'existing_session',
      role: 'admin',
    })
  );
  expect(replaceMock).toHaveBeenCalledWith('/access/pending');
});
```

Expected before implementation: FAIL because view and form mode do not exist.

- [ ] **Step 2: Add existing session mode to SignupApplicationForm**

For `mode="existing_session"`:

- Show `sessionEmail` as read-only text.
- Do not render email input.
- Do not render password input.
- Submit `authMode: 'existing_session'`.
- Keep role-specific hospital/invite behavior identical to password mode.

Request examples:

```ts
{
  authMode: 'existing_session',
  role: 'admin',
  name,
  hospitalId,
  hospitalName,
  hospitalSource: 'data.go.kr',
}
```

```ts
{
  authMode: 'existing_session',
  role: 'user',
  name,
  inviteCode,
}
```

- [ ] **Step 3: Implement SocialSignupComplete view**

Create `src/views/auth/SocialSignupComplete.vue`:

```vue
<template>
  <AuthPageShell
    eyebrow="EveryShift 시작하기"
    title="가입 정보 완료"
    description="소셜 계정 인증이 완료되었습니다. 병원 가입 정보를 입력하세요."
    variant="compact"
  >
    <n-alert v-if="!sessionEmail" type="warning" class="mx-auto mb-4 max-w-2xl">
      소셜 계정 이메일을 확인할 수 없습니다.
    </n-alert>

    <SignupApplicationForm
      mode="existing_session"
      :session-email="sessionEmail"
      @completed="handleCompleted"
      @cancel="moveToLogin"
    />
  </AuthPageShell>
</template>
```

Script behavior:

- Read `authStore.user?.email`.
- If no `authStore.user`, redirect `/login`.
- On completed:
  - `pending_approval` -> `/access/pending`
  - `active` -> call `authStore.refreshSessionContext()` then `resolvePostAuthRedirectPath()`
- On cancel: logout or navigate to `/login` based on current UX decision. Recommended: logout then `/login` to prevent a no-membership session loop.

- [ ] **Step 4: Run social completion tests**

Run:

```bash
pnpm test:unit tests/unit/social-signup-complete-view.spec.ts tests/unit/signup-view.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/auth/SocialSignupComplete.vue src/components/auth/SignupApplicationForm.vue tests/unit/social-signup-complete-view.spec.ts tests/unit/signup-view.spec.ts
git commit -m "feat: complete signup for social sessions"
```

## Task 10: E2E And Provider Setup Notes

**Files:**

- Modify: `tests/e2e/signup-flow.spec.ts`
- Optional docs update if the project has an auth setup doc: `docs/launch/launch-plus/launch-plus-auth-spec.md`

- [ ] **Step 1: Add E2E coverage for ID expansion**

In `tests/e2e/signup-flow.spec.ts`, add lightweight checks:

```ts
await page.goto('/login');
await expect(page.getByTestId('social-auth-options')).toBeVisible();
await page.getByTestId('social-auth-id').click();
await expect(page.getByTestId('login-email')).toBeVisible();

await page.goto('/signup');
await expect(page.getByTestId('social-auth-options')).toBeVisible();
await page.getByTestId('social-auth-id').click();
await expect(page.getByTestId('signup-submit')).toBeVisible();
```

Do not automate real Kakao/Naver/Google login in Playwright unless test credentials and provider sandbox are explicitly configured.

- [ ] **Step 2: Document manual provider setup checklist**

Keep this checklist in the plan or auth setup doc:

- Supabase Auth providers:
  - Kakao enabled
  - Google enabled
  - Custom OAuth provider `custom:naver` enabled
- Supabase redirect allow list:
  - `http://localhost:5173/auth/callback`
  - Preview callback URL
  - Production callback URL
- Naver Developer Console callback:
  - `https://<project-ref>.supabase.co/auth/v1/callback`
- Manual smoke matrix:
  - Kakao login existing active user
  - Google login existing active user
  - Naver login existing active user
  - Kakao signup new admin -> pending page
  - Google signup invite user -> user home
  - Naver signup missing/invalid invite -> Korean error

- [ ] **Step 3: Run E2E signup flow**

Run:

```bash
pnpm test:e2e tests/e2e/signup-flow.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/signup-flow.spec.ts docs/plans/2026-05-01-social-auth-login-signup.ko.md
git commit -m "test: cover social auth ID fallback flows"
```

## Required Checks

Run after all implementation tasks:

```bash
pnpm lint:check
pnpm test:unit tests/unit/auth-page-shell.spec.ts tests/unit/login-view.spec.ts tests/unit/signup-view.spec.ts tests/unit/auth-store.spec.ts tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/signup-api.spec.ts tests/unit/signup-submit-edge.spec.ts tests/unit/oauth-callback-view.spec.ts tests/unit/social-signup-complete-view.spec.ts
pnpm test:e2e tests/e2e/signup-flow.spec.ts
```

Expected:

- `pnpm lint:check`: exits 0
- focused unit tests: all pass
- focused E2E signup flow: pass

If ESLint fails, run:

```bash
pnpm lint:fix
pnpm lint:check
```

## Risk Checklist

- OAuth callback route must not be treated as an app route inside `DefaultLayout`.
- `/auth/signup-complete` must require an authenticated Supabase session, but allow `no_membership_or_inactive`.
- Existing session signup must never trust `email` or `userId` from request body.
- Existing session signup must not call `auth.admin.createUser()`.
- Existing session signup must not call `auth.admin.deleteUser()` on RPC failure.
- Password signup behavior must remain backward compatible when `authMode` is omitted.
- `아이디로 시작하기` must preserve existing login/signup form selectors so existing tests and E2E flows stay stable.
- Korean user-facing messages must be used for all new UI and error messages.
- Do not add Apple, CRUD, or real solver integration.

## Assumptions

- User-facing UI text is Korean.
- `아이디로 시작하기` is an in-page expansion, not a route change.
- Social signup users already have a Supabase session after provider authentication.
- Naver uses Supabase Custom OAuth provider identifier `custom:naver`.
- Kakao and Google use Supabase built-in provider identifiers `kakao` and `google`.
- Current `src/views/auth/Login.vue` changes in the worktree must be preserved when implementing.

## References

- `README.md`
- `docs/launch/launch-plus/launch-plus-auth-spec.md`
- `docs/launch/launch-plus/launch-plus-plan.md`
- `src/views/auth/Login.vue`
- `src/views/auth/Signup.vue`
- `src/stores/auth.ts`
- `src/constants/routes.ts`
- `src/router/guards.ts`
- `src/types/signup.ts`
- `src/api/signup.ts`
- `supabase/functions/signup-submit/service.ts`
- Supabase Social Login: https://supabase.com/docs/guides/auth/social-login
- Supabase Custom OAuth Providers: https://supabase.com/docs/guides/auth/custom-oauth-providers
- Supabase Redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
