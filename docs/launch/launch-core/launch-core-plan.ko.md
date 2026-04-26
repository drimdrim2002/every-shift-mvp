# Launch Core 계획 문서

> 상태: Slice 2 완료, Slice 3 대기
> 원문 기준 문서: [launch-core-plan.md](./launch-core-plan.md)

## 목표

EveryShift 가 외부에 공개 가능한 실제 제품처럼 보이기 위해 필요한 최소 범위를 출시합니다.

즉, 아래가 가능해야 합니다.

- `/` 에 공개 랜딩 페이지가 있다
- 검색 유입과 크롤러는 앱 셸이 아니라 공개 콘텐츠를 본다
- 로그인 사용자는 `/app` 아래에서 작업한다
- 라우트 분리 후에도 기존 앱이 안정적으로 동작한다
- 프론트엔드가 Vercel 에 배포 가능하다
- 공개 CTA 가 실제 동작하는 경로로 연결된다

## Launch Core 가 의미하는 것

`Launch Core` 는 단순한 마케팅 페이지 작업이 아닙니다.

이 릴리스부터 제품은 다음을 갖춰야 합니다.

- 공개 진입점
- 보호된 작업 공간
- 배포 계약
- 출시 차단용 QA 게이트

또한 신규 방문자가 헷갈리지 않고 아래 세 가지를 할 수 있어야 합니다.

- 로그인
- 관리자 회원가입 시작
- 도입 문의 제출

## Launch Core 가 의미하지 않는 것

이번 범위는 아래를 포함하지 않습니다.

- 전체 인증 확장
- 완성형 마케팅 사이트 구축
- 스케줄 생성 워크플로우 재작성
- 소셜 로그인 출시

## 범위

### 포함

- `pnpm lint:check` green 유지
- 공개 경로와 앱 경로 분리
- `/` 를 공개 랜딩 페이지로 전환
- 로그인 후 제품 루트를 `/app` 으로 이동
- 기존 이메일/비밀번호 로그인, 회원가입 유지
- 관리자 회원가입과 도입 문의 CTA 를 실제 경로로 고정
- Vercel preview / production 배포 설정
- 출시 차단용 QA 수행

### 제외

- Google 로그인
- Kakao 로그인
- 공용 OAuth callback 라우트 배포
- provider 별 계정 연결 규칙
- 대외 신뢰 확보에 꼭 필요하지 않은 과도한 런칭 폴리시

## Step 0: 범위 점검

### 이미 재사용할 수 있는 것

Launch Core 는 이미 잘 동작하는 코드를 재사용해야 합니다.

- `src/router/index.ts` 는 이미 auth/public route 등록과 guard 연결을 담당하고 있습니다.
- `src/router/guards.ts` 는 active, pending, rejected 상태 리다이렉트를 이미 알고 있습니다.
- `src/constants/routes.ts` 는 일부 경로 계약을 중앙화하고 있으므로, launch 경로 전체의 단일 출처로 확장해야 합니다.
- `src/views/auth/Login.vue`, `src/views/auth/Signup.vue`, `src/views/auth/AccessState.vue` 는 인증 및 blocked-state 화면을 이미 갖추고 있습니다.
- `src/components/layout/DefaultLayout.vue`, `Header.vue`, `Sidebar.vue` 는 로그인 후 작업 공간 셸이며 `/app` 아래로만 제한하면 됩니다.
- 기존 unit / E2E 테스트는 router guard, login, signup, RBAC, dashboard, schedule navigation 을 이미 다루고 있으므로 새 QA 체계를 만들 필요가 없습니다.

### 최소 변경 권장안

가장 안전한 최소 Launch Core 는 아래 다섯 가지입니다.

1. `/` 에 공개 랜딩 페이지 추가
2. 로그인 후 작업 공간을 `/app` 으로 이동
3. 로그인, 회원가입, pending, rejected 흐름 유지
4. 예전 딥링크를 위한 임시 legacy redirect 레이어 추가
5. Vercel 배포 계약과 핵심 회귀 테스트 추가

이번 계획은 아래로 범위가 번지면 안 됩니다.

- 인증 제공자 작업
- analytics SDK 추가
- 대시보드 재디자인
- 앱 내부 문의 관리

### 왜 단계적으로 해야 하나

