# Step4 Request Entry UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `src/views/schedule/Step4InitialData.vue`를 “대형 그리드 직접 편집 화면”에서 “근무자 검색 + 요청 입력 + 월간 검토” 워크스페이스로 재설계하면서, existing save/restore/version handoff semantics를 그대로 유지한다.

**Architecture:** `src/views/schedule/Step4InitialData.vue`가 Step4의 단일 orchestration owner로 남고, 요청 입력 UI는 request-entry child components로 분리한다. 로컬 draft는 parent에서만 관리하고, `요청 반영`은 local maps까지만 commit하며, page-level `임시 저장`/`다음 단계`만 기존 snapshot persistence API를 호출한다.

**Tech Stack:** Vue 3, TypeScript, Naive UI, Tailwind CSS, Pinia, existing schedule APIs/stores, Vitest, Playwright

---

**문서 상태:** `plan-design-review`/`plan-eng-review` 결과를 `writing-plans` 기준으로 execution-ready하게 재정렬한 구현 계획서

**Plan file:** `docs/plans/2026-05-02-step4-request-entry-ux-plan.ko.md`

**Primary implementation rule:** 새 API, 새 store, 새 calendar/search 라이브러리는 도입하지 않는다.

## 1. System Audit

- **UI scope:** 높음. Step4의 핵심 입력 흐름, 정보 구조, 상호작용, 상태 피드백, 그리드 역할이 모두 바뀐다.
- **Current branch:** `main`
- **DESIGN.md status:** 존재함. 모든 시각/상호작용 결정은 `DESIGN.md`의 operational app 규칙에 맞춰야 한다.
- **TODOS.md status:** 없음
- **Test framework detected:** `Vitest`(unit), `Playwright`(E2E)
- **Base branch detection:** 로컬 기준 기본 branch는 `main`으로 본다.

### Current code hotspots

- `src/views/schedule/Step4InitialData.vue`는 이미 약 1,828줄이며, 단순 UI가 아니라 restore, 임시 저장, 버전 선택, 기존 결과 진입, Step5 handoff를 모두 orchestration한다.
- `tests/unit/step4-initial-data.spec.ts`는 이미 약 2,354줄이며, preview version 보존, note-only 저장, duplicate overwrite, localStorage restore 우선순위 등 Step4의 회귀 포인트를 많이 잡고 있다.
- `saveScheduleVersionPreferences()`는 **부분 저장 API가 아니라 전체 snapshot delete + insert** 방식이다.
- 직원 목록은 이미 `orgStore.employees` / `grid.employees.value`로 메모리에 올라오므로 Step4 검색을 위해 새 backend 검색 API가 필요하지 않다.
- 현재 정책 거부 정보는 `schedule_preferences.request_note`, `policy_check_status`, `policy_rejection_reason`로 이미 표현 가능하다.

### What already exists

- `DESIGN.md`가 정의한 typography, color, spacing, app hierarchy
- `ScheduleGrid.vue`의 sticky column / sticky header / dense grid pattern
- `useScheduleGrid()`의 employee/date load path
- `Step4InitialData.vue`의 restore precedence
  - `schedule_version_id` 기준 preference 복원
  - `schedule_id` legacy fallback
  - scoped localStorage fallback
- `Step4InitialData.vue`의 save / recheck / Step5 handoff 경로
- `schedule_preferences`의 `request_code`, `request_note`, `policy_check_status`, `policy_rejection_reason`
- `tests/unit/step4-initial-data.spec.ts`의 existing regression suite
- `tests/e2e/helpers.ts` / `tests/e2e/schedule-workflow.spec.ts`의 Step4 helper
- Naive UI의 existing input / chip / modal usage

---

## 2. Step 0: Scope Challenge

### 2.1 무엇을 재사용할 것인가

이번 작업은 “Step4를 새로 만드는 일”이 아니라 “기존 Step4 orchestration 위에 더 나은 입력 UX를 얹는 일”이어야 한다.

재사용해야 하는 것:

- Step4 진입 시 `ensurePhase2Schedule()` → `getScheduleVersionAssignments()` → `getScheduleVersionPreferences()`로 이어지는 baseline 확보 경로
- `restoreData()`가 가진 version → schedule → localStorage 복원 우선순위
- `handleSave()`의 page-level 저장, `recheckPhase2ScheduleVersion()` 호출, 저장 후 verification fetch
- `handleNext()`의 note-only / unchanged / changed-off-request 분기와 버전 이름 modal
- `policy_rejection_reason` 기반 거부 요약 및 후속 표시
- `grid.generateDates(month, 0)`가 만든 날짜 집합

### 2.2 최소 변경 권고

이번 slice의 최소 변경은 다음이다.

1. Step4 parent는 orchestration owner로 유지한다.
2. 입력 UX만 분리된 request-entry 컴포넌트로 추출한다.
3. 그리드는 `직접 편집기`에서 `선택 + 검토 surface`로 역할을 바꾼다.
4. page-level 저장 / Step5 handoff / version modal / existing-history modal은 유지한다.

이 범위를 넘는 작업은 scope creep로 본다.

### 2.3 Complexity smell과 scope reduction

초기 제안은 `8개 기존 파일 + 4개 신규 파일 + optional composable`까지 열어 둔다. 현재 Step4가 이미 복잡하다는 점을 감안하면 이 정도면 구조가 아니라 확산이다.

이번 계획의 권장 범위:

- **수정 필수**
  - `src/views/schedule/Step4InitialData.vue`
  - `src/components/schedule/ScheduleGrid.vue`
  - `src/components/schedule/ConstraintSelector.vue`
  - `tests/unit/step4-initial-data.spec.ts`
  - `tests/e2e/helpers.ts`
  - `tests/e2e/schedule-workflow.spec.ts`
- **신규 추가 권장**
  - `src/components/schedule/request-entry/Step4RequestComposer.vue`
  - `src/components/schedule/request-entry/Step4MonthCalendar.vue`
  - `src/components/schedule/request-entry/EmployeeRequestList.vue`
- **optional**
  - Step4 전용 pure helper 파일 1개까지 허용
- **금지**
  - 새 store
  - 새 API endpoint
  - 새 calendar/search 라이브러리
  - repo-wide `constraint` → `request` rename

### 2.4 Completeness check

이번 slice에서 “나중에 하자”로 미루면 안 되는 것:

- local draft와 persisted state의 구분
- 미반영 draft 이탈 방지
- policy rejection stale 상태 처리
- keyboard reachable calendar
- existing Step4 regression suite 유지
- Step5 handoff 분기 보존

### 2.5 Distribution check

새 artifact, 새 배포 파이프라인, 새 패키징 대상은 없다. distribution 관점의 추가 작업은 필요 없다.

### Step 0 verdict

이 계획은 **진행 가능**하다. 다만 “generic request renaming”이나 “per-request 즉시 서버 저장”으로 가면 blast radius가 급격히 커진다. 이번 문서는 **scope reduced / orchestration preserved** 버전으로 잠근다.

---

## 3. 핵심 문제 정의

현재 Step4는 사용자가 다음 순서로 일한다.

1. 표에서 근무자를 눈으로 찾는다.
2. 해당 row를 따라 날짜 셀을 찾아간다.
3. 셀을 클릭해서 `O`를 찍는다.
4. 우클릭해서 사유를 적는다.

이 방식의 문제는 다음과 같다.

- **탐색 비용이 크다.** 30명 이상이 있으면 “입력”보다 “찾기”에 시간이 든다.
- **발견성이 낮다.** 우클릭 사유 입력은 학습 없이는 알기 어렵다.
- **입력과 검토가 같은 surface에 섞여 있다.** 그리드는 월 전체를 보는 데 강하지만, 특정 사람의 요청을 넣는 데는 비효율적이다.
- **정책 피드백이 너무 멀다.** 현재는 상단 alert에 요약되고 셀 내부 맥락에서 이해하기 어렵다.
- **미래 확장이 막혀 있다.** 현재 타입이 `ConstraintCode = 'O'`에 묶여 있어 UI도 자연히 Off-only가 된다.

