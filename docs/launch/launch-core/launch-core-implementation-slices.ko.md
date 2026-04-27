# Launch Core 구현 슬라이스 가이드

> 원문 기준 문서: [launch-core-implementation-slices.md](./launch-core-implementation-slices.md)
> 관련 계획 문서: [launch-core-plan.md](./launch-core-plan.md)

## 이 문서는 무엇인가

`Launch Core` 작업을 한 번에 크게 바꾸지 않고, 안전하게 나눠서 구현하기 위한 실행 문서입니다.

- 각 슬라이스는 독립적으로 구현, 검증, 머지할 수 있어야 합니다.
- 이전 슬라이스가 안정화되기 전에는 다음 슬라이스로 넘어가지 않습니다.
- 특히 라우팅(`/`, `/app`)과 인증, 공개 랜딩, 문의 CTA가 섞여서 반쯤 바뀐 상태가 되지 않도록 막는 것이 핵심입니다.

이 문서는 Launch Core 전체의 마스터 slice 계획입니다. Slice 0~6의 순서와 통과 기준은 여기서 관리하고, Slice 6의 세부 산출물은 아래 두 문서가 담당합니다.

- [Launch Core 인증 및 배포 스펙](./launch-core-auth-and-deploy-spec.ko.md): Slice 6의 인증, 환경변수, Vercel, 도메인, SSL 기준
- [Launch Core QA 체크리스트](./launch-core-qa-checklist.ko.md): preview, production 기본 URL, custom domain 스모크 확인 순서

## 핵심 목표

이번 작업의 목표는 제품을 새로 만드는 것이 아닙니다. 기존 앱을 유지한 채 진입 구조만 정리하는 것입니다.

- 공개 랜딩 페이지는 `/`
- 로그인 후 실제 작업 공간은 `/app`
- 기존 인증 화면, 접근 상태 화면, 앱 셸, 운영 화면, 스케줄 플로우는 최대한 재사용
- 런칭 기간에는 예전 URL도 임시 리다이렉트로 살려두기
- 배포와 테스트 기준까지 함께 고정하기

## 사용 기술

- Vue 3 `<script setup>`
- TypeScript
- Vue Router
- Pinia
- Naive UI
- Tailwind CSS
- Vite
- Vitest
- Playwright
- Vercel

---

## 이번 문서의 범위

### 포함

- `/` 공개 랜딩 페이지
- `/app` 기준의 로그인 후 작업 공간
- 기존 이메일/비밀번호 로그인, 회원가입 흐름 유지
- pending/rejected/admin/user/super 권한별 리다이렉트 정확성
- 공개 설정값을 통한 실제 문의 CTA 연결
- 기존 앱 URL에 대한 임시 리다이렉트
- Vercel SPA 딥링크 동작 보장
- 런칭 중심 회귀 테스트

### 제외

- Google 로그인
- Kakao 로그인
- OAuth callback 배포
- 앱 내부 문의 관리 기능
- analytics SDK 도입
- 라우트 마이그레이션과 무관한 스케줄 생성 로직 변경

## 반드시 지켜야 하는 원칙

- `/` 는 소개용 화면만 담당합니다.
- `/app` 은 실제 업무 화면만 담당합니다.
- 공개 화면, 인증 화면, 접근 상태 화면에는 앱 크롬(`DefaultLayout`, 사이드바, 워크스페이스 헤더)이 붙으면 안 됩니다.
- 공개 루트(`/`)와 로그인 후 홈(`/app`)은 같은 상수나 같은 의미로 취급하면 안 됩니다.
- 기존 경로는 런칭 기간 동안만 명시적인 리다이렉트로 유지합니다.
- 하드코딩된 경로 문자열은 가능한 한 공용 라우트 헬퍼나 레거시 리다이렉트 맵으로 치환합니다.

## 라우트 계약 고정

구현 전에 아래 의미를 먼저 고정합니다.

- `PUBLIC_ROOT_ROUTE_PATH = '/'`
- `APP_HOME_ROUTE_PATH = '/app'`

### 대표 canonical 경로

- 승인 대기열: `/app/admin/approval-queue`
- 사용자 홈: `/app/home/user`
- 조직 설정: `/app/ops/organization-setup`
- 오프요청 정책 설정: `/app/ops/off-request-policy-setup`
- 스케줄 단계: `/app/schedule/step1` ~ `/app/schedule/step4`
- Step5 상세: `/app/schedule/step5/:scheduleKey`

### 런칭 기간 레거시 리다이렉트 대상

- `/admin/*`
- `/home/*`
- `/ops/*`
- `/schedule/*`

### 이 계약을 반드시 따라야 하는 곳

- 로그인 후 이동 경로 결정
- auth guard 기본 이동 처리
- 대시보드 CTA 이동
- 사이드바 선택 상태와 활성 상태 계산
- Step1~Step5 이동
- Step5 route builder 와 self-heal helper
- 공용 E2E helper 와 랜딩 가정

## 슬라이스 운영 규칙

1. 한 번에 하나의 슬라이스만 작업합니다.
2. 현재 슬라이스의 테스트 게이트가 모두 통과되기 전에는 다음 슬라이스로 가지 않습니다.
3. 회귀 버그가 생기면 같은 슬라이스 안에서 바로 수정합니다.
4. 각 슬라이스는 그 자체로 머지 가능한 상태여야 합니다.
5. 새 테스트 체계를 만드는 것보다 기존 테스트를 확장하는 쪽을 우선합니다.