현재 저장소는 router, guards, layout navigation, schedule view, tests 전반에 앱 경로가 하드코딩되어 있습니다.

한 번에 이름을 바꾸면 위험하므로, 순서를 나눠서 진행해야 합니다.

Launch Core 의 기술적 결정:

- 먼저 route constants / helpers 에 canonical 경로를 모읍니다.
- 그다음 `/app` 경로와 legacy redirect 를 추가합니다.
- 그다음 호출부와 테스트를 canonical `/app` 기준으로 바꿉니다.
- 안정화가 확인된 뒤에만 legacy redirect 제거를 검토합니다.

## Slice 진행 상황

최종 업데이트: 2026-04-25

| Slice                                           | 상태      | 현재 의미                                                                                                                                                                  |
| ----------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slice 0: Route semantics freeze                 | 완료      | `/` 와 `/app` 의 의미가 route contract 에서 분리되었습니다.                                                                                                                |
| Slice 1: Route contract consolidation           | 완료      | Launch Core 경로 상수, canonical builder, legacy redirect 대상이 중앙화되었습니다.                                                                                         |
| Slice 2: Canonical `/app` workspace coexistence | 완료      | `DefaultLayout` 은 `/app` 이 소유하고, 인증 후 작업 공간은 `/app/*` canonical 경로로 동작합니다. legacy 작업 공간 URL 은 query/hash 를 보존해 `/app/*` 로 redirect 됩니다. |
| Slice 3: Public landing + layout boundary       | 다음 작업 | 공개 랜딩이 들어가기 전까지 `/` 는 임시로 `/app` 으로 redirect 됩니다.                                                                                                     |
| Slice 4: Legacy redirect window                 | 미시작    | 공개 경계 적용 후 launch-window redirect 를 더 넓게 고정합니다.                                                                                                            |
| Slice 5: Launch-safe inquiry CTA                | 미시작    | 랜딩 표면이 준비된 뒤 공개 문의 CTA 와 config 를 연결합니다.                                                                                                               |
| Slice 6: 배포 준비 + Preview 회귀 게이트        | 미시작    | generated Vercel URL 에서 먼저 배포 준비 상태를 검증하고, `everyshift.co.kr` custom-domain 런칭은 DNS, SSL, 스모크 점검 이후 게이트로 분리합니다.                          |

### 기술 가드레일

- Vue Router 는 중첩 라우트를 잘 지원하지만, child path 가 `/` 로 시작하면 루트 경로가 되므로 `/app` 아래 child 는 상대 경로를 써야 합니다.
- Vercel 에서 Vite SPA 딥링크를 살리려면 명시적인 rewrite 가 필요하므로 `/app/*` 새로고침 지원은 선택이 아니라 필수입니다.
- Vite 는 `VITE_*` 환경변수만 클라이언트에 노출하므로 공개 문의 URL 은 `VITE_PUBLIC_INQUIRY_FORM_URL` 에 둘 수 있지만, 비밀값은 두면 안 됩니다.

## 출시 UX 계약

Launch Core 는 라우터 동작만 정의하면 안 됩니다. 사용자가 실제로 무엇을 보게 되는지도 정의해야 합니다.

### 첫 화면에서 답해야 할 3가지

랜딩 첫 화면은 아래를 바로 설명해야 합니다.

1. 이 제품은 무엇인가
2. 누구를 위한 것인가
3. 다음에 무엇을 해야 하는가

첫 화면이 전달해야 할 핵심:

- 제품명: `EveryShift`
- 대상: 병원과 간호 운영팀
- 약속: 더 쉬운 근무표 생성과 검토
- 행동 유도: `회원 가입`, `도입 문의`

### 공개 헤더

데스크톱 헤더 오른쪽 액션:

- `로그인`
- `회원 가입`
- `도입 문의`

규칙:

- 순서는 반드시 위와 같아야 합니다.
- `로그인` 은 `/login`
- `회원 가입` 은 `/signup?role=admin`
- `도입 문의` 는 실제 Google Form 을 새 탭에서 엽니다.
- 공개 헤더에는 앱 사이드바나 로그인 후 전용 컨트롤이 보이면 안 됩니다.

### 히어로 CTA 우선순위

- 기본 CTA: `회원 가입`
- 보조 CTA: `도입 문의`
- 기존 사용자를 위해 `로그인` 은 헤더에 유지

