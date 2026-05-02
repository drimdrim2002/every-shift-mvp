# 소셜 인증 로그인/회원가입 세션 인계 문서

## 목적

이 문서는 `docs/plans/2026-05-01-social-auth-login-signup.ko.md` 구현 작업을 다음 세션에서 이어서 진행할 수 있도록, 이번 세션에서 실제로 변경한 내용과 현재 상태를 정리한 handoff 문서다.

## 작업 위치

- 작업 워크트리: `/Users/brown/workspace/every-shift-mvp`
- 작업 브랜치: `main`
- 별도 git worktree / 별도 브랜치 생성 없음
- 커밋 없음

## 이번 세션에서 완료한 범위

계획 문서의 Task 1-10 범위를 실제 코드 기준으로 구현하고 검증했다.

완료한 기능:

- `/login`, `/signup` 첫 화면에 소셜 시작 UI 추가
- `아이디로 시작하기` 클릭 시 기존 이메일/비밀번호 폼 펼침
- `/auth/callback` OAuth callback 처리
- `/auth/signup-complete` 소셜 가입 완료 화면 추가
- no-membership 사용자가 `/auth/signup-complete`에 접근할 수 있도록 라우터 가드 확장
- `useAuthStore`에 `startOAuth`, `handleOAuthCallback`, `refreshSessionContext` 추가
- `SignupApplicationForm` 분리
- `existing_session` signup client contract 추가
- `signup-submit` Edge Function에서 password signup / existing session signup 분리
- OAuth 세션 기반 signup 시 `createUser/deleteUser`를 하지 않고 `getUser(jwt)` + `updateUserById()` 사용
- Playwright signup flow를 새 UI에 맞게 수정

## 주요 변경 파일

새로 생성:

- `src/components/auth/SocialAuthOptions.vue`
- `src/components/auth/SignupApplicationForm.vue`
- `src/types/auth.ts`
- `src/views/auth/OAuthCallback.vue`
- `src/views/auth/SocialSignupComplete.vue`
- `tests/unit/oauth-callback-view.spec.ts`
- `tests/unit/social-signup-complete-view.spec.ts`

주요 수정:

- `src/components/auth/AuthPageShell.vue`
- `src/views/auth/Login.vue`
- `src/views/auth/Signup.vue`
- `src/stores/auth.ts`
- `src/constants/routes.ts`
- `src/router/index.ts`
- `src/router/guards.ts`
- `src/types/router-meta.d.ts`
- `src/types/signup.ts`
- `src/api/signup.ts`
- `supabase/functions/signup-submit/index.ts`
- `supabase/functions/signup-submit/service.ts`
- `tests/unit/auth-page-shell.spec.ts`
- `tests/unit/auth-store.spec.ts`
- `tests/unit/login-view.spec.ts`
- `tests/unit/router-auth-guards.spec.ts`
- `tests/unit/router-index.spec.ts`
- `tests/unit/signup-api.spec.ts`
- `tests/unit/signup-submit-edge.spec.ts`
- `tests/unit/signup-view.spec.ts`
- `tests/e2e/helpers.ts`
- `tests/e2e/signup-flow.spec.ts`

## 구현 상세

### 1. Auth 시작 화면

- `SocialAuthOptions`를 공통 시작 컴포넌트로 추가했다.
- Kakao / Naver / Google / 아이디 시작 버튼을 제공한다.
- `Login.vue`, `Signup.vue`는 처음에는 소셜 시작 화면만 보여주고, `아이디로 시작하기` 클릭 시 기존 폼을 표시한다.
- 기존 selector는 유지했다.
  - login: `login-email`, `login-password`, `login-submit`
  - signup: `signup-submit`, `signup-search`, `signup-hospital-select`

### 2. 라우팅 및 가드

- 새 route 추가:
  - `/auth/callback`
  - `/auth/signup-complete`
- `/auth/signup-complete`는 `requiresAuth: true`이지만 `allowsNoMembership: true`로 예외 허용한다.
- route access guard는 `no_membership_or_inactive` 사용자가 일반 보호 페이지로 들어가면 `/login`으로 보내고, `allowsNoMembership` route에만 통과시킨다.

### 3. Auth store

- `startOAuth(provider, intent)`
- `handleOAuthCallback(intent)`
- `refreshSessionContext()`

추가 메모:

- `custom:naver`는 현재 설치된 Supabase SDK `Provider` type에 포함되지 않아, Supabase 호출 경계에서만 좁은 타입 adapter/cast를 사용했다.

### 4. Signup client contract

