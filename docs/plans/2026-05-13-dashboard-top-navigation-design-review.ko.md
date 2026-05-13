# Dashboard 상단 고정 메뉴 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** EveryShift MVP의 app shell을 왼쪽 사이드바에서 상단 고정 메뉴로 전환하고, schedule-generation workflow의 가로 작업 공간을 넓힌다.

**Architecture:** 기존 `Sidebar.vue`가 갖고 있는 RBAC 메뉴 노출과 active-route 정규화 로직을 `useAppNavigation.ts`로 먼저 추출한다. `Header.vue`는 이 composable을 소비해 top nav만 렌더링하고, `DefaultLayout.vue`는 sticky header + route content 구조로 단순화한다. 신규 조회 route 2개는 app shell 안에 추가하되, backend/API와 schedule workflow business logic은 건드리지 않는다.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vite, Tailwind CSS, Naive UI, Pinia, Vue Router, Vitest, Playwright.

---

**작성일:** 2026-05-13
**검토 관점:** `plan-design-review` + `plan-eng-review` + `superpowers:writing-plans`
**대상 화면:** `/app` app shell, `Dashboard.vue`, schedule generation workflow 진입부
**결론:** 현재 EveryShift MVP에는 왼쪽 고정 사이드바보다 **상단 고정 메뉴 + 작업 단계 중심 UI**가 더 적합하다.

---

## Direct Recommendation

왼쪽 사이드바는 제거하고, app shell을 상단 고정 헤더 구조로 바꾼다.

이유는 단순하다. 현재 주요 메뉴는 `운영 기준`, `근무표 생성`, `근무표 조회` 중심이고, EveryShift의 핵심 작업면은 30명 x 36일 근무표 그리드다. 사이드바는 계속 세로 빈 공간을 만들고, 가장 비싼 자원인 가로 폭을 줄인다.

메뉴 이름은 사용자의 월간 업무 흐름인 **준비 → 생성 → 조회**를 기준으로 정한다.

권장 top nav:

```text
운영 기준
근무표 생성
근무표 조회
```

이 명명은 `design-consultation` 관점에서도 현재 `DESIGN.md`의 "calm operational product" 방향과 맞다. 메뉴는 브랜드성 표현보다 업무 맥락을 먼저 전달해야 한다. `기본 정보`는 schedule workflow Step 1의 `기본 정보`와 충돌하므로 top nav에서는 쓰지 않는다. `지난 결과 보기`는 의미는 맞지만 길고 회고성 표현이라, 생성된 근무표와 근무자별 실적을 함께 담는 상위 메뉴로는 `근무표 조회`가 더 안정적이다.

하위 메뉴 구조:

```text
운영 기준
├── 병원 정보
├── 병동/근무 기준
└── 직원 정보

근무표 생성
└── 하위 메뉴 없음

근무표 조회
├── 생성된 근무표
└── 근무 실적
```

`근무표 생성`은 사용자가 새 계획월을 만드는 단일 주요 행동이므로 하위 메뉴를 만들지 않는다. 상단 메뉴 클릭 자체가 생성 workflow 진입이어야 한다. 별도 텍스트가 필요한 화면 제목이나 CTA에서는 `새 근무표 만들기`를 사용할 수 있지만, top nav label은 `근무표 생성`으로 유지한다.

권장 구조:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ EveryShift   운영 기준   근무표 생성   근무표 조회             조직 / 권한 / 로그아웃 │
└─────────────────────────────────────────────────────────────────────────────┘
│                                                                             │
│  [페이지 제목 / 현재 해야 할 일]                                              │
│                                                                             │
│  Dashboard 또는 Schedule Step workspace                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

schedule workflow 안에서는 전역 메뉴를 더 늘리지 말고, 화면 내부 상단에 단계형 progress를 둔다.

```text
EveryShift | 운영 기준 | 근무표 생성 | 근무표 조회              세브란스병원 / 운영 관리자
─────────────────────────────────────────────────────────────────────────────
근무표 생성
[1 기본 정보] ─ [2 사이트 기준] ─ [3 직원 기준] ─ [4 오프 입력] ─ [5 결과 검토]
─────────────────────────────────────────────────────────────────────────────
대형 근무표 / 입력 / 검토 workspace
```

---

## System Audit

### Base Branch

`gh` 명령이 없어 PR base를 자동 감지하지 못했다. 이 검토에서는 `main`을 기준으로 보았다.

### Current UI Scope

이 변경은 backend와 schedule generation business logic을 바꾸는 작업이 아니다. 기존 route path는 유지하되, 조회 메뉴를 직접 열 수 있도록 read-only route contract 2개를 새로 추가한다.

포함 범위:

- `DefaultLayout.vue`의 app shell 구조
- `Header.vue`의 브랜드, 전역 메뉴, 조직/계정 영역
- `Sidebar.vue` 삭제
- `Dashboard.vue`의 content width, page chrome, CTA 중복 정리
- top nav 명명 체계를 `운영 기준`, `근무표 생성`, `근무표 조회`로 정리
- 조회 영역의 2개 하위 목적 정의: 생성된 근무표 확인, 근무자별 기간 실적 확인
- `근무표 조회 > 생성된 근무표` route 추가: `/app/schedule-results`
- `근무표 조회 > 근무 실적` route 추가: `/app/work-performance`
- `근무 실적`은 이번 구현에서 빈 placeholder page까지만 만든다.
- schedule route에서 stepper를 본문 상단 작업 흐름으로 명확히 배치

제외 범위:

- 조직/직원/근무 CRUD 확장
- 모바일 full support
- 실제 AI solver 연동
- analytics dashboard 또는 광범위한 리포트 센터
- `근무 실적` 실제 집계/분석 기능
- 승인/리포트 등 6개 이상 메뉴를 전제로 한 full admin shell

### What Already Exists

재사용해야 하는 기준:

- `DESIGN.md`가 active design contract다.
- App UI 방향은 “calm operational product, dense but readable, minimal chrome”이다.
- Dashboard hierarchy는 `readiness and next action -> schedule work area -> lower-priority metadata`다.
- Top nav는 사용자의 월간 흐름인 `준비 -> 생성 -> 조회`를 먼저 드러내야 한다.
- Sidebar/header는 promotional element가 아니라 infrastructural chrome이어야 한다.
- Step 3 grid는 desktop-first critical high-density surface다.
- Header와 sidebar action은 keyboard로 접근 가능해야 한다.
- User-facing UI text는 한국어다.

현재 코드에서 확인한 구조:

- App shell은 `src/components/layout/DefaultLayout.vue`에서 `n-layout-sider` + `n-layout-header`로 구성되어 있다.
- 왼쪽 메뉴는 `src/components/layout/Sidebar.vue`의 `n-menu`가 담당한다.
- 상단 우측 조직 선택과 로그아웃은 `src/components/layout/Header.vue`와 `OrganizationSwitcher.vue`가 담당한다.
- Dashboard 본문은 `src/views/Dashboard.vue`에서 readiness gate와 schedule list를 이미 상당히 구체적으로 다룬다.

---

## Design Scope Assessment

### Initial Rating

현재 제안은 **7/10**이다.

좋은 점:

- 가로 공간을 회수한다는 판단이 제품의 핵심 업무와 맞다.
- 현재 메뉴 수가 적다는 제약을 제대로 본다.
- Step 3 grid의 폭을 우선한다는 결정이 명확하다.

부족한 점:

- 상단 메뉴의 active state, overflow state, 권한별 메뉴 노출 규칙이 아직 없다.
- Dashboard 본문이 “큰 카드 안의 카드들”처럼 보일 위험이 남아 있다.
- schedule workflow stepper와 global nav의 역할 분리가 더 명확해야 한다.
- narrow desktop/tablet에서 조직 선택이 길어질 때의 레이아웃 규칙이 필요하다.

10/10이 되려면:

- app shell의 정보 구조
- route별 active nav 규칙
- interaction states
- responsive behavior
- keyboard/screen reader contract
- 구현 파일 범위와 테스트 범위

까지 문서에 명시되어야 한다.

---

## Pass 1: Information Architecture

**Rating:** 7/10 -> 9/10

### Recommended Structure

App shell은 3개 영역만 갖는다. Primary nav는 사용자 업무 순서를 따라 `준비 -> 생성 -> 조회`로 읽혀야 한다.

```text
Top App Header
├── Brand: EveryShift
├── Primary Nav
│   ├── 운영 기준
│   ├── 근무표 생성
│   └── 근무표 조회
└── Account Context
    ├── 선택한 조직
    ├── 권한 label
    └── 로그아웃
```

Top nav naming contract:

| Candidate        | Decision           | Reason                                                                                                    |
| ---------------- | ------------------ | --------------------------------------------------------------------------------------------------------- |
| `기본 정보`      | Reject for top nav | schedule Step 1 `기본 정보`와 충돌한다. 병원/병동/직원 정보는 단순 입력값보다 생성 전 운영 기준에 가깝다. |
| `운영 기준 설정` | Shorten            | 의미는 맞지만 top nav에서는 길다. 하위 메뉴가 이미 설정 성격을 드러내므로 `운영 기준`이 더 빠르게 읽힌다. |
| `운영 기준`      | Use                | 근무표 생성 전에 준비해야 하는 병원/병동/직원 기준을 정확히 묶는다.                                       |
| `지난 결과 보기` | Reject for top nav | 길고 회고성 표현이다. 근무 실적까지 포함하는 상위 메뉴로는 좁다.                                          |
| `근무표 조회`    | Use                | 생성된 근무표와 근무자별 실적 조회를 모두 담는 업무형 표현이다.                                           |

Primary nav hierarchy:

```text
운영 기준
├── 병원 정보 -> /app/ops/organization-setup#hospital-info
├── 병동/근무 기준 -> /app/ops/organization-setup#site-shift-rules
└── 직원 정보 -> /app/ops/organization-setup#employee-info

근무표 생성
└── direct route: /app/schedule/step1

근무표 조회
├── 생성된 근무표 -> /app/schedule-results
└── 근무 실적 -> /app/work-performance
```

`근무표 생성`은 하위 메뉴를 만들지 않는다. 사용자가 상단에서 이 메뉴를 누르는 순간 새 근무표 생성 workflow로 들어가야 한다. 하위 메뉴가 1개뿐이면 같은 의미를 두 번 선택하게 되어 friction이 생긴다.

`운영 기준` 하위 항목은 새 CRUD route가 아니다. 현재 MVP에서는 병원 정보, 병동/근무 기준, 직원 정보를 같은 운영 기준 화면 안의 anchor로 이동시킨다. 구현 시 anchor id는 화면 섹션명과 일치해야 하며, route guard는 기존 `/app/ops/organization-setup`의 org/admin rule을 그대로 따른다.

`근무표 조회` 하위 항목은 새 route를 갖는다. `생성된 근무표`는 기존 `Dashboard.vue`의 `지난 결과` 섹션이 제공하던 schedule list 데이터를 조회 전용 화면으로 옮기거나 재사용한다. `근무 실적`은 아직 실제 분석 기능이 없으므로 `/app/work-performance`에 빈 상태 placeholder page를 먼저 만든다.

권한별 메뉴 노출:

| Ability                                                          | Top Nav Item |
| ---------------------------------------------------------------- | ------------ |
| `canManageOrganizationSetup`                                     | 운영 기준    |
| `canManageSchedules`                                             | 근무표 생성  |
| `canManageSchedules` 또는 조회 권한이 분리되면 해당 조회 ability | 근무표 조회  |
| `canViewRestrictedUserHome`                                      | 내 홈        |
| `canViewApprovalQueue`                                           | 가입 승인    |
| no available items                                               | 대시보드     |

Active state:

| Current Route                                                               | Active Nav               |
| --------------------------------------------------------------------------- | ------------------------ |
| `/app/ops/*`                                                                | 운영 기준                |
| `/app/schedule/step1` - `/app/schedule/step5/*`                             | 근무표 생성              |
| `/app/schedule-results` and generated schedule detail routes if added later | 근무표 조회              |
| `/app/work-performance`                                                     | 근무표 조회              |
| `/app/admin/approval-queue`                                                 | 가입 승인                |
| `/app/home/user`                                                            | 내 홈                    |
| `/app`                                                                      | 대시보드 fallback active |

Dashboard는 전역 메뉴를 반복하지 않는다. 본문 첫 화면은 readiness/next action을 보여준다.

```text
[Top fixed app header]

[Dashboard page]
  Page title: 근무표 관리
  Primary state:
    - readiness loading
    - readiness unavailable
    - incomplete readiness
    - complete readiness
  Work sections:
    - 운영 기준
    - 근무표 생성
    - 근무표 조회
```

### Design Decision

`DefaultLayout.vue`의 left sidebar는 app shell의 기본 구조에서 제외한다. `Sidebar.vue`는 삭제한다. 단, 현재 `Sidebar.vue`가 갖고 있는 route/RBAC mapping behavior는 버리지 말고 `useAppNavigation.ts`로 옮긴 뒤 테스트로 보존한다.

Dashboard 본문 copy도 top nav와 같은 언어를 사용한다. 현재 `기본 정보` section은 `운영 기준`으로, `지난 결과` section은 `근무표 조회`로 바꾸는 것이 좋다. 이렇게 해야 사용자가 상단 메뉴와 Dashboard의 업무 영역을 같은 구조로 인식한다.

Dashboard cleanup은 기능 삭제가 아니라 surface 정리다. 페이지 전체를 하나의 큰 `n-card`로 감싼 뒤 내부에 다시 section/card를 넣으면 app shell 안에 또 다른 boxed page가 생겨 Step 3 grid 중심 제품과 맞지 않는다. cleanup의 목표는 page-level card를 제거하고, readiness/status, schedule generation CTA, schedule lookup처럼 실제로 표면이 필요한 단위만 section surface로 남기는 것이다.

---

## Pass 2: Interaction State Coverage

**Rating:** 6/10 -> 9/10

| Feature                   | Loading                                                                          | Empty                                                                                                                              | Error                                                                                        | Success                                                                | Partial                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Top navigation            | RBAC context loading 중에는 nav skeleton 대신 최소 brand + disabled context 표시 | 권한상 메뉴가 없으면 `대시보드`만 표시                                                                                             | access context 실패 시 Dashboard error state와 충돌하지 않게 account area에만 짧은 상태 표시 | active route에 `aria-current="page"`와 accent underline 표시           | 조직 선택이 없으면 org-required nav는 disabled가 아니라 route guard에 맡기고, header에는 현재 선택 없음 표시                    |
| Top nav submenus          | submenu options를 늦게 계산하지 말고 고정 IA로 즉시 표시                         | 하위 메뉴가 없는 `근무표 생성`은 dropdown을 만들지 않음                                                                            | submenu route resolve 실패 시 해당 landing 화면에서 복구 CTA 표시                            | `운영 기준`과 `근무표 조회`는 hover/focus/click으로 하위 목적을 드러냄 | narrow desktop에서는 submenu width를 고정하지 말고 label 길이에 맞추되 화면 밖으로 나가지 않게 정렬                             |
| Organization switcher     | options load 전 select를 disabled                                                | 선택 가능한 조직 없음 placeholder                                                                                                  | 조직 전환 실패 시 기존 message utility 사용                                                  | 선택 후 현재 조직 label 갱신                                           | 긴 조직명은 truncate, full name은 title 또는 accessible label 제공                                                              |
| Dashboard create CTA      | readiness loading 중 숨김                                                        | schedule empty state에서 primary CTA 유지                                                                                          | readiness unavailable이면 create/list action 숨김                                            | month modal 진입                                                       | header CTA와 section CTA가 중복되면 section CTA를 우선하고 page header CTA는 제거 가능                                          |
| Schedule lookup           | schedule list loading 중에는 기존 목록 영역 높이를 유지하며 loading state 표시   | 생성된 근무표가 없으면 `새 근무표 생성` primary action과 함께 빈 상태 표시. `근무 실적`은 기능 준비 전 placeholder empty page 표시 | 목록 조회 실패 시 생성 flow와 분리된 retry 표시. `근무 실적`은 아직 API를 호출하지 않음      | 생성된 근무표 조회와 근무 실적 진입점을 명확히 분리                    | `생성된 근무표`는 연/월 calendar-picker형 조회 UI를 우선 검토한다. `근무 실적`은 실제 조건 입력 UI를 이번 PR에서 만들지 않는다. |
| Schedule workflow stepper | route content loading과 독립적으로 표시                                          | 해당 없음                                                                                                                          | route guard 실패 시 stepper보다 error/redirect state 우선                                    | 현재 step 강조                                                         | Step 5 dynamic route는 현재 copy 기준 `결과 검토`로 표시                                                                        |

### Required State Details

- Top nav active state는 color만으로 표현하지 않는다. underline, font weight, `aria-current`를 함께 쓴다.
- 로그아웃은 text button으로 유지하되, focus-visible ring이 보이게 한다.
- 조직 선택 영역은 최소 너비를 고정하지 말고 `minmax` 또는 responsive clamp를 사용한다. 현재 `min-w-[220px]`는 좁은 폭에서 header 압박을 만들 수 있다.
- 상단 메뉴는 route navigation이고, schedule stepper는 workflow progress다. 둘을 같은 visual style로 만들지 않는다.
- `근무표 생성`은 direct nav item이다. 하위 메뉴가 1개뿐인 dropdown을 만들면 정보 구조가 깊어지는 대신 선택지는 늘지 않는다.
- `근무표 조회`는 조회 목적이 2개이므로 하위 메뉴를 허용한다. 단, 첫 화면에서 두 항목이 같은 card weight로 경쟁하지 않게 `생성된 근무표`를 primary, `근무 실적`을 secondary analysis entry로 둔다.
- `생성된 근무표` 화면은 기존 Dashboard의 `지난 결과` 목록 데이터를 그대로 재사용하되, UI는 list-only보다 연/월 calendar-picker형 선택을 우선 설계한다. 근무표는 월 단위 산출물이므로 일자 grid가 아니라 연도 선택 + 12개월 tile grid가 더 자연스럽다. 생성된 월은 선택 가능, 없는 월은 disabled/empty로 표시한다.
- `근무 실적` 화면은 이번 범위에서 빈 page scaffold다. 제목, 준비 중 empty state, `생성된 근무표`로 이동하는 보조 action 정도만 허용하고, 실제 기간/근무자 조건 입력이나 집계 API 호출은 넣지 않는다.

