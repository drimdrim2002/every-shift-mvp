# 대시보드 운영 브리핑 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드를 메뉴 모음 화면에서 운영 관리자가 다음 행동, 막힌 상태, 최근 근무표를 즉시 판단하는 운영 브리핑 화면으로 바꾼다.

**Architecture:** 새 store, 새 service, 새 backend endpoint 없이 `src/views/Dashboard.vue` 내부의 Vue `computed` 파생 상태와 기존 route/API helper만 사용한다. 테스트는 `tests/unit/dashboard.spec.ts`에서 branch logic을 먼저 고정하고, E2E helper는 새 dashboard selector와 `ScheduleResults.vue` 책임 분리에 맞춘다.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vite, Tailwind CSS, Naive UI, Pinia, Vitest, Playwright

---

**작성일:** 2026-05-13
**대상 화면:** `src/views/Dashboard.vue`
**관련 맥락:** `docs/plans/2026-05-13-dashboard-top-navigation-design-review.ko.md` 이후 대시보드 역할 재정의
**목표:** 대시보드를 기능 모음 화면에서 운영 관리자 전용 첫 화면으로 재구성한다.

## 0. `plan-design-review` 보강 결과

이 계획은 **APP UI** 변경이다. 랜딩 페이지나 통계 대시보드가 아니라, 로그인한 운영 관리자가 월간 근무표 업무를 시작하는 운영 브리핑 화면이다.

- 디자인 완성도: **7/10 -> 9/10**
- 10/10에 필요한 추가 조건: 구현 후 desktop/narrow desktop screenshot 기반 `/design-review` 검증
- 주요 보강: 정보 위계, interaction state, empty/error copy, responsive/accessibility, AI-slop 방지 규칙, TODO/비범위 명시
- 기준 문서: `DESIGN.md`의 “calm operational product, dense but readable, minimal chrome”

### `plan-eng-review` 보강 결과

이 계획은 **Dashboard.vue 중심의 단일 화면 재구성**으로 유지한다. 새 service, 새 store, 새 backend endpoint를 만들지 않는다. 필요한 변경은 기존 dashboard의 파생 상태와 template 구조를 정리하는 일이다.

Engineering verdict:

- Scope: **accepted as-is with one completeness fix**. `schedule list load failure`가 primary CTA 우선순위에 빠져 있었으므로 `다시 불러오기`를 readiness 다음 단계에 추가한다.
- Architecture: **boring by default**. Vue `computed`, 기존 route helper, 기존 `getChecklist`, 기존 `getScheduleList`, 기존 Step5 canonical route만 사용한다.
- Blast radius: `src/views/Dashboard.vue`, `tests/unit/dashboard.spec.ts`, `tests/e2e/helpers.ts`, readiness 관련 E2E 일부에 한정한다.
- Complexity smell: touched source files가 8개를 넘거나 새 abstraction이 2개를 넘으면 scope가 커진 것이다. 그 경우 `Dashboard.vue` 내부 pure helper + computed로 다시 줄인다.
- Distribution check: 새 binary/package/container artifact가 없으므로 별도 publish pipeline은 필요 없다.
- Lake score: completeness recommendation **5/5**. 목록 실패, stale response, sorting tie-breaker, route failure, permission-gated CTA까지 이번 plan 안에서 테스트한다.

### 시스템 감사

- Base branch 자동 감지는 `gh` 명령 부재로 실패했다. 이 검토는 `main`을 fallback base로 본다.
- 현재 작업트리에는 이 계획 외의 Dashboard/layout 관련 변경이 이미 존재한다. 구현자는 이 문서만 보고 unrelated diff를 되돌리면 안 된다.
- `DESIGN.md`가 존재하며, 이 화면의 모든 색상/타이포/밀도/상태 결정은 해당 문서를 따른다.
- `TODOS.md`는 현재 없다. 이 계획에서 새 TODO 파일을 만들지 않는다.

### What Already Exists

새 시각 언어를 만들지 않고 아래 기존 결정을 재사용한다.

- Dashboard hierarchy: `what to do next -> what is blocked/ready -> what can be acted on now`
- App UI 방향: restrained neutral surface, one meaningful teal accent, minimal chrome
- Typography: `Pretendard Variable` for Korean UI, `IBM Plex Mono` only for timestamps/scores/IDs when useful
- State contract: loading/empty/error/success/partial state를 화면 단위가 아니라 section 단위로 보여준다
- 기존 흐름: readiness gate, 월 선택 modal, Step5 canonical route 이동, `getReadinessRoute`
- 기존 top nav 결정: `운영 기준`, `근무표 생성`, `근무표 조회`
- Existing API boundary: `getChecklist(orgId)`로 readiness를 판단하고, `getScheduleList(orgId)`로 schedule summary를 가져온다.
- Existing route helpers: `getOpsOrganizationSetupRoutePath`, `getScheduleStepRoutePath`, `getScheduleResultsRoutePath`, `buildCanonicalStep5RouteLocation`를 재사용한다.
- Existing Step5 resolver: `navigateToCanonicalStep5`의 `getPhase2ScheduleCompare` + `resolveStep5VersionState` 흐름은 유지한다.
- Existing tests: `tests/unit/dashboard.spec.ts`는 readiness gate, Step5 이동, 월 선택 modal, org 변경 reload를 이미 다룬다. 새 plan은 이 테스트를 삭제하지 않고 새 역할에 맞게 기대값을 바꾼다.

### `writing-plans` 검토 결과와 보강 범위

기존 계획은 design/engineering decision은 충분하지만, `superpowers:writing-plans` 기준의 실행 단위가 부족했다.

- 보강 필요 1: 구현자가 바로 따라갈 수 있는 파일 책임 지도가 없었다.
- 보강 필요 2: red test -> failure 확인 -> 최소 구현 -> pass 확인 -> commit 흐름이 task 단위로 쪼개져 있지 않았다.
- 보강 필요 3: 핵심 파생 상태인 CTA 우선순위, 최근 근무표 정렬, stale response guard의 코드 형태가 너무 추상적이었다.
- 보강 필요 4: dashboard helper migration과 visual QA handoff가 검증 명령과 연결되어 있지 않았다.

이 문서는 위 4가지를 `## 4. writing-plans 실행 태스크`에 추가해 implementation-ready 상태로 보강한다.

## 0.1 파일 책임 지도

구현 전 아래 파일 경계를 먼저 고정한다. 이 범위를 벗어나는 변경은 새 요구가 생긴 것으로 보고 별도 계획으로 분리한다.

- Modify: `src/views/Dashboard.vue`
  - Dashboard template을 `오늘의 다음 작업`, `운영 상태`, `최근 근무표` vertical stack으로 바꾼다.
  - `Schedule` local interface를 제거하고 `ScheduleSummary` type을 import한다.
  - `primaryDashboardAction`, `sortedSchedulesByRecency`, `latestDisplaySchedule`, `runningSchedule`, `recentActionableSchedule`, `operationalStatusRows` computed를 둔다.
  - `handleEdit`, `handleDelete`, `deletePhase2ScheduleMonth`, 삭제 dialog/message 경로를 제거한다.
  - `reloadDashboardData`와 `loadSchedules`에 stale response guard를 둔다.
- Modify: `tests/unit/dashboard.spec.ts`
  - Legacy dashboard 기대값을 operational briefing 기대값으로 바꾼다.
  - CTA 우선순위, recent schedule sorting, schedule list failure, `error` schedule Step4 route, stale response guard를 unit test로 고정한다.
  - `deletePhase2ScheduleMonth`, `showSuccess`, delete dialog mock 의존성을 제거한다.
- Modify: `tests/e2e/helpers.ts`
  - `startNewScheduleFromDashboard`가 `dashboard-primary-action` 또는 `새 근무표 생성하기` CTA를 사용하도록 바꾼다.
  - 기존 `schedule-card` selector 의존은 dashboard helper에서 제거한다.
- Modify as needed: `tests/e2e/schedule-workflow.spec.ts`
  - dashboard 전체 목록에 의존하던 흐름은 `/app/schedule-results`로 이동한 뒤 진행하도록 helper 사용부만 조정한다.
- Read-only reference: `DESIGN.md`, `src/constants/routes.ts`, `src/api/schedule.ts`, `src/utils/date.ts`, `src/utils/scheduleVersionResolver.ts`, `src/utils/message.ts`
  - existing helper/API/type을 확인하는 용도다. 새 route string, 새 API boundary, 새 design token family를 만들지 않는다.
- Do not modify: Supabase migrations, solver integration, organization/employee CRUD, registration/approval flow, Step 3 grid, Step 5 result editor.