- `src/types/signup.ts`에서 `SignupSubmitRequest`를 discriminated union으로 확장했다.
  - password mode: `authMode?: 'password'`, `email`, `password`
  - existing session mode: `authMode: 'existing_session'`, 이메일/비밀번호 없음
- `src/api/signup.ts`는 existing session 요청일 때만 `supabase.auth.getSession()`으로 access token을 읽고, `Authorization: Bearer <token>`을 Edge Function에 전달한다.
- mock signup fallback(`VITE_ENABLE_MOCK_SIGNUP=true`)은 토큰 조회 없이 그대로 동작하도록 유지했다.

### 5. Edge Function signup-submit

- existing session mode 추가
- `processSignupSubmit(..., context)` 형태로 `accessToken` context를 받는다
- existing session signup:
  - `auth.getUser(jwt)`로 현재 user 확인
  - provider email 없으면 `OAUTH_EMAIL_REQUIRED`
  - bearer token 없거나 invalid면 `AUTH_SESSION_REQUIRED`
  - `auth.admin.createUser()` 호출 안 함
  - RPC 실패 시 `auth.admin.deleteUser()` 호출 안 함
  - RPC 성공 후 `auth.admin.updateUserById()`로 metadata 동기화

추가 메모:

- `createSignupSubmitContextFromRequest()` helper를 `service.ts`에 작게 export했다.
- 이유: Deno `npm:@supabase/supabase-js@2` import 때문에 `index.ts`를 직접 unit test 하기가 불편해서 bearer parsing 핵심 로직만 testable helper로 분리했다.

### 6. Social signup completion

- `SocialSignupComplete.vue` 구현
- 세션 email 표시
- 기존 세션 기반 signup submit
- 완료 후 분기:
  - `pending_approval` -> `/access/pending`
  - `active` -> `refreshSessionContext()` 후 `resolvePostAuthRedirectPath()`
- 취소 시 logout 후 `/login`

## 검증 결과

통과:

- `pnpm lint:check`
  - 결과: 0 errors, 기존 warnings 78개
- focused unit tests
  - `pnpm test:unit tests/unit/auth-page-shell.spec.ts tests/unit/login-view.spec.ts tests/unit/signup-view.spec.ts tests/unit/auth-store.spec.ts tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/signup-api.spec.ts tests/unit/signup-submit-edge.spec.ts tests/unit/oauth-callback-view.spec.ts tests/unit/social-signup-complete-view.spec.ts`
  - 결과: 10 files, 97 tests passed
- Playwright signup flow
  - `pnpm test:e2e tests/e2e/signup-flow.spec.ts --no-deps`
  - 결과: 5 tests passed
- `pnpm exec vue-tsc -b --noEmit`
  - Task 2/7/8/9 진행 중 여러 번 통과 확인
- `git diff --check`
  - 통과

주의:

- 기본 명령인 `pnpm test:e2e tests/e2e/signup-flow.spec.ts`는 실패했다.
- 실패 원인:
  - Playwright global setup `tests/e2e/setup/auth.setup.ts`가 `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`를 요구한다.
  - 이번 signup-flow spec 자체는 비로그인 시나리오라 `--no-deps`로 실행하면 정상 통과한다.

## 다음 세션에서 바로 알아야 할 점

### 1. 현재 작업은 커밋되지 않았다

이번 세션 변경은 모두 현재 `main` worktree에 uncommitted 상태로 남아 있다.

### 2. 이번 작업과 무관한 기존 변경도 섞여 있다

아래 파일들은 이번 세션 social auth 작업과 직접 무관한 기존 dirty state로 보인다. 되돌리지 않았다.

- `docs/.obsidian/workspace.json`
- `src/utils/scheduleVersionResolver.ts`
- `src/views/schedule/Step4InitialData.vue`
- `tests/unit/schedule-version-resolver.spec.ts`
- `tests/unit/step4-initial-data.spec.ts`

다음 세션에서 커밋/PR 정리 시 social auth 변경과 분리해서 판단하는 편이 안전하다.

### 3. E2E는 `--no-deps`와 setup 의존성 구분이 필요하다

- 비로그인 public flow만 보려면:
  - `pnpm test:e2e tests/e2e/signup-flow.spec.ts --no-deps`
- 전체 Playwright 기본 실행을 쓰려면:
  - `TEST_USER_EMAIL`
  - `TEST_USER_PASSWORD`
    필요

## 다음 세션 권장 시작 순서

1. `git status --short --branch`로 worktree 상태 확인
2. social auth 변경과 unrelated dirty files를 구분
3. 필요하면 social auth 변경만 별도 브랜치로 정리
4. `pnpm lint:check`
5. focused unit suite 재실행
6. public signup flow는 `pnpm test:e2e tests/e2e/signup-flow.spec.ts --no-deps`로 확인