---

## Pass 3: User Journey & Emotional Arc

**Rating:** 7/10 -> 9/10

| Step | User Does                                           | User Should Feel                                                     | Plan Specifies                                                             |
| ---- | --------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1    | 로그인 후 `/app` 진입                               | 지금 무엇을 해야 하는지 바로 안다                                    | Dashboard first block이 readiness/next action을 보여준다                   |
| 2    | 운영 기준을 확인한다                                | 생성 전 준비가 왜 필요한지 이해한다                                  | `운영 기준`은 global nav, readiness items는 Dashboard 내부 action으로 연결 |
| 3    | 근무표 생성을 시작한다                              | 메뉴가 아니라 작업 흐름에 들어왔다고 느낀다                          | schedule route에서 상단 stepper를 표시                                     |
| 4    | Step 3 grid를 편집한다                              | 가로 공간이 충분하고 메뉴 chrome이 방해하지 않는다                   | sidebar 제거, content width 확대                                           |
| 5    | 결과 검토/수정/export로 이동한다                    | 아직 생성 workflow 안에 있다는 맥락을 유지한다                       | stepper와 route title 유지                                                 |
| 6    | 생성이 끝난 뒤 과거 근무표나 근무자별 실적을 찾는다 | 이미 끝난 업무를 다시 찾는 것이 아니라 운영 기록을 조회한다고 느낀다 | `근무표 조회` 하위에 `생성된 근무표`, `근무 실적`을 둔다                   |

Time-horizon design:

- 5초: 상단에서 브랜드, 현재 조직, 가능한 작업 3개(`운영 기준`, `근무표 생성`, `근무표 조회`)를 즉시 파악한다.
- 5분: Dashboard에서 준비 상태를 확인하고 생성 workflow로 들어간다. 완료된 결과는 `근무표 조회`에서 다시 찾을 수 있음을 안다.
- 장기 사용: 매월 반복 작업 시 `운영 기준 -> 근무표 생성 -> 근무표 조회`가 같은 순서로 반복되어 메뉴를 다시 학습하지 않아도 된다.

---

## Pass 4: AI Slop Risk

**Rating:** 8/10 -> 9/10

이 화면은 **APP UI**다. landing page 규칙이 아니라 operational workspace 규칙을 적용한다.

Hard rejection risk:

- App UI made of stacked cards: **주의 필요**
- Generic dashboard-card mosaic: **주의 필요**
- Decorative gradients/icons: **도입 금지**

Fix:

- Dashboard 전체를 `n-card` 하나로 감싸는 현재 구조는 장기적으로 제거하는 편이 좋다. 페이지 자체는 unframed layout이고, 각 section만 필요한 만큼 surface를 가진다.
- `운영 기준`, `근무표 생성`, `근무표 조회`는 같은 카드 3개가 아니라 서로 다른 업무 단계다. visual weight도 다르게 둔다.
- `운영 기준`은 readiness/status 중심, `근무표 생성`은 primary action 중심, `근무표 조회`는 record-finding 중심으로 구분한다.
- schedule list card는 실제 schedule entity이므로 card가 맞다.
- onboarding readiness item은 action container이므로 card가 맞다.
- header는 shadow보다 border와 sticky surface로 구분한다.

Litmus:

| Check                                  | Result                                                 |
| -------------------------------------- | ------------------------------------------------------ |
| Brand unmistakable in first screen?    | YES, top-left EveryShift                               |
| One strong visual anchor?              | YES, Dashboard readiness block or Step workspace title |
| Page understandable by headlines only? | YES, if section titles stay operational                |
| Each section has one job?              | YES, after Dashboard sections are separated            |
| Cards actually necessary?              | PARTIAL, schedule entity/onboarding item only          |
| Motion improves hierarchy?             | NOT REQUIRED for app shell                             |
| Premium without decorative shadows?    | YES, use border, spacing, typography                   |

---

## Pass 5: Design System Alignment

**Rating:** 8/10 -> 9/10

Use `DESIGN.md` directly.

### Visual Rules

- Header height: 56-64px.
- Header background: `--color-surface-primary`.
- Header border: `--color-border-subtle`.
- App canvas: `--color-bg-app` or current app background.
- Brand text: `text-lg` or `text-xl`, font weight `700`.
- Top nav text: `text-sm`, active `600`, inactive `500`.
- Top nav labels: `운영 기준`, `근무표 생성`, `근무표 조회`.
- Dropdown/submenu labels: keep `text-sm`; use `font-medium` for item labels and short helper copy only if the dropdown has enough width.
- Page title: `text-2xl`.
- Section title: `text-xl`.
- Metadata: `text-sm`; timestamps/scores may use mono only if already supported by global font wiring.
- Accent color only for active nav, primary CTA, important status.

### Avoid

- purple/blue gradient header
- large rounded pill nav for every item
- icon-in-circle menu decoration
- card inside card
- heavy drop shadows on app chrome
- centered dashboard copy except true loading/empty states
- long verb-style nav labels such as `지난 결과 보기`

---

## Pass 6: Responsive & Accessibility

**Rating:** 5/10 -> 8/10

This MVP remains desktop-first, but the top header must not break on narrower work laptops.

### Desktop

```text
brand width: 160-180px
nav: horizontal, left aligned
account area: right aligned
content: max width widened for grid surfaces
```

### Tablet / Narrow Desktop

- Top nav remains horizontal.
- Nav may scroll horizontally if needed, but current three-item MVP should not need it.
- `운영 기준` and `근무표 조회` dropdowns must open within the viewport and stay keyboard reachable.
- Organization switcher compresses before nav items wrap.
- Long organization names truncate with accessible full label.
- Header can become two rows only below the compact breakpoint, not unpredictably.
- Compact breakpoint default is `1024px`. Define it as a single adjustable design token or constant, for example `APP_HEADER_COMPACT_BREAKPOINT = 1024` or `--app-header-compact-breakpoint: 1024px`, so implementation and visual QA use the same threshold.

### Mobile

Full mobile support is out of MVP scope, especially for Step 3 grid. Still, the header must avoid overlap:

- 44px minimum touch target.
- No clipped logout button.
- If viewport is too narrow, account context can collapse to a compact menu button, but this is a fallback state, not the primary MVP design.

### Accessibility Contract

- Header uses `<header>` landmark.
- Primary nav uses `<nav aria-label="주요 메뉴">`.
- Active nav item uses `aria-current="page"`.
- Submenu triggers expose expanded/collapsed state with `aria-expanded` when implemented as dropdown buttons.
- Dropdown items are reachable by keyboard and dismiss on Escape.
- Stepper uses `<nav aria-label="근무표 생성 단계">`.
- Buttons and links keep visible focus.
- Disabled-looking nav states must still explain route guard result through page state, not hidden UI.
- State is never communicated by color alone.

---

## Pass 7: Unresolved Design Decisions

**Rating:** 6/10 -> 8/10

| Decision Needed                   | Recommendation                                                                              | If Deferred                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Header single-row vs two-row      | Start single-row on desktop; allow two-row only below tablet breakpoint                     | Long org names may crush nav or logout                                                          |
| Top nav naming                    | Use `운영 기준`, `근무표 생성`, `근무표 조회`                                               | `기본 정보` conflicts with Step 1, and `지난 결과 보기` reads too narrow for performance lookup |
| `근무표 생성` submenu             | Do not create a submenu while there is only one action                                      | User has to choose the same thing twice                                                         |
| `근무표 조회` submenu labels      | Use `생성된 근무표`, `근무 실적`                                                            | Engineers may ship vague labels like `지난 결과` or mix schedule list with performance analysis |
| `Sidebar.vue` delete vs repurpose | Repurpose route option logic into top nav helper first, delete only after tests pass        | Duplicate nav logic can drift                                                                   |
| Dashboard outer `n-card` removal  | Remove in the same UI pass if scope allows                                                  | Page may still feel like card-inside-card                                                       |
| Schedule stepper owner            | Put stepper in schedule workflow layout or a small route-local component, not global header | Global nav and workflow progress may blur together                                              |
| Future 6+ menu expansion          | Reconsider sidebar only when menu count actually grows                                      | Premature admin portal chrome returns                                                           |

---

## Engineering Review Addendum

**검토 관점:** `plan-eng-review`
**검토일:** 2026-05-13
**대상 브랜치:** `codex/dashboard-readiness-gate`
**상태:** DONE_WITH_CONCERNS. 구현 가능하지만, navigation 로직 추출과 테스트 범위를 계획에 명시해야 안전하다.