이것이 이번 출시의 고정 결정입니다.

- 직접 회원가입 전환을 우선한다
- 사람과 먼저 이야기하고 싶은 병원을 위해 문의 경로도 눈에 띄게 둔다

### 랜딩 섹션 순서

랜딩 페이지가 앱 대시보드처럼 보이거나 흔한 SaaS 카드 모음처럼 보이면 안 됩니다.

필수 순서:

1. Hero
2. Workflow Summary
3. Trust / Launch Readiness
4. Inquiry Reinforcement
5. Footer

각 섹션의 역할:

- hero: 제품 설명과 행동 유도
- workflow summary: 근무표 생성 흐름을 쉬운 말로 설명
- trust signals: 제품이 실제로 준비되어 있음을 보여줌
- inquiry reinforcement: 아직 회원가입이 부담스러운 병원에 낮은 압력의 문의 경로 제공

### 공개 히어로 콘텐츠 위계

히어로는 아래 순서로 읽혀야 합니다.

1. `EveryShift`
2. 병원용 간호 근무표 생성 제품이라는 한 줄 헤드라인
3. 현재 MVP 범위를 설명하는 한 줄 보조 문장
4. `회원 가입` 버튼
5. `도입 문의` 버튼 또는 텍스트 버튼

피해야 하는 것:

- 일반적인 마케팅 문구
- 첫 화면부터 3열 SaaS 기능 카드
- 보라색 그라디언트 기본값 같은 장식 위주 표현
- 제품명보다 더 시끄러운 히어로 이미지

### 핵심 전환 경로

- 기존 사용자: `로그인` -> `/login`
- 신규 관리자: `회원 가입` -> `/signup?role=admin`
- 검토/상담 사용자: `도입 문의` -> Google Form

어떤 CTA 도 placeholder, disabled, dead end 로 이어지면 안 됩니다.

## 왜 이 작업이 먼저 나가야 하나

아래 중 하나라도 맞으면 제품을 공개 출시할 수 없습니다.

- `/` 가 아직 내부 앱 홈처럼 동작한다
- 초기 유입 사용자가 placeholder CTA 를 누르게 된다
- 배포 동작이 정리되지 않았다

## 엔지니어링 구조

```text
Browser request
├─ Public surface
│  ├─ / -> PublicLandingView
│  ├─ /login -> LoginView
│  └─ /signup -> SignupView
│
├─ Access-state surface
│  ├─ /access/pending -> AccessStateView(pending)
│  └─ /access/rejected -> AccessStateView(rejected)
│
├─ Authenticated workspace
│  └─ /app/*
│     └─ DefaultLayout
│        ├─ Header
│        ├─ Sidebar
│        └─ workspace child routes
│           ├─ /app
│           ├─ /app/admin/approval-queue
│           ├─ /app/home/user
│           ├─ /app/ops/*
│           └─ /app/schedule/step1..step5
│
└─ Legacy compatibility redirects (launch window only)
   ├─ /admin/approval-queue -> /app/admin/approval-queue
   ├─ /home/user -> /app/home/user
   ├─ /ops/* -> /app/ops/*
   └─ /schedule/* -> /app/schedule/*
```

### 라우트 소유 규칙

- `/` 는 비로그인 사용자를 위한 공개 진입점입니다.
- 활성 로그인 사용자가 `/` 에 들어오면 `/app` 으로 보내서 소개 화면과 작업 화면이 섞이지 않게 해야 합니다.
- `/login`, `/signup` 은 공개 경로로 유지하되, 로그인 성공 후에는 `/app`, `/app/admin/approval-queue`, `/app/home/user` 중 권한에 맞는 canonical 경로로 이동해야 합니다.
- pending, rejected 상태는 `/app` 이 아니라 `/access/pending`, `/access/rejected` 로 보내야 합니다.
- `/access/pending`, `/access/rejected` 는 상태 설명 화면이므로 앱 셸 밖에 있어야 합니다.
- `DefaultLayout` 은 `/`, `/login`, `/signup`, `/access/*` 에 렌더링되면 안 됩니다.

## 정보 구조 다이어그램