## 실제 연동에 필요한 남은 작업

현재 상태는 코드 경로와 테스트는 준비되었지만, 실제 카카오/네이버/구글 로그인이 동작한다고 보장하려면 외부 provider / Supabase 설정이 추가로 필요하다.

### 1. Supabase Auth provider 설정

Supabase Dashboard에서 아래 provider를 실제로 켜야 한다.

- Google provider 활성화
- Kakao provider 활성화
- Custom OAuth provider `custom:naver` 활성화

확인할 값:

- Google client id / client secret
- Kakao REST API key 또는 OAuth client 설정값
- Naver client id / client secret

### 2. Supabase redirect allow list 설정

Supabase Auth redirect allow list에 아래 callback URL을 등록해야 한다.

- local: `http://localhost:5173/auth/callback`
- preview: `https://<vercel-preview-domain>/auth/callback`
- production: `https://<production-domain>/auth/callback`

관련 참고:

- `docs/launch/launch-plus/launch-plus-auth-spec.md`

### 3. Naver Developer Console callback 설정

Naver는 앱 callback을 직접 프론트 `/auth/callback`으로 주는 것이 아니라, Supabase Auth callback으로 설정해야 한다.

- `https://<supabase-project-ref>.supabase.co/auth/v1/callback`

즉:

- Naver Developer Console callback: Supabase callback
- Supabase redirectTo: 앱 callback(`/auth/callback`)

### 4. Google / Kakao provider 쪽 callback / domain 허용 설정

Google Cloud Console, Kakao Developers 쪽에도 실제 서비스 도메인과 callback 관련 허용이 맞아야 한다.

최소 확인 항목:

- local 개발 도메인 허용 여부
- preview 도메인 허용 여부
- production 도메인 허용 여부
- OAuth consent / app status / 테스트 사용자 제한 여부

### 5. Supabase 프로젝트 대상 확인

현재 로컬 `.env.local`에는 Supabase URL / anon key가 들어 있다.

다음 세션에서 먼저 확인할 것:

- 이 프로젝트가 실제로 social auth provider 설정이 된 Supabase 프로젝트를 가리키는지
- preview / production 환경 변수도 같은 프로젝트 또는 의도한 프로젝트를 가리키는지

확인 대상:

- `.env.local`
- 배포 환경 변수

### 6. 실제 smoke test

외부 설정 후 최소한 아래 수동 테스트를 해야 한다.

- Kakao: 기존 active user 로그인
- Google: 기존 active user 로그인
- Naver: 기존 active user 로그인
- Kakao: 신규 admin signup -> `/access/pending`
- Google: invite user signup -> user home
- Naver: invite code invalid -> 한국어 에러 표시

### 7. provider가 email을 주지 않는 경우 확인

현재 구현은 provider email이 없으면 `OAUTH_EMAIL_REQUIRED`로 막는다.

실제 확인 필요:

- Kakao 계정에서 email scope 미동의 시 동작
- Naver provider 응답에서 email 누락 시 동작
- Google provider 응답에서 email 누락 시 동작

예상 결과:

- 사용자에게 한국어 에러 메시지 노출
- 잘못된 signup request 생성 안 함

### 8. 배포 전 체크 포인트

실제 연동 전후로 아래를 다시 확인하는 편이 안전하다.

- `/auth/callback`이 public route로 유지되는지
- `/auth/signup-complete`가 authenticated + no-membership 허용 route인지
- `signup-submit` Edge Function 배포본이 최신 코드인지
- preview / production `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`가 올바른지
- provider secret이 preview / production에서 누락되지 않았는지

## 실제 연동 권장 순서

1. Supabase Dashboard에서 Google / Kakao / `custom:naver` 설정 확인
2. Supabase redirect allow list에 local / preview / production callback 등록
3. Naver Developer Console callback을 Supabase callback으로 설정
4. Google / Kakao 콘솔의 허용 도메인 / redirect 설정 확인
5. 로컬에서 provider별 로그인 시작
6. `/auth/callback` -> `/auth/signup-complete` 또는 post-auth redirect 실제 흐름 확인
7. 신규 social signup이 `signup-submit` 최신 Edge Function으로 처리되는지 확인
8. preview 환경에서 같은 흐름 재검증
9. production 반영 전 마지막 smoke test 수행

## 참고 문서

- 원본 계획: `docs/plans/2026-05-01-social-auth-login-signup.ko.md`
- 관련 스펙: `docs/launch/launch-plus/launch-plus-auth-spec.md`