### Step 0: Scope Challenge

#### What Existing Code Already Solves

| Sub-problem                          | Existing Source                                                                  | Reuse Decision                                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| RBAC별 메뉴 노출                     | `src/components/layout/Sidebar.vue`의 `menuOptions` computed                     | 재사용한다. 같은 로직을 `Header.vue`에 복사하지 않는다.                                          |
| 현재 route를 nav active key로 정규화 | `Sidebar.vue`의 `currentRoute` computed + `src/constants/routes.ts` route helper | 재사용한다. legacy route active 처리도 유지한다.                                                 |
| route 접근 제어                      | `src/router/guards.ts`의 `resolveRouteAccessTarget`                              | 그대로 둔다. header nav는 권한 표시만 담당하고 접근 차단은 guard가 담당한다.                     |
| 조직 선택/로그아웃                   | `Header.vue`, `OrganizationSwitcher.vue`, `src/utils/message.ts`                 | 그대로 둔다. top nav 추가가 account context를 건드리지 않게 한다.                                |
| schedule workflow 단계 표시          | 각 schedule view의 `StepIndicator.vue` 사용                                      | 새 global stepper를 만들지 않는다. 기존 컴포넌트를 유지하거나, route-local wrapper로만 정리한다. |
| Dashboard readiness gate             | `Dashboard.vue`, `tests/unit/dashboard.spec.ts`                                  | 동작을 바꾸지 않는다. visual nesting만 줄인다.                                                   |

#### Minimum Change Set

가장 작은 안전 구현은 5개 소스 파일과 기존 테스트 보강이다.

```text
src/components/layout/
├── DefaultLayout.vue        # sider 제거, sticky header + content only
├── Header.vue               # primary nav 렌더링 추가
├── Sidebar.vue              # behavior extraction 후 삭제
└── useAppNavigation.ts      # sidebar의 route/RBAC mapping 추출

tests/unit/
├── app-navigation.spec.ts   # 새 composable unit coverage
├── header.spec.ts           # nav render/click/a11y 추가
└── router-index.spec.ts     # DefaultLayout boundary 유지 확인은 기존 테스트 유지
```

`Dashboard.vue` outer surface cleanup은 같은 PR에서 해도 되지만, navigation 전환과 behavior 변경을 섞지 않는다. Dashboard CTA 중복 정리는 visual cleanup이며 route contract 변경이 아니다.

#### Complexity Check

이 계획이 구현에서 8개 이상 파일을 건드리거나 새 service/helper를 3개 이상 만들면 과하다.

권장 상한:

- 새 composable/helper: `useAppNavigation.ts` 1개
- 새 layout component: 0개
- route 변경: 0개
- store 변경: 0개
- backend/API 변경: 0개

#### Search Check

새로운 framework나 infrastructure는 도입하지 않는다. [Layer 1] Vue Router, Naive UI, Tailwind, existing route helpers만 사용한다. top navigation은 app shell composition 문제이며 별도 navigation framework가 필요 없다.

#### TODOS Cross-reference

`TODOS.md`는 현재 없다. 이 문서의 `TODO Candidates`가 임시 backlog 역할을 한다. 구현 후 남는 항목은 `TODOS.md`로 옮기되, "왜 남겼는지"를 함께 기록한다.

#### Completeness Check

상단 nav 전환만 하고 테스트를 미루는 것은 shortcut이다. 완성된 버전은 RBAC matrix, active route normalization, keyboard/a11y, responsive compression, schedule workflow smoke를 모두 테스트에 포함한다.

Lake score: **4/4 complete recommendations chosen**

- Navigation extraction: complete option chosen.
- Active route and legacy route coverage: complete option chosen.
- Header accessibility states: complete option chosen.
- Visual QA for app shell and schedule grid: complete option chosen.

#### Distribution Check

새 artifact, package, binary, container image를 만들지 않는다. 배포 파이프라인 변경은 범위 밖이다.

### Architecture Review

#### Data Flow

```text
rbacStore.abilities + route.path
        │
        ▼
useAppNavigation()
        ├── navigationItems
        │     ├── label: Korean UI copy
        │     ├── key/path: constants/routes helper output
        │     ├── children: optional submenu entries for 운영 기준 and 근무표 조회
        │     └── isVisible: RBAC ability result
        │
        ├── activeNavigationKey
        │     └── canonical + legacy route prefixes normalized
        │
        └── navigateToNavigationItem(key)
              └── router.push(key)
                    └── existing route guards enforce org/admin access

Header.vue
  ├── Brand
  ├── <nav aria-label="주요 메뉴">
  │     └── buttons/links/dropdowns with aria-current on active item
  └── Account context
        ├── OrganizationSwitcher
        ├── access label
        └── logout

DefaultLayout.vue
  └── sticky app header + content router-view
```

#### Opinionated Recommendation

`Header.vue` should render nav, but not own nav rules. Put route/RBAC mapping in `useAppNavigation.ts` so the highest-risk logic is unit-testable without mounting app shell chrome.

Tradeoff:

- Pros: DRY, explicit, easy unit tests, preserves current sidebar behavior.
- Cons: one new file.
- Recommendation: accept the one-file helper. It is the smallest abstraction that removes meaningful duplication.

#### Production Failure Scenarios

| New Codepath                         | Failure Scenario                                                                         | Planned Handling                                                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `useAppNavigation().navigationItems` | RBAC context loads after first render and nav briefly shows fallback only                | computed reacts to store update; test fallback and admin/user/super states.                                                              |
| `activeNavigationKey`                | `/app/schedule/step5/:scheduleKey` does not highlight `근무표 생성`                      | keep `isScheduleRoutePath()` normalization; add unit test.                                                                               |
| `activeNavigationKey`                | `/app/schedule-results` or `/app/work-performance` accidentally highlights `근무표 생성` | add explicit lookup route normalization before broad schedule workflow matching. Prefer keeping lookup routes outside `/app/schedule/*`. |
| `navigateToNavigationItem`           | user clicks nav requiring org context while no org is selected                           | route guard redirects; header must not fake disabled state.                                                                              |
| Header account compression           | long organization name pushes logout off-screen                                          | truncate account context and keep 44px targets; add visual QA at narrow desktop.                                                         |
| Dropdown submenu keyboard handling   | `운영 기준` or `근무표 조회` is hover-only                                               | implement click/focus-open behavior, Escape close, and unit/a11y assertions.                                                             |
| Sidebar removal                      | tests still mount deleted `Sidebar.vue`                                                  | migrate `sidebar.spec.ts` assertions to `app-navigation.spec.ts` before deleting the component.                                          |

### Code Quality Review

#### 1. Avoid Duplicated Navigation Rules

Current risk: `Sidebar.vue` already has a complete RBAC/active-route mapping. Copying it into `Header.vue` creates two sources of truth during the transition.

Recommendation: extract first, then render top nav.

```text
Before:
Sidebar.vue owns menuOptions/currentRoute
Header.vue owns account context only

After:
useAppNavigation.ts owns menuItems/activeKey/navigation
Header.vue consumes useAppNavigation()
Sidebar.vue is deleted after its behavior coverage is moved to app-navigation tests
```

#### 2. Keep Header Explicit

`Header.vue` should stay a small shell component:

- render brand
- render top nav
- render account context
- handle logout

It should not parse route prefixes inline. Route parsing belongs in `useAppNavigation.ts`.

#### 3. Do Not Change Business Flow

No changes to:

- `src/router/guards.ts`
- schedule store state
- Dashboard readiness API calls
- Step progression guard
- solver integration

#### 4. Resolve Step Label Drift Before Implementation

The design section proposes:

```text
1 기본 정보
2 사이트 정보
3 직원 정보
4 초기 데이터
5 결과 확인
```

The current code and test use:

```text
1 기본 정보
2 사이트 기준
3 직원 기준
4 오프 입력
5 결과 검토
```

Recommendation: keep the existing labels in this top-nav PR unless the implementation explicitly includes a copy-change task and updates `tests/unit/step-indicator.spec.ts`. Silent label drift is a regression risk.

### Test Review

Detected test framework:

- Unit: Vitest + Vue Test Utils
- E2E: Playwright
- Required repo checks after implementation: `pnpm lint:check`, `pnpm run build`

#### Code Path Coverage Diagram