## 슬라이스 순서

```text
Slice 0: 라우트 의미 고정
   ↓
Slice 1: 라우트 계약 정리
   ↓
Slice 2: canonical /app 작업 공간 공존
   ↓
Slice 3: 공개 랜딩 + 레이아웃 경계 분리
   ↓
Slice 4: 레거시 리다이렉트 유지
   ↓
Slice 5: 문의 CTA 실사용 연결
   ↓
Slice 6: 배포 준비 + Preview 회귀 게이트
```

## 슬라이스 진행 현황

마지막 업데이트: 2026-04-25

| 슬라이스                                 | 상태   | 비고                                                                                            |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| Slice 0: 라우트 의미 고정                | 완료   | 공개 루트와 인증된 앱 라우트 의미가 라우트 계약에서 분리되었습니다.                             |
| Slice 1: 라우트 계약 정리                | 완료   | Launch Core 라우트 상수, canonical builder, 레거시 리다이렉트 대상이 중앙화되었습니다.          |
| Slice 2: canonical `/app` 작업 공간 공존 | 완료   | `DefaultLayout` 은 `/app` 이 소유하며, 레거시 작업 공간 URL 은 `/app/*` 로 리다이렉트됩니다.    |
| Slice 3: 공개 랜딩 + 레이아웃 경계 분리  | 완료   | 로그아웃 사용자는 `/` 공개 랜딩을 보고, 활성 인증 사용자는 `/app` 으로 진입합니다.              |
| Slice 4: 레거시 리다이렉트 유지          | 완료   | 리다이렉트 정규화, helper 갱신, unit coverage, 직접 Playwright spec coverage 가 완료되었습니다. |
| Slice 5: 문의 CTA 실사용 연결            | 완료   | 공개 문의 CTA 는 하나의 `VITE_PUBLIC_INQUIRY_FORM_URL` 을 사용하며, env 검증이 준비되었습니다.  |
| Slice 6: 배포 준비 + Preview 회귀 게이트 | 미시작 | Vercel 딥링크와 런칭 회귀 게이트가 아직 남아 있습니다.                                          |

---

## Slice 0 시작 전 기준선 점검

처음 한 번만 아래를 실행합니다.

- `pnpm lint:check`
- `pnpm test:unit tests/unit/router-index.spec.ts tests/unit/router-guards.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/dashboard.spec.ts tests/unit/sidebar.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts`

그리고 변경 전에 현재 상태를 기록해 둡니다.

- `/`, `/login`, `/signup`, `/access/*`, `/admin/*`, `/home/*`, `/ops/*`, `/schedule/*` 의 현재 리다이렉트 규칙
- 기존 `/schedule/step*` guard 동작, 특히 Step5 `scheduleKey` 보정 규칙
- 대시보드와 사이드바가 “home” 경로를 어떻게 가정하는지
- 공용 E2E helper 가 랜딩 위치와 스케줄 리뷰 URL을 어떻게 가정하는지

이 단계의 목적은 “나중에 무엇이 깨졌는지”를 비교할 기준을 만드는 것입니다.

## 테스트로 확인해야 하는 전체 그림