---

## 4. 제품 / 아키텍처 결론

### 4.1 Primary vs Secondary Surface

- **Primary input surface:** 요청 입력 패널
- **Secondary review surface:** 월간 검토 그리드

핵심 결정은 “그리드를 남기되, 그리드가 더 이상 주 편집기가 아니게 한다”는 것이다.

### 4.2 Eureka

일반적인 날짜 입력 문제처럼 보여서 date picker popup으로 해결하고 싶어질 수 있다. 하지만 Step4는 “임의 날짜 입력”이 아니라 “정해진 한 달 안에서 반복적으로 요청을 넣는 작업”이다.

따라서 이 화면은 일반 입력 폼이 아니라 **고정된 월 캘린더를 가진 작업 패널**이 더 맞다.

- 사용자는 한 달을 공간적으로 기억한다.
- 기존 요청과 빈 날짜를 한 화면에서 비교해야 한다.
- popup date picker는 매번 열고 닫는 비용이 생긴다.

결론적으로 Step4는 generic date picker보다 **고정 월간 request calendar**가 맞다.

### 4.3 Editing authority

- Step4 저장/수정/삭제의 권한 있는 편집기는 **요청 입력 패널**이다.
- 그리드 셀 클릭은 즉시 저장하지 않는다.
- 그리드 셀 클릭은 `근무자 + 날짜`를 패널로 동기화하는 selection action이다.
- note 입력, request type 변경, 삭제는 모두 패널에서 수행한다.

### 4.4 Local commit vs server persist

이 문서에서 가장 중요한 엔지니어링 계약은 저장 semantics를 **2단계**로 나누는 것이다.

1. **패널 primary CTA = `요청 반영`**
   - 현재 draft를 Step4 local maps(`constraints`, `constraintNotes`)에 반영한다.
   - 네트워크 호출하지 않는다.
   - 그리드와 직원 요청 목록은 즉시 갱신된다.
2. **페이지 하단 `임시 저장` / `다음 단계`**
   - existing `saveScheduleVersionPreferences()`를 호출해 서버에 snapshot을 저장한다.
   - 저장 후 `recheckPhase2ScheduleVersion()`을 호출한다.
   - verification fetch로 policy status를 다시 동기화한다.

이렇게 나누는 이유:

- 현재 API는 per-request patch가 아니라 전체 snapshot replace다.
- 날짜 클릭마다 서버 저장을 하면 비용이 커지고 race/dataloss risk가 늘어난다.
- draft typing 중에는 full-grid reactive churn을 줄여야 한다.

### 4.5 Preserved workflow invariants

UI가 바뀌어도 다음 동작은 반드시 유지한다.

- 기존 preview version / selected version 복원 규칙
- existing-history modal 진입 분기
- dashboard-origin return flow
- note-only change는 current preview version에 저장하고 새 version을 만들지 않는 규칙
- changed off-request는 version naming / re-solve flow로 넘어가는 규칙
- localStorage scoped v2 fallback
- 저장 후 policy recheck + verification fetch

---

## 5. 최종 정보 구조

### 5.1 Screen hierarchy

사용자가 Step4에 들어왔을 때 보는 순서는 다음이어야 한다.

1. **현재 누구의 요청을 입력하는지**
2. **무슨 요청을 어떤 날짜에 넣으려는지**
3. **아직 반영 전인지, 로컬 반영만 된 상태인지, 서버 저장까지 끝났는지**
4. **월 전체 맥락에서 어디에 반영됐는지**

### 5.2 Layout