```text
CODE PATH COVERAGE
===========================
[+] src/components/layout/useAppNavigation.ts
    │
    ├── navigationItems
    │   ├── [GAP] admin abilities -> 운영 기준 + 근무표 생성 + 근무표 조회
    │   ├── [GAP] 운영 기준 children -> 병원 정보 + 병동/근무 기준 + 직원 정보 anchors on /app/ops/organization-setup
    │   ├── [GAP] 근무표 생성 -> direct item with no one-item submenu
    │   ├── [GAP] 근무표 조회 children -> 생성된 근무표 (/app/schedule-results) + 근무 실적 (/app/work-performance)
    │   ├── [GAP] restricted user -> 내 홈 only
    │   ├── [GAP] approval queue ability -> 가입 승인 only
    │   └── [GAP] no visible abilities -> 대시보드 fallback
    │
    ├── activeNavigationKey
    │   ├── [GAP] /app/schedule/* and legacy /schedule/* -> Step 1 route key
    │   ├── [GAP] /app/schedule-results and /app/work-performance -> 근무표 조회 route key
    │   ├── [GAP] /app/ops/* and legacy /ops/* -> organization setup key
    │   ├── [GAP] approval queue route -> approval key
    │   └── [GAP] user home/dashboard fallback -> matching key
    │
    └── navigateToNavigationItem()
        └── [GAP] pushes selected route key through Vue Router

[+] src/components/layout/Header.vue
    │
    ├── [★★ TESTED] role label + organization switcher render — tests/unit/header.spec.ts
    ├── [★★★ TESTED] logout success/failure — tests/unit/header.spec.ts
    ├── [GAP] renders top nav items from useAppNavigation()
    ├── [GAP] active item has aria-current="page" and non-color active cue
    ├── [GAP] nav click calls navigation handler
    └── [GAP] no available nav item still renders 대시보드 fallback

[+] src/components/layout/DefaultLayout.vue
    │
    ├── [GAP] removes n-layout-sider from /app shell
    ├── [GAP] keeps Header and router-view under DefaultLayout
    └── [GAP] content width no longer reserves sidebar space

[+] src/components/schedule/StepIndicator.vue
    │
    ├── [★ TESTED] renders current labels — tests/unit/step-indicator.spec.ts
    └── [GAP] if labels change, test must change in same PR
```

#### User Flow Coverage Diagram

```text
USER FLOW COVERAGE
===========================
[+] Admin dashboard navigation
    │
    ├── [GAP] [→E2E] /app shows top nav and no sidebar
    ├── [GAP] [→E2E] click 근무표 생성 -> /app/schedule/step1
    ├── [GAP] [→E2E] click 운영 기준 > 병원 정보 -> /app/ops/organization-setup#hospital-info
    ├── [GAP] [→E2E] click 근무표 조회 > 생성된 근무표 -> /app/schedule-results
    ├── [GAP] [→E2E] click 근무표 조회 > 근무 실적 -> /app/work-performance placeholder
    └── [GAP] [→E2E] active nav updates on Step 5 dynamic route

[+] Schedule workflow workspace
    │
    ├── [GAP] [→E2E] Step 3 grid gains horizontal room compared with sidebar shell
    ├── [GAP] [→E2E] schedule stepper remains visible inside route content
    └── [GAP] [→E2E] route guard still blocks incomplete step progression

[+] Account context
    │
    ├── [★★ TESTED] logout works — tests/unit/header.spec.ts
    ├── [GAP] organization switcher remains usable after header layout change
    └── [GAP] long organization name truncates instead of overlapping nav/logout

─────────────────────────────────
COVERAGE: 4/27 paths currently tested (15%)
  Code paths: 4/17 (24%)
  User flows: 0/10 (0%)
QUALITY:  ★★★: 1  ★★: 3  ★: 1
GAPS: 23 paths need explicit test coverage (7 should be E2E)
─────────────────────────────────
```

#### Required Test Additions

| Test File                                                 | Type | Assertions                                                                                                                                                                             |
| --------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/app-navigation.spec.ts`                       | unit | RBAC menu matrix, `운영 기준`/`근무표 조회` children, no submenu for `근무표 생성`, fallback dashboard item, canonical/legacy active route normalization, navigation push.             |
| `tests/unit/header.spec.ts`                               | unit | renders nav labels, active item has `aria-current="page"`, dropdown triggers expose submenu items, nav click triggers route push, fallback `대시보드` item renders.                    |
| `tests/unit/router-index.spec.ts`                         | unit | keep `DefaultLayout` mounted only under `/app`; existing route paths unchanged; add `/app/schedule-results` and `/app/work-performance` as authenticated org/admin workspace children. |
| `tests/unit/step-indicator.spec.ts`                       | unit | update only if the implementation intentionally changes step labels.                                                                                                                   |
| `tests/unit/work-performance.spec.ts`                     | unit | placeholder page renders title, empty/준비 중 state, and does not call performance APIs.                                                                                               |
| `tests/e2e/pilot-checklist.spec.ts` or new app-shell spec | E2E  | `/app` has top nav, no sidebar menu, organization switcher and logout are reachable.                                                                                                   |
| `tests/e2e/schedule-workflow.spec.ts`                     | E2E  | schedule workflow still reaches Step 3/Step 5 after layout change; Step 5 active nav remains `근무표 생성`; 조회 routes do not steal active state from in-progress generation.         |

Regression rule: the old sidebar tests already cover behavior that must survive the UI move. Move those assertions to `app-navigation.spec.ts`; do not delete them with `Sidebar.vue`.

### Performance Review

No backend, database, or solver codepath is introduced. N+1 query risk is not applicable.

Potential frontend performance issues:

- Avoid async loading or API calls in `Header.vue`; it should consume existing Pinia state only.
- Keep `navigationItems` as computed data over a small fixed menu list.
- Do not add window resize listeners unless CSS can solve the header compression.
- Do not move schedule grid wrappers into a globally constrained `max-w-*`; Step 3/Step 5 need route-level width freedom.

Performance acceptance:

- Header render does not trigger new network requests.
- Step 3 table keeps its current data and virtualization behavior.
- Layout shift is limited to the intentional sidebar removal.

### Failure Modes

| Failure Mode                                                  | Test?                                                                   | Error Handling?                                                                                 | User Impact                                                             |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| RBAC context unavailable on first render                      | add unit fallback test                                                  | existing store load flow                                                                        | user sees `대시보드` fallback or stable account state, not broken nav   |
| User has no selected organization and clicks org-required nav | route guard test already covers guard logic; add E2E smoke if practical | existing `resolveRouteAccessTarget`                                                             | redirect/fallback, not silent failure                                   |
| Legacy route is opened from old bookmark                      | add active-key unit test                                                | existing redirects and route helpers                                                            | top nav highlights correct section                                      |
| 조회 route is introduced under a broad schedule prefix        | avoid broad schedule prefix for lookup routes; add active-key unit test | `/app/schedule-results` and `/app/work-performance` normalize before schedule workflow matching | user does not see `근무표 생성` highlighted while browsing past records |
| Long organization name overlaps nav                           | add Playwright screenshot at narrow desktop                             | CSS truncation and accessible label                                                             | user can still logout and navigate                                      |
| Submenu opens only on hover                                   | add keyboard interaction test or Playwright smoke                       | use click/focus-open dropdown behavior                                                          | keyboard users cannot reach `병원 정보`, `근무 실적`                    |
| Sidebar behavior tests are deleted with component             | add replacement `app-navigation.spec.ts`                                | not runtime-handled                                                                             | regression could ship unnoticed                                         |
| Step labels silently change                                   | update unit test only when intentional                                  | not runtime-handled                                                                             | user copy inconsistency                                                 |

Critical gaps: **0** if the required test additions are implemented with the layout change. Critical gaps become **2** if sidebar tests are deleted without replacement or if active route normalization is copied manually into `Header.vue`.

### Implementation Sequence

```text
1. Extract navigation mapping
   Sidebar.vue -> useAppNavigation.ts
   Add app-navigation unit tests first.

2. Render top nav in Header.vue
   Consume useAppNavigation().
   Add aria-current and click tests.

3. Remove sidebar from DefaultLayout.vue and delete Sidebar.vue
   Keep existing route paths and guards unchanged.
   Verify /app still mounts Dashboard through router-view.

4. Add lookup routes and placeholder page
   Add /app/schedule-results for generated schedule lookup.
   Add /app/work-performance as a placeholder page only.

5. Clean Dashboard shell as visual cleanup
   Remove page-level card nesting without changing readiness behavior.

6. Run verification
   pnpm lint:check
   pnpm run build
   targeted Vitest + Playwright smoke