## 1. 결론

대시보드는 더 이상 `운영 기준`, `근무표 생성`, `근무표 조회`를 반복 노출하는 메뉴형 화면이 아니다.

로그인한 운영 관리자가 처음 보는 화면으로서 아래 질문에 바로 답해야 한다.

```text
지금 준비됐나?
문제가 있나?
다음에 무엇을 눌러야 하나?
최근 결과는 어디서 확인하나?
```

따라서 준비 완료 상태의 대시보드는 아래 3개 블록만 유지한다.

```text
1. 오늘의 다음 작업
2. 운영 상태
3. 최근 근무표
```

## 2. 요구사항

### 포함 범위

- 상단 primary CTA는 항상 1개만 표시한다.
- CTA 우선순위는 아래 순서로 고정한다.

```text
1. 운영 기준 확인 실패 -> 다시 확인
2. 운영 기준 미완료 -> 현재 막힌 운영 기준 항목으로 이동
3. 근무표 목록 확인 실패 -> 다시 불러오기
4. 생성 중인 근무표 있음 -> 생성 상태 확인하기
5. 생성 가능한 다음 계획월 있음 -> 새 근무표 생성하기
6. 최근 완료/수정 근무표 있음 -> 최근 근무표 보기
7. 아무 작업 없음 -> 근무표 조회로 이동
```

`운영 기준 확인 실패`는 readiness 결과 자체를 신뢰할 수 없는 상태다. 이때는 미완료 항목을 추정하지 말고, schedule 생성/조회 action보다 `다시 확인`을 우선한다. `운영 기준 미완료`는 checklist 응답이 성공한 뒤에만 판단한다.

`근무표 목록 확인 실패`는 schedule 상태를 신뢰할 수 없는 상태다. 이때는 running schedule, 최근 결과, 이미 생성된 월을 알 수 없으므로 `새 근무표 생성하기`보다 `다시 불러오기`를 우선한다.

- 최근 근무표는 1건만 표시한다.
- `운영 기준` 상세 항목은 미완료 상태에서만 보여준다.
- 운영 기준 완료 후에는 `운영 기준 준비 완료` 같은 요약 상태만 표시한다.
- 전체 목록은 `근무표 조회` 화면으로 이동시킨다.

### 제외 범위

- 전체 근무표 목록
- 월별 근무표 조회
- 대시보드 안의 근무표 `수정`, `삭제` 버튼
- 운영 기준 상세 카드 반복
- 상단 메뉴와 중복되는 기능 카드
- 통계형 analytics dashboard
- 근무 실적 분석

## 3. 구현 계획

### 3.1 Dashboard 화면 구조 변경

`Dashboard.vue`의 준비 완료 화면을 다음 구조로 변경한다.

```text
근무표 관리

[오늘의 다음 작업]  <- first visual anchor
- 현재 가장 중요한 안내 문장 1개
- primary CTA 1개
- supporting context 1줄

[운영 상태]
- 운영 기준: 준비 완료 / 확인 필요 / 확인 실패
- 생성 중 근무표: 있음 / 없음
- 최근 완료 근무표: 있음 / 없음
- 확인 필요: 있음 / 없음
  - `확인 필요`는 readiness 확인 실패 또는 schedule list 확인 실패처럼 데이터 신뢰 자체가 깨진 상태만 뜻한다.
  - `error` 상태 근무표가 존재하는 것은 이 row의 `확인 필요`에 포함하지 않고, 최근 근무표 row의 상태 chip으로만 표시한다.

[최근 근무표]
- 최근 1건
- 상태, 생성일, 점수 요약
- 보기
- 전체 목록 보기
```

디자인 위계는 3개 블록을 같은 카드 3개로 병렬 배치하는 방식이 아니다.

```text
┌──────────────────────────────────────────────────────────────┐
│ 근무표 관리                                                    │
├──────────────────────────────────────────────────────────────┤
│ 오늘의 다음 작업                                                │
│ [가장 중요한 상태 문장]                         [Primary CTA] │
│ supporting context                                             │
├──────────────────────────────────────────────────────────────┤
│ 운영 상태                                                      │
│ 운영 기준      준비 완료 / 확인 필요 / 확인 실패               │
│ 생성 중 근무표 있음 / 없음                                     │
│ 최근 완료 근무표 있음 / 없음                                   │
│ 확인 필요      있음 / 없음                                     │
├──────────────────────────────────────────────────────────────┤
│ 최근 근무표                                                    │
│ 2026-05 근무표  상태 chip  생성일  점수 요약       [보기]      │
│                                             [전체 목록 보기]   │
└──────────────────────────────────────────────────────────────┘
```

- `오늘의 다음 작업`은 가장 강한 surface다. 이 화면의 목적은 다음 행동을 3초 안에 알리는 것이다.
- `운영 상태`는 카드 grid가 아니라 scan 가능한 상태 row list다.
- `최근 근무표`는 schedule entity 1건만 보여준다. 전체 목록은 이 화면에 재구현하지 않는다.
- section heading은 `text-xl`, page title은 `text-2xl`, body/helper는 `text-sm`을 사용한다.
- accent color는 primary CTA와 핵심 status에만 사용한다.

기존 준비 미완료 화면은 유지하되, 역할을 명확히 한다.

- `dashboard-onboarding-only`는 운영 기준 준비 미완료 상태 전용으로 유지한다.
- `organization_profile`, `schedule_foundation`, `employee_roster` 상세 항목은 이 상태에서만 노출한다.
- 준비 완료 후에는 기존 `dashboard-basic-info-section`의 3개 상세 항목과 `확인하기` 버튼을 제거한다.

### 3.2 CTA 결정 로직 추가

대시보드 내부에 `primaryDashboardAction` 계산값을 만든다.

필수 필드:

```ts
type DashboardPrimaryActionKey =
  | 'retry_readiness'
  | 'open_readiness_item'
  | 'retry_schedule_list'
  | 'open_running_schedule'
  | 'create_schedule'
  | 'open_recent_schedule'
  | 'open_schedule_results';

interface DashboardPrimaryAction {
  key: DashboardPrimaryActionKey;
  label: string;
  title: string;
  description: string;
  readinessKey?: DashboardReadinessKey;
  schedule?: ScheduleSummary;
  disabled?: boolean;
}
```

`primaryDashboardAction`은 실행 함수가 아니라 **action descriptor**다. 실제 클릭 처리는 `handlePrimaryDashboardAction(action)`의 `switch(action.key)`에서 한다. 이유는 unit test가 action key와 route side effect를 분리해 검증할 수 있고, template 안에 anonymous async closure를 쌓지 않아도 되기 때문이다.

우선순위:

1. 운영 기준 확인 실패면 `다시 확인`
2. 운영 기준 미완료면 현재 막힌 readiness 항목으로 이동
3. 근무표 목록 확인 실패면 `다시 불러오기`
4. `running` 상태 근무표가 있으면 해당 근무표 Step5로 이동
5. 생성 가능한 계획월이 있고 `canManageSchedules`가 true면 월 선택 모달 열기
6. 최근 `complete` 또는 `changed` 근무표가 있으면 해당 근무표 Step5로 이동
7. 그 외에는 `/app/schedule-results`로 이동

`생성 가능한 계획월`은 새 규칙을 만들지 않고 기존 `getDefaultSchedulableMonth(existingScheduleMonthSet) !== null`로 판단한다. 이 값이 `null`이면 create action 후보가 아니며, 사용자가 직접 생성 버튼을 누른 경우에만 기존 warning copy를 보여준다.

### 3.3 최근 근무표 1건 계산

`schedules` 배열에서 최근 1건만 계산한다.

- API 응답 순서에 의존하지 않는다.
- `updated_at`이 유효한 날짜면 우선 사용하고, 없거나 invalid이면 `created_at`을 사용한다.
- 동일 timestamp는 `month` desc, `id` asc로 tie-break한다. 테스트 snapshot이 흔들리지 않게 결정적 정렬이어야 한다.
- `running` 근무표는 생성 중 상태 판단에 사용하며, 여러 건이면 같은 최신 정렬 규칙을 따른다.
- `complete`, `changed`는 최근 결과 CTA 후보로 사용하며, `running`과 별도로 계산한다.
- `error` 상태는 최근 근무표 영역에 표시한다. 해당 월의 `보기` 버튼을 누르면 Step5가 아니라 해당 schedule context를 채운 뒤 Step4로 이동한다.
- `error` 상태는 primary CTA 후보가 아니다. primary CTA 우선순위에서는 생성/조회보다 낮게 둔다.
- 원본 `schedules` 배열을 in-place sort하지 않는다. computed 내부에서 `slice()` 또는 spread로 복사한 뒤 정렬한다.