Desktop 기준 2-pane workspace로 구성한다.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Header: 5월 요청 입력 | 조직명 | 저장 상태 | 미반영 draft 경고 | 정책 요약 │
├────────────────────────┬───────────────────────────────────────────────────┤
│ Left: 요청 입력 패널    │ Right: 월간 검토 워크스페이스                    │
│                        │                                                   │
│ 1. 근무자 검색         │ 1. 선택 직원 표시 / 필터 요약                    │
│ 2. 요청 유형           │ 2. 월간 요청 그리드                               │
│ 3. 날짜 선택 모드      │ 3. 선택 셀 / 선택 날짜 preview                    │
│ 4. 월간 캘린더         │                                                   │
│ 5. 메모                │                                                   │
│ 6. 요청 반영 / 초기화  │                                                   │
│ 7. 해당 직원 요청 목록 │                                                   │
└────────────────────────┴───────────────────────────────────────────────────┘
```

### 5.3 Section jobs

| 영역             | 역할                                                                   | 이 영역이 하지 말아야 할 일                     |
| ---------------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| Header           | 현재 월, 조직, 저장 상태, 미반영 draft 경고, 정책 요약을 짧게 보여준다 | 긴 도움말과 장식성 문구를 담지 않는다           |
| 요청 입력 패널   | 검색, 선택, 메모, 요청 반영, 수정, 삭제를 끝낸다                       | Step4 page-level 저장 책임을 혼자 가지지 않는다 |
| 월간 검토 그리드 | 월 전체 결과를 검토하고 패널 selection context를 바꾼다                | 즉시 토글 저장하지 않는다                       |

---

## 6. Interaction Model

### 6.1 근무자 검색

- Step4 진입 시 첫 포커스는 `근무자 검색`이다.
- 검색 기준:
  - 이름
  - 사번
- 검색 결과는 최대 8개까지 보여준다.
- 각 항목에는 다음 메타를 함께 보여준다.
  - 이름
  - 사번
  - 현재 월 요청 개수
- 검색 결과 source는 **기존 메모리의 employee list**다. 서버 검색 API를 추가하지 않는다.
- 검색 결과를 선택하면:
  - 요청 입력 패널이 해당 직원 기준으로 전환된다.
  - 오른쪽 그리드가 해당 row로 자동 스크롤된다.
  - 해당 row는 시각적으로 강조된다.

### 6.2 요청 유형

- 패널 상단에 `요청 유형` chips를 둔다.
- 현재 slice에서는 사용자에게 **`Off`만 노출**한다.
- 하지만 구현은 다음 catalog 구조를 전제로 한다.

| 필드                   | 설명                                                     |
| ---------------------- | -------------------------------------------------------- |
| `id`                   | 내부 request type id. 예: `off`, `vacation`, `education` |
| `label`                | 사용자 노출명                                            |
| `shortCode`            | 그리드/리스트 축약 표기                                  |
| `colorToken`           | badge/cell color                                         |
| `selectionModeSupport` | `single`, `range`, `multi` 허용 여부                     |
| `noteRequired`         | 메모 필수 여부                                           |
| `isActive`             | 현재 UI에 노출할지 여부                                  |

이번 slice의 active catalog는 다음 하나만 사용한다.

| id    | label | shortCode | colorToken          | noteRequired |
| ----- | ----- | --------- | ------------------- | ------------ |
| `off` | Off   | `O`       | shift-off / neutral | false        |

### 6.3 날짜 선택 모드

숨겨진 modifier key 대신 명시적 mode selector를 둔다.

- `하루`
- `연속 기간`
- `개별 여러 날`

### 6.4 월간 캘린더

- popup input이 아니라 **고정 월간 캘린더**를 패널 안에 직접 배치한다.
- 현재 스케줄 월만 보여준다.
- 달력 date source는 `dayjs(month)`를 따로 새로 짜지 않고, **이미 생성된 `grid.dates.value`의 이번 달 segment를 재사용**한다.
- 토/일은 옅은 background로 구분한다.
- 저장된 요청이 있는 날짜는 작은 badge로 표시한다.
- 현재 선택한 날짜는 accent outline + filled state로 구분한다.

선택 동작:

- `하루`: 날짜 1개 토글
- `연속 기간`: 시작일 클릭 후 종료일 클릭
- `개별 여러 날`: 날짜를 여러 개 누적 선택

선택 요약 예:

- `5월 3일`
- `5월 3일 ~ 5월 5일`
- `5월 3일, 5월 7일, 5월 14일`

### 6.5 메모 입력

- 메모 입력란은 항상 보이게 한다.
- 우클릭 interaction은 제거한다.
- 메모는 현재 optional이지만 future catalog에서 type별 required로 바뀔 수 있어야 한다.
- draft note는 typing 중에는 Step4 global map으로 바로 쓰지 않는다. `draftNote`에만 머물다가 `요청 반영` 시점에만 commit한다.

### 6.6 요청 반영 / 수정 / 삭제

- 패널 primary CTA label은 `저장`이 아니라 **`요청 반영`**으로 한다.
- `요청 반영` semantics:
  - 동일 직원 + 동일 날짜에 기존 요청이 있으면 `신규`가 아니라 `수정`
  - 기존 요청을 제거할 때는 `삭제`
  - local maps만 갱신하고 서버에는 쓰지 않는다
- page-level persistence는 기존 하단 `임시 저장` / `다음 단계`가 맡는다.
- `선택 초기화` secondary action을 제공한다.
- `해당 직원 요청 삭제`는 요청 목록 row 단위에서 수행한다. bulk delete는 이번 slice 범위 밖이다.

### 6.7 미반영 draft guard

다음 상황에서 draft가 아직 `요청 반영`되지 않았다면 guard가 필요하다.

- 다른 직원 선택
- 다른 요청 row 편집 진입
- 그리드 셀 선택 전환
- 하단 `임시 저장`
- 하단 `다음 단계`

행동 규칙:

- 원칙적으로 silent loss를 허용하지 않는다.
- 최소 구현은 inline warning + CTA disabled다.
- 더 나은 구현은 confirm modal이다.

이번 slice 권장안:

- **하단 `임시 저장` / `다음 단계`는 미반영 draft가 있으면 비활성화 + 이유 문구**
- **직원/셀/row 전환 시도는 현재 draft를 유지한 채 차단하고, `요청 반영` 또는 `선택 초기화`를 먼저 하도록 안내한다**

이유: modal 남발보다 explicit disabled reason과 blocked transition이 더 덜 피곤하고, 구현 복잡도도 낮다.

### 6.8 해당 직원 요청 목록

- 패널 하단에 현재 선택한 직원의 이번 달 요청 목록을 둔다.
- 정렬: 날짜 오름차순
- 각 row에는 다음을 보여준다.
  - 날짜 또는 날짜 범위
  - 요청 유형 chip
  - 메모 preview
  - 상태 chip

상태 chip:

- `저장 전`
- `저장됨`
- `정책 확인 중`
- `정책 거부`

Row action:

- `수정`
- `삭제`

### 6.9 월간 검토 그리드

그리드는 검토 surface로 남는다.

- 직원 row는 계속 sticky left
- 날짜 header는 계속 sticky top
- 선택된 직원 row는 background 강조
- 선택된 날짜 column은 옅은 tint
- 요청이 있는 셀은 type token으로 채운다
- 메모가 있는 셀은 indicator를 유지할 수 있다
- 정책 거부 셀은 일반 요청과 분리된 warning affordance를 준다

Grid click behavior:

- 셀 클릭 = 해당 직원/날짜를 패널로 동기화
- 즉시 toggle 저장하지 않음
- 우클릭 interaction 제거
- 그리드 click은 local map mutation이 아니라 **selection change**만 일으킨다

### 6.10 정책 거부 피드백

정책 거부는 페이지 상단 요약 alert만으로 끝나면 안 된다.

다음 3곳에서 동시에 보여야 한다.

1. Header summary: 거부 건수와 대표 메시지
2. 해당 직원 요청 목록: 거부 row에 status chip + rejection reason
3. Grid cell / panel preview: 해당 날짜에 warning 표시

단, local draft가 아직 서버에 저장되지 않았다면 이전 rejection status를 그대로 보여주면 안 된다. 이 경우:

- 해당 row는 `저장 전`으로 보인다
- 이전 rejection reason은 숨기거나 `저장 후 정책 재확인` 안내로 대체한다

---

## 7. Request Model and State Ownership Contract

### 7.1 Domain contract

- 현재 데이터 저장 contract는 직원 1명, 날짜 1개당 request 1개다.
- 이번 slice에서도 이 제약을 유지한다.
- 동일 직원의 동일 날짜에 여러 request type을 동시에 저장하지 않는다.

### 7.2 Naming contract: UI alias만 도입

현재 `ConstraintCode`와 `ConstraintMap` 중심 naming을 repo-wide로 바꾸면 blast radius가 너무 크다. 이번 slice에서는 **shared type rename이 아니라 Step4 UI alias**만 도입한다.

원칙:

- persistence / API / shared types는 기존 naming 유지
- Step4 request-entry UI에서만 request-centric alias 사용

예:

| shared layer         | Step4 UI alias            |
| -------------------- | ------------------------- |
| `ConstraintCode`     | `Step4RequestTypeId`      |
| `ConstraintMap`      | `PersistedRequestMap`     |
| `CommentMap`         | `PersistedRequestNoteMap` |
| context-menu comment | `draftNote`               |

### 7.3 Persistence bridge

- 사용자에게는 `requestTypeId = 'off'`로 보인다.
- persistence layer에는 `request_code = 'O'`로 mapping 한다.
- future type은 backend, evaluator, Step5 review surface, policy engine이 준비되기 전까지 UI에 노출하지 않는다.

### 7.4 Parent-owned state

State owner는 `Step4InitialData.vue` 하나로 고정한다.

**mutable state**

- `selectedEmployeeId`
- `draftRequestTypeId`
- `draftSelectionMode`
- `draftSelectedDates`
- `draftNote`
- `editingRequestKey`
- `dirtySinceLastApply`

**derived state**

- `selectedEmployeeName`
- `currentEmployeeRequests`
- `requestCatalog`
- `hasUnappliedDraft`
- `hasUnpersistedAppliedChanges`

권고:

- `selectedEmployeeName`은 state로 들고 있지 않는다. employee list에서 derive한다.
- `requestCatalog`는 static constant로 두고 reactive state로 만들지 않는다.

### 7.5 Data flow diagram

```text
Employee search / Grid click / Request row edit
                │
                ▼
     Step4 selected context (parent-owned)
     - selectedEmployeeId
     - draftRequestTypeId
     - draftSelectionMode
     - draftSelectedDates
     - draftNote
     - editingRequestKey
                │
                ├── [요청 반영]
                ▼
  Step4 local persisted maps
  - constraints
  - constraintNotes
  - local dirty metadata
                │
                ├── recompute
                │    ├── EmployeeRequestList
                │    └── ScheduleGrid review state
                │
                └── [임시 저장 / 다음 단계]
                     ▼
     saveScheduleVersionPreferences()
                     ▼
     recheckPhase2ScheduleVersion()
                     ▼
     getScheduleVersionPreferences() verification
                     ▼
     policy status / rejection reason sync