```text
/
├─ Public Header
│  ├─ EveryShift
│  └─ 로그인 | 회원 가입 | 도입 문의
├─ Hero
│  ├─ Product identity
│  ├─ One-sentence value proposition
│  ├─ Primary CTA: 회원 가입
│  └─ Secondary CTA: 도입 문의
├─ Workflow Summary
│  ├─ Step 1 기본 정보
│  ├─ Step 2 사이트 정보
│  ├─ Step 3 직원 정보
│  ├─ Step 4 초기 데이터
│  └─ Step 5 결과 검토 및 수정
├─ Trust Signals
│  ├─ protected app workspace under /app
│  ├─ admin approval flow
│  └─ deployable public beta status
└─ Inquiry Reinforcement
   └─ 소개 자료 / 체험 / 기타 문의를 위한 Google Form
```

## 구현 순서

상세 순서는 [launch-core-implementation-slices.ko.md](./launch-core-implementation-slices.ko.md) 에 따릅니다.

### 1. 먼저 라우트 계약 정리

- `src/constants/routes.ts` 를 public, access-state, app-home, admin, user-home, schedule-step 의 단일 출처로 확장
- schedule step 과 legacy redirect 대상용 route builder 추가
- router, guards, sidebar, dashboard, schedule view 에서 새로운 raw string 경로 추가를 막기

### 1A. 호환 리다이렉트 기간

- canonical 출시 경로는 `/app` 아래에 둡니다.
- 다만 출시 기간 동안 아래 예전 경로는 유지합니다.
- `/admin/approval-queue`
- `/home/user`
- `/ops/organization-setup`
- `/ops/off-request-policy-setup`
- `/schedule/step1`
- `/schedule/step2`
- `/schedule/step3`
- `/schedule/step4`
- `/schedule/step5/:scheduleKey`

이 redirect 는 북마크, 테스트 fixture, 내부 링크가 이미 예전 경로를 쓰고 있기 때문에 필요합니다.

### 2. Public / App 라우트 분리

- 공개 경로는 `/`, `/login`, `/signup`
- 인증 후 제품 경로는 `/app`
- 로그인 후 redirect 는 권한에 맞는 `/app` 경로를 사용
- 앱 셸은 더 이상 `/` 를 소유하지 않음
- `createRouter` 구조는 유지하고, route tree 만 바꿈
- `/app` 부모 route 가 `DefaultLayout` 을 소유하고, child 는 상대 경로를 사용

### 2A. 레이아웃 경계

- `/` 에는 공개 레이아웃 또는 route-level 공개 페이지 컴포넌트 도입
- 기존 auth 페이지는 공개 경로에 두되, 앱 사이드바/헤더가 새지 않게 유지
- access-state 페이지는 `DefaultLayout` 밖에 둠
- 사용자가 앱으로 들어가기 전 `/` 에서 조직 데이터 hydration 을 시작하지 않음

### 3. 공개 랜딩 페이지

- 히어로와 제품 설명
- 워크플로우 요약
- 신뢰 요소
- SEO 대응 문구와 구조
- 공개 헤더 액션: `로그인`, `회원 가입`, `도입 문의`
- CTA 위계: `회원 가입` 기본, `도입 문의` 보조
- 모바일 헤더 동작과 터치 영역
- 접근성과 키보드 내비게이션

### 4. 전환 경로

- `회원 가입` 은 `/signup?role=admin`
- `도입 문의` 는 실제 Google Form
- 두 CTA 모두 공개 화면에서 항상 보여야 함
- placeholder 나 dead end 금지
- 연락 경로를 푸터에만 숨기지 않음
- Google Form URL 은 하나의 공개 config 값에서만 가져옴

### 4A. 문의 폼 요구사항

Google Form 필수 항목:

- `요청 내용`
  - 체크박스, 복수 선택 허용
  - 옵션:
    - `소개 자료 다운로드`
    - `한 달 무료 사용하기`
    - `기타`
  - `기타` 선택 시 직접 입력란 제공
- `병원 이름`
- `병동 이름`
- `이메일 주소`

폼 동작 규칙:

- `병원 이름`, `병동 이름`, `이메일 주소` 는 필수
- 이메일은 하나의 명시적 필드만 사용
- 제출 후에는 후속 연락 시점을 안내하는 완료 메시지 제공
- 헤더와 랜딩 보조 CTA 모두에서 폼 접근 가능해야 함

### 4B. 개인정보 안내