### 3.4 삭제/수정 기능 제거

대시보드에서 다음을 제거한다.

- 전체 `schedule-card` 반복 목록
- `수정` 버튼
- `삭제` 버튼
- `handleEdit`
- `handleDelete`
- `deletePhase2ScheduleMonth` import
- 삭제 오류 메시지 helper
- 전체 카드 목록 표시를 위해 쓰던 `NCard` import
- 삭제 성공 message를 위해서만 쓰던 `showSuccess` import
- 조회 불가 상태에서 쓰던 직접 `window.$message` 호출

최근 근무표의 `보기`는 기존 `handleViewSchedule` 또는 그 흐름을 유지한다.

- `created`, `running`, `complete`, `changed`: Step5 canonical route로 이동한다.
- `error`: 해당 schedule의 `id`, `public_id`, `month`, organization context를 `scheduleStore.basicInfo`에 채운 뒤 Step4로 이동한다.

`error` schedule은 조회 불가 toast로 막지 않는다. template 또는 method에서 `window.$message`를 직접 호출하지 않는다.

### 3.5 라우팅

`Dashboard.vue`는 route helper를 직접 사용한다.

- 최근 근무표 보기: `created`, `running`, `complete`, `changed`는 기존 `buildCanonicalStep5RouteLocation`
- 최근 `error` 근무표 보기: `getScheduleStepRoutePath(4)`
- 전체 목록 보기: `getScheduleResultsRoutePath()`
- 새 근무표 생성: 기존 `handleCreateNew`
- 운영 기준 이동: 기존 `getReadinessRoute`

raw path string을 새로 추가하지 않는다.

### 3.6 Interaction State Coverage

구현자는 boolean branch만 만들지 말고, 사용자가 실제로 보는 상태를 아래처럼 고정한다.

| Feature          | Loading                                                           | Empty                                                  | Error                                                                   | Success                               | Partial                                                                                                                           |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Readiness gate   | `dashboard-ops-readiness-loading`만 표시하고 schedule action 숨김 | 해당 없음                                              | `다시 확인` primary CTA가 있는 retryable state                          | incomplete 또는 complete state로 분기 | 필수 key 누락은 ready가 아니라 unavailable                                                                                        |
| 오늘의 다음 작업 | readiness loading 전에는 렌더링하지 않음                          | 할 일이 없으면 `근무표 조회로 이동` CTA                | readiness 확인 실패면 `다시 확인`, schedule list 실패면 `다시 불러오기` | 클릭 후 modal/route 이동              | running schedule이 있으면 생성 CTA보다 상태 확인 우선                                                                             |
| 운영 상태        | readiness loading 전에는 렌더링하지 않음                          | schedule 없음은 `없음` row로 표현                      | readiness 실패 또는 schedule list 실패는 `확인 필요` row로 표현         | 준비 완료/없음/있음 chip text로 표현  | 일부 데이터 실패 시 빈 상태로 오해하지 않게 `확인 필요` 표시. 단, `error` 근무표 존재는 데이터 신뢰 실패가 아니므로 포함하지 않음 |
| 최근 근무표      | schedule list loading은 section-local spinner                     | 생성된 근무표 없음 + 새 근무표 생성 CTA 또는 조회 안내 | 목록 로드 실패 + retry action                                           | 최근 1건 표시                         | `error` schedule은 표시 가능하고 `보기`는 Step4로 이동하지만 primary action 후보는 아님                                           |
| 월 선택 modal    | modal positive button loading                                     | 선택 가능한 월 없음 warning                            | 중복/검증 실패 message 유지                                             | Step1 route 이동                      | 이미 생성된 월은 disabled                                                                                                         |

권장 user-facing copy:

| State                     | Title                                | Description                                                                       | CTA                |
| ------------------------- | ------------------------------------ | --------------------------------------------------------------------------------- | ------------------ |
| Readiness unavailable     | 운영 준비 상태를 확인하지 못했습니다 | 필수 정보가 준비되었는지 확인할 수 없어 다음 작업을 잠시 멈췄습니다.              | 다시 확인          |
| Incomplete readiness      | 운영 기준 확인이 필요합니다          | 근무표 생성을 시작하려면 먼저 막힌 기준 항목을 완료해야 합니다.                   | 현재 항목 확인하기 |
| Schedule list unavailable | 근무표 목록을 확인하지 못했습니다    | 생성 중인 근무표나 이미 만든 계획월을 확인할 수 없어 목록을 다시 불러와야 합니다. | 다시 불러오기      |
| Running schedule          | 생성 중인 근무표가 있습니다          | 생성 상태를 확인하고 이어서 검토할 수 있습니다.                                   | 생성 상태 확인하기 |
| Creatable month           | 새 근무표를 만들 수 있습니다         | 아직 생성하지 않은 다음 계획월을 선택해 생성 흐름을 시작합니다.                   | 새 근무표 생성하기 |
| Recent result             | 최근 완료된 근무표가 있습니다        | 마지막으로 작업한 근무표를 바로 확인할 수 있습니다.                               | 최근 근무표 보기   |
| No immediate work         | 지금 바로 처리할 작업은 없습니다     | 생성된 근무표 목록에서 이전 결과를 확인할 수 있습니다.                            | 근무표 조회로 이동 |

### 3.7 User Journey & Emotional Arc

| Step | User Does                        | User Should Feel                        | Plan Specifies                             |
| ---- | -------------------------------- | --------------------------------------- | ------------------------------------------ |
| 1    | 로그인 후 `/app` 진입            | 지금 무엇을 눌러야 하는지 바로 안다     | `오늘의 다음 작업`이 first visual anchor   |
| 2    | readiness가 막힌 상태를 본다     | 생성 전 준비가 왜 막혔는지 이해한다     | 막힌 항목만 primary CTA로 노출             |
| 3    | 준비 완료 후 대시보드로 돌아온다 | 메뉴 모음이 아니라 운영 브리핑을 본다   | 운영 상태 row와 최근 1건만 표시            |
| 4    | 생성 중인 근무표를 확인한다      | 아직 진행 중인 작업을 잃어버리지 않는다 | running schedule이 생성 CTA보다 우선       |
| 5    | 최근 결과를 다시 연다            | 전체 목록을 뒤지지 않고 바로 이어간다   | 최근 1건 + 전체 목록 보기                  |
| 6    | 반복 사용한다                    | 매달 같은 순서로 빠르게 판단한다        | 준비 -> 생성 -> 조회 흐름을 top nav와 맞춤 |

Time-horizon:

- 5초: `오늘의 다음 작업` CTA만 보고도 다음 행동을 안다.
- 5분: 운영 상태와 최근 근무표를 훑고 현재 월 업무 맥락을 회복한다.
- 장기 사용: 대시보드가 메뉴 중복 없이 월간 운영 브리핑 역할만 한다.

### 3.8 Visual System Alignment

`DESIGN.md`를 따른다.

- Surface: `--color-surface-primary`, `--color-surface-secondary`, subtle border 우선
- Accent: `--color-accent-primary`는 primary CTA, active/important status에만 사용
- Status: success/warning/error/info semantic token을 사용하고 color alone으로 의미 전달하지 않는다
- Radius: panel은 `radius-md` 또는 `radius-lg`, button/chip은 `radius-sm` 또는 pill
- Shadow: 기본은 border 중심, elevation이 필요한 경우에만 `shadow-soft`
- Typography: page title `text-2xl`, section title `text-xl`, row label/body `text-sm`
- Mono: `created_at`, score, schedule id처럼 inspectable data에만 사용 가능
- 금지: purple/blue gradient, icon-in-circle decoration, emoji-first empty state, decorative blobs, card-inside-card

### 3.9 AI Slop Risk Assessment

이 화면은 **APP UI**이므로 generic dashboard mosaic으로 보이면 실패다.

Hard rejection 방지:

- 3개 section을 같은 높이의 decorative cards로 만들지 않는다.
- `운영 상태`에 colored icon circle 4개를 쓰지 않는다.
- `오늘의 다음 작업`을 hero처럼 과장하지 않는다.
- 빈 상태에 emoji나 marketing copy를 넣지 않는다.
- Dashboard 전체를 하나의 큰 `NCard`로 감싸고 그 안에 또 card를 반복하지 않는다.

Litmus:

| Check                                           | Result                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| Brand/product unmistakable in first screen?     | YES, app shell의 EveryShift + `근무표 관리`                            |
| One strong visual anchor?                       | YES, `오늘의 다음 작업`                                                |
| Page understandable by scanning headlines only? | YES, `오늘의 다음 작업`, `운영 상태`, `최근 근무표`                    |
| Each section has one job?                       | YES                                                                    |
| Cards actually necessary?                       | PARTIAL, 최근 근무표 entity와 primary action surface만 필요            |
| Motion improves hierarchy?                      | NOT REQUIRED, app UI에서는 hover/focus/section state transition만 사용 |
| Premium without decorative shadows?             | YES, typography/order/border로 위계 형성                               |

### 3.10 Responsive & Accessibility Contract

MVP는 desktop-first이지만 narrow desktop/tablet에서 깨지면 안 된다.

Responsive:

- Desktop: 3개 section은 vertical stack을 유지한다. 대시보드 폭은 기존 app content max width 안에서 안정적으로 읽히게 한다.
- Narrow desktop/tablet: `오늘의 다음 작업`은 text와 CTA가 wrap 가능해야 하며, CTA가 heading과 분리되어 보이지 않게 같은 section 안에 둔다.
- Mobile: broad mobile support는 scope 밖이지만 text overlap, clipped CTA, unreachable action은 허용하지 않는다.
- `운영 상태` row는 2열 grid가 좁아지면 단일 column row list로 바뀐다.
- `최근 근무표`는 row layout이 좁아지면 schedule summary와 buttons를 세로로 쌓는다.

Accessibility:

- Primary CTA는 실제 `<button>` 또는 router link이며 minimum hit target은 44px다.
- Status chip은 `준비 완료`, `확인 필요`, `확인 실패`, `있음`, `없음` 같은 text를 반드시 포함한다.
- Color만으로 상태를 전달하지 않는다.
- 모든 button/link는 visible focus ring을 유지한다.
- `오늘의 다음 작업` section은 heading과 CTA 관계가 screen reader에서 자연스럽게 읽혀야 한다.
- `다시 확인`, `새 근무표 생성하기`, `최근 근무표 보기`, `전체 목록 보기`는 서로 구분되는 accessible name을 가진다.
- Loading state는 page 전체를 blank로 만들지 않고 section-local 안내를 유지한다.

### 3.11 NOT in Scope

- 전체 schedule workflow mobile redesign: Step 3/Step 5는 `DESIGN.md`상 desktop-first surface다.
- Dashboard analytics/KPI widgets: 이번 화면은 운영 브리핑이지 분석 대시보드가 아니다.
- 월별 calendar형 조회 UI: `근무표 조회` 전용 화면의 책임이다.
- Organizations, employees, shifts CRUD: MVP seed/setup flow 범위 밖이다.
- Real AI solver integration: 현재 solver integration은 mock 유지다.
- 새로운 design system 또는 token family: `DESIGN.md`가 이미 source of truth다.
- Dashboard 안의 근무표 수정/삭제: 전용 조회/결과 화면으로 책임을 이동한다.

### 3.12 Unresolved Design Decisions

없음. 구현자는 아래 기본값을 따른다.

| Decision                           | Default                                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| CTA failure vs incomplete priority | readiness 확인 실패를 먼저 처리하고, 응답 성공 후에만 incomplete item을 판단한다                |
| Complete dashboard layout          | vertical stack, equal-card mosaic 금지                                                          |
| 최근 근무표 표시                   | 1건만 표시, 전체 목록은 `/app/schedule-results`                                                 |
| `error` schedule                   | 최근 근무표에는 표시 가능, primary CTA 후보에서는 제외                                          |
| 운영 상태 `확인 필요`              | readiness/schedule list load failure 같은 데이터 신뢰 실패만 포함, `error` schedule 존재는 제외 |
| Mobile support                     | full support는 제외, overlap/clipping 방지만 필수                                               |

### 3.13 TODO.md 업데이트

추가 TODO 없음.

이 계획 안에서 dashboard-specific empty/error/responsive/accessibility 결정을 모두 보강했기 때문에 별도 `TODOS.md` 항목으로 미루지 않는다. 구현 후 screenshot 기반 visual QA가 필요하면 `/design-review` 단계에서 처리한다.

### 3.14 Engineering Architecture Contract

새 data source를 만들지 않는다. Dashboard는 기존 readiness API와 schedule summary API를 읽고, 화면에 필요한 파생 상태만 계산한다.

```text
/app Dashboard mount or selected organization changes
   │
   ├── reloadDashboardData(loadToken)
   │      │
   │      ├── orgStore.loadOrganization()
   │      ├── orgStore.loadFoundationData(orgId)
   │      ├── loadChecklist(orgId)
   │      │      ├── success -> checklist
   │      │      └── failure -> opsReadinessLoadFailed
   │      │
   │      ├── if readiness unavailable/incomplete -> stop before schedules
   │      │
   │      └── loadSchedules(orgId)
   │             ├── success -> schedules
   │             └── failure -> scheduleListLoadFailed
   │
   └── computed presentation state
          ├── isDashboardReadinessUnavailable
          ├── isDashboardReady
          ├── latestDisplaySchedule
          ├── runningSchedule
          ├── recentActionableSchedule
          ├── operationalStatusRows
          └── primaryDashboardAction
```

Stale response guard:

- `reloadDashboardData`는 `dashboardLoadRunId` 같은 monotonically increasing token을 사용한다.
- `loadChecklist`와 `loadSchedules`는 response를 state에 쓰기 전에 현재 token과 org id가 여전히 맞는지 확인한다.
- 이전 org의 느린 응답이 나중에 도착해도 새 org의 dashboard state를 덮어쓰면 안 된다.

Search check:

- [Layer 1] Vue `computed`와 Vue Router helper를 사용한다. 새 state machine library, event bus, dashboard store는 도입하지 않는다.
- [Layer 1] Naive UI discrete API는 이미 `src/utils/message.ts`로 감싸져 있다. Dashboard는 직접 `window.$message`를 호출하지 않는다.
- [Layer 3] 이 화면은 통계 dashboard가 아니라 운영 브리핑이다. 그러므로 caching, analytics widgets, background polling보다 deterministic local derivation이 더 단순하고 안전하다.

### 3.15 Derived State Contract

`Dashboard.vue` 내부 파생 상태는 아래 이름과 책임으로 분리한다. 구현자가 이름을 조금 바꿔도 되지만 책임은 섞지 않는다.

```text
schedules
   │
   ├── sortedSchedulesByRecency
   │      └── updated_at valid desc -> created_at valid desc -> month desc -> id asc
   │
   ├── latestDisplaySchedule
   │      └── 최근 근무표 section에 표시할 1건, status 제한 없음
   │
   ├── runningSchedule
   │      └── primary CTA 후보, status === running 최신 1건
   │
   ├── recentActionableSchedule
   │      └── primary CTA 후보, status in complete/changed 최신 1건
   │
   └── existingScheduleMonthSet
          └── 월 선택 modal disabled 계산에 사용
```

`scheduleListLoadFailed=true`이면 `runningSchedule`, `recentActionableSchedule`, `existingScheduleMonthSet`를 신뢰할 수 없다. 이 상태에서는 primary CTA가 `retry_schedule_list`를 반환해야 한다.

### 3.16 Code Quality Contract

- `Schedule` local interface를 새로 복제하지 않는다. 기존 `ScheduleSummary` 타입을 재사용한다.
- `primaryDashboardAction`은 pure computed descriptor로 두고, side effect는 `handlePrimaryDashboardAction`에 모은다.
- `handleViewSchedule`은 `created/running/complete/changed`를 같은 Step5 canonical route 흐름으로 보낸다. `error`는 schedule context를 채운 뒤 Step4로 보낸다. 중복 try/catch branch를 만들지 않는다.
- `getStatusText`, `getStatusType`, `formatDate`가 최근 1건 UI에서도 필요하면 유지한다. 필요 없으면 제거한다.
- `deletePhase2ScheduleMonth`, `handleDelete`, `handleEdit`, deletion helper tests는 dashboard scope에서 제거한다.
- 직접 `window.$message`와 `window.$dialog` 접근을 남기지 않는다. 메시지는 `src/utils/message.ts` helper를 사용한다.
- CSS는 Tailwind utility 중심으로 유지한다. Dashboard 전용 복잡한 scoped CSS를 새로 만들지 않는다.
- Data-test 이름은 새 역할을 반영한다: `dashboard-next-action`, `dashboard-primary-action`, `dashboard-operational-status`, `dashboard-recent-schedule`, `dashboard-schedule-list-retry`.

### 3.17 Production Failure Modes