```

### 7.6 Child component contract

- child는 `intent`만 emit한다
- child는 `constraints`나 `constraintNotes`를 직접 mutate하지 않는다
- `Step4RequestComposer.vue`는 draft UI shell
- `Step4MonthCalendar.vue`는 날짜 선택 UI
- `EmployeeRequestList.vue`는 persisted/local-applied request list UI
- `ScheduleGrid.vue`는 review + selection sync UI

---

## 8. Interaction State Coverage

| Feature              | Loading                                   | Empty                                      | Error                                              | Success                                   | Partial                                               |
| -------------------- | ----------------------------------------- | ------------------------------------------ | -------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| 근무자 검색          | search input spinner 또는 immediate ready | `일치하는 근무자가 없습니다` + 검색어 유지 | inline error보다는 local search이므로 empty로 처리 | 결과 dropdown 표시                        | 일부 이름만 일치해도 결과 표시                        |
| 요청 입력 패널       | 직원 선택 전 disabled state               | `왼쪽에서 근무자를 선택하세요`             | draft hydration 실패 시 inline error               | draft가 정상 hydrate                      | 날짜는 선택됐지만 아직 반영 안 된 incomplete draft    |
| 월간 캘린더          | 날짜 grid skeleton                        | 선택 없음일 때 neutral prompt              | 날짜 sync 실패 시 panel warning                    | 선택 요약 즉시 갱신                       | 일부 날짜만 선택된 range preview                      |
| 요청 반영            | CTA loading은 짧아야 하며 네트워크 없음   | 날짜 없으면 CTA disabled + 이유 문구       | local validation error                             | 목록/그리드 즉시 반영                     | 일부 날짜만 반영은 허용하지 않고 전체 validation 실패 |
| page-level 임시 저장 | 버튼 loading + secondary actions disabled | 변경 없으면 저장 불필요 안내               | 저장 실패 toast + 기존 local state 유지            | verification 후 정책 상태 갱신            | verification mismatch 시 경고 후 재시도 유도          |
| 직원 요청 목록       | list skeleton                             | `아직 이 근무자의 요청이 없습니다`         | list vm build 실패                                 | 새 row 상단 강조                          | `저장 전` / `정책 확인 중` / `정책 거부` 혼재         |
| 월간 검토 그리드     | 전체 grid spinner 유지                    | 직원/날짜 데이터 없음 안내                 | load/retry alert                                   | selection sync highlight                  | policy status가 섞여 있는 mixed state                 |
| 정책 거부            | summary count placeholder                 | 거부 0건이면 요약 숨김                     | 상태 fetch 실패 경고                               | 거부 row와 이유 표시                      | local draft가 덮어쓴 날짜는 `저장 전` 우선            |
| restore / handoff    | baseline loading                          | 복원 데이터 없음                           | ensure/restore 실패 alert                          | 기존 preview / selected version 규칙 유지 | DB와 localStorage가 함께 있으면 DB 우선               |

### Empty state copy principles

- `No items found.` 같은 generic text 금지
- 업무 맥락과 다음 행동을 같이 제시
- 예:
  - `아직 이 근무자의 요청이 없습니다. 위 캘린더에서 날짜를 선택해 첫 요청을 추가하세요.`
  - `현재 선택한 요청이 아직 반영되지 않았습니다. "요청 반영" 후 임시 저장하세요.`

---

## 9. User Journey and Emotional Arc

| 단계 | 사용자가 하는 일    | 사용자가 느껴야 하는 것              | 화면이 지원해야 하는 것                                 |
| ---- | ------------------- | ------------------------------------ | ------------------------------------------------------- |
| 1    | Step4 진입          | “어디서 입력해야 하는지 바로 알겠다” | 왼쪽 입력 패널이 첫 시선, 오른쪽은 검토용으로 보이게 함 |
| 2    | 근무자 검색         | “찾는 시간이 안 든다”                | 검색창 첫 포커스, 빠른 결과, row sync                   |
| 3    | 요청 유형/날짜 선택 | “표를 뒤지지 않고 한 번에 고른다”    | 고정 월간 캘린더, 명시적 선택 모드                      |
| 4    | 요청 반영           | “내가 고른 내용이 화면에 반영됐다”   | 목록/그리드 즉시 갱신, `저장 전` 상태 명시              |
| 5    | 임시 저장           | “이제 서버에도 저장됐다”             | header 저장 상태, verification 후 policy status 갱신    |
| 6    | 거부 확인           | “왜 안 됐는지 이해했다”              | row-level rejection reason, grid warning                |
| 7    | 다음 직원으로 이동  | “반복 작업이 빠르다”                 | 검색 유지, 선택 유지, 미반영 draft guard                |

### Time-horizon design

- **첫 5초:** 거대한 표보다 입력 패널이 먼저 읽혀야 한다.
- **첫 5분:** 반복 입력이 줄고 저장 피드백이 명확해야 한다.
- **장기 사용:** 관리자에게 “이 화면은 실수하지 않게 만든다”는 신뢰를 줘야 한다.

---

## 10. AI Slop Risk Review

Step4는 **APP UI**다. 따라서 다음을 금지한다.

- card mosaic식 3단 구성
- decorative gradient background
- 모든 텍스트 중앙 정렬
- 이모지 중심 tip UI
- 카드 안에 또 카드가 들어가는 dashboard-template 레이아웃

### Specific fixes

- 현재 header tip의 `👆`, `🖱️` 같은 이모지 팁은 제거한다.
- helper text는 조용한 operational language로 바꾼다.
- 패널과 그리드 두 surface만 강하게 보이게 하고, 나머지는 보조 레이어로 내린다.
- 그림자보다 spacing과 typography로 hierarchy를 만든다.

### Visual thesis

Step4는 “병원 운영자가 쓰는 요청 입력 콘솔”처럼 보여야 한다.

- loud brand surface가 아니라 calm utility surface
- 넓은 workspace
- 한 눈에 읽히는 구조
- 선택, 상태, 경고만 색으로 강조

---

## 11. Design System Alignment

모든 visual decision은 `DESIGN.md`에 맞춘다.

### Typography

- 기본: `Pretendard Variable`
- 날짜, 카운트, request status meta: 필요 시 `IBM Plex Mono`
- 새로운 font 추가 금지

### Color

- 일반 surface: `--color-surface-primary`, `--color-surface-secondary`
- 본문 텍스트: `--color-text-default`, `--color-text-strong`
- 선택 accent: `--color-accent-primary`, `--color-accent-soft`
- 경고/거부: semantic warning / error tokens
- shift/off semantic color는 기존 `shift-off` 의미를 유지

### Spacing

- 패널 내부 section gap: `md(16px)`
- 패널 outer padding: `lg(24px)`
- header utility row: `md(16px)`
- 그리드와 패널 사이 gutter: `lg(24px)`

### Radius and shadow

- inputs, chips: `radius-sm ~ radius-md`
- panel container: `radius-md`
- heavy shadow 금지

### Surface hierarchy

- 가장 강한 contrast는 패널 active section과 selected row에만 준다.
- alert는 계속 사용할 수 있지만, UI를 alert-driven으로 만들지 않는다.

---

## 12. Responsive and Accessibility Contract

### 12.1 Responsive

이번 Step4의 primary target은 desktop이다. 하지만 viewport별 동작은 명시해야 한다.

| Viewport          | Layout                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `>= 1440px`       | 고정 2-pane. 왼쪽 패널 380~420px, 오른쪽 그리드 flexible                                                   |
| `1280px ~ 1439px` | 2-pane 유지. 패널 360px, 요약 text 더 압축                                                                 |
| `1024px ~ 1279px` | split 대신 tabbed workspace: `요청 입력` / `월간 검토`                                                     |
| `< 1024px`        | Step4는 desktop 권장 안내를 노출하고, 핵심 정보만 안전하게 읽히게 유지. full mobile optimization은 범위 밖 |

### 12.2 Accessibility

- 검색 input, type chips, mode selector, calendar day button, 요청 반영 버튼 모두 keyboard reachable
- calendar는 arrow key로 day 이동 가능
- `Enter` 또는 `Space`로 day 선택
- focus ring은 항상 visible
- touch target minimum 44px
- 색만으로 상태를 구분하지 않는다. text label과 icon/badge를 함께 사용
- screen reader label 예:
  - `김민지 요청 입력`
  - `5월 3일 Off 요청 선택됨`
  - `정책 거부: 월별 Off 허용 한도 초과`
- save success/error는 `aria-live` 영역으로 읽히게 한다
- tooltip은 보조 수단일 뿐, 핵심 정보의 유일한 전달 수단이 되면 안 된다

---

## 13. Scope Decisions

### In scope

- 근무자 검색 기반 요청 입력 패널
- 고정 월간 캘린더 기반 날짜 선택
- 패널 기반 note 입력
- 그리드의 역할을 검토 surface로 재정의
- 정책 거부를 row/cell/panel 맥락에서 보여주기
- local draft / local applied / persisted 상태를 명시적으로 구분하기
- Step4 orchestration을 유지한 채 UX surface만 교체하기

### Not in scope

- backend에서 `Off` 외 request type 저장 및 evaluator 반영
- employee self-service 요청 포털
- Step5 전체 request taxonomy 확장 표시
- mobile-first Step4 재설계
- 같은 직원/같은 날짜에 복수 request 저장
- Excel import 기반 bulk request 입력
- drag-to-paint grid editing의 유지 또는 고도화
- transactional save API redesign
- unapplied draft의 localStorage 복원

### Compatibility requirements

이 변경은 다음 동작을 **깨뜨리면 안 된다**.

- preview version 보존
- selected version fallback
- existing-history modal
- dashboard return CTA
- note-only change persistence
- duplicate version overwrite
- localStorage scoped restore precedence
- Step5 compare/focus route handoff

---

## 14. File Responsibility Proposal

### 14.1 Existing files to modify

| File                                             | Responsibility                                                                | Must preserve                                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/views/schedule/Step4InitialData.vue`        | Step4 state owner, child wiring, save/next/restore orchestration, guard logic | preview version rules, existing-history modal, dashboard return, note-only save semantics |
| `src/components/schedule/ScheduleGrid.vue`       | planning mode를 selection-aware review surface로 전환                         | sticky row/header layout, existing result mode behavior                                   |
| `src/components/schedule/ConstraintSelector.vue` | toggle cell에서 selectable/read-only cell variant로 확장                      | existing tooltip/comment indicator behavior                                               |
| `tests/unit/step4-initial-data.spec.ts`          | orchestration regression + parent-owned request-entry contracts               | existing restore/version/localStorage test coverage                                       |
| `tests/e2e/helpers.ts`                           | Step4 helper를 search/calendar/apply/save flow 기준으로 교체                  | Step1~Step5 setup helper compatibility                                                    |
| `tests/e2e/schedule-workflow.spec.ts`            | Step4 happy path를 request-entry UX 기준으로 갱신                             | Step5 handoff regression                                                                  |