문의 폼은 추후 연락을 위해 식별 가능한 정보를 저장하므로, 제출 전에 개인정보 수집/이용 안내가 보여야 합니다.

최소 공개 항목:

- 수집 및 이용 목적
- 수집 항목
- 보관 기간
- 거부 권리와 거부 시 불이익

권장 방식:

- 제출 전 필수 동의 체크박스
- 목적은 문의 응답, 소개 자료 전달, 무료 사용 후속 대응 수준으로 제한
- 보관 기간은 폼에 명확히 기재

정확한 법적 문구는 공개 출시 전에 다시 검토해야 합니다.

### 5. 배포

- Vercel preview 배포
- Vercel production 배포
- 환경변수 정리
- `/app/*` SPA 딥링크 지원
- 이를 위한 `vercel.json` rewrite
- 공개 문의 URL 이 없으면 출시용 빌드 검증이 실패해야 함

### 5A. 되돌릴 수 있는 출시 구조

- 랜딩은 괜찮지만 `/app` 마이그레이션이 불안정하면 preview 에서 먼저 잡아야 합니다.
- production 릴리스는 config/code deploy 만 포함해야 하며 schema migration 이나 auth-provider rollout 과 묶이면 안 됩니다.
- 출시 기간의 legacy redirect 는 실수 비용을 낮춰 줍니다.

### 6. QA 와 릴리스 게이트

- 랜딩 QA
- 인증 QA
- 라우팅 QA
- 메뉴 / RBAC QA
- preview / production 스모크 QA
- 문의 폼 QA
- 모바일 / 키보드 QA

## 실패 시나리오

| 코드 경로 / 화면              | 현실적인 실패                                               | 테스트 필요 | 에러 처리 필요 | 방치 시 사용자 결과 |
| ----------------------------- | ----------------------------------------------------------- | ----------- | -------------- | ------------------- |
| `/app/*` 새로고침             | SPA rewrite 가 없어 Vercel 404 발생                         | Yes         | Yes            | 조용한 치명적 실패  |
| 활성 로그인 사용자의 `/` 접근 | 공개 랜딩에 머물러 로그인/회원가입 버튼만 보게 됨           | Yes         | Yes            | 제품 정체성 혼란    |
| legacy 북마크                 | 예전 `/ops/*`, `/schedule/*` 북마크가 깨짐                  | Yes         | Yes            | 조용한 치명적 실패  |
| `도입 문의` CTA               | Google Form URL 이 없거나 잘못됨                            | Yes         | Yes            | 전환 경로 끊김      |
| 로그인 후 redirect            | `/login`, `/`, `/app` 사이를 잘못 돌거나 잘못된 화면으로 감 | Yes         | Yes            | 로그인 완료 실패    |

사용자를 조용한 dead end 로 보내는 문제는 모두 출시 차단 사항입니다.

## 테스트 커버리지 계획

### 코드 경로 커버리지

```text
[+] src/constants/routes.ts
    ├── [GAP] public / app canonical route constants
    ├── [GAP] schedule-step route builders
    └── [GAP] legacy-to-canonical redirect map

[+] src/router/index.ts
    ├── [GAP] / 의 public route tree
    ├── [GAP] 상대 경로 child 를 가진 /app parent
    ├── [GAP] legacy redirect route
    └── [GAP] 활성 사용자 / 접근 시 redirect

[+] src/router/guards.ts
    ├── [GAP] canonical /app 권한별 redirect
    ├── [GAP] 로그인 사용자의 / 접근 처리
    └── [GAP] blocked-state route 의 app shell 분리

[+] public landing surface
    ├── [GAP] hero CTA -> /signup?role=admin
    ├── [GAP] header CTA -> Google Form config
    └── [GAP] / 에서 app chrome 누수 없음
```

### 사용자 흐름 커버리지

```text
[+] Public entry
    ├── [GAP] [→E2E] 비로그인 사용자가 / 에 도착
    ├── [GAP] [→E2E] 로그인 사용자가 / 에 도착 후 /app 으로 이동
    ├── [GAP] [→E2E] legacy /ops/organization-setup -> /app/ops/organization-setup
    └── [GAP] [→E2E] legacy /schedule/step1 -> /app/schedule/step1

[+] Auth completion
    ├── [GAP] [→E2E] admin login -> /app
    ├── [GAP] [→E2E] super login -> /app/admin/approval-queue
    ├── [GAP] [→E2E] user login -> /app/home/user
    ├── [GAP] pending admin -> /access/pending
    └── [GAP] rejected admin -> /access/rejected

[+] Inquiry path
    ├── [GAP] header inquiry CTA opens configured external URL
    ├── [GAP] hero inquiry CTA opens the same external URL
    └── [GAP] missing inquiry URL fails pre-release validation
```