| Codepath                       | Realistic failure                                               | Handling required                      | Test required                    | User-visible result                   |
| ------------------------------ | --------------------------------------------------------------- | -------------------------------------- | -------------------------------- | ------------------------------------- |
| `reloadDashboardData`          | org 변경 중 이전 응답이 늦게 도착                               | load token으로 stale write 차단        | unit                             | 새 org state만 보인다                 |
| `loadChecklist`                | checklist API 500 또는 필수 key 누락                            | readiness unavailable                  | unit + E2E existing failure flow | `다시 확인`                           |
| `loadSchedules`                | schedule list API 500                                           | schedule list unavailable              | unit                             | `다시 불러오기`, 생성 CTA 숨김/후순위 |
| `primaryDashboardAction`       | running schedule과 creatable month가 동시에 존재                | running 우선                           | unit                             | `생성 상태 확인하기`                  |
| `primaryDashboardAction`       | `getDefaultSchedulableMonth(existingScheduleMonthSet) === null` | create action 제외                     | unit                             | 최근 결과 또는 조회 CTA               |
| `primaryDashboardAction`       | `canManageSchedules=false`인데 creatable month 존재             | create action 제외                     | unit                             | 최근 결과 또는 조회 CTA               |
| `recent schedule sorting`      | API가 오래된 순서로 응답                                        | local deterministic sort               | unit                             | 최신 1건만 표시                       |
| `operationalStatusRows`        | `error` schedule 존재                                           | `확인 필요` row에 포함하지 않음        | unit                             | 최근 근무표 상태 chip에만 오류 표시   |
| `handleViewSchedule`           | Step5 compare 실패                                              | error message + route push 없음        | existing unit 유지               | clear error toast                     |
| `handleViewSchedule`           | 최신 schedule이 `error` 상태                                    | schedule context를 채우고 Step4로 이동 | unit                             | 해당 월 Step4에서 재작업 가능         |
| `handlePrimaryDashboardAction` | router push reject                                              | catch + error message                  | unit                             | 화면 유지 + retry 가능                |
| `handleMonthConfirm`           | duplicate month detected after modal open                       | existing duplicate validation 유지     | existing unit 유지               | modal stays open                      |
| narrow layout                  | CTA/button text wraps                                           | responsive classes, no clipping        | E2E viewport                     | 클릭 가능한 CTA 유지                  |

Critical gap count after this addendum: **0**. The only critical candidate was schedule-list failure offering create; it is now covered by action priority, copy, and tests.

## 4. `writing-plans` 실행 태스크

각 task는 독립적으로 review 가능한 단위다. 구현자는 task 하나가 끝날 때마다 해당 파일만 stage하고 commit한다. 이미 존재하는 unrelated local change는 stage하지 않는다.

### Task 1: Dashboard role regression tests

**Files:**

- Modify: `tests/unit/dashboard.spec.ts`
- Read: `src/views/Dashboard.vue`

- [ ] **Step 1: Write failing tests for the new ready-state layout**

Add or update tests that assert the ready dashboard renders only the operational briefing surfaces.

```ts
it('renders the operational briefing instead of legacy dashboard sections when ready', async () => {
  getChecklistMock.mockResolvedValue(createReadyChecklist());
  getScheduleListMock.mockResolvedValue([
    createScheduleSummary({ id: 'schedule-1', month: '2026-05', status: 'complete' }),
  ]);

  const wrapper = createWrapper();
  await flushPromises();

  expect(wrapper.find('[data-test="dashboard-next-action"]').exists()).toBe(true);
  expect(wrapper.find('[data-test="dashboard-operational-status"]').exists()).toBe(true);
  expect(wrapper.find('[data-test="dashboard-recent-schedule"]').exists()).toBe(true);
  expect(wrapper.find('[data-test="dashboard-basic-info-section"]').exists()).toBe(false);
  expect(wrapper.find('[data-test="dashboard-create-section"]').exists()).toBe(false);
  expect(wrapper.findAll('[data-test="schedule-card"]')).toHaveLength(0);
  expect(wrapper.text()).not.toContain('수정');
  expect(wrapper.text()).not.toContain('삭제');
});
```

- [ ] **Step 2: Run the test and verify it fails for the expected reason**

Run:

```bash
pnpm test:unit tests/unit/dashboard.spec.ts
```

Expected: FAIL because `dashboard-next-action`, `dashboard-operational-status`, and `dashboard-recent-schedule` do not exist yet, or because legacy sections still render.

- [ ] **Step 3: Add failing tests for primary navigation affordances**

Cover `전체 목록 보기` and the accessible distinction between primary CTA and list navigation.

```ts
it('routes to schedule results from the full-list action', async () => {
  getChecklistMock.mockResolvedValue(createReadyChecklist());
  getScheduleListMock.mockResolvedValue([
    createScheduleSummary({ id: 'schedule-1', month: '2026-05', status: 'complete' }),
  ]);

  const wrapper = createWrapper();
  await flushPromises();

  await wrapper.find('[data-test="dashboard-view-all-schedules"]').trigger('click');

  expect(pushMock).toHaveBeenCalledWith('/app/schedule-results');
  expect(wrapper.find('[data-test="dashboard-primary-action"]').text()).not.toBe(
    wrapper.find('[data-test="dashboard-view-all-schedules"]').text()
  );
});
```

- [ ] **Step 4: Do not implement yet**

This task intentionally stops with red tests. Task 3 implements the template and action handler.

- [ ] **Step 5: Commit the red-test checkpoint**

```bash
git add tests/unit/dashboard.spec.ts
git commit -m "test: lock dashboard briefing layout expectations"
```

### Task 2: Derived state and failure-priority tests

**Files:**

- Modify: `tests/unit/dashboard.spec.ts`
- Read: `src/api/schedule.ts`
- Read: `src/utils/date.ts`

- [ ] **Step 1: Add test fixtures that use `ScheduleSummary` shape**

Ensure test data matches the API summary type and includes `updated_at`.

```ts
function createScheduleSummary(overrides: Partial<ScheduleSummary> = {}): ScheduleSummary {
  return {
    id: 'schedule-1',
    public_id: 'public-schedule-1',
    organization_id: 'org-1',
    month: '2026-05',
    status: 'complete',
    hard_score: 0,
    soft_score: 0,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-02T00:00:00.000Z',
    ...overrides,
  };
}
```

- [ ] **Step 2: Write failing tests for CTA priority**

Use separate tests for each priority edge, not one large table that hides failure cause.

```ts
it('prioritizes schedule-list retry over creating a new schedule', async () => {
  getChecklistMock.mockResolvedValue(createReadyChecklist());
  getScheduleListMock.mockRejectedValue(new Error('schedule list failed'));

  const wrapper = createWrapper();
  await flushPromises();

  const primaryAction = wrapper.find('[data-test="dashboard-primary-action"]');
  expect(primaryAction.text()).toContain('다시 불러오기');
  expect(primaryAction.text()).not.toContain('새 근무표 생성');
});

it('prioritizes a running schedule over a creatable month', async () => {
  getChecklistMock.mockResolvedValue(createReadyChecklist());
  getScheduleListMock.mockResolvedValue([
    createScheduleSummary({ id: 'running-1', month: '2026-05', status: 'running' }),
  ]);

  const wrapper = createWrapper();
  await flushPromises();

  expect(wrapper.find('[data-test="dashboard-primary-action"]').text()).toContain(
    '생성 상태 확인하기'
  );
});
```

- [ ] **Step 3: Write failing tests for recent schedule sorting**

Lock deterministic order and non-mutating behavior.

```ts
it('shows one recent schedule sorted by updated_at, created_at, month, then id', async () => {
  const oldFirstApiResponse = [
    createScheduleSummary({
      id: 'b-schedule',
      month: '2026-04',
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: 'not-a-date',
    }),
    createScheduleSummary({
      id: 'a-schedule',
      month: '2026-06',
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: 'not-a-date',
    }),
  ];
  getChecklistMock.mockResolvedValue(createReadyChecklist());
  getScheduleListMock.mockResolvedValue(oldFirstApiResponse);

  const wrapper = createWrapper();
  await flushPromises();

  expect(wrapper.find('[data-test="dashboard-recent-schedule"]').text()).toContain('2026-06');
  expect(wrapper.findAll('[data-test="dashboard-recent-schedule"]')).toHaveLength(1);
  expect(oldFirstApiResponse.map((schedule) => schedule.id)).toEqual(['b-schedule', 'a-schedule']);
});
```

- [ ] **Step 4: Write failing tests for stale response guard**

Use two deferred promises so the older org resolves after the newer org.