### 14.2 New files to add

| File                                                             | Responsibility                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/components/schedule/request-entry/Step4RequestComposer.vue` | 근무자 검색, 요청 유형, 선택 모드, draft note, apply/reset, list child orchestration |
| `src/components/schedule/request-entry/Step4MonthCalendar.vue`   | current month calendar matrix, single/range/multi selection, keyboard interaction    |
| `src/components/schedule/request-entry/EmployeeRequestList.vue`  | 현재 선택 직원의 요청 목록, 상태 chip, rejection reason, edit/delete actions         |
| `tests/unit/step4-request-composer.spec.ts`                      | 검색, disabled reason, apply/reset, edit/delete emit contracts                       |
| `tests/unit/step4-month-calendar.spec.ts`                        | single/range/multi selection + keyboard navigation contracts                         |
| `tests/unit/employee-request-list.spec.ts`                       | row status rendering, rejection visibility, edit/delete emit contracts               |

### 14.3 Files to avoid touching unless proven necessary

- `src/api/schedule.ts`
  - 기존 save/load API 재사용이 원칙이다.
- `src/types/schedule.ts`
  - Step4-only alias 때문에 shared type rename을 시작하지 않는다.
- `src/stores/schedule.ts`
  - Step4 local UI state 때문에 store를 비대하게 만들지 않는다.

### 14.4 Optional helper

- Step4 request-entry용 pure helper 1개까지 허용한다.
- 권장 경로: `src/components/schedule/request-entry/requestEntryUtils.ts`
- 허용 범위:
  - current month calendar rows 생성
  - 날짜 정렬/요약 문자열 생성
  - request row view model 생성
- 금지 범위:
  - 네트워크 호출
  - store 접근
  - DOM 조작

### 14.5 State additions

**mutable**

- `selectedEmployeeId`
- `draftRequestTypeId`
- `draftSelectionMode`
- `draftSelectedDates`
- `draftNote`
- `editingRequestKey`
- `dirtySinceLastApply`

**derived**

- `selectedEmployeeName`
- `currentEmployeeRequests`
- `hasUnappliedDraft`
- `hasUnpersistedAppliedChanges`
- `requestCatalog`
- `selectedDateSummary`

### 14.6 Required local contracts

```ts
type Step4RequestTypeId = 'off';
type Step4SelectionMode = 'single' | 'range' | 'multi';

interface Step4DraftRequestState {
  selectedEmployeeId: string | null;
  draftRequestTypeId: Step4RequestTypeId;
  draftSelectionMode: Step4SelectionMode;
  draftSelectedDates: string[];
  draftNote: string;
  editingRequestKey: string | null;
  dirtySinceLastApply: boolean;
}

interface EmployeeRequestRowVM {
  requestKey: string;
  employeeId: string;
  dates: string[];
  requestTypeId: Step4RequestTypeId;
  requestCode: 'O';
  note: string;
  status: 'local-pending' | 'persisted' | 'policy-checking' | 'policy-rejected';
  policyRejectionReason: string | null;
}
```

```ts
// Step4RequestComposer.vue
emit('select-employee', employeeId: string)
emit('update:request-type', requestTypeId: Step4RequestTypeId)
emit('update:selection-mode', mode: Step4SelectionMode)
emit('update:note', note: string)
emit('apply-request')
emit('reset-draft')
emit('edit-request', requestKey: string)
emit('delete-request', requestKey: string)

// Step4MonthCalendar.vue
emit('update:selected-dates', dates: string[])
emit('request-blocked-transition')

// ScheduleGrid.vue
emit('cell-select', { employeeId: string, date: string })
```

### 14.7 Task ownership map

| Task   | Primary files                                                    | Secondary files                                                                                                                      |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Task 0 | `tests/unit/step4-initial-data.spec.ts`                          | `src/views/schedule/Step4InitialData.vue`                                                                                            |
| Task 1 | `src/views/schedule/Step4InitialData.vue`                        | `tests/unit/step4-initial-data.spec.ts`                                                                                              |
| Task 2 | `src/components/schedule/request-entry/Step4RequestComposer.vue` | `src/views/schedule/Step4InitialData.vue`, `tests/unit/step4-request-composer.spec.ts`                                               |
| Task 3 | `src/components/schedule/request-entry/Step4MonthCalendar.vue`   | `src/components/schedule/request-entry/requestEntryUtils.ts`, `tests/unit/step4-month-calendar.spec.ts`                              |
| Task 4 | `src/components/schedule/request-entry/EmployeeRequestList.vue`  | `src/views/schedule/Step4InitialData.vue`, `tests/unit/employee-request-list.spec.ts`                                                |
| Task 5 | `src/components/schedule/ScheduleGrid.vue`                       | `src/components/schedule/ConstraintSelector.vue`, `src/views/schedule/Step4InitialData.vue`, `tests/unit/step4-initial-data.spec.ts` |
| Task 6 | `src/views/schedule/Step4InitialData.vue`                        | `tests/unit/step4-initial-data.spec.ts`                                                                                              |
| Task 7 | `tests/e2e/helpers.ts`                                           | `tests/e2e/schedule-workflow.spec.ts`                                                                                                |
| Task 8 | all touched files                                                | `package.json` scripts only for verification                                                                                         |

---

## 15. Implementation Plan

### Task 0: Freeze the current Step4 orchestration with tests first

**Files:**

- Modify: `tests/unit/step4-initial-data.spec.ts`
- Verify: `src/views/schedule/Step4InitialData.vue`

- [ ] **Step 1: Add failing orchestration-protection tests**
      Add explicit tests for `grid click does not mutate until 요청 반영`, `미반영 draft blocks page-level actions`, and `request-entry mount does not break existing version restoration`.
- [ ] **Step 2: Run the Step4 regression suite**
      Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts`
      Expected: new request-entry assertions fail, while existing preview/version/localStorage assertions remain green.