### 테스트 산출물 기준

- unit test 는 기존 router, guard, login, sidebar, dashboard 테스트를 확장
- 공개 CTA 렌더링과 레이아웃 분리를 위한 landing-page unit test 1개 추가
- `/`, `/app`, 로그인 후 redirect matrix, legacy redirect 호환을 다루는 launch E2E 1개 추가
- 깨진 legacy redirect 는 회귀로 취급하고 같은 구현 슬라이스에서 테스트까지 함께 추가

## 성능 가드레일

- 공개 랜딩 번들은 첫 화면에서 `DefaultLayout`, `Sidebar`, schedule-step view 를 import 하면 안 됩니다.
- `/` 는 조직 컨텍스트 hydration 이나 작업공간 데이터 로딩 때문에 첫 렌더가 막히면 안 됩니다.
- route split 작업은 기존 schedule page lazy-loading 을 유지해야 합니다.
- Launch Core 에서는 analytics SDK 를 새로 넣지 않습니다.

## 상태별 UX 기준

| 기능               | Loading                                  | Empty                    | Error                                         | Success                             | Partial                                                     |
| ------------------ | ---------------------------------------- | ------------------------ | --------------------------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| Landing page       | 레이아웃 점프 없는 첫 렌더 또는 스켈레톤 | 해당 없음                | 헤더 액션은 유지된 채 다시 시도 안내          | 두 CTA 가 모두 보인다               | 일부 보조 섹션이 늦어도 hero 와 CTA 는 보여야 함            |
| Header actions     | 버튼은 즉시 보임                         | 해당 없음                | 출시 전에는 fallback 안내 또는 숨김 처리 필요 | 올바른 경로 또는 탭 열림            | 한 액션 문제로 나머지 액션이 사라지면 안 됨                 |
| Signup CTA         | 비동기 경로 해석이면 pending 표시 가능   | 해당 없음                | 명확한 재시도 안내                            | `/signup?role=admin` 으로 이동      | signup 페이지는 열리지만 병원 검색 데이터가 늦게 올 수 있음 |
| Inquiry CTA        | 외부 링크라는 점이 보임                  | 해당 없음                | 폼 링크 오류는 출시 차단                      | Google Form 이 열리고 제출 가능     | 비필수 항목만 일부 문제                                     |
| Login page         | 제출 중 loading                          | 기본 배너 없음           | 필드 검증과 제출 실패 메시지                  | 올바른 post-auth 경로로 이동        | 로그인 성공 후 pending/rejected 화면으로 갈 수 있음         |
| Signup page        | 병원 검색, 제출 loading                  | 병원 검색 결과 없음 안내 | 필드 오류와 요청 실패 메시지                  | pending 또는 active 완료 상태 표시  | 일부 선택 정보가 비어도 핵심 흐름은 유지                    |
| Pending / rejected | 루프 없이 상태 화면 표시                 | 해당 없음                | membership context 가 없을 때 fallback 안내   | 다음 단계와 로그아웃 방법 이해 가능 | 거절 사유가 없어도 상태 설명은 렌더링                       |

## 사용자 여정 스토리보드

| 단계 | 사용자가 하는 일                  | 사용자가 느끼는 것                                | 계획에 반드시 있어야 할 것                          |
| ---- | --------------------------------- | ------------------------------------------------- | --------------------------------------------------- |
| 1    | `/` 에 도착                       | "이게 실제 병원 스케줄 제품인가?"                 | 강한 첫 헤드라인, 보이는 액션, app chrome 누수 없음 |
| 2    | 헤더를 봄                         | "로그인, 회원가입, 문의 중 무엇을 할 수 있지?"    | 고정된 순서의 헤더 액션                             |
| 3    | 히어로를 읽음                     | "간호 운영에 관련 있겠네."                        | 명확한 가치 제안과 다음 행동                        |
| 4    | `회원 가입` 또는 `도입 문의` 선택 | "내 상황에 맞는 길이 있네."                       | 직접 가입과 문의 경로 분리                          |
| 5    | signup 진입                       | "무슨 역할을 골라야 하는지 고민하지 않아도 되네." | admin-first 기본값과 병원 검색 안내                 |
| 6    | inquiry form 진입                 | "연락처를 남길 수 있네."                          | 필수 항목, 동의 안내, 응답 기대치                   |
| 7    | 인증 또는 문의 완료               | "실제 서비스고 후속 대응이 있겠구나."             | 성공 상태, pending/rejected 처리, 후속 안내         |