```text
Public `/`
  ├─ 로그아웃 상태 -> 공개 랜딩 페이지
  └─ 로그인 상태 -> `/app`

Canonical `/app`
  ├─ `/app`
  ├─ `/app/home/user`
  ├─ `/app/admin/approval-queue`
  ├─ `/app/ops/*`
  └─ `/app/schedule/step1..step5`

Legacy coexistence
  ├─ `/admin/*` -> `/app/admin/*`
  ├─ `/home/*` -> `/app/home/*`
  ├─ `/ops/*` -> `/app/ops/*`
  └─ `/schedule/*` -> `/app/schedule/*`

Layout boundary
  ├─ `/`, `/login`, `/signup`, `/access/*` -> 앱 크롬 없음
  └─ `/app/*` -> 앱 크롬 허용

Inquiry
  ├─ 헤더 CTA
  ├─ 히어로 CTA
  └─ 하나의 검증된 Google Form URL 사용
```

---

## Slice 0: 라우트 의미 고정

### 목표

`/` 와 `/app` 이 각각 무엇을 의미하는지 먼저 고정합니다. 이후 작업에서 의미가 다시 섞이지 않도록 만드는 단계입니다.

### 왜 먼저 해야 하나

이 작업 없이 바로 구현에 들어가면,

- 경로 문자열이 여기저기 남고
- 인증 fallback 이 엉키고
- 공개 화면과 앱 화면의 역할이 다시 섞일 가능성이 큽니다.

### 포함 작업

- 공개 루트와 로그인 후 홈의 역할을 문서와 코드에 명확히 반영
- app home, approval queue, user home, ops setup, schedule steps, Step5 용 canonical builder 정의
- `/admin/*`, `/home/*`, `/ops/*`, `/schedule/*` 레거시 리다이렉트 맵 정의
- 하드코딩 경로를 찾는 raw path 조사와 체크리스트 작성

### raw path 조사 대상

- `src/router/index.ts`
- `src/router/guards.ts`
- `src/views/Dashboard.vue`
- `src/components/layout/Sidebar.vue`
- `src/views/schedule/Step1BasicInfo.vue`
- `src/views/schedule/Step2SiteInfo.vue`
- `src/views/schedule/Step3EmployeeInfo.vue`
- `src/views/schedule/Step4InitialData.vue`
- `src/views/schedule/Step5Result.vue`
- `tests/e2e/helpers.ts`
- `tests/unit/dashboard.spec.ts`
- `tests/unit/sidebar.spec.ts`
- `tests/unit/schedule-version-resolver.spec.ts`
- `tests/unit/step5-result.spec.ts`

추천 검색:

- `rg -n "'/((admin|home|ops|schedule)|app)" src tests`

### 주요 파일

- `src/constants/routes.ts`
- `src/router/index.ts`
- `src/router/guards.ts`
- `src/views/Dashboard.vue`
- `src/components/layout/Sidebar.vue`
- `src/views/schedule/Step1BasicInfo.vue`
- `src/views/schedule/Step2SiteInfo.vue`
- `src/views/schedule/Step3EmployeeInfo.vue`
- `src/views/schedule/Step4InitialData.vue`
- `src/views/schedule/Step5Result.vue`
- `tests/e2e/helpers.ts`

### 검증 파일

- `tests/unit/router-index.spec.ts`
- `tests/unit/router-guards.spec.ts`
- `tests/unit/router-auth-guards.spec.ts`
- `tests/unit/dashboard.spec.ts`
- `tests/unit/sidebar.spec.ts`
- `tests/unit/schedule-version-resolver.spec.ts`
- `tests/unit/step5-result.spec.ts`

### 완료 기준

- `PUBLIC_ROOT_ROUTE_PATH` 와 `APP_HOME_ROUTE_PATH` 의 의미가 분리되어 있다.
- approval queue, user home, ops setup, schedule steps, Step5 를 커버하는 builder 세트가 준비되어 있다.
- 공개 랜딩 작업 전에 레거시 리다이렉트 맵이 명시되어 있다.
- raw path 가 암묵적 지식이 아니라 체크리스트로 관리된다.

### 테스트 게이트

- `pnpm lint:check`
- `pnpm test:unit tests/unit/router-index.spec.ts tests/unit/router-guards.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/dashboard.spec.ts tests/unit/sidebar.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts`

---

## Slice 1: 라우트 계약 정리

### 목표

Launch Core 경로의 단일 출처를 `src/constants/routes.ts` 와 관련 helper 로 통일합니다.

### 왜 분리된 슬라이스인가

이 단계가 먼저 정리되어야 이후 `/app` canonical 경로와 레거시 리다이렉트를 동시에 안전하게 운영할 수 있습니다.

### 포함 작업

- `src/constants/routes.ts` 를 Launch Core 기준의 canonical route map 으로 확장
- 아래 helper 또는 builder 추가
- app home
- approval queue
- user home
- ops organization setup
- ops off-request-policy setup
- schedule step paths
- Step5 route payload
- legacy -> canonical redirect target
- Launch Core 관련 코드의 하드코딩 경로를 helper 또는 legacy map 으로 교체

### 주요 파일

- `src/constants/routes.ts`
- `src/router/index.ts`
- `src/router/guards.ts`
- `src/components/layout/Sidebar.vue`
- `src/views/Dashboard.vue`
- `src/views/schedule/Step1BasicInfo.vue`
- `src/views/schedule/Step2SiteInfo.vue`
- `src/views/schedule/Step3EmployeeInfo.vue`
- `src/views/schedule/Step4InitialData.vue`
- `src/views/schedule/Step5Result.vue`
- `tests/e2e/helpers.ts`

### 검증 파일

- `tests/unit/router-index.spec.ts`
- `tests/unit/router-guards.spec.ts`
- `tests/unit/router-auth-guards.spec.ts`
- `tests/unit/dashboard.spec.ts`
- `tests/unit/sidebar.spec.ts`
- `tests/unit/schedule-version-resolver.spec.ts`
- `tests/unit/step5-result.spec.ts`

### 완료 기준

- Launch Core 목적지는 상수와 builder 가 단일 출처가 된다.
- `/ops/organization-setup`, `/ops/off-request-policy-setup`, `/schedule/step5/:scheduleKey` 가 예외 취급되지 않는다.
- 남은 raw path 는 제거되거나 레거시 리다이렉트 맵으로 명시된다.
- 이 슬라이스에서는 사용자에게 보이는 동작 변화가 없어야 한다.

### 테스트 게이트

- `pnpm lint:check`
- `pnpm test:unit tests/unit/router-index.spec.ts tests/unit/router-guards.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/dashboard.spec.ts tests/unit/sidebar.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts`

---

## Slice 2: canonical `/app` 작업 공간 공존

### 목표

로그인 후 실제 작업 경로를 `/app` 아래로 옮기되, 중간 마이그레이션 기간에는 예전 경로도 깨지지 않게 유지합니다.

### 왜 분리된 슬라이스인가

`/` 를 공개 랜딩으로 바꾸기 전에, `/app` 작업 공간이 먼저 안정적으로 살아 있어야 합니다.

### 포함 작업

- `DefaultLayout` 을 소유하는 `/app` 부모 라우트 추가
- `/app` 아래에 인증 후 child route 등록
- 로그인 후 리다이렉트와 guard fallback 을 canonical `/app` 경로로 변경
- 이전 경로도 임시로 계속 동작하게 유지
- router guard 관련 회귀를 이 슬라이스의 차단 게이트로 사용

### 주요 파일

- `src/router/index.ts`
- `src/router/guards.ts`
- `src/constants/routes.ts`
- `src/views/auth/Login.vue`
- `src/components/layout/Header.vue`
- `src/components/layout/Sidebar.vue`
- `src/views/Dashboard.vue`
- `tests/e2e/helpers.ts`

### 검증 파일

- `tests/unit/router-index.spec.ts`
- `tests/unit/router-guards.spec.ts`
- `tests/unit/router-auth-guards.spec.ts`
- `tests/unit/login-view.spec.ts`
- `tests/unit/dashboard.spec.ts`
- `tests/unit/sidebar.spec.ts`
- `tests/unit/schedule-version-resolver.spec.ts`
- `tests/unit/step5-result.spec.ts`
- `tests/e2e/signup-flow.spec.ts`
- `tests/e2e/multi-org-rbac.spec.ts`
- 필요 시 `/app` 마이그레이션 전용 E2E 테스트 추가

### 완료 기준

- 로그인 성공 시 우선적으로 canonical `/app` 경로로 이동한다.
- `DefaultLayout` 은 `/app` 에서만 마운트된다.
- canonical `/app` 경로가 실제로 사용 가능하다.
- 레거시 경로도 공존 기간에는 계속 열린다.
- 전환 중에도 schedule 사용자가 잘못된 화면으로 보내지지 않는다.

### 테스트 게이트

- `pnpm lint:check`
- `pnpm test:unit tests/unit/router-index.spec.ts tests/unit/router-guards.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/dashboard.spec.ts tests/unit/sidebar.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts`
- `pnpm test:e2e -- tests/e2e/signup-flow.spec.ts tests/e2e/multi-org-rbac.spec.ts tests/e2e/public-launch.spec.ts`

---

## Slice 3: 공개 랜딩 + 레이아웃 경계 분리

### 목표

`/` 를 공개 랜딩 페이지로 만들고, 공개/인증/접근 상태 화면에서 앱 크롬이 절대 보이지 않게 합니다.

### 왜 독립적인가

사용자가 가장 먼저 보게 되는 진입점이므로, `/app` 작업 공간이 먼저 안정화된 뒤에 적용해야 안전합니다.

### 포함 작업

- `/` 용 공개 랜딩 페이지 컴포넌트 또는 뷰 추가
- `/login`, `/signup`, `/access/pending`, `/access/rejected` 가 `DefaultLayout` 밖에 있도록 보장
- 로그인된 사용자가 `/` 로 오면 `/app` 으로 리다이렉트
- 랜딩 hero 와 header CTA 구조를 IA 문서와 일치시킴

### 추가 확인 항목

- 로그아웃 상태에서 `/` 는 공개 랜딩 페이지가 보인다.
- 로그인 상태에서 `/` 는 `/app` 으로 이동한다.
- `/login`, `/signup`, `/access/pending`, `/access/rejected` 는 앱 크롬 없이 렌더링된다.
- 공개/인증/접근 상태 경로에 사이드바나 워크스페이스 헤더가 섞여 나오지 않는다.

### 주요 파일

- `src/router/index.ts`
- `src/router/guards.ts`
- 랜딩 페이지 뷰 및 공개 CTA 관련 컴포넌트
- 필요 시 `src/App.vue`, `src/main.ts`
- 필요 시 `src/style.css`

### 검증 파일

- `tests/unit/router-index.spec.ts`
- `tests/unit/router-auth-guards.spec.ts`
- 필요 시 `tests/unit/header.spec.ts`
- 새 파일: `tests/unit/public-landing.spec.ts`
- 공개 진입 전용 Playwright 테스트

### 완료 기준

- 비로그인 사용자는 `/` 에서 공개 랜딩 페이지를 본다.
- 로그인된 사용자가 `/` 로 오면 `/app` 으로 이동한다.
- 공개/인증/접근 상태 경로에 앱 크롬이 새지 않는다.

### 테스트 게이트

- `pnpm lint:check`
- `pnpm test:unit tests/unit/public-landing.spec.ts tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts`
- `pnpm test:e2e -- tests/e2e/public-launch.spec.ts`

---

## Slice 4: 레거시 리다이렉트 유지

**상태:** 완료

**완료:** 레거시 경로 정규화는 라우트 상수로 중앙화했고, static legacy redirect matrix 와 Step5 query/hash 보존은 unit test 로 고정했습니다. launch E2E 와 checklist spec 도 canonical `/app` 목적지를 기대하도록 갱신했습니다. dependency 를 건너뛴 Playwright spec 실행은 로컬에서 통과했고, 전체 Playwright setup 은 로컬 `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` 설정에 의존합니다.

### 목표

기존 북마크, 운영자 습관, 테스트 helper 가 깨지지 않도록 옛 경로를 명시적으로 `/app` 경로로 넘깁니다.

### 왜 중요한가

`/` 가 공개 랜딩으로 바뀌면, 가장 쉽게 깨지는 것은 오래된 딥링크입니다.

### 포함 작업

- `/admin/approval-queue` -> `/app/admin/approval-queue`
- `/home/user` -> `/app/home/user`
- `/ops/organization-setup` -> `/app/ops/organization-setup`
- `/ops/off-request-policy-setup` -> `/app/ops/off-request-policy-setup`
- `/schedule/step1` -> `/app/schedule/step1`
- `/schedule/step2` -> `/app/schedule/step2`
- `/schedule/step3` -> `/app/schedule/step3`
- `/schedule/step4` -> `/app/schedule/step4`
- `/schedule/step5/:scheduleKey` -> `/app/schedule/step5/:scheduleKey`
- 공용 E2E helper 가 canonical 과 legacy 를 모두 이해하도록 수정
- helper 사용자 테스트가 여전히 통과하는지 검증

### 주요 파일

- `src/router/index.ts`
- `src/constants/routes.ts`
- `tests/e2e/helpers.ts`
- 직접 경로를 검사하는 unit test 들

### 검증 파일

- `tests/unit/router-index.spec.ts`
- `tests/unit/router-guards.spec.ts`
- `tests/unit/dashboard.spec.ts`
- `tests/unit/sidebar.spec.ts`
- `tests/unit/schedule-version-resolver.spec.ts`
- `tests/unit/step5-result.spec.ts`
- `tests/e2e/public-launch.spec.ts`
- `tests/e2e/multi-org-rbac.spec.ts`

### 완료 기준

- 기존 북마크가 새 `/app` 작업 공간으로 제대로 연결된다.
- 리다이렉트 동작이 우연히 되는 것이 아니라, 코드와 테스트로 명시되어 있다.
- `/ops/*`, `/schedule/*`, Step5 레거시 경로가 막히지 않는다.
- 공용 E2E helper 가 canonical 기준으로도 동작하면서 런칭 기간 legacy 테스트도 유지한다.

### 테스트 게이트

- `pnpm lint:check`
- `pnpm test:unit tests/unit/router-index.spec.ts tests/unit/router-guards.spec.ts tests/unit/dashboard.spec.ts tests/unit/sidebar.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts`
- `pnpm test:e2e -- tests/e2e/public-launch.spec.ts tests/e2e/multi-org-rbac.spec.ts`

---

## Slice 5: 문의 CTA 실사용 연결

**상태:** 완료

**완료:** 헤더, 히어로, 하단 문의 CTA 가 하나의 `VITE_PUBLIC_INQUIRY_FORM_URL` 로 설정된 Google Form 을 새 탭에서 열도록 통일했습니다. `.env.example` 에 공개 문의 URL 설정을 추가했고, `pnpm check-env` 로 URL 누락, 형식 오류, Google Form 이 아닌 URL, 템플릿 placeholder 를 막습니다. CTA parity 와 env validation 은 focused unit test 로 고정했습니다. Google Form 계약은 launch QA 기준으로 준비했으며, Vercel Preview/Production 환경변수 설정은 Slice 6 배포 스모크 범위로 남깁니다.

### 목표

공개 랜딩의 모든 문의 CTA 가 하나의 검증된 설정값을 사용하도록 통일하고, 실제 Google Form 연결까지 런칭 기준으로 검증합니다.

### 왜 분리된 슬라이스인가

이 작업은 단순한 버튼 연결이 아니라, 실제 전환 경로가 작동하는지 확인하는 런칭 작업입니다.

### 포함 작업

- 모든 문의 CTA 가 하나의 공개 config 값을 사용하도록 통일
- `.env.example` 에 `VITE_PUBLIC_INQUIRY_FORM_URL` 추가
- `pnpm check-env` 에서 URL 존재 여부와 URL 형식을 검증
- header 와 hero 의 CTA 라벨, 새 탭 동작을 일치시킴
- Google Form 수동 QA 절차 문서화 및 실행

### Google Form 수동 QA 체크

아래 항목을 실제로 확인해야 합니다.

- 필수 항목 존재: `요청 내용`, `병원 이름`, `병동 이름`, `이메일 주소`
- `요청 내용` 옵션 존재: `소개 자료 다운로드`, `한 달 무료 사용하기`, `기타`
- `기타` 를 선택했을 때 자유 입력 경로가 자연스럽다.
- 제출 전 개인정보 안내가 보인다.
- 런칭 문구상 필요하다면 동의 체크박스가 있다.
- 제출 완료 후 다음 단계 안내가 보인다.

### 주요 파일

- 랜딩 / 헤더 CTA 컴포넌트
- `.env.example`
- `scripts/check-env.js`
- 필요 시 `vite-env.d.ts`

### 검증 파일

- `tests/unit/public-landing.spec.ts`
- 필요 시 CTA parity / inquiry URL 검증 테스트

### 완료 기준

- 모든 공개 문의 CTA 가 같은 목적지로 열린다.
- 문의 URL 이 없거나 잘못되었으면 런칭 전에 잡힌다.
- 코드베이스에 하드코딩된 Form URL 이 중복으로 남아 있지 않다.
- Google Form 계약이 수동 검증되어 런칭 가능 상태로 기록된다.

### 테스트 게이트

- `pnpm lint:check`
- `pnpm check-env`
- `pnpm test:unit tests/unit/public-landing.spec.ts tests/unit/check-env.spec.ts`
- Google Form 수동 QA 완료

---

## Slice 6: 배포 준비 + Preview 회귀 게이트

**목표:** custom-domain DNS 또는 SSL 준비를 요구하지 않고, 저장소가 배포 준비 상태임을 만들고, 첫 Vercel 배포 경로를 부트스트랩하며, 런칭 회귀 게이트를 정의합니다.

**마지막 슬라이스인 이유:** Launch Core 마이그레이션 동작이 존재한 뒤에만 전체 라우트, 인증, 리다이렉트, 문의 CTA, 배포 계약을 검증할 수 있기 때문입니다.

### 상태 레이어

```text
Repo-ready
  -> Vercel-project-ready
  -> Preview-smoke-ready
  -> Production-default-domain-ready
  -> Custom-domain-ready
```

`Repo-ready` 는 Vercel 프로젝트가 없고 custom-domain 이 연결되기 전에도 병합할 수 있습니다. `Custom-domain-ready` 는 `everyshift.co.kr` 공개 런칭만 막으며, 저장소 배포 준비 증명을 막지 않습니다.

### 명시적 가정

- 구매한 custom-domain 은 `everyshift.co.kr` 입니다.
- 아직 Vercel 프로젝트가 없을 수 있습니다.
- 첫 배포 검증 대상은 Vercel generated URL 입니다.
- registrar DNS 와 SSL 준비는 외부 launch-ops 작업입니다.
- Slice 6 코드와 문서는 `everyshift.co.kr` 연결 및 SSL 준비 전에 병합할 수 있습니다.

### 지원 산출물

- [Launch Core 인증 및 배포 스펙](./launch-core-auth-and-deploy-spec.ko.md)
- [Launch Core QA 체크리스트](./launch-core-qa-checklist.ko.md)

이 마스터 slice 문서는 단계 순서와 통과 기준을 정의합니다. 인증 및 배포 스펙은 Vercel 프로젝트 설정값과 배포 원칙을 기록하고, QA 체크리스트는 실제 런칭 스모크를 수행하는 사람이 따라갈 확인 순서를 기록합니다.

### Slice 6 단계 흐름

#### 1. Repo-ready

목적: Vercel 프로젝트 설정이나 배포 스모크 전에 저장소가 준비됐는지 확인합니다.

통과 기준:

- 루트 `vercel.json` 에 Vite SPA rewrite 가 `/index.html` 로 설정되어 있다.
- `pnpm check-env` 가 공개 문의 URL 계약을 검증한다.
- 핵심 unit / E2E 런칭 회귀 테스트가 준비되어 있다.
- 첫 배포 인계 전 로컬 `pnpm build` 가 통과한다.

#### 2. Vercel-project-ready

목적: Vercel 을 처음 쓰는 사람도 확인할 수 있게 프로젝트와 GitHub 연결, 빌드 설정을 고정합니다.

통과 기준:

- GitHub 저장소가 Vercel 프로젝트에 연결되어 있다.
- Framework Preset 이 Vite 이거나 Vite 자동 감지가 확인되어 있다.
- Build Command 는 `pnpm build` 다.
- Output Directory 는 `dist` 다.
- Install Command 는 프로젝트 package manager 기준이며 보통 `pnpm install` 이다.
- Preview 와 Production 환경변수가 독립적으로 설정되어 있다.
- `VITE_PUBLIC_INQUIRY_FORM_URL` 이 Preview 와 Production 양쪽에 있다.

#### 3. Preview-smoke-ready

목적: production 승격 전에 generated Preview URL 에서 실제 동작을 확인합니다.

통과 기준:

- generated Preview URL 의 `/` 가 공개 랜딩으로 열린다.
- Preview URL 에서 `/app/*` 딥링크 직접 접근과 새로고침이 동작한다.
- Preview 에서 로그인, 회원가입, 접근 상태, 권한별 도착 경로, 레거시 리다이렉트, 문의 CTA 확인이 통과한다.
- Preview 스모크 결과가 [Launch Core QA 체크리스트](./launch-core-qa-checklist.ko.md)에 기록되어 있다.

#### 4. Production-default-domain-ready

목적: 런칭 도메인을 붙이거나 공개하기 전에 generated Production URL 을 확인합니다.

통과 기준:

- generated Production URL 에 접근할 수 있다.
- generated Production URL 에서 공개 랜딩, 인증 리다이렉트, `/app/*` 새로고침, 레거시 리다이렉트, 문의 CTA 확인이 통과한다.
- Production 환경변수 값이 런칭 의도와 일치한다.
- production 기본 URL 스모크 결과가 [Launch Core QA 체크리스트](./launch-core-qa-checklist.ko.md)에 기록되어 있다.

#### 5. Custom-domain-ready

목적: DNS 와 SSL 이 활성화된 뒤 `everyshift.co.kr` 을 확인합니다.

통과 기준:

- `everyshift.co.kr` 이 Vercel 프로젝트에 연결되어 있다.
- Vercel 이 안내한 DNS record 가 도메인 제공업체에 설정되어 있다.
- DNS 전파 후 Vercel 이 HTTPS certificate 를 active 로 표시한다.
- `https://everyshift.co.kr` 에서 공개 랜딩, `/app/*` 새로고침, 레거시 리다이렉트, 문의 CTA 확인이 통과한다.
- custom-domain 스모크 결과가 [Launch Core QA 체크리스트](./launch-core-qa-checklist.ko.md)에 기록되어 있다.

### 포함 범위

- 루트 `vercel.json` 에 Vite SPA 딥링크 fallback rewrite 를 추가합니다.
- 로컬 repo-ready 점검은 Vercel 과 독립적으로 유지합니다.
- Vercel 프로젝트 부트스트랩 설정을 정의합니다.
- `https://<vercel-preview-deployment>.vercel.app` 에서 Preview smoke checks 를 정의합니다.
- `https://<vercel-project>.vercel.app` 에서 Production smoke checks 를 정의합니다.
- DNS 와 SSL 이 완료될 때까지 `https://everyshift.co.kr` custom-domain 스모크 점검을 미룹니다.

### 제외 범위

- 추가 도메인 구매 또는 등록 도메인 변경
- registrar DNS 설정
- OAuth provider 추가
- analytics 추가
- 스케줄 생성 동작 변경

### 저장소 배포 계약

- 루트 `vercel.json` 은 `/api/*` 를 function proxy 로 먼저 라우팅한 뒤 `/index.html` 로 가는 Vite SPA fallback rewrite 를 가집니다.
- `/app/*` hard refresh 는 SPA fallback 을 통해 해결되어야 합니다.
- 로컬 점검은 `.env.local` 을 사용하며 live Vercel URLs 를 요구하지 않습니다.
- 자격 증명 기반 Playwright specs 는 repo readiness 와 별도로 보고합니다.
- `pnpm check-env` 는 `VITE_PUBLIC_INQUIRY_FORM_URL` 의 런칭 환경변수 게이트로 유지됩니다.

### Vercel 프로젝트 부트스트랩 체크리스트

- GitHub repo 를 Vercel 로 import 합니다.
- 프레임워크 preset: `Vite`
- install command: `pnpm install`
- build command: `pnpm build`
- output directory: `dist`
- Node version: Vercel default, 단 추후 프로젝트 제약이 추가되면 그 제약을 따릅니다.
- Preview 와 Production 환경변수를 별도로 설정합니다:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_PUBLIC_INQUIRY_FORM_URL`
- Vercel 에서는 `VITE_API_BASE_URL` 을 설정하지 않아 브라우저 solver 요청이 same-origin `/api/*` function proxy 를 사용하게 합니다.
- canonical/meta 동작이 생기기 전까지는 선택 사항입니다:
  - `VITE_PUBLIC_SITE_URL`
- secrets 를 `VITE_*` 에 넣지 않습니다.
- 값을 검토하지 않고 `.env.local` 을 Vercel 로 복사하지 않습니다.
- `VITE_PUBLIC_INQUIRY_FORM_URL` 은 템플릿 placeholder 가 아니라 실제 Google Form URL 이어야 합니다.

### Preview 스모크 게이트

Preview 대상:

```text
https://<vercel-preview-deployment>.vercel.app
```

필수 점검:

- 로그아웃 상태의 `/` 는 공개 랜딩을 보여줍니다.
- 로그인 상태의 `/` 는 `/app` 으로 리다이렉트합니다.
- `/login`, `/signup`, `/access/*` 는 앱 크롬 없이 렌더링됩니다.
- `/app` 은 활성 admin 에게 앱 크롬과 함께 로드됩니다.
- `/app/schedule/step1` hard refresh 는 404 가 나지 않습니다.
- `/admin/*`, `/home/*`, `/ops/*`, `/schedule/*` 는 canonical `/app/*` 로 리다이렉트합니다.
- inquiry CTA 는 설정된 Google Form 을 엽니다.
- `pending`, `rejected`, `restricted-user` 라우트는 올바른 위치에 도착합니다.

실패 규칙:

```text
If preview smoke fails, do not promote to production. Fix the repo or Vercel env/config first.
```

### Production 기본 도메인 스모크 게이트

custom-domain 연결 전 Production 대상:

```text
https://<vercel-project>.vercel.app
```

Preview 게이트와 같은 스모크 매트릭스를 production generated URL 에 대해 실행합니다.

승격 규칙:

```text
Production deployment can be verified on the generated Vercel domain. Custom-domain launch on everyshift.co.kr remains blocked until DNS, SSL, and custom-domain smoke are complete.
```

### 지연된 Custom-Domain 체크리스트

대상 custom domain:

```text
https://everyshift.co.kr
```

Vercel 프로젝트가 존재하고 도메인 연결 작업을 시작한 뒤에만 아래를 완료합니다:

- 구매한 도메인이 `everyshift.co.kr` 임을 확인합니다.
- Vercel 프로젝트에 `everyshift.co.kr` 을 추가합니다.
- Vercel 안내에 따라 등록기관 DNS records 를 설정합니다.
- Vercel SSL certificate 가 valid 상태가 될 때까지 기다립니다.
- `https://everyshift.co.kr` 에서 `/`, `/app`, `/login`, `/signup`, `/access/*`, 그리고 `/app/schedule/*` hard refresh 하나를 스모크 테스트합니다.
- site metadata 또는 canonical URL 동작이 구현된 경우에만 `VITE_PUBLIC_SITE_URL` 을 업데이트합니다.

Custom-domain 규칙:

```text
Do not block Slice 6 repo completion on connecting everyshift.co.kr. Block public custom-domain launch on this checklist instead.
```

### 주요 파일

- `vercel.json`
- `docs/launch/launch-core/launch-core-implementation-slices.md`
- `docs/launch/launch-core/launch-core-implementation-slices.ko.md`
- `docs/launch/launch-core/launch-core-auth-and-deploy-spec.md`
- `docs/launch/launch-core/launch-core-auth-and-deploy-spec.ko.md`
- `docs/launch/launch-core/launch-core-qa-checklist.md`
- `docs/launch/launch-core/launch-core-qa-checklist.ko.md`

### 검증 파일

- `tests/unit/router-index.spec.ts`
- `tests/unit/router-auth-guards.spec.ts`
- `tests/unit/login-view.spec.ts`
- `tests/unit/public-landing.spec.ts`
- `tests/unit/check-env.spec.ts`
- `tests/unit/schedule-version-resolver.spec.ts`
- `tests/unit/step5-result.spec.ts`
- `tests/e2e/public-launch.spec.ts`
- `tests/e2e/signup-flow.spec.ts`
- `tests/e2e/multi-org-rbac.spec.ts`

### 완료 기준

- `vercel.json` 은 Vite SPA fallback rewrite 를 정의합니다.
- live Vercel URLs 없이 로컬 repo-ready 점검이 통과합니다.
- Vercel 프로젝트 부트스트랩 설정이 문서화되어 있습니다.
- preview smoke 는 generated Vercel URL 에 대해 정의되어 있습니다.
- production smoke 는 generated Vercel production URL 에 대해 정의되어 있습니다.
- `everyshift.co.kr` custom-domain 런칭은 DNS, SSL, 스모크 점검 뒤로 미뤄져 있습니다.
- inquiry URL 이 없거나, malformed 이거나, non-Google 이거나, template inquiry URL 이면 런칭할 수 없습니다.
- Slice 6의 다섯 readiness 단계가 QA 체크리스트에 pass, blocked, intentionally deferred 중 하나로 기록되어 있습니다.

### Slice 6 이후 테스트 게이트

Repo-ready 로컬 게이트:

```bash
pnpm lint:check
pnpm check-env
pnpm test:unit tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/public-landing.spec.ts tests/unit/check-env.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts
pnpm test:e2e -- --no-deps tests/e2e/public-launch.spec.ts
pnpm build
```

예상 결과: 모든 명령은 `.env.local` 을 사용해 로컬에서 통과해야 하며, E2E 는 live Vercel URL 을 요구하지 않습니다.

자격 증명 기반 E2E 게이트:

```bash
pnpm test:e2e -- tests/e2e/signup-flow.spec.ts tests/e2e/multi-org-rbac.spec.ts
```

예상 결과: `.env.test` 또는 shell environment 에 필요한 test account credentials 가 있을 때만 실행합니다.

자격 증명 기반 E2E 를 실행할 수 없으면 다음을 기록합니다:

```text
Blocked locally by missing TEST_USER_EMAIL/TEST_USER_PASSWORD. Not a Slice 6 repo-readiness failure.
```

Manual smoke records before launch:

- 로그아웃 상태에서 `/` 가 공개 랜딩으로 보인다.
- 로그인 상태에서 `/` 가 `/app` 으로 이동한다.
- `/login`, `/signup`, `/access/*` 에 앱 크롬이 보이지 않는다.
- preview 에서 `/app/*` 새로고침이 된다.
- `/admin/*`, `/home/*`, `/ops/*`, `/schedule/*` 레거시 리다이렉트가 모두 맞다.
- 문의 CTA 가 설정된 Google Form 을 연다.
- admin, super, pending, rejected, restricted-user 라우팅이 모두 맞다.
- generated Preview URL, generated Production URL, `everyshift.co.kr` 의 스모크 결과가 런칭 공지 전에 명시되어 있다.

---

## 권장 개발 순서

각 슬라이스마다 아래 순서를 그대로 반복합니다.

1. 현재 슬라이스 범위만 구현
2. 해당 슬라이스 테스트 게이트 실행
3. 같은 슬라이스 안에서 회귀 수정
4. 슬라이스 단위 커밋
5. 그 다음 슬라이스로 이동

### 권장 커밋 메시지

- `chore: freeze launch route semantics`
- `feat: consolidate launch route contract`
- `feat: add canonical app workspace routes`
- `feat: add public launch landing route`
- `feat: add launch legacy redirects`
- `feat: wire inquiry CTA config`
- `chore: add vercel launch routing contract`

## 특히 주의할 실패 시나리오

| 실패 유형                                                 | 어떤 문제가 생기나                                                             | 어느 슬라이스에서 잡아야 하나 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------- |
| 로그인 사용자가 `/` 에서 루프를 돌거나 잘못된 화면으로 감 | `/`, `/login`, 레거시 홈 사이를 왔다 갔다 하거나 엉뚱한 화면으로 이동          | Slice 0, 2, 3                 |
| `/ops/*` 북마크가 막힘                                    | 운영자가 저장해둔 설정 링크로 들어갔을 때 404 또는 빈 셸이 나옴                | Slice 1, 4                    |
| `/app/schedule/*` 단계 guard 오동작                       | 사용자가 필요한 단계를 건너뛰거나 `scheduleKey` 를 잃거나 잘못된 단계로 돌아감 | Slice 0, 1, 2                 |
| 문의 URL 이 없는데 CTA 는 보임                            | 사용자가 버튼을 눌렀지만 실제 문의 폼을 열 수 없음                             | Slice 5, 6                    |

## 최종 런칭 조건

아래가 모두 충족될 때만 `Launch Core` 를 배포할 수 있습니다.

- 7개 슬라이스가 모두 완료되었다.
- 각 슬라이스 테스트 게이트가 모두 통과했다.
- 최종 런칭 회귀 테스트가 통과했다.
- preview, production 기본 URL, custom domain 스모크 테스트가 통과했거나 명시적인 런칭 결정이 기록되어 있다.
- `launch-core-qa-checklist.md` 가 완료되었다.