- [ ] **Step 3: Add request-entry child stubs to the Step4 test harness**
      Keep the existing API/store mocks intact; only add minimal stubs and emit helpers for the new child components.
- [ ] **Step 4: Re-run the Step4 regression suite**
      Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts`
      Expected: failures are isolated to the new request-entry assertions.
- [ ] **Step 5: Commit**

```bash
git add tests/unit/step4-initial-data.spec.ts
git commit -m "test: lock step4 orchestration before request-entry refactor"
```

### Task 1: Introduce parent-owned Step4 draft state and local aliases

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue`
- Modify: `tests/unit/step4-initial-data.spec.ts`
- Optional create: `src/components/schedule/request-entry/requestEntryUtils.ts`

- [ ] **Step 1: Add failing parent-state tests**
      Cover `selectedEmployeeId`, `draftSelectedDates`, `hasUnappliedDraft`, `currentEmployeeRequests`, and `selectedDateSummary`.
- [ ] **Step 2: Run the focused parent suite**
      Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts -t "request-entry"`
      Expected: fails because the parent does not yet expose or derive the new draft state.
- [ ] **Step 3: Add the Step4 local aliases and draft refs**
      Use the exact local contracts from section 14.6; keep shared persistence naming unchanged.
- [ ] **Step 4: Implement the parent-only helpers**
      Add `applyDraftRequest()`, `resetDraftState()`, `hydrateDraftFromGridSelection()`, `hydrateDraftFromRequestRow()`, and `buildCurrentEmployeeRequests()`.
- [ ] **Step 5: Re-run the parent suite**
      Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts -t "request-entry"`
      Expected: parent-owned draft state assertions pass.
- [ ] **Step 6: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue tests/unit/step4-initial-data.spec.ts
git commit -m "feat: add parent-owned step4 request draft state"
```

If `src/components/schedule/request-entry/requestEntryUtils.ts` was created in this task, stage it in the same commit.

### Task 2: Build the request composer shell before calendar logic

**Files:**

- Create: `src/components/schedule/request-entry/Step4RequestComposer.vue`
- Create: `tests/unit/step4-request-composer.spec.ts`
- Modify: `src/views/schedule/Step4InitialData.vue`

- [ ] **Step 1: Add failing component tests for the composer shell**
      Cover employee search by name/employeeId, disabled reasons, apply/reset emits, and edit/delete row emits.
- [ ] **Step 2: Run the composer tests**
      Run: `pnpm exec vitest run tests/unit/step4-request-composer.spec.ts`
      Expected: fails because the component does not exist yet.
- [ ] **Step 3: Implement the shell UI**
      Render search input, request type chips, selection mode controls, note input, apply/reset actions, and the inline draft status message. Do not implement calendar-specific selection logic here.
- [ ] **Step 4: Wire the shell into `Step4InitialData.vue`**
      Replace the current header tip language with panel-first workflow messaging and autofocus the search input after baseline load.
- [ ] **Step 5: Re-run composer and parent tests**
      Run: `pnpm exec vitest run tests/unit/step4-request-composer.spec.ts tests/unit/step4-initial-data.spec.ts`
      Expected: shell contract tests pass and existing parent regressions stay green.
- [ ] **Step 6: Commit**

```bash
git add src/components/schedule/request-entry/Step4RequestComposer.vue src/views/schedule/Step4InitialData.vue tests/unit/step4-request-composer.spec.ts tests/unit/step4-initial-data.spec.ts
git commit -m "feat: add step4 request composer shell"
```

### Task 3: Implement the fixed month calendar with explicit selection modes

**Files:**

- Create: `src/components/schedule/request-entry/Step4MonthCalendar.vue`
- Create: `tests/unit/step4-month-calendar.spec.ts`
- Modify or create: `src/components/schedule/request-entry/requestEntryUtils.ts`
- Modify: `src/components/schedule/request-entry/Step4RequestComposer.vue`

- [ ] **Step 1: Add failing calendar tests**
      Cover single-day toggle, range start/end selection, multi-day add/remove, keyboard navigation, and selected-date summary rendering.
- [ ] **Step 2: Run the calendar tests**
      Run: `pnpm exec vitest run tests/unit/step4-month-calendar.spec.ts`
      Expected: fails because the calendar component does not exist yet.
- [ ] **Step 3: Implement pure date helpers first**
      Build current-month matrix generation and date summary helpers from `grid.dates.value` input; do not derive dates from a second calendar source.
- [ ] **Step 4: Implement `Step4MonthCalendar.vue`**
      Render a fixed current-month calendar, support `single`/`range`/`multi`, and keep keyboard focus/selection behavior inside the component.
- [ ] **Step 5: Re-run the calendar tests**
      Run: `pnpm exec vitest run tests/unit/step4-month-calendar.spec.ts`
      Expected: selection mode and keyboard tests pass.
- [ ] **Step 6: Commit**

```bash
git add src/components/schedule/request-entry/Step4MonthCalendar.vue src/components/schedule/request-entry/requestEntryUtils.ts src/components/schedule/request-entry/Step4RequestComposer.vue tests/unit/step4-month-calendar.spec.ts
git commit -m "feat: add step4 month calendar interactions"
```

### Task 4: Add the employee request list and stale-policy handling

**Files:**

- Create: `src/components/schedule/request-entry/EmployeeRequestList.vue`
- Create: `tests/unit/employee-request-list.spec.ts`
- Modify: `src/views/schedule/Step4InitialData.vue`
- Modify: `src/components/schedule/request-entry/Step4RequestComposer.vue`

- [ ] **Step 1: Add failing request-list tests**
      Cover status chips, rejection reason visibility, local-pending rows, and edit/delete emits.
- [ ] **Step 2: Run the request-list tests**
      Run: `pnpm exec vitest run tests/unit/employee-request-list.spec.ts`
      Expected: fails because the list component does not exist yet.
- [ ] **Step 3: Implement the request row view model in the parent**
      `currentEmployeeRequests` must hide stale rejection text when a local draft has overwritten the persisted request.
- [ ] **Step 4: Implement the list component**
      Render date summary, request chip, note preview, status chip, rejection reason, and edit/delete actions.
- [ ] **Step 5: Re-run list and parent tests**
      Run: `pnpm exec vitest run tests/unit/employee-request-list.spec.ts tests/unit/step4-initial-data.spec.ts`
      Expected: stale-rejection and request-row interaction tests pass.
- [ ] **Step 6: Commit**

```bash
git add src/components/schedule/request-entry/EmployeeRequestList.vue src/components/schedule/request-entry/Step4RequestComposer.vue src/views/schedule/Step4InitialData.vue tests/unit/employee-request-list.spec.ts tests/unit/step4-initial-data.spec.ts
git commit -m "feat: add step4 employee request list states"
```

### Task 5: Convert the grid from toggle editor to selection-aware review surface

**Files:**

- Modify: `src/components/schedule/ScheduleGrid.vue`
- Modify: `src/components/schedule/ConstraintSelector.vue`
- Modify: `src/views/schedule/Step4InitialData.vue`
- Modify: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: Add failing parent regression tests for grid selection**
      Cover `cell-select` syncing draft state, highlighted employee/date context, and zero mutation before apply.
- [ ] **Step 2: Run the targeted grid-parent tests**
      Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts -t "grid selection"`
      Expected: fails because grid interactions still toggle constraints directly.