```ts
it('ignores stale schedule responses after the selected organization changes', async () => {
  const firstSchedules = createDeferred<ScheduleSummary[]>();
  const secondSchedules = createDeferred<ScheduleSummary[]>();
  getChecklistMock.mockResolvedValue(createReadyChecklist());
  getScheduleListMock
    .mockReturnValueOnce(firstSchedules.promise)
    .mockReturnValueOnce(secondSchedules.promise);

  const wrapper = createWrapper();
  await flushPromises();

  rbacStoreMock.selectedOrganizationId = 'org-2';
  organizationStoreMock.current = { ...organizationStoreMock.current, id: 'org-2' };
  await nextTick();

  secondSchedules.resolve([createScheduleSummary({ id: 'new-org-schedule', month: '2026-07' })]);
  await flushPromises();

  firstSchedules.resolve([createScheduleSummary({ id: 'old-org-schedule', month: '2026-01' })]);
  await flushPromises();

  expect(wrapper.text()).toContain('2026-07');
  expect(wrapper.text()).not.toContain('2026-01');
});
```

- [ ] **Step 5: Run tests and verify they fail before implementation**

Run:

```bash
pnpm test:unit tests/unit/dashboard.spec.ts
```

Expected: FAIL on missing operational CTA/sorting/stale guard behavior.

- [ ] **Step 6: Commit the red-test checkpoint**

```bash
git add tests/unit/dashboard.spec.ts
git commit -m "test: cover dashboard action priority and recency"
```

### Task 3: Dashboard derived state implementation

**Files:**

- Modify: `src/views/Dashboard.vue`
- Modify: `tests/unit/dashboard.spec.ts`

- [ ] **Step 1: Replace the local schedule interface**

Remove `interface Schedule` from `Dashboard.vue` and import the existing API type.

```ts
import { getPhase2ScheduleCompare, getScheduleList, type ScheduleSummary } from '@/api/schedule';

const schedules = ref<ScheduleSummary[]>([]);
```

- [ ] **Step 2: Add deterministic recency helpers**

Keep this local to `Dashboard.vue`; do not create a shared utility until another screen needs it.

```ts
function getScheduleSortTime(schedule: ScheduleSummary) {
  const updatedTime = dayjs(schedule.updated_at);
  if (updatedTime.isValid()) {
    return updatedTime.valueOf();
  }

  const createdTime = dayjs(schedule.created_at);
  return createdTime.isValid() ? createdTime.valueOf() : 0;
}

const sortedSchedulesByRecency = computed(() => {
  return [...schedules.value].sort((left, right) => {
    const timeDiff = getScheduleSortTime(right) - getScheduleSortTime(left);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    const monthDiff = right.month.localeCompare(left.month);
    if (monthDiff !== 0) {
      return monthDiff;
    }

    return left.id.localeCompare(right.id);
  });
});

const latestDisplaySchedule = computed(() => sortedSchedulesByRecency.value[0] ?? null);
const runningSchedule = computed(
  () => sortedSchedulesByRecency.value.find((schedule) => schedule.status === 'running') ?? null
);
const recentActionableSchedule = computed(
  () =>
    sortedSchedulesByRecency.value.find(
      (schedule) => schedule.status === 'complete' || schedule.status === 'changed'
    ) ?? null
);
```

- [ ] **Step 3: Add the action descriptor and priority computed**

Keep side effects out of the computed.

```ts
type DashboardPrimaryActionKey =
  | 'retry_readiness'
  | 'open_readiness_item'
  | 'retry_schedule_list'
  | 'open_running_schedule'
  | 'create_schedule'
  | 'open_recent_schedule'
  | 'open_schedule_results';

interface DashboardPrimaryAction {
  key: DashboardPrimaryActionKey;
  label: string;
  title: string;
  description: string;
  readinessKey?: DashboardReadinessKey;
  schedule?: ScheduleSummary;
}

const nextSchedulableMonth = computed(() =>
  getDefaultSchedulableMonth(existingScheduleMonthSet.value)
);

const primaryDashboardAction = computed<DashboardPrimaryAction>(() => {
  if (isDashboardReadinessUnavailable.value) {
    return {
      key: 'retry_readiness',
      label: '다시 확인',
      title: '운영 준비 상태를 확인하지 못했습니다',
      description: '필수 정보가 준비되었는지 확인할 수 없어 다음 작업을 잠시 멈췄습니다.',
    };
  }

  if (!isDashboardReady.value && firstIncompleteReadinessKey.value) {
    return {
      key: 'open_readiness_item',
      label: '현재 항목 확인하기',
      title: '운영 기준 확인이 필요합니다',
      description: '근무표 생성을 시작하려면 먼저 막힌 기준 항목을 완료해야 합니다.',
      readinessKey: firstIncompleteReadinessKey.value,
    };
  }

  if (scheduleListLoadFailed.value) {
    return {
      key: 'retry_schedule_list',
      label: '다시 불러오기',
      title: '근무표 목록을 확인하지 못했습니다',
      description:
        '생성 중인 근무표나 이미 만든 계획월을 확인할 수 없어 목록을 다시 불러와야 합니다.',
    };
  }

  if (runningSchedule.value) {
    return {
      key: 'open_running_schedule',
      label: '생성 상태 확인하기',
      title: '생성 중인 근무표가 있습니다',
      description: '생성 상태를 확인하고 이어서 검토할 수 있습니다.',
      schedule: runningSchedule.value,
    };
  }

  if (canManageSchedules.value && nextSchedulableMonth.value !== null) {
    return {
      key: 'create_schedule',
      label: '새 근무표 생성하기',
      title: '새 근무표를 만들 수 있습니다',
      description: '아직 생성하지 않은 다음 계획월을 선택해 생성 흐름을 시작합니다.',
    };
  }

  if (recentActionableSchedule.value) {
    return {
      key: 'open_recent_schedule',
      label: '최근 근무표 보기',
      title: '최근 완료된 근무표가 있습니다',
      description: '마지막으로 작업한 근무표를 바로 확인할 수 있습니다.',
      schedule: recentActionableSchedule.value,
    };
  }

  return {
    key: 'open_schedule_results',
    label: '근무표 조회로 이동',
    title: '지금 바로 처리할 작업은 없습니다',
    description: '생성된 근무표 목록에서 이전 결과를 확인할 수 있습니다.',
  };
});
```

- [ ] **Step 4: Add stale response guard**

Use a monotonically increasing token and compare both token and organization id before writing async results.

```ts
const dashboardLoadRunId = ref(0);

async function reloadDashboardData() {
  const runId = dashboardLoadRunId.value + 1;
  dashboardLoadRunId.value = runId;

  // existing reset and org load logic

  const organizationId = orgStore.current?.id ?? null;
  const loadedChecklist = await loadChecklist(runId, organizationId);
  if (runId !== dashboardLoadRunId.value || organizationId !== orgStore.current?.id) {
    return;
  }

  if (!loadedChecklist || !hasRequiredReadinessItems.value || !isDashboardReady.value) {
    schedules.value = [];
    return;
  }

  await loadSchedules(runId, organizationId);
}
```

- [ ] **Step 5: Run unit tests**

Run:

```bash
pnpm test:unit tests/unit/dashboard.spec.ts
```

Expected: previously added derived-state tests PASS or fail only on missing template selectors that Task 4 will add.

- [ ] **Step 6: Commit**

```bash
git add src/views/Dashboard.vue tests/unit/dashboard.spec.ts
git commit -m "feat: add dashboard briefing state model"
```

### Task 4: Dashboard template replacement and action handling

**Files:**

- Modify: `src/views/Dashboard.vue`
- Modify: `tests/unit/dashboard.spec.ts`

- [ ] **Step 1: Replace the ready-state template**

Remove the ready-state `dashboard-basic-info-section`, `dashboard-create-section`, full schedule list, edit button, and delete button. Add only these ready-state surfaces:

```text
dashboard-next-action
dashboard-primary-action
dashboard-operational-status
dashboard-recent-schedule
dashboard-view-recent-schedule
dashboard-view-all-schedules
dashboard-schedule-list-retry
```

- [ ] **Step 2: Add operational status rows**

Rows must be text-readable without relying on color.