```

### Engineering NOT In Scope

- Rewriting route guards: existing guards already own access enforcement.
- Adding a global admin navigation framework: current menu count does not justify it.
- Moving schedule stepper into the global header: global navigation and workflow progress have different jobs.
- Reworking Step 3 grid internals: the layout change should only give it more room.
- Adding mobile-first schedule grid behavior: MVP remains desktop-first.
- Adding new backend or Supabase calls for navigation.
- Implementing real `근무 실적` aggregation, filters, charts, or API calls.

### Plan-Ready Acceptance Criteria

Add these to the implementation checklist:

- `useAppNavigation.ts` has full RBAC and active-route unit coverage before `Sidebar.vue` is removed.
- `Header.vue` top nav uses Korean labels and `aria-current="page"` on the active item.
- `/app/schedule/step5/:scheduleKey` highlights `근무표 생성`.
- `운영 기준` exposes `병원 정보`, `병동/근무 기준`, `직원 정보`.
- `근무표 생성` has no single-item submenu.
- `근무표 조회` exposes `생성된 근무표`, `근무 실적`.
- `/app/schedule-results` renders generated schedule lookup and highlights `근무표 조회`.
- `/app/work-performance` renders a placeholder empty page and highlights `근무표 조회`.
- 조회 route active-state tests run before any broad `/app/schedule/*` matching rule is reused.
- legacy `/schedule/*` and `/ops/*` paths still normalize to the right active nav key during redirect or direct test setup.
- no new network request is introduced by app shell render.
- 1024px screenshot shows no overlap among brand, nav, organization switcher, role label, and logout.
- if step labels change, `StepIndicator.vue` and `tests/unit/step-indicator.spec.ts` are updated in the same PR.

---

## Writing-Plans Review Findings

`superpowers:writing-plans` 관점에서 기존 문서는 디자인 판단과 engineering risk는 충분하지만, 실행자가 바로 구현하기에는 다음 5개가 부족했다.

| Gap                          | Why It Matters                                                                    | Fix In This Revision                                                         |
| ---------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Required plan header 없음    | 구현 agent가 목표, 구조, stack을 처음 10초 안에 파악하기 어렵다.                  | 문서 첫머리에 Goal, Architecture, Tech Stack, required sub-skill을 추가했다. |
| File responsibility map 부족 | 어떤 파일이 무엇을 책임지는지 불명확하면 `Header.vue`에 route/RBAC 로직이 섞인다. | 아래 `File Responsibility Map`을 추가했다.                                   |
| Task granularity가 큼        | "top nav 구현"은 한 번에 너무 크고 테스트 실패 지점을 좁히기 어렵다.              | Task를 2-5분 단위 step과 commit boundary로 쪼갰다.                           |
| TDD 순서가 약함              | `Sidebar.vue` 삭제 후 회귀를 발견하면 원인 추적이 늦다.                           | 각 task를 failing test -> implementation -> pass 순서로 재정렬했다.          |
| Expected command output 없음 | 실행자가 실패와 성공을 구분하기 어렵다.                                           | 각 verification command에 Expected result를 명시했다.                        |

---

## File Responsibility Map

| File                                         | Action           | Responsibility                                                                                                                          |
| -------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/layout/useAppNavigation.ts`  | Create           | RBAC 기반 top nav item, submenu, active-route 정규화, navigation push를 소유한다.                                                       |
| `src/components/layout/Header.vue`           | Modify           | EveryShift brand, primary top nav, organization switcher, role label, logout만 렌더링한다. Route prefix parsing은 하지 않는다.          |
| `src/components/layout/DefaultLayout.vue`    | Modify           | `n-layout-sider` 제거, sticky header, app content wrapper를 소유한다.                                                                   |
| `src/components/layout/Sidebar.vue`          | Delete           | behavior coverage가 `app-navigation.spec.ts`로 이동한 뒤 삭제한다.                                                                      |
| `src/constants/routes.ts`                    | Modify           | `/app/schedule-results`, `/app/work-performance` constants/helpers와 lookup-route predicate를 추가한다.                                 |
| `src/router/index.ts`                        | Modify           | 새 lookup routes를 `/app` child route로 등록한다. Existing schedule workflow routes는 변경하지 않는다.                                  |
| `src/views/schedule/ScheduleResults.vue`     | Create           | 생성된 근무표 월별 조회 UI를 렌더링한다. 기존 Dashboard schedule list data access pattern만 재사용하고 새 backend call은 만들지 않는다. |
| `src/views/schedule/WorkPerformance.vue`     | Create           | `근무 실적` 준비 중 placeholder만 렌더링한다. 필터, 차트, 집계 API는 만들지 않는다.                                                     |
| `src/views/Dashboard.vue`                    | Modify           | page-level card nesting 제거와 copy alignment만 수행한다. Readiness, modal, schedule deletion behavior는 변경하지 않는다.               |
| `tests/unit/app-navigation.spec.ts`          | Create           | 기존 `sidebar.spec.ts`의 RBAC/active-route behavior를 대체한다.                                                                         |
| `tests/unit/header.spec.ts`                  | Modify           | top nav render, active state, submenu trigger, click behavior, logout regression을 검증한다.                                            |
| `tests/unit/router-index.spec.ts`            | Modify           | 새 lookup routes가 `/app` layout child로 등록되는지 검증한다.                                                                           |
| `tests/unit/schedule-results.spec.ts`        | Create           | 월별 lookup empty/success state와 Step 5 route 진입을 검증한다.                                                                         |
| `tests/unit/work-performance.spec.ts`        | Create           | placeholder가 API 호출 없이 렌더링되는지 검증한다.                                                                                      |
| `tests/unit/dashboard.spec.ts`               | Modify           | readiness behavior는 유지되고 section copy가 top nav와 일치하는지 검증한다.                                                             |
| `tests/e2e/app-shell-top-navigation.spec.ts` | Create or extend | `/app` top nav, no sidebar, 1024px no-overlap, basic keyboard reachability를 검증한다.                                                  |
| `tests/e2e/schedule-workflow.spec.ts`        | Modify           | Step 3/Step 5 flow가 layout 전환 후에도 유지되고 active nav가 `근무표 생성`인지 검증한다.                                               |

---

## Agent-Ready Implementation Plan

### Task 1: Extract Navigation Behavior Before Touching UI

**Files:**

- Modify: `src/constants/routes.ts`
- Create: `src/components/layout/useAppNavigation.ts`
- Create: `tests/unit/app-navigation.spec.ts`
- Reference only: `src/components/layout/Sidebar.vue`
- Reference only: `src/stores/rbac.ts`

- [ ] **Step 1: Write failing RBAC and active-route tests**

Add `tests/unit/app-navigation.spec.ts` with these cases:

```ts
it('shows admin primary navigation in workflow order', () => {
  expect(labels).toEqual(['운영 기준', '근무표 생성', '근무표 조회']);
});

it('keeps 근무표 생성 as a direct item without a one-item submenu', () => {
  expect(scheduleCreateItem.children).toBeUndefined();
});

it('normalizes schedule workflow routes to 근무표 생성', () => {
  expect(activeKeyFor('/app/schedule/step5/2026-05')).toBe('/app/schedule/step1');
});

it('normalizes lookup routes to 근무표 조회 before broad schedule matching', () => {
  expect(activeKeyFor('/app/schedule-results')).toBe('/app/schedule-results');
  expect(activeKeyFor('/app/work-performance')).toBe('/app/schedule-results');
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
pnpm exec vitest run tests/unit/app-navigation.spec.ts
```

Expected: FAIL because `src/components/layout/useAppNavigation.ts` does not exist yet.

- [ ] **Step 3: Add lookup route constants**

In `src/constants/routes.ts`, add route constants before implementing `useAppNavigation.ts`:

```ts
export const APP_SCHEDULE_RESULTS_ROUTE_PATH = `${APP_HOME_ROUTE_PATH}/schedule-results`;
export const APP_WORK_PERFORMANCE_ROUTE_PATH = `${APP_HOME_ROUTE_PATH}/work-performance`;

export function getScheduleResultsRoutePath(): string {
  return APP_SCHEDULE_RESULTS_ROUTE_PATH;
}

export function getWorkPerformanceRoutePath(): string {
  return APP_WORK_PERFORMANCE_ROUTE_PATH;
}

export function isScheduleLookupRoutePath(path: string): boolean {
  return path === APP_SCHEDULE_RESULTS_ROUTE_PATH || path === APP_WORK_PERFORMANCE_ROUTE_PATH;
}
```

- [ ] **Step 4: Implement the smallest composable**

Create `src/components/layout/useAppNavigation.ts`.

Required public shape:

```ts
export interface AppNavigationItem {
  label: string;
  key: string;
  children?: AppNavigationItem[];
}

export function useAppNavigation(): {
  navigationItems: ComputedRef<AppNavigationItem[]>;
  activeNavigationKey: ComputedRef<string>;
  navigateToNavigationItem: (key: string) => Promise<void>;
};
```

Rules:

- Use `useRbacStore()`, `useRoute()`, `useRouter()`.
- Use `src/constants/routes.ts` helpers instead of string duplication where helpers exist.
- Check lookup routes before `isScheduleRoutePath()`.
- Include `대시보드` fallback when no visible item exists.
- Keep `운영 기준` children as anchors under `/app/ops/organization-setup`.
- Keep `근무표 조회` children as `/app/schedule-results` and `/app/work-performance`.

- [ ] **Step 5: Run navigation tests and verify pass**

Run:

```bash
pnpm exec vitest run tests/unit/app-navigation.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/constants/routes.ts src/components/layout/useAppNavigation.ts tests/unit/app-navigation.spec.ts
git commit -m "test: cover app navigation behavior"
```

---

### Task 2: Add Lookup Route Contracts And Placeholder Views

**Files:**

- Modify: `src/router/index.ts`
- Create: `src/views/schedule/ScheduleResults.vue`
- Create: `src/views/schedule/WorkPerformance.vue`
- Modify: `tests/unit/router-index.spec.ts`
- Create: `tests/unit/schedule-results.spec.ts`
- Create: `tests/unit/work-performance.spec.ts`

- [ ] **Step 1: Write failing route contract tests**

In `tests/unit/router-index.spec.ts`, add assertions that:

- `/app/schedule-results` is registered under `DefaultLayout`.
- `/app/work-performance` is registered under `DefaultLayout`.
- Existing `/app/schedule/step1` through Step 5 routes remain unchanged.

Run:

```bash
pnpm exec vitest run tests/unit/router-index.spec.ts
```

Expected: FAIL because the routes are missing.

- [ ] **Step 2: Register lookup routes**

In `src/router/index.ts`, add the routes as `/app` children with the same authenticated workspace metadata pattern used by Dashboard and schedule workflow routes.

Expected route paths:

```text
/app/schedule-results
/app/work-performance
```

- [ ] **Step 3: Create the placeholder views**

`src/views/schedule/ScheduleResults.vue`:

- Title: `생성된 근무표`
- Year/month lookup surface: current year heading or selector + 12 month tiles.
- Empty state for months with no generated schedule.
- Generated month click routes to existing Step 5 review path.
- No new backend/API function in this task unless the existing Dashboard schedule list abstraction already exposes the needed data.

`src/views/schedule/WorkPerformance.vue`:

- Title: `근무 실적`
- Empty state: feature 준비 중.
- Secondary action to `/app/schedule-results`.
- No filters, charts, aggregation, or API calls.

- [ ] **Step 4: Write and run view tests**

Run:

```bash
pnpm exec vitest run tests/unit/schedule-results.spec.ts tests/unit/work-performance.spec.ts tests/unit/router-index.spec.ts
```

Expected: PASS, with `WorkPerformance.vue` tests proving no performance API is called.

- [ ] **Step 5: Commit**

```bash
git add src/router/index.ts src/views/schedule/ScheduleResults.vue src/views/schedule/WorkPerformance.vue tests/unit/router-index.spec.ts tests/unit/schedule-results.spec.ts tests/unit/work-performance.spec.ts
git commit -m "feat: add schedule lookup routes"
```

---

### Task 3: Render Top Navigation In Header

**Files:**

- Modify: `src/components/layout/Header.vue`
- Modify: `tests/unit/header.spec.ts`
- Reference: `src/components/layout/useAppNavigation.ts`
- Reference: `src/components/layout/OrganizationSwitcher.vue`

- [ ] **Step 1: Write failing header tests**

Add `tests/unit/header.spec.ts` coverage for:

- Brand `EveryShift` renders.
- Primary nav uses `aria-label="주요 메뉴"`.
- `운영 기준`, `근무표 생성`, `근무표 조회` render for admin abilities.
- Active item has `aria-current="page"`.
- `근무표 생성` click pushes `/app/schedule/step1`.
- `운영 기준` and `근무표 조회` submenu items are keyboard/click reachable.
- Organization switcher, role label, and logout still render.

Run:

```bash
pnpm exec vitest run tests/unit/header.spec.ts
```

Expected: FAIL because `Header.vue` does not render primary nav yet.

- [ ] **Step 2: Implement header nav rendering**

In `Header.vue`:

- Import and consume `useAppNavigation()`.
- Render `<header>` or ensure the parent header landmark is preserved by `DefaultLayout.vue`.
- Render `<nav aria-label="주요 메뉴">`.
- Use Naive UI dropdown/menu primitives only if they preserve keyboard reachability.
- Use Tailwind for layout and visible active underline.
- Keep logout logic unchanged and still use `showSuccess` / `showError`.
- Keep user-facing text Korean.

- [ ] **Step 3: Run header tests**

Run:

```bash
pnpm exec vitest run tests/unit/header.spec.ts tests/unit/app-navigation.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Header.vue tests/unit/header.spec.ts
git commit -m "feat: render top navigation header"
```

---

### Task 4: Remove Sidebar From App Shell

**Files:**

- Modify: `src/components/layout/DefaultLayout.vue`
- Delete: `src/components/layout/Sidebar.vue`
- Delete or rewrite: `tests/unit/sidebar.spec.ts`
- Modify: `tests/unit/router-index.spec.ts` if it snapshots layout assumptions

- [ ] **Step 1: Move remaining sidebar assertions**

Before deleting `Sidebar.vue`, compare `tests/unit/sidebar.spec.ts` against `tests/unit/app-navigation.spec.ts`.

Required outcome:

- No RBAC menu visibility assertion is lost.
- No active-route normalization assertion is lost.
- No navigation click behavior assertion is lost.

- [ ] **Step 2: Update layout test expectations**

If existing tests assert that `DefaultLayout.vue` contains `n-layout-sider`, change them to assert:

- `Header` renders.
- `router-view` renders.
- Sidebar text `메뉴` no longer appears.

Run:

```bash
pnpm exec vitest run tests/unit/router-index.spec.ts tests/unit/app-navigation.spec.ts
```

Expected: FAIL until `DefaultLayout.vue` is changed.

- [ ] **Step 3: Remove `n-layout-sider`**

In `DefaultLayout.vue`:

- Remove `Sidebar` import and usage.
- Keep app shell under `/app` only.
- Keep content scroll behavior stable.
- Use a sticky top header surface with border, not heavy shadow.
- Do not apply one global narrow `max-w-*` wrapper to schedule workflow pages.

- [ ] **Step 4: Delete sidebar component and obsolete test**

Delete `src/components/layout/Sidebar.vue`.

Delete `tests/unit/sidebar.spec.ts` only after its behavior is covered by `app-navigation.spec.ts`.

- [ ] **Step 5: Run layout/navigation regression tests**

Run:

```bash
pnpm exec vitest run tests/unit/app-navigation.spec.ts tests/unit/header.spec.ts tests/unit/router-index.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/DefaultLayout.vue src/components/layout/Header.vue src/components/layout/useAppNavigation.ts tests/unit/app-navigation.spec.ts tests/unit/header.spec.ts tests/unit/router-index.spec.ts
git rm src/components/layout/Sidebar.vue tests/unit/sidebar.spec.ts
git commit -m "refactor: replace sidebar with top app navigation"
```

---

### Task 5: Clean Dashboard Surface Without Changing Behavior

**Files:**

- Modify: `src/views/Dashboard.vue`
- Modify: `tests/unit/dashboard.spec.ts`

- [ ] **Step 1: Write failing copy/surface tests**

Update `tests/unit/dashboard.spec.ts` to assert:

- Dashboard section language uses `운영 기준`.
- Dashboard lookup section uses `근무표 조회`.
- Readiness loading, unavailable, incomplete, and complete states still render.
- Existing create modal behavior still works.
- Existing schedule deletion behavior still works.

Run:

```bash
pnpm exec vitest run tests/unit/dashboard.spec.ts
```

Expected: FAIL only for the new copy/surface assertions. Existing behavior tests should still pass.

- [ ] **Step 2: Remove unnecessary page-level framing**

In `Dashboard.vue`:

- Remove outer full-page `n-card` if it creates card-inside-card layout.
- Keep real section surfaces for readiness, generation, and lookup.
- Rename `기본 정보` references to `운영 기준` where they refer to the app-level preparation area.
- Rename `지난 결과` references to `근무표 조회` where they refer to lookup.
- Do not change readiness API calls, creation modal, deletion logic, or stores.

- [ ] **Step 3: Run dashboard tests**

Run:

```bash
pnpm exec vitest run tests/unit/dashboard.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/views/Dashboard.vue tests/unit/dashboard.spec.ts
git commit -m "refactor: align dashboard surface with top navigation"
```

---

### Task 6: Add App-Shell E2E And Schedule Workflow Smoke

**Files:**

- Create: `tests/e2e/app-shell-top-navigation.spec.ts`
- Modify: `tests/e2e/schedule-workflow.spec.ts`
- Optional modify: `tests/e2e/pilot-checklist.spec.ts`

- [ ] **Step 1: Add app-shell E2E coverage**

Add assertions:

- `/app` shows top nav labels.
- Sidebar label `메뉴` is absent.
- Organization switcher and logout are reachable.
- At `1024px`, brand, nav, organization switcher, role label, and logout do not overlap.
- `근무표 생성` navigates to `/app/schedule/step1`.
- `근무표 조회 > 근무 실적` navigates to `/app/work-performance`.

- [ ] **Step 2: Add schedule workflow smoke coverage**

In `tests/e2e/schedule-workflow.spec.ts`, add or preserve assertions:

- Step 3 grid still renders inside the new layout.
- Step 5 dynamic route highlights `근무표 생성`.
- `/app/schedule-results` and `/app/work-performance` highlight `근무표 조회`, not `근무표 생성`.

- [ ] **Step 3: Run targeted E2E**

Run:

```bash
pnpm exec playwright test tests/e2e/app-shell-top-navigation.spec.ts tests/e2e/schedule-workflow.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/app-shell-top-navigation.spec.ts tests/e2e/schedule-workflow.spec.ts tests/e2e/pilot-checklist.spec.ts
git commit -m "test: cover top navigation app shell"
```

---

### Task 7: Final Verification

**Files:**

- Verify only unless previous tasks expose a defect.

- [ ] **Step 1: Run required repo checks**

Run:

```bash
pnpm lint:check
pnpm run build
```

Expected: both PASS.

- [ ] **Step 2: Run targeted unit suite**

Run:

```bash
pnpm exec vitest run tests/unit/app-navigation.spec.ts tests/unit/header.spec.ts tests/unit/router-index.spec.ts tests/unit/dashboard.spec.ts tests/unit/schedule-results.spec.ts tests/unit/work-performance.spec.ts tests/unit/step-indicator.spec.ts
```

Expected: PASS. `step-indicator.spec.ts` should pass unchanged unless step labels were intentionally changed.

- [ ] **Step 3: Run targeted E2E**

Run:

```bash
pnpm exec playwright test tests/e2e/app-shell-top-navigation.spec.ts tests/e2e/schedule-workflow.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Inspect diff for scope drift**

Run:

```bash
git diff --stat
git diff -- src/router/guards.ts src/stores/schedule.ts src/composables/useAISolver.ts
```

Expected:

- Diff stat is limited to layout, nav, routes, new lookup views, tests, and Dashboard cleanup.
- No changes to solver integration.
- No changes to route guard semantics unless an existing test required a narrow route registration fix.
- No backend, Supabase, or API changes.

---

## Acceptance Criteria

### Visual

- Left sidebar no longer appears on `/app`.
- `Sidebar.vue` is deleted; its RBAC and active-route behavior is covered by `app-navigation.spec.ts`.
- Top header stays visible while scrolling app content.
- `운영 기준`, `근무표 생성`, and `근무표 조회` are visible as primary navigation for admin users.
- `운영 기준` shows `병원 정보`, `병동/근무 기준`, `직원 정보` as submenu/anchor destinations on `/app/ops/organization-setup`.
- `근무표 생성` is a direct item, not a dropdown with one repeated action.
- `근무표 조회` shows `생성된 근무표`, `근무 실적` as submenus.
- `/app/schedule-results` uses a year/month schedule lookup UI, not only a vertical schedule list.
- `/app/work-performance` exists as a placeholder empty page.
- Active route is visually obvious without relying on color alone.
- Step 3 grid gains horizontal room compared with the sidebar layout.
- Dashboard no longer reads as a full-page card nested inside app chrome.
- Header has no overlap at `1024px`, and the compact threshold is adjustable through one token/constant.

### Functional

- Existing route paths still work.
- New lookup routes work: `/app/schedule-results`, `/app/work-performance`.
- Existing role-based menu visibility still works.
- Organization switching still works.
- Logout still works.
- Dashboard readiness gate behavior does not change.
- Schedule creation modal behavior does not change.
- `근무 실적` placeholder does not trigger new backend/API calls.

### Accessibility

- Header and nav are keyboard reachable.
- Active nav has `aria-current`.
- Focus ring is visible on nav items, organization switcher, logout, CTA buttons.
- 44px minimum clickable height is preserved.

### Tests

Run after implementation:

```bash
pnpm lint:check
pnpm run build
```

Recommended targeted tests:

```bash
pnpm exec vitest run tests/unit/dashboard.spec.ts
pnpm exec playwright test tests/e2e/pilot-checklist.spec.ts
pnpm exec playwright test tests/e2e/schedule-workflow.spec.ts
```

Additional required tests from engineering review:

```bash
pnpm exec vitest run tests/unit/app-navigation.spec.ts tests/unit/header.spec.ts tests/unit/router-index.spec.ts
```

`Sidebar.vue` is deleted in this plan. Replace `tests/unit/sidebar.spec.ts` with `tests/unit/app-navigation.spec.ts` before deletion and run the replacement test instead.

---

## NOT In Scope

- Adding organization/employee/shift CRUD menus: MVP scope does not require it.
- Adding analytics or broad reporting navigation: not part of schedule-generation focus. `근무 실적` is limited to employee-period duty performance from generated schedules.
- Making Step 3 a mobile-first grid: current product contract is desktop-first.
- Replacing Naive UI: existing stack remains Vue 3 + Naive UI + Tailwind.
- Rebranding the product shell: this is layout and IA cleanup, not brand exploration.
- Real solver integration: mocked solver contract remains.

---

## TODO Candidates

These are not blockers for the top-nav conversion, but they should be considered if the implementation reveals debt.

| What                                                      | Why                                                                                 | Recommendation                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Create `useAppNavigation.ts`                              | Prevent duplicated permission/active-route logic between old sidebar and new header | Do in the same PR if top nav is implemented                    |
| Add route-level app content width policy                  | Dashboard and Step 3 need different width behavior                                  | Do in the same PR if layout changes are touched                |
| Add visual QA screenshots for `/app`, Step 3, Step 5      | Proves sidebar removal actually improves workspace width                            | Do after implementation                                        |
| Revisit sidebar only when menu count reaches 6+           | Avoid premature admin portal chrome                                                 | Defer                                                          |
| Preserve sidebar behavior coverage after deleting sidebar | Current `sidebar.spec.ts` covers important RBAC/active-route behavior               | Do in the same PR; move assertions to `app-navigation.spec.ts` |
| Add app-shell E2E smoke for top nav                       | Unit tests will not catch real layout overlap or sticky header regressions          | Do in the same PR if top nav is implemented                    |
| Add lookup route IA for `근무표 조회`                     | Resolved in this plan as `/app/schedule-results` and `/app/work-performance`        | Implement in the same PR                                       |
| Add employee performance lookup empty/error states        | `근무 실적` is not implemented yet and needs a deliberate placeholder               | Do in the same PR as `/app/work-performance`; no API calls     |

---

## Completion Summary

```text
+====================================================================+
|         DESIGN PLAN REVIEW — COMPLETION SUMMARY                    |
+====================================================================+
| System Audit         | DESIGN.md exists, UI scope is app shell + dashboard |
| Step 0               | initial rating 7/10, focus on IA, states, a11y       |
| Pass 1  (Info Arch)  | 7/10 -> 9/10 after nav naming + submenu fixes       |
| Pass 2  (States)     | 6/10 -> 9/10 after fixes                            |
| Pass 3  (Journey)    | 7/10 -> 9/10 after fixes                            |
| Pass 4  (AI Slop)    | 8/10 -> 9/10 after fixes                            |
| Pass 5  (Design Sys) | 8/10 -> 9/10 after fixes                            |
| Pass 6  (Responsive) | 5/10 -> 8/10 after fixes                            |
| Pass 7  (Decisions)  | 6 resolved, 2 deferred                              |
| Eng Scope Challenge  | accepted with minimum 5-source-file implementation |
| Eng Architecture     | 0 blocking issues, extract nav mapping first        |
| Eng Code Quality     | 1 concrete drift risk: StepIndicator labels         |
| Eng Test Review      | 23 gaps identified, 7 E2E-worthy                    |
| Eng Performance      | no backend risk, avoid header-side async work       |
| Writing Plans        | header, file map, TDD tasks, commands added         |
+--------------------------------------------------------------------+
| NOT in scope         | written (6 items)                                    |
| What already exists  | written                                              |
| TODOS.md updates     | 8 candidates proposed in this document               |
| Decisions made       | top fixed nav, route active mapping, naming, submenus |
| Decisions deferred   | future 6+ menu sidebar, full mobile grid support     |
| Overall score        | design 7/10 -> 9/10, eng ready with test additions   |
+====================================================================+
```

**Status:** DONE_WITH_CONCERNS
**Verdict:** Plan is implementable after adding `useAppNavigation.ts` test coverage and preserving current sidebar behavior assertions. Run visual QA after implementation, especially on `/app`, Step 3 grid, and Step 5 review surfaces.

## GSTACK REVIEW REPORT

| Review        | Trigger                      | Why                             | Runs | Status      | Findings                                                                         |
| ------------- | ---------------------------- | ------------------------------- | ---- | ----------- | -------------------------------------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`           | Scope & strategy                | 0    | —           | —                                                                                |
| Codex Review  | `/codex review`              | Independent 2nd opinion         | 0    | —           | —                                                                                |
| Eng Review    | `/plan-eng-review`           | Architecture & tests (required) | 1    | issues_open | 23 test gaps, 0 critical gaps; extraction-first plan required                    |
| Design Review | `/plan-design-review`        | UI/UX gaps                      | 1    | clean       | score: 7/10 -> 9/10, top navigation and submenu IA recommended                   |
| Writing Plans | `$superpowers:writing-plans` | Implementation readiness        | 1    | clean       | required header, file ownership map, TDD task breakdown, expected commands added |

**UNRESOLVED:** 0
**VERDICT:** DESIGN CLEARED + ENG REVIEW COMPLETE WITH TEST REQUIREMENTS — ready to implement after carrying the listed tests into the PR.