- [ ] **Step 3: Extend `ConstraintSelector.vue` with a selection variant**
      Keep tooltip/comment indicator support, but add a non-mutating selectable state for planning mode.
- [ ] **Step 4: Extend `ScheduleGrid.vue`**
      Add `cell-select` emit, selected employee/date highlight props, and preserve result mode behavior unchanged.
- [ ] **Step 5: Rewire the parent**
      Remove direct toggle assumptions from planning mode, route grid clicks into `hydrateDraftFromGridSelection()`, and keep right-click note editing removed from Step4.
- [ ] **Step 6: Re-run the full Step4 unit suite**
      Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts`
      Expected: grid-selection tests pass and legacy Step4 orchestration assertions remain green.
- [ ] **Step 7: Commit**

```bash
git add src/components/schedule/ConstraintSelector.vue src/components/schedule/ScheduleGrid.vue src/views/schedule/Step4InitialData.vue tests/unit/step4-initial-data.spec.ts
git commit -m "refactor: convert step4 grid to review surface"
```

### Task 6: Preserve page-level persistence and Step5 handoff semantics

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue`
- Modify: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: Add failing persistence/handoff regression tests**
      Cover `요청 반영` local commit without network, save/next disabled when draft is unapplied, note-only persistence, and changed-off-request version naming flow.
- [ ] **Step 2: Run the full Step4 unit suite**
      Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts`
      Expected: new persistence-guard assertions fail while older restore/version cases stay green.
- [ ] **Step 3: Implement page-level guard logic**
      `임시 저장`/`다음 단계` must stay disabled while draft is unapplied, and blocked transitions must show the exact reason inline.
- [ ] **Step 4: Keep the existing API sequence untouched**
      `saveScheduleVersionPreferences()` -> `recheckPhase2ScheduleVersion()` -> verification fetch must remain the only persistence path.
- [ ] **Step 5: Re-run the full Step4 unit suite**
      Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts`
      Expected: all Step4 orchestration regressions pass.
- [ ] **Step 6: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue tests/unit/step4-initial-data.spec.ts
git commit -m "feat: preserve step4 persistence and handoff semantics"
```

### Task 7: Rewrite the E2E happy path around request-entry UX

**Files:**

- Modify: `tests/e2e/helpers.ts`
- Modify: `tests/e2e/schedule-workflow.spec.ts`

- [ ] **Step 1: Update the Step4 helper API**
      Replace grid-toggle helpers with `searchEmployee()`, `selectRequestDates()`, `applyRequest()`, `saveStep4()`, and `assertPolicyRejection()`.
- [ ] **Step 2: Add or rewrite the Step4 E2E scenario**
      Cover search -> calendar selection -> request apply -> save -> Step5 handoff, plus one rejection visibility assertion.
- [ ] **Step 3: Run the targeted E2E spec**
      Run: `pnpm exec playwright test tests/e2e/schedule-workflow.spec.ts`
      Expected: Step4 workflow passes with the new request-entry UX.
- [ ] **Step 4: Commit**

```bash
git add tests/e2e/helpers.ts tests/e2e/schedule-workflow.spec.ts
git commit -m "test: update step4 e2e flow for request-entry ux"
```

### Task 8: Final verification, lint, and visual/accessibility pass

**Files:**

- Modify only if verification exposes issues in already touched files

- [ ] **Step 1: Run the focused component unit tests**
      Run: `pnpm exec vitest run tests/unit/step4-request-composer.spec.ts tests/unit/step4-month-calendar.spec.ts tests/unit/employee-request-list.spec.ts`
      Expected: all new request-entry component suites pass.
- [ ] **Step 2: Run the parent Step4 regression suite**
      Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts`
      Expected: all Step4 orchestration regressions pass.
- [ ] **Step 3: Run the Step4 E2E workflow**
      Run: `pnpm exec playwright test tests/e2e/schedule-workflow.spec.ts`
      Expected: the Step4 request-entry happy path passes end-to-end.
- [ ] **Step 4: Run lint**
      Run: `pnpm lint:check`
      Expected: zero ESLint errors.
- [ ] **Step 5: If lint fails, fix then re-run**
      Run: `pnpm lint:fix`
      Expected: only formatting/lint issues change.
- [ ] **Step 6: Re-run lint after fixes**
      Run: `pnpm lint:check`
      Expected: zero ESLint errors.
- [ ] **Step 7: Manual QA pass**
      Verify search autofocus, keyboard calendar navigation, blocked transition messaging, selected row/date highlight, and rejection visibility in header/list/grid.
- [ ] **Step 8: Commit**

```bash
git add src/components/schedule/request-entry src/components/schedule/ScheduleGrid.vue src/components/schedule/ConstraintSelector.vue src/views/schedule/Step4InitialData.vue tests/unit tests/e2e
git commit -m "feat: ship step4 request-entry workspace"
```

---

## 16. Verification Plan

### 16.1 Required automated commands

| Layer                     | Command                                                          | When             | Expected                               |
| ------------------------- | ---------------------------------------------------------------- | ---------------- | -------------------------------------- |
| Focused composer unit     | `pnpm exec vitest run tests/unit/step4-request-composer.spec.ts` | Task 2           | shell contract passes                  |
| Focused calendar unit     | `pnpm exec vitest run tests/unit/step4-month-calendar.spec.ts`   | Task 3           | selection and keyboard tests pass      |
| Focused request-list unit | `pnpm exec vitest run tests/unit/employee-request-list.spec.ts`  | Task 4           | state chip and row action tests pass   |
| Step4 orchestration unit  | `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts`     | Tasks 0, 5, 6, 8 | restore/save/next regressions all pass |
| Step4 E2E workflow        | `pnpm exec playwright test tests/e2e/schedule-workflow.spec.ts`  | Tasks 7, 8       | search/apply/save/handoff flow passes  |
| Lint                      | `pnpm lint:check`                                                | Task 8           | zero ESLint errors                     |

### 16.2 Required code path coverage

```text
CODE PATH COVERAGE
===========================
[+] Step4 orchestration (`Step4InitialData.vue`)
    ├── [★★★ REQUIRED] restore precedence: version -> schedule -> localStorage
    ├── [★★★ REQUIRED] existing-history modal / dashboard return / preview preservation
    ├── [★★★ REQUIRED] next-step handoff: unchanged / note-only / constraint-change / overwrite
    ├── [★★★ REQUIRED] request-entry draft state owned by parent
    ├── [★★★ REQUIRED] `요청 반영` local commit without network
    ├── [★★★ REQUIRED] unapplied-draft guard before save/next
    └── [★★★ REQUIRED] grid click -> draft hydrate without mutation

[+] Request composer (`Step4RequestComposer.vue`)
    ├── [★★★ REQUIRED] employee search by name / employeeId
    ├── [★★★ REQUIRED] apply button disabled reasons
    ├── [★★★ REQUIRED] editing existing request hydrates draft
    └── [★★★ REQUIRED] delete path emits requestKey

[+] Month calendar (`Step4MonthCalendar.vue`)
    ├── [★★★ REQUIRED] single-day toggle
    ├── [★★★ REQUIRED] range start/end and preview
    ├── [★★★ REQUIRED] multi-day add/remove
    ├── [★★★ REQUIRED] keyboard navigation / Enter / Space
    └── [★★★ REQUIRED] existing request badge + selected highlight

[+] Grid review surface (`ScheduleGrid.vue` / `ConstraintSelector.vue`)
    ├── [★★★ REQUIRED] planning-mode selectable cell variant
    ├── [★★★ REQUIRED] selected employee row highlight
    ├── [★★★ REQUIRED] selected date highlight
    └── [★★★ REQUIRED] policy rejection warning affordance
```