```ts
const operationalStatusRows = computed(() => [
  {
    key: 'readiness',
    label: '운영 기준',
    value: isDashboardReadinessUnavailable.value
      ? '확인 실패'
      : isDashboardReady.value
        ? '준비 완료'
        : '확인 필요',
  },
  {
    key: 'running_schedule',
    label: '생성 중 근무표',
    value: runningSchedule.value ? '있음' : '없음',
  },
  {
    key: 'recent_schedule',
    label: '최근 완료 근무표',
    value: recentActionableSchedule.value ? '있음' : '없음',
  },
  {
    key: 'data_attention',
    label: '확인 필요',
    value: isDashboardReadinessUnavailable.value || scheduleListLoadFailed.value ? '있음' : '없음',
  },
]);
```

- [ ] **Step 3: Implement primary action handler**

Side effects stay in the handler.

```ts
async function handlePrimaryDashboardAction(action: DashboardPrimaryAction) {
  try {
    switch (action.key) {
      case 'retry_readiness':
        await reloadDashboardData();
        return;
      case 'open_readiness_item':
        if (action.readinessKey) {
          handleOpenReadinessItem(action.readinessKey);
        }
        return;
      case 'retry_schedule_list':
        await loadSchedules();
        return;
      case 'open_running_schedule':
      case 'open_recent_schedule':
        if (action.schedule) {
          await handleViewSchedule(action.schedule);
        }
        return;
      case 'create_schedule':
        handleCreateNew();
        return;
      case 'open_schedule_results':
        await router.push(getScheduleResultsRoutePath());
        return;
    }
  } catch {
    showError('요청한 화면으로 이동하지 못했습니다. 다시 시도해주세요.');
  }
}
```

- [ ] **Step 4: Update recent schedule `error` behavior**

`error` schedule 보기 should route to Step4 after setting schedule context.

```ts
if (schedule.status === 'error') {
  scheduleStore.setBasicInfo({
    ...buildChecklistBasicInfo(schedule.month, schedule.id, schedule.public_id ?? undefined),
  });
  await router.push(getScheduleStepRoutePath(4));
  return;
}
```

- [ ] **Step 5: Remove imports and tests tied only to deletion/editing**

Remove `deletePhase2ScheduleMonth`, `showSuccess`, delete dialog mock, `handleEdit`, `handleDelete`, and related expectations. Keep Step5 compare failure tests.

- [ ] **Step 6: Run unit tests**

Run:

```bash
pnpm test:unit tests/unit/dashboard.spec.ts
```

Expected: PASS for `tests/unit/dashboard.spec.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/views/Dashboard.vue tests/unit/dashboard.spec.ts
git commit -m "feat: replace dashboard with operational briefing"
```

### Task 5: E2E helper migration

**Files:**

- Modify: `tests/e2e/helpers.ts`
- Modify as needed: `tests/e2e/schedule-workflow.spec.ts`
- Read: `src/views/schedule/ScheduleResults.vue`

- [ ] **Step 1: Write or update helper expectations first**

Dashboard helpers should use operational briefing selectors, not deleted schedule cards.

```ts
export async function startNewScheduleFromDashboard(page: Page) {
  await page
    .getByTestId('dashboard-primary-action')
    .filter({ hasText: '새 근무표 생성하기' })
    .click();
}

export async function openExistingScheduleFromDashboard(page: Page) {
  await page.getByTestId('dashboard-recent-schedule').getByRole('button', { name: '보기' }).click();
}
```

- [ ] **Step 2: Move full-list assumptions to schedule results route**

Any test that needs multiple schedules must first navigate through `dashboard-view-all-schedules` or directly to `/app/schedule-results`, then use `ScheduleResults.vue` selectors.

- [ ] **Step 3: Run affected E2E specs**

Run:

```bash
pnpm test:e2e tests/e2e/schedule-workflow.spec.ts
```

Expected: PASS, or fail only on pre-existing environment/auth setup that is documented in the test output.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/helpers.ts tests/e2e/schedule-workflow.spec.ts
git commit -m "test: migrate dashboard e2e helpers to briefing selectors"
```

### Task 6: Final verification and visual QA handoff

**Files:**

- Modify only if verification exposes a real bug: `src/views/Dashboard.vue`, `tests/unit/dashboard.spec.ts`, `tests/e2e/helpers.ts`, `tests/e2e/schedule-workflow.spec.ts`

- [ ] **Step 1: Run lint**

Run:

```bash
pnpm lint:check
```

Expected: PASS with no ESLint errors.

- [ ] **Step 2: Run build**

Run:

```bash
pnpm run build
```

Expected: PASS with `vue-tsc` and Vite build success.

- [ ] **Step 3: Run focused unit tests again**

Run:

```bash
pnpm test:unit tests/unit/dashboard.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Run visual QA after implementation**

Use `/design-review` or the local browser QA flow to capture desktop and narrow desktop screenshots for `/app`. Verify no clipped CTA, no equal-card mosaic, and no nested-card look.

- [ ] **Step 5: Commit verification fixes if any**

Only commit if Step 1-4 required code changes.

```bash
git add src/views/Dashboard.vue tests/unit/dashboard.spec.ts tests/e2e/helpers.ts tests/e2e/schedule-workflow.spec.ts
git commit -m "fix: polish dashboard briefing verification issues"
```

## 5. 테스트 계획

Test framework: `package.json` 기준 **Vitest unit** + **Playwright E2E**.

```text
CODE PATH COVERAGE
==================
[+] src/views/Dashboard.vue
    │
    ├── reloadDashboardData()
    │   ├── [PLANNED ★★★] admin access false -> no API calls, restricted fallback
    │   ├── [PLANNED ★★★] org load failure -> readiness unavailable, schedule hidden
    │   ├── [PLANNED ★★★] checklist failure/missing required key -> retry action
    │   ├── [PLANNED ★★★] incomplete required readiness -> onboarding-only
    │   ├── [PLANNED ★★★] ready + schedule load success -> briefing sections
    │   ├── [PLANNED ★★★] ready + schedule load failure -> retry_schedule_list action
    │   └── [PLANNED ★★★] stale org response ignored after selected org changes
    │
    ├── primaryDashboardAction
    │   ├── [PLANNED ★★★] readiness failure beats everything
    │   ├── [PLANNED ★★★] incomplete readiness beats schedule states
    │   ├── [PLANNED ★★★] schedule list failure beats running/create/recent/fallback
    │   ├── [PLANNED ★★★] running schedule beats creatable month
    │   ├── [PLANNED ★★★] canManageSchedules=false removes create candidate
    │   ├── [PLANNED ★★★] recent complete/changed beats fallback
    │   └── [PLANNED ★★★] no work -> schedule results route
    │
    ├── recent schedule derivation
    │   ├── [PLANNED ★★★] updated_at desc, invalid updated_at falls back to created_at
    │   ├── [PLANNED ★★★] deterministic tie-breaker: month desc, id asc
    │   └── [PLANNED ★★★] original schedules array is not mutated
    │
    ├── handlePrimaryDashboardAction()
    │   ├── [PLANNED ★★★] retry readiness calls reloadDashboardData
    │   ├── [PLANNED ★★★] retry schedule list calls loadSchedules
    │   ├── [PLANNED ★★★] readiness item routes through getReadinessRoute
    │   ├── [PLANNED ★★★] running/recent schedule routes through Step5 canonical flow
    │   ├── [PLANNED ★★★] create opens month modal only when permitted
    │   ├── [PLANNED ★★★] fallback uses getScheduleResultsRoutePath()
    │   └── [PLANNED ★★★] route/compare failure shows error and leaves screen stable
    │
    └── removed deletion/editing code
        ├── [PLANNED ★★★] no 수정/삭제 buttons in dashboard
        ├── [PLANNED ★★★] deletePhase2ScheduleMonth is not imported/called
        └── [PLANNED ★★★] no direct window.$message/window.$dialog usage remains

USER FLOW COVERAGE
==================
[+] Dashboard operational briefing
    │
    ├── [PLANNED ★★★] Login -> /app -> next action visible in under one screen
    ├── [PLANNED ★★★] Incomplete readiness -> current blocked item CTA opens setup flow
    ├── [PLANNED ★★★] Ready + running schedule -> 생성 상태 확인하기 opens Step5
    ├── [PLANNED ★★★] Ready + no schedules -> 새 근무표 생성하기 opens month modal
    ├── [PLANNED ★★★] Ready + recent schedule -> 최근 근무표 보기 opens Step5
    ├── [PLANNED ★★★] Schedule list failure -> 다시 불러오기, not generic empty state
    ├── [PLANNED ★★ ] Keyboard tab reaches primary CTA, recent 보기, 전체 목록 보기
    └── [PLANNED ★★ ] [→E2E] narrow desktop no clipped CTA or overlapping action row

────────────────────────────────────────
TARGET COVERAGE: 31/31 planned paths
  Code paths: 23/23
  User flows: 8/8
QUALITY TARGET: ★★★ for all branch logic, ★★ minimum for viewport/a11y E2E
REGRESSION TESTS: schedule list failure priority, deletion/edit removal, helper selector migration
────────────────────────────────────────
```