## 반응형 / 접근성 요구사항

### 반응형

- 데스크톱 헤더는 오른쪽에 `로그인`, `회원 가입`, `도입 문의` 를 인라인으로 노출
- 모바일에서는 메뉴로 접히더라도 같은 세 액션이 1차 레벨에 보여야 함
- 좁은 화면에서는 히어로 CTA 를 세로로 쌓음
- hover 에만 의존하는 섹션 금지
- 외부 문의 링크는 모바일에서도 푸터까지 내려가지 않고 찾을 수 있어야 함

### 접근성

- 모든 상호작용 요소에 보이는 focus state 제공
- 터치 타깃 높이 최소 44px
- 헤더와 본문에 의미 있는 landmark 사용
- CTA 라벨은 한국어로 유지하고, 주변 장식 없이도 이해 가능해야 함
- 새 탭으로 열리는 문의 링크는 이를 알려야 함
- 텍스트와 버튼 대비는 접근성 기준을 만족해야 함

## 이미 있는 것

이미 잘 작동하는 패턴은 그대로 재사용합니다.

- 저장소 루트 `DESIGN.md` 는 랜딩, auth, app shell 의 시각 기준 문서입니다.
- auth 페이지는 이미 중앙 정렬 Naive UI 카드 레이아웃을 사용합니다.
- pending / rejected access state 화면이 이미 있습니다.
- 로그인 후 작업 공간은 이미 헤더와 사이드바 구조를 갖고 있습니다.
- post-auth 라우팅은 active / pending / rejected 사용자를 이미 구분합니다.
- route guard test, login/signup test, RBAC test 가 이미 있으므로 여기에 커버리지를 흡수하면 됩니다.

즉, 새로 만드는 핵심은 `/` 공개 화면이지, 기존 앱 작업 공간을 다시 디자인하는 것이 아닙니다.

## 범위 밖

- 앱 내부 문의 관리 UI
- 소셜 로그인 버튼, provider 별 callback UX
- 여러 하위 페이지를 가진 큰 마케팅 사이트
- 랜딩 액션과 기본 섹션 reveal 을 넘는 과도한 브랜드 모션
- 소개/체험/답변에 필요 이상으로 많은 문의 정보 수집
- 새로운 analytics SDK 나 이벤트 파이프라인
- 첫 출시 기간 중 legacy redirect 제거

## 릴리스 게이트

아래를 만족하지 못하면 Launch Core 는 출시 준비가 된 것이 아닙니다.

- `pnpm lint:check` 통과
- 핵심 auth / router 테스트 통과
- 랜딩 / legacy redirect 회귀 통과
- `/` 는 공개 경로
- `/app` 은 보호 경로
- 배포된 `/app` 딥링크가 새로고침 후에도 동작
- 회원가입과 문의 CTA 가 실제 경로로 검증됨
- preview 와 production 이 모두 접근 가능

## 출시 신호

범위를 불필요하게 늘리지 않으면서 아래 신호는 관찰할 수 있어야 합니다.

- 기존 플랫폼 수준 page view 도구가 이미 있다면 `/` 방문 수
- 회원가입 CTA 클릭은 기존 수동/플랫폼 리포트 수준으로만 확인
- Google Form 응답 로그를 통한 문의 제출 수
- 승인된 admin 이 실제로 `/app` 에 도달했는지

아래 때문에 Launch Core 를 막으면 안 됩니다.

- 새 analytics 벤더 도입
- 맞춤 이벤트 파이프라인 추가
- 전체 앱 추적 코드 대규모 삽입

경량 관찰 수단이 없더라도, 초기에는 문의 응답과 admin 승인 로그를 수동으로 검토하는 편이 더 낫습니다.