### 16.3 Required user flow coverage

```text
USER FLOW COVERAGE
===========================
[+] Existing Step4 regressions
    ├── [★★★ REQUIRED] preview version preservation
    ├── [★★★ REQUIRED] note-only persistence without new version
    ├── [★★★ REQUIRED] duplicate overwrite / existing-history modal
    └── [★★★ REQUIRED] scoped localStorage restore priority

[+] New Step4 request-entry flow
    ├── [★★★ REQUIRED] search employee -> select dates -> 요청 반영 -> 임시 저장
    ├── [★★★ REQUIRED] search employee -> note 입력 -> 요청 반영 -> Step5 handoff
    ├── [★★★ REQUIRED] existing history edit mode -> panel populated -> save
    ├── [★★★ REQUIRED] policy rejection visible in header + list + grid
    ├── [★★★ REQUIRED] grid click syncs panel but does not mutate until 요청 반영
    └── [★★★ REQUIRED] unapplied draft blocks page-level save/next
```

### 16.4 Manual QA checklist

- 검색창이 baseline 로딩 완료 후 첫 포커스를 받는다.
- 이름과 사번 모두로 근무자 검색이 가능하다.
- `하루`/`연속 기간`/`개별 여러 날` 모드가 각각 의도대로 동작한다.
- `요청 반영` 전에는 grid/list/header가 바뀌지 않는다.
- `요청 반영` 후에는 해당 직원 요청 목록과 grid가 즉시 갱신된다.
- 미반영 draft가 있으면 직원 전환, grid selection 전환, `임시 저장`, `다음 단계`가 차단된다.
- 저장 후 정책 거부 상태가 header/list/grid에 동시에 보인다.
- 우클릭 note 입력 경로가 완전히 제거된다.

### 16.5 Regression rules

다음 테스트는 삭제 금지다.

- preview version / selected version 복원
- existing-history modal
- note-only persistence without new version
- duplicate overwrite flow
- scoped localStorage restore priority
- initialization failure path

---

## 17. Failure Modes and Performance Review

### 17.1 Failure modes

| Codepath                                     | 현실적인 실패                          | 테스트 필요 | 에러 처리                                   | 사용자 가시성  |
| -------------------------------------------- | -------------------------------------- | ----------- | ------------------------------------------- | -------------- |
| draft 작성 중 직원 전환                      | 미반영 draft 유실                      | 예          | disabled reason 또는 guard                  | 명확해야 함    |
| `요청 반영` 후 page save 전 새로고침         | local applied state만 남고 서버 미저장 | 예          | scoped localStorage로 복원                  | 복원 또는 경고 |
| page-level 저장 중 delete 후 insert 실패     | snapshot 일부/전체 미저장              | 예          | error toast + local state 유지              | 명확해야 함    |
| local draft가 기존 rejection을 덮음          | stale rejection reason 노출            | 예          | `저장 전` 상태 우선                         | 명확해야 함    |
| grid click이 곧바로 mutation함               | 숨은 side effect                       | 예          | selection-only contract                     | 즉시 보여야 함 |
| date selection 모드 전환 중 range state 꼬임 | 잘못된 날짜 반영                       | 예          | mode 전환 시 draft reset 또는 preview clear | 명확해야 함    |
| calendar focus 이동 누락                     | keyboard 접근성 저하                   | 예          | roving tabindex 또는 active-day 관리        | 명확해야 함    |

### 17.2 Critical gaps

아래 4개는 구현에서 빠지면 안 된다.

1. **미반영 draft guard**
2. **stale policy rejection 숨김 또는 대체 표시**
3. **grid click = selection only 계약**
4. **keyboard reachable calendar**

### 17.3 Performance review

- employee search는 로컬 배열 필터로 충분하다. debounced remote search를 추가하지 않는다.
- `draftNote`는 typing 중 global maps를 건드리지 않으므로 full-grid rerender를 줄일 수 있다.
- `currentEmployeeRequests`는 전체 직원이 아니라 **선택 직원 기준**으로만 derive한다.
- row auto-scroll은 employee selection 시점에만 수행한다. date selection마다 스크롤하지 않는다.
- `recheckPhase2ScheduleVersion()`는 explicit persist 때만 호출한다. `요청 반영`마다 호출하지 않는다.
- grid highlight는 `selectedEmployeeId`와 `selectedDateSet` 기반 class 계산으로 처리하고, cell-level watcher를 추가하지 않는다.

---

## 18. Acceptance Criteria

- [ ] 관리자는 직원 이름 또는 사번 검색으로 원하는 직원을 바로 찾을 수 있다.
- [ ] 관리자는 grid row를 훑지 않고도 날짜 요청 draft를 만들고 `요청 반영`할 수 있다.
- [ ] `요청 반영` 전에는 header/list/grid가 바뀌지 않고, page-level 저장 전에는 `저장 전` 상태가 명확히 보인다.
- [ ] note 입력은 우클릭 없이 항상 가능하다.
- [ ] grid click은 selection sync만 하고 즉시 저장하지 않는다.
- [ ] 저장된 요청은 해당 직원 요청 목록과 grid 양쪽에 반영된다.
- [ ] policy rejection은 상단 요약뿐 아니라 해당 요청 row와 셀 맥락에서도 보인다.
- [ ] current slice는 `Off`만 보여주되, UI alias 구조는 future request type 확장을 막지 않는다.
- [ ] note-only change, unchanged flow, changed-off-request flow의 기존 Step4 handoff semantics가 유지된다.
- [ ] employee search, calendar selection, draft typing 단계에서는 새 네트워크 요청이 발생하지 않는다.
- [ ] `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts`가 통과한다.
- [ ] `pnpm exec playwright test tests/e2e/schedule-workflow.spec.ts`가 통과한다.
- [ ] `pnpm lint:check`가 통과한다.

---

## 19. Execution Order and Handoff

### 19.1 Recommended commit sequence

1. `test: lock step4 orchestration before request-entry refactor`
2. `feat: add parent-owned step4 request draft state`
3. `feat: add step4 request composer shell`
4. `feat: add step4 month calendar interactions`
5. `feat: add step4 employee request list states`
6. `refactor: convert step4 grid to review surface`
7. `feat: preserve step4 persistence and handoff semantics`
8. `test: update step4 e2e flow for request-entry ux`
9. `feat: ship step4 request-entry workspace`

### 19.2 Recommended stop points

- Stop after Task 1 if parent-owned draft state starts leaking into shared store or API naming.
- Stop after Task 5 if grid result mode regressions appear outside Step4 planning mode.
- Stop after Task 6 if note-only persistence semantics diverge from the existing Step4 unit suite.

### 19.3 Remaining non-goals

- backend가 아직 `Off` 외 request type을 저장/검증하지 못한다.
- `<1024px` 구간은 intentional fallback만 정의하고 full optimization은 미룬다.
- snapshot delete + insert 저장은 transactional하지 않다. 이번 slice는 저장 빈도를 줄여 risk를 늘리지 않는 선에서 멈춘다.

### 19.4 Execution recommendation

이 문서를 기준으로 구현을 시작한다. 구현 순서는 반드시 `orchestration 보호 -> parent draft 도입 -> composer/calendar/list 추가 -> grid selection 전환 -> persistence 회귀 검증 -> E2E/린트 검증` 순서를 따른다.