### Unit Test

`tests/unit/dashboard.spec.ts`를 새 역할에 맞게 수정한다.

검증 항목:

- 준비 완료 상태에서 `오늘의 다음 작업`, `운영 상태`, `최근 근무표`가 렌더링된다.
- 준비 완료 상태에서 기존 `dashboard-basic-info-section`, `dashboard-create-section`, 전체 `schedule-card` 목록이 렌더링되지 않는다.
- 최근 근무표가 여러 건이어도 1건만 표시된다.
- 최근 근무표는 API 응답 순서가 아니라 `updated_at -> created_at -> month -> id` 정렬로 결정된다.
- 대시보드에 `수정`, `삭제` 버튼이 없다.
- `deletePhase2ScheduleMonth`는 Dashboard test mock에서 제거되거나 호출되지 않는다.
- `전체 목록 보기` 클릭 시 `/app/schedule-results`로 이동한다.
- 최근 근무표 `보기` 클릭 시 `created/running/complete/changed`는 기존 Step5 canonical route로 이동한다.
- 최근 근무표가 `error` 상태이면 `보기` 클릭 시 해당 schedule context로 Step4에 이동한다.
- 생성 중인 근무표가 있으면 `새 근무표 생성하기`보다 `생성 상태 확인하기`가 primary CTA다.
- 운영 기준 미완료 상태에서는 readiness 상세 항목이 유지된다.
- 운영 기준 확인 실패 상태에서는 `다시 확인` CTA가 유지된다.
- `canManageSchedules=false`이면 생성 CTA가 표시되지 않는다.
- schedule list load 실패 시 대시보드가 빈 상태를 오해하게 만들지 않고 `다시 불러오기` primary CTA와 확인 필요 상태를 보여준다.
- schedule list load 실패 시 `새 근무표 생성하기`가 primary CTA로 나오지 않는다.
- `primaryDashboardAction` 우선순위가 readiness failure, incomplete readiness, schedule list failure, running schedule, creatable month, recent result, fallback 순서로 동작한다.
- `운영 상태`는 color 없이도 의미가 통하는 status text를 렌더링한다.
- `error` 상태 근무표가 있어도 `운영 상태`의 `확인 필요` row는 데이터 신뢰 실패가 없으면 `없음`으로 유지한다.
- 최근 근무표 영역은 `updated_at` 기준 최신 1건만 보여주며 전체 `schedule-card` 반복을 만들지 않는다.
- 최근 근무표 empty/error 상태는 `No items found`류 generic copy를 사용하지 않는다.
- primary CTA와 `전체 목록 보기`는 서로 다른 accessible name을 갖는다.
- org 변경 중 느린 이전 요청이 늦게 resolve되어도 새 organization dashboard state를 덮어쓰지 않는다.
- route push 또는 Step5 compare 실패 시 error message를 보여주고 잘못된 route 이동을 하지 않는다.
- `window.$message`, `window.$dialog` 직접 호출이 Dashboard에 남지 않는다.

### E2E Test

대시보드 전체 목록에 의존하던 E2E helper를 조정한다.

- `startNewScheduleFromDashboard`는 `dashboard-primary-action` 또는 `새 근무표 생성하기` CTA를 찾도록 변경한다.
- `openExistingScheduleFromDashboard`는 `dashboard-recent-schedule`의 `보기` action을 사용한다.
- 전체 목록이 필요한 테스트는 `/app/schedule-results`로 이동한 뒤 진행한다.
- 기존 `[data-test="schedule-card"]` selector에 의존하는 helper는 dashboard가 아니라 `ScheduleResults.vue` 전용 helper로 이동하거나 route별 selector를 분리한다.
- narrow desktop viewport에서 `오늘의 다음 작업` CTA와 최근 근무표 action이 잘리지 않는지 확인한다.
- keyboard로 primary CTA, 최근 근무표 `보기`, `전체 목록 보기`까지 이동할 수 있는지 확인한다.

### 필수 검증 명령

문서만 작성할 때는 실행하지 않아도 된다. 코드 변경 후에는 반드시 실행한다.

```bash
pnpm lint:check
pnpm run build
```

## 6. 완료 기준

- 로그인 후 3초 안에 다음 행동이 무엇인지 보인다.
- 대시보드가 상단 메뉴와 기능을 중복하지 않는다.
- 상세 작업은 각 전용 메뉴로 이동한다.
- 준비 완료 상태의 화면은 3개 블록만으로 읽힌다.
- 최근 근무표는 1건만 표시된다.
- 대시보드에서 근무표 수정/삭제가 보이지 않는다.
- 기존 readiness gate, 월 선택 모달, Step5 이동 흐름은 깨지지 않는다.
- 근무표 목록을 불러오지 못한 상태에서는 새 생성 CTA를 먼저 제안하지 않고 `다시 불러오기`를 보여준다.
- 조직 전환 중 느린 이전 응답이 최신 대시보드 상태를 덮어쓰지 않는다.

## 7. 확정된 기본값

- 대시보드는 운영 관리자 전용 운영 브리핑 화면이다.
- 일반 사용자용 공통 홈으로 확장하지 않는다.
- 최근 근무표 정렬은 날짜 기준으로 프론트에서 계산한다.
- schedule list를 신뢰할 수 없으면 생성/최근 결과 파생 상태도 신뢰하지 않는다.
- 사용자-facing 문구는 한국어로 작성한다.
- 디자인 방향은 기존 `DESIGN.md`의 “calm operational product, dense but readable, minimal chrome”을 따른다.

## 8. `plan-design-review` Completion Summary

```text
+====================================================================+
|         DESIGN PLAN REVIEW - COMPLETION SUMMARY                    |
+====================================================================+
| System Audit         | DESIGN.md exists, UI scope is Dashboard.vue  |
| Step 0               | initial 7/10, focused on hierarchy/states/a11y |
| Pass 1  (Info Arch)  | 7/10 -> 9/10 after hierarchy diagram           |
| Pass 2  (States)     | 6/10 -> 9/10 after state matrix/copy           |
| Pass 3  (Journey)    | 7/10 -> 9/10 after storyboard                  |
| Pass 4  (AI Slop)    | 7/10 -> 9/10 after hard rejection rules        |
| Pass 5  (Design Sys) | 8/10 -> 9/10 after DESIGN.md token mapping     |
| Pass 6  (Responsive) | 5/10 -> 8/10 after narrow viewport/a11y rules  |
| Pass 7  (Decisions)  | 5 resolved, 0 deferred                         |
+--------------------------------------------------------------------+
| NOT in scope         | written (7 items)                              |
| What already exists  | written                                        |
| TODOS.md updates     | 0 items proposed                               |
| Decisions made       | 5 added to plan                                |
| Decisions deferred   | 0                                              |
| Overall design score | 7/10 -> 9/10                                   |
+====================================================================+
```

Plan is design-complete for implementation. Run `/design-review` after implementation for visual QA.

## 9. `plan-eng-review` Completion Summary

```text
+====================================================================+
|          ENG PLAN REVIEW - COMPLETION SUMMARY                      |
+====================================================================+
| Step 0: Scope Challenge        | scope accepted with 1 completeness fix |
| Architecture Review            | 1 issue found, addressed in plan        |
| Code Quality Review            | 4 concrete constraints added            |
| Test Review                    | coverage diagram produced, 31 paths     |
| Performance Review             | no new infra, local derivation only     |
| NOT in scope                   | written                                 |
| What already exists            | expanded with route/API/test reuse      |
| TODOS.md updates               | 0 items proposed                        |
| Failure modes                  | 10 listed, 0 critical gaps remaining    |
| Outside voice                  | skipped                                 |
| Lake Score                     | 5/5 complete recommendations chosen     |
+--------------------------------------------------------------------+
| VERDICT                       | ENG READY FOR IMPLEMENTATION            |
+====================================================================+
```

The main engineering correction is explicit: schedule-list failure must be treated as a first-class unreliable state, not as an empty schedule list.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status | Findings                                          |
| ------------- | --------------------- | ------------------------------- | ---- | ------ | ------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | —      | —                                                 |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | —      | —                                                 |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 3    | clean  | scope accepted, 31 planned paths, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 2    | clean  | score: 7/10 -> 9/10, 5 decisions                  |

**UNRESOLVED:** 0
**VERDICT:** DESIGN + ENG CLEARED — ready to implement.
