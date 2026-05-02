# Step4/Step5 결과 흐름 단순화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step4는 Off 요청 입력과 기존 결과 분기를 담당하고, Step5는 전달받은 조직/월/근무표 결과를 보여주는 데 집중하도록 Step4/Step5 화면과 문서를 정리한다.

**Architecture:** 기존 DB 구조는 유지한다. `schedules`는 조직+월 단위 컨테이너이고, 서로 다른 Off 요구사항 세트와 생성 결과는 `schedule_versions`에 저장한다. 단, 사용자 화면과 문서에서는 `version` 대신 `근무표안`이라는 용어를 사용해 기능 중심 표현을 숨긴다. Step5의 비교 기능은 기본 화면에서 제거하고 `근무표안 비교` 버튼으로 여는 넓은 팝업 또는 drawer로 분리한다.

**Tech Stack:** Vue 3, TypeScript, Vite, Tailwind CSS, Naive UI, Pinia, Supabase Edge Functions, Vitest.

---

## Summary

기존 PRD/엔지니어링 스펙의 "Step5 = 항상 보이는 Review Hub/비교 화면" 방향은 폐기한다. 새 방향은 다음과 같다.

- Step4는 현재 조직/월에 이미 생성된 근무표 결과가 있는지 확인한다.
- 기존 결과가 없으면 현재처럼 Off 요청을 입력한다.
- 기존 결과가 있으면 사용자가 `기존 결과 보기` 또는 `요청 수정해서 새 근무표안 만들기` 중 하나를 선택한다.
- 새 근무표안을 만들 때는 이름을 입력받고, 중복 이름 정책을 명확히 적용한다.
- Step5는 Step4에서 넘어온 조직/월/schedule의 결과 상세를 보여주는 데 집중한다.
- 근무표안별 결과 비교와 선택은 `근무표안 비교` 버튼으로 여는 별도 팝업/drawer에서 처리한다.
- Step5 하단의 `근무표 삭제`는 삭제 범위를 선택하게 하되, 확정된 근무표는 삭제하지 못하게 한다.

## Product Decisions

- **저장 단위:** 실제 DB는 월별 `schedule` 컨테이너 1개를 유지한다. 새 Off 요구사항 세트는 새 `schedule_version`으로 저장한다.
- **사용자 용어:** `version`, `preview`, `selected version`, `compare surface`를 화면에 노출하지 않는다. 각각 `근무표안`, `현재 보는 안`, `선택한 안`, `비교하기`로 바꾼다.
- **비교 위치:** Step5 기본 화면이 아니라 넓은 `n-modal` 또는 오른쪽 `n-drawer`에서 비교한다. 구현 권장값은 넓은 `n-modal`.
- **확정본 삭제:** 확정된 근무표가 있는 월은 Step5 삭제 메뉴에서 삭제를 차단한다. 추후 별도 운영자 기능으로 다룬다.
- **생성 실패 재사용:** 같은 이름의 실패한 근무표안(`solve_failed`)이 있으면 기존 실패 안을 새 입력으로 교체한다.
- **정상 결과 중복:** 같은 이름의 정상 생성 결과가 있으면 중복 메시지를 보여주고 다른 이름 입력을 요구한다.

## Plan Design Review 보강

**Review 관점:** 이 계획은 사용자-facing Step4/Step5 화면과 상호작용을 바꾸므로 디자인 리뷰 적용 대상이다. `/plan-design-review` 기준 최초 디자인 완성도는 **6/10**이다. 핵심 흐름과 용어 방향은 좋지만, 구현자가 화면 위계, 상태별 UI, modal focus, responsive/a11y 세부를 임의로 결정해야 하는 빈칸이 있었다. 아래 보강 후 목표 완성도는 **8.5/10**이다. 10/10은 구현 후 실제 화면 캡처 기반 `/design-review`에서 spacing, contrast, scroll, keyboard 동작까지 검증해야 달성한다.

### UI Scope

- Step4: 기존 결과 감지 선택 modal, Off 요청 입력 workspace, 새 근무표안 이름 modal, 모든 Off 요청 초기화 confirmation.
- Step5: 결과 상세 기본 화면, 현재 보는 근무표안 action bar, review/detail tabs, 근무표안 비교 modal, 삭제 범위 선택 modal.
- 문서/카피: `version`, `preview`, `selected`, `compare surface` 같은 내부 용어를 사용자 용어로 치환한다.

### What Already Exists

- `DESIGN.md`가 존재하며, 모든 UI 결정은 "calm operational product", desktop-first Step3/Step5, restrained neutral palette, `Pretendard Variable`, `IBM Plex Mono`, 8px spacing scale, Step5 review hub state contract에 맞춘다.
- Step4는 이미 `ScheduleGrid`, `Step4RequestComposer`, right `n-drawer`, page-level alert, bottom action bar 패턴을 갖고 있다. 새 버튼/상태는 이 구조 안에 넣고 새 shell을 만들지 않는다.
- Step5는 이미 `FocusedVersionActionBar`, `VersionReviewDetail`, `VersionCandidateShelf`, `ComparisonWorkspace`, `ComparisonToolsSection`을 갖고 있다. 기본 화면에서는 비교 컴포넌트를 숨기고, 비교 modal 안에서 기존 컴포넌트를 재사용한다.
- `src/utils/message.ts`와 `createDiscreteApi` 패턴이 있으므로, template에서 `window.$message`를 직접 쓰지 않는다.

### NOT in Scope

- Step3 grid 구조 변경: 이번 계획은 Step4/Step5 결과 흐름 단순화가 목적이다.
- 신규 조직/직원/근무 CRUD: MVP guardrail상 seed data 흐름을 유지한다.
- 실제 AI solver 연결: 현재 mock/phase2 schedule 흐름을 유지한다.
- 모바일 전용 Step5 비교 UX: Step5 비교는 desktop-first 운영 화면이다. 작은 화면에서는 깨지지 않는 안전한 fallback만 보장한다.
- 확정 근무표 삭제 운영자 기능: 이번 계획은 삭제 차단과 설명까지만 다룬다.

### Information Architecture

Step4 진입 분기:

```text
Step4 진입
  ├─ 기존 생성 결과 없음
  │   └─ Off 요청 캘린더 + 요청 drawer + 하단 저장/생성 action
  └─ 기존 생성 결과 있음
      └─ 선택 modal
          ├─ 기존 결과 보기                  -> Step5 결과 상세
          └─ 요청 수정해서 새 근무표안 만들기 -> Step4 Off 요청 편집
```

Step5 기본 화면 위계:

```text
Step5 결과 상세
  1. 조직명 / 대상 월 / 현재 보는 근무표안 / 상태
  2. 확정 가능 여부와 주요 차단 사유
  3. 주요 action 1개
  4. 배정표 / 하드 제약 / Off 요청 tabs
  5. 보조 actions: 근무표안 비교, 엑셀 다운로드, 입력 수정, 근무표 삭제
  6. 비교 modal은 사용자가 열 때만 표시
```

화면에서 한 번에 강조할 3가지는 다음 순서다.

1. 지금 보고 있는 근무표안이 무엇이고 확정 가능한가.
2. 확정이 막혔다면 가장 큰 이유는 무엇인가.
3. 사용자가 지금 할 수 있는 다음 행동은 무엇인가.

### App UI Design Rules

- Classifier는 **APP UI**다. 마케팅 hero, 장식 gradient, decorative icon card grid를 추가하지 않는다.
- Step5 기본 화면은 dashboard card mosaic처럼 만들지 않는다. 비교 후보 card grid는 modal 안에서만 허용된다. 기본 화면은 decision workspace처럼 읽혀야 한다.
- Page shell에 `n-card`를 유지하더라도 내부에는 중첩 `n-card`를 늘리지 않는다. 반복 정보는 token 기반 `section`/panel로 구성한다.
- `DESIGN.md` token을 따른다: neutral surface, subtle border, accent only for primary action/status, destructive state는 semantic red/rose 계열만 사용한다.
- Korean UI text는 운영자가 바로 이해할 수 있는 말로 쓴다. 예: `현재 보는 근무표안`, `확정 가능`, `확정할 수 없는 이유`, `생성 실패`.

### Interaction State Coverage

| Feature              | Loading                                                           | Empty                                                                        | Error                                                           | Success                                                      | Partial / Transitional                                   |
| -------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| Step4 기존 결과 확인 | modal을 띄우기 전 page-level loading 또는 기존 grid skeleton 유지 | 기존 결과 없음이면 modal 없이 Off 요청 입력 화면                             | schedule/compare 조회 실패 alert + `다시 시도`                  | 사용자가 선택한 branch로 명확히 이동                         | `intent=edit-off`가 있으면 modal 재표시 금지             |
| Step4 이름 입력      | confirm button loading, input disabled only during submit         | 빈 이름은 inline validation, modal 유지                                      | 중복/서버 거부는 input 아래 warning으로 표시                    | 생성 시작 toast 또는 Step5 이동                              | `solve_failed` 동일 이름은 "기존 실패 안 교체" 설명 표시 |
| Step4 전체 초기화    | confirm button loading                                            | 초기화 후 캘린더와 drawer 모두 빈 요청 상태                                  | localStorage 삭제 실패는 warning, 화면 상태는 rollback하지 않음 | `모든 Off 요청을 초기화했습니다.`                            | hidden draft/unapplied draft도 함께 제거                 |
| Step5 기본 결과      | 현재 근무표안 context 먼저 표시 후 detail loading                 | 생성 결과 없음이면 왜 비어 있는지와 `근무표 생성` action 표시                | 결과 로드 실패 card + `다시 시도` + `입력 수정` safe path       | 저장/확정/다운로드 완료는 short confirmation                 | 생성 중, 중간 결과 없음, stale proof, 재검토 필요를 구분 |
| 근무표안 비교 modal  | modal body 안에서 후보/비교 영역 loading                          | 후보 1개 이하이면 "비교할 다른 안이 없습니다" + `요청 수정해서 새 안 만들기` | modal-local error + retry, Step5 본문은 유지                    | 안 선택 시 본문 focus 갱신 후 modal 유지 또는 닫기 선택 가능 | modal을 닫아도 Step5 기본 화면에 비교 UI가 남지 않음     |
| 삭제 범위 modal      | destructive confirm loading                                       | 삭제 가능한 범위가 없으면 차단 안내                                          | 삭제 실패 시 같은 modal 안에 error 유지                         | 삭제 후 이동/상태 초기화가 명확히 보임                       | 확정본/생성 중이면 삭제 option 대신 차단 안내만 표시     |

### User Journey Storyboard

| Step | User Does                                 | User Feels                                 | Plan Must Support                                                         |
| ---- | ----------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| 1    | Step4에 들어온다                          | "이미 만든 결과가 있나?"                   | 기존 결과 여부를 숨기지 말고 선택 modal에서 바로 알려준다.                |
| 2    | 기존 결과 보기 또는 새 안 만들기를 고른다 | "실수로 기존 결과를 덮어쓰면 안 된다"      | 기본 action은 기존 결과 보기, 새 안 만들기는 명확히 분리한다.             |
| 3    | 새 근무표안 이름을 입력한다               | "나중에 어떤 안인지 알아볼 수 있어야 한다" | `1안`, `2안` 기본값과 중복/실패 안 교체 정책을 input 근처에 설명한다.     |
| 4    | Step5 결과를 본다                         | "이 안을 확정해도 되나?"                   | 확정 가능 여부와 차단 사유를 grid보다 먼저 보여준다.                      |
| 5    | 여러 안을 비교한다                        | "비교는 필요할 때만 보고 싶다"             | 기본 화면은 단순하게 유지하고, 비교는 넓은 modal에서 집중적으로 처리한다. |
| 6    | 삭제를 시도한다                           | "무엇이 지워지는지 정확히 알아야 한다"     | 선택한 안/모든 안/월 전체 삭제 범위를 radio로 고르고 결과를 설명한다.     |

### Responsive and Accessibility Contract

- Step4/Step5는 desktop-first 운영 화면이다. 1024px 이상에서 primary workspace가 가장 안정적으로 보여야 한다.
- 768px~1023px에서는 action bar와 modal content가 한 column으로 줄어도 핵심 상태와 primary action은 위에 남긴다.
- 767px 이하에서는 grid/compare 영역에 horizontal overflow를 허용하되, page action과 modal close/confirm/cancel은 44px 이상 touch target을 유지한다.
- 모든 modal은 focus trap, Esc close 정책, initial focus를 명시한다. destructive modal은 취소 버튼에 initial focus를 둔다.
- 비교 modal은 `role="dialog"`/Naive UI 기본 접근성을 유지하고, 제목 `근무표안 비교`가 accessible name이 되게 한다.
- 상태 chip은 색만으로 구분하지 말고 텍스트를 함께 노출한다.
- 모든 icon-only/close/delete affordance는 visible text 또는 `aria-label`을 가진다.
- keyboard 순서: 상단 context -> primary action -> tabs -> grid/detail -> secondary actions -> modal trigger 순서로 예측 가능해야 한다.

### Unresolved Design Decisions

- 넓은 비교 surface는 기본값을 `n-modal`로 확정한다. 화면 폭이 900px 미만이면 same component를 full-screen `n-drawer`처럼 보이게 하는 responsive fallback은 구현 단계에서 검증한다.
- 삭제 범위 modal에서 "이번 달 근무표 전체 삭제"에 typed confirmation을 요구할지는 이번 계획에서 강제하지 않는다. MVP에서는 radio 선택 + destructive confirm copy로 충분하되, 확정본은 항상 차단한다.
- Step5 공정성 요약의 위치는 이번 변경의 핵심이 아니므로 기존 위치를 유지한다. 단, 결과 상세 위계를 방해하면 `/design-review`에서 재배치한다.

### TODO Update Candidates

별도 `TODOS.md`는 없고 `docs/todo/`가 존재한다. 이번 계획 안에서는 아래 항목을 구현 acceptance로 흡수하고, 별도 TODO 문서는 만들지 않는다.

- 구현 후 `/design-review`로 Step5 modal width, scroll, keyboard focus, destructive dialog copy를 실제 화면에서 검증한다.
- Step5 mobile-first 비교 UX는 MVP 이후 별도 제품 결정으로 남긴다.

## Plan Eng Review 보강

**Review 관점:** 이 계획은 DB 구조를 새로 만들기보다 이미 구현된 `schedule`/`schedule_versions` 흐름을 재배치하는 작업이다. 엔지니어링 리뷰 기준으로 원 계획은 **7/10**이다. 사용자 흐름과 UI 상태는 충분하지만, 구현자가 route query, 비교 데이터 lazy-load, 삭제 scope, 테스트 경계, 실패 모드를 임의로 해석할 여지가 있었다. 아래 보강 후 목표 완성도는 **9/10**이다.

**Eng verdict:** 진행해도 된다. 단, 새 상태관리 store나 새 backend boundary를 만들지 말고 기존 `useScheduleReviewHub`, `scheduleVersionResolver`, `phase2-schedule` endpoint를 재사용한다. 이번 변경의 핵심은 "새로 만들기"가 아니라 "상시 비교 화면을 modal로 이동하고, Step4/Step5의 선택 상태를 명시화하는 것"이다.

### Step 0 Scope Challenge

**What already exists**

| Sub-problem                    | Existing code                                                                                                   | Review decision                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Step4 기존 결과 감지           | `Step4InitialData.vue`의 `baselineState`, `hasExecutedVersionHistory`, `maybeOpenExistingHistoryChoiceModal`    | 재사용한다. copy, branch label, query intent만 정리한다.                                          |
| Step4 기존 결과 보기/수정 분기 | `handleChooseReviewExistingHistory`, `handleChooseEditExistingHistory`                                          | 재사용한다. Step5 이동 시 기본 비교 query를 붙이지 않는 것이 핵심 변경이다.                       |
| 근무표안 이름 입력             | `isVersionNameModalOpen`, `pendingVersionName`, `findDuplicateVersionByName`                                    | 재사용하되 사용자 용어와 기본값을 `V1/V2`에서 `1안/2안`으로 바꾼다.                               |
| 실패 안 재사용                 | `isSolverFailedVersion`, `creationMode: 'overwrite'`, `overwriteVersionId`                                      | 재사용한다. 정상/확정/생성중 안에는 overwrite UI를 절대 노출하지 않는다.                          |
| Step5 결과 상세                | `FocusedVersionActionBar`, `VersionReviewDetail`, `ScheduleGrid`, `useScheduleReviewHub`                        | 재사용한다. 기본 화면의 비교 후보/비교 workspace만 modal 밖에서 제거한다.                         |
| Step5 비교 후보/비교 workspace | `VersionCandidateShelf`, `ComparisonWorkspace`, `ComparisonToolsSection`                                        | `ScheduleCompareModal.vue` 안으로 이동한다. 비교 로직은 복제하지 않는다.                          |
| 생성 결과 삭제                 | `deletePhase2ScheduleGeneratedResults`, `deleteGeneratedResults`, RPC `reset_schedule_generated_results_atomic` | 단일 안 삭제는 재사용한다. "모든 안 결과 삭제"는 같은 endpoint의 request scope 확장으로 처리한다. |
| 월 전체 삭제                   | `deletePhase2ScheduleMonth`                                                                                     | 재사용한다. 확정본/생성중 차단은 UI와 backend 모두에서 유지한다.                                  |

**Minimum change set**

- Step4: 기존 modal/name modal/submit 흐름을 유지하고 copy, 기본 이름, 중복 정책, 초기화 action만 좁게 수정한다.
- Step5: `ComparisonToolsSection`을 기본 template에서 제거하고 `ScheduleCompareModal.vue`로 감싼다. 기존 candidate/workspace component는 그대로 쓴다.
- Backend: 새 endpoint를 만들지 않는다. `DeleteGeneratedResultsRequest`에 scope를 추가해 `selected_version`과 `all_active_versions`를 구분한다.
- Tests: 이미 있는 unit test 파일을 우선 확장한다. 새 파일은 `ScheduleCompareModal.vue` component test가 더 명확할 때만 만든다.

**Complexity check**

계획은 문서 4개, Step4/Step5 view 2개, API/types/contracts/repository 4개, test 4개 이상을 건드리므로 8-file smell을 넘는다. 다만 DB 구조나 신규 서비스가 아니라 기존 흐름을 정리하는 작업이므로 scope를 줄이기보다 **write ownership을 제한**한다.

- 허용되는 새 production file은 기본적으로 `src/components/schedule/review/ScheduleCompareModal.vue` 1개뿐이다.
- 새 composable/store/service는 만들지 않는다. 중복 helper가 필요하면 `src/utils/scheduleVersionResolver.ts`에 기존 resolver 계열 함수로만 추가한다.
- Step5 삭제 modal이 복잡해지더라도 별도 service abstraction을 만들지 않는다. API request shape와 view handler를 명시적으로 둔다.

**Search check**

- [Layer 1] Local docs와 Context7 기준 Naive UI `n-modal`/`n-drawer`는 controlled `show`, `mask-closable`, size props, drawer `trap-focus` 계열을 지원한다. 따라서 custom focus-trap을 만들지 않는다.
- [Layer 1] Vue Test Utils는 Teleport/modal 검증 시 `attachTo`와 `document.body` cleanup 패턴을 제공한다. Modal focus/return 테스트는 이 패턴을 쓴다.
- [Layer 3] 이 제품에서는 deep-link query가 권한 상태가 아니라 "한 번 소비되는 화면 힌트"여야 한다. Step5의 권위 상태는 backend `selectedVersionId/finalizedVersionId`와 hub state이며, `version/compare` query는 초기 focus 해석 후 canonical route로 정리한다.

**Distribution check**

새 binary, package, container, mobile artifact는 없다. 배포 파이프라인 변경은 scope 밖이다.

### Architecture Contracts

Step4 entry flow:

```text
Step4 mount
  │
  ├─ load org/month context
  ├─ ensure schedule container
  ├─ load compare response
  ├─ resolve baseline state
  │
  ├─ has executed history?
  │    ├─ no  -> show Off request workspace
  │    └─ yes -> has intent=edit-off?
  │              ├─ yes -> show Off request workspace
  │              └─ no  -> blocking choice modal
  │                        ├─ 기존 결과 보기
  │                        │    └─ Step5 canonical route, no compare auto-open
  │                        └─ 요청 수정해서 새 근무표안 만들기
  │                             └─ router.replace({ intent: edit-off })
  │
  └─ no createVersion side effect until user explicitly starts generation
```

New plan name flow:

```text
Generate action
  │
  ├─ open name modal with default "1안" or next "{n}안"
  ├─ trim + lowercase duplicate check
  │
  ├─ empty name
  │    └─ inline validation, no API call
  ├─ duplicate solve_failed
  │    └─ creationMode=overwrite + overwriteVersionId
  ├─ duplicate review_ready/review_blocked/review_pending/infeasible/finalized/solving
  │    └─ block with same-name message, no overwrite affordance
  └─ unique name
       └─ creationMode=new

Backend must enforce the same policy even if frontend validation is bypassed.
```

Step5 result/detail flow:

```text
Step5 mount
  │
  ├─ parse route query
  │    ├─ version -> initial focus hint only
  │    ├─ compare -> initial compare candidate hint only
  │    └─ autoStart -> solver start hint only
  │
  ├─ hydrate schedule compare metadata
  ├─ load focused version review only
  ├─ canonicalize route by removing transient version/compare query
  │
  ├─ default page
  │    ├─ current plan context
  │    ├─ finalization gate and blocking reasons
  │    ├─ tabs/detail/grid
  │    └─ secondary button: 근무표안 비교
  │
  └─ user clicks 근무표안 비교
       └─ mount ScheduleCompareModal
            ├─ load/refresh compare candidates
            ├─ load compared reviews as needed
            ├─ select/focus/delete candidate
            └─ close -> focus returns to trigger button
```

Deletion flow:

```text
근무표 삭제
  │
  ├─ finalized month?
  │    └─ block: 확정된 근무표는 삭제할 수 없습니다.
  ├─ active solving version?
  │    └─ block: 생성 중인 근무표안이 있어 삭제할 수 없습니다.
  │
  └─ open scope modal
       ├─ 선택한 안의 생성 결과 삭제
       │    └─ POST delete-generated-results { scope: 'selected_version', sourceVersionId }
       ├─ 모든 안의 생성 결과 삭제
       │    └─ POST delete-generated-results { scope: 'all_active_versions' }
       └─ 이번 달 근무표 전체 삭제
            └─ POST delete-month { organizationId, month }
```

**Hard invariants**

- `schedule_versions` remains the internal implementation term; Korean UI copy says `근무표안`.
- `selectedVersionId` is backend-authoritative. `previewVersionId/focusVersionId` is screen state only.
- `compare` query must never auto-render comparison UI on the base Step5 page.
- A finalized month is read-only for delete, overwrite, generated-result reset, and manual edit actions.
- A solving version blocks destructive actions for the month unless backend explicitly supports cancellation.
- Deleting generated results must preserve Off requests for result-only scopes.
- Full-month delete is the only path that deletes Off requests and returns to schedule management.
- All write paths must preserve organization scoping through existing request-scope headers and backend auth checks.

### Code Quality Review

1. **Avoid duplicate compare helpers.** `Step5Result.vue` currently has local compare-id helpers that mirror `scheduleVersionResolver.ts`. During this change, move reusable compare-id normalization into `scheduleVersionResolver.ts` instead of copying it into `ScheduleCompareModal.vue`.

2. **Keep `ScheduleCompareModal.vue` thin.** The modal should orchestrate existing `VersionCandidateShelf` and `ComparisonWorkspace`, not reimplement candidate sorting, selection rules, delete guards, or review mapping.

3. **Do not introduce a new store.** `useScheduleReviewHub` already owns versions, reviews, compare IDs, and preview/selected state. Adding another compare store would create two sources of truth.

4. **Normalize user-facing copy through existing copy utilities where possible.** If status/action copy is repeated, prefer `src/utils/scheduleReviewCopy.ts` or `scheduleReviewState.ts` rather than inline Korean strings spread across Step5 and modal.

5. **Use Discrete API safely.** Script-level `window.$dialog?.warning` remains acceptable in this repo pattern, but template-level global API access is not allowed. Repeated message calls should continue through `src/utils/message.ts`.

6. **Do not rely on user-editable labels as keys.** Modal candidate rows and delete actions must key by `version.id`, not `name`.

7. **Local state must reset after destructive actions.** After any generated-result delete, clear assignment/review/realtime/local temp state before route movement so stale grids do not flash.

### Test Coverage Diagram

```text
CODE PATH COVERAGE
==================
[+] src/views/schedule/Step4InitialData.vue
    │
    ├── [PLAN TEST] Existing history absent
    │       └─ no choice modal, Off request workspace remains editable
    ├── [PLAN TEST] Existing history present
    │       └─ blocking modal copy/actions shown, no close/X path
    ├── [PLAN TEST] 기존 결과 보기
    │       └─ routes to Step5 canonical route without compare query
    ├── [PLAN TEST] 요청 수정해서 새 근무표안 만들기
    │       └─ route replace adds intent=edit-off and modal does not reopen
    ├── [PLAN TEST] Name modal default
    │       └─ first run "1안", next active plan "{n}안"
    ├── [PLAN TEST] Name validation
    │       └─ empty, trim/case-insensitive duplicate, normal duplicate block
    ├── [PLAN TEST] solve_failed duplicate
    │       └─ overwrite request includes overwriteVersionId
    ├── [PLAN TEST] finalized/solving duplicate
    │       └─ overwrite blocked, no API call
    └── [PLAN TEST] 모든 Off 요청 초기화
            └─ constraints, notes, policy display, hidden draft, temp storage cleared

[+] src/views/schedule/Step5Result.vue
    │
    ├── [PLAN TEST] Base page with compare-capable data
    │       └─ candidate shelf and comparison workspace are not rendered
    ├── [PLAN TEST] version/compare route query
    │       └─ focus state may be consumed, modal does not auto-open
    ├── [PLAN TEST] Focused result detail
    │       └─ organization/month/current plan/status/gate shown before grid
    ├── [PLAN TEST] One primary action rule
    │       └─ finalize/recheck/retry/select/start only one primary visual action
    ├── [PLAN TEST] Empty result state
    │       └─ explains why empty and provides safe next action
    └── [PLAN TEST] Delete scope modal
            ├─ selected generated result reset
            ├─ all active generated result reset
            ├─ whole month delete
            ├─ finalized block
            └─ solving block

[+] src/components/schedule/review/ScheduleCompareModal.vue
    │
    ├── [PLAN TEST] closed state
    │       └─ component not mounted before button click
    ├── [PLAN TEST] open state
    │       └─ title, candidate list, comparison workspace render inside modal
    ├── [PLAN TEST] 0/1 candidate empty state
    │       └─ request-edit action shown
    ├── [PLAN TEST] candidate select/focus
    │       └─ emits or calls hub action and updates Step5 focused detail
    ├── [PLAN TEST] delete disabled reasons
    │       └─ finalized/solving/current/locked candidates cannot be deleted
    └── [PLAN TEST] focus return
            └─ close returns focus to 근무표안 비교 trigger

[+] src/types/schedule.ts + src/api/schedule.ts + supabase/functions/phase2-schedule/*
    │
    ├── [PLAN TEST] DeleteGeneratedResultsRequest parse
    │       ├─ scope='selected_version' requires sourceVersionId
    │       ├─ scope='all_active_versions' rejects sourceVersionId mismatch if supplied
    │       └─ invalid scope returns bad_request
    ├── [PLAN TEST] repository selected_version reset
    │       └─ existing RPC behavior preserved
    ├── [PLAN TEST] repository all_active_versions reset
    │       └─ active non-finalized versions reset in one backend operation
    ├── [PLAN TEST] finalized conflict
    │       └─ maps already_finalized to 409
    └── [PLAN TEST] solving conflict
            └─ maps version_locked_for_solving to 409

USER FLOW COVERAGE
==================
[+] Existing-result branch [-> E2E]
    ├── [PLAN TEST] Step4 existing month -> 기존 결과 보기 -> Step5 detail
    └── [PLAN TEST] Step4 existing month -> 요청 수정 -> new plan name -> solver starts

[+] Compare modal [-> E2E]
    ├── [PLAN TEST] Step5 detail stays simple before click
    ├── [PLAN TEST] click 근무표안 비교 -> modal opens
    ├── [PLAN TEST] choose another plan -> Step5 focused detail updates
    └── [PLAN TEST] close modal -> comparison UI no longer visible

[+] Destructive delete [-> E2E or integration]
    ├── [PLAN TEST] finalized month delete blocked with clear message
    ├── [PLAN TEST] selected result delete preserves Off requests
    └── [PLAN TEST] whole-month delete returns to schedule management

────────────────────────────────
COVERAGE TARGET: 100% of planned branches covered before implementation is complete
UNIT: required for all code paths above
E2E: required for existing-result branch and compare modal because they cross route + store + component boundaries
────────────────────────────────
```

### Test Implementation Requirements

- Extend `tests/unit/step4-initial-data.spec.ts` for Step4 entry branch, name policy, failed-plan overwrite, and clear-all Off requests.
- Extend `tests/unit/step5-result.spec.ts` for base detail-only rendering, transient route query behavior, one-primary-action rule, compare trigger, and delete scope modal.
- Create `tests/unit/schedule-compare-modal.spec.ts` if the modal owns focus return, empty state, or candidate action wiring. Use Vue Test Utils `attachTo: document.body` and cleanup `document.body.innerHTML = ''` for Teleport/focus assertions.
- Extend `tests/unit/schedule-version-resolver.spec.ts` if compare query/focus canonicalization moves into resolver helpers.
- Extend `tests/unit/phase2-schedule-contracts.spec.ts`, `tests/unit/phase2-schedule-api.spec.ts`, and `tests/unit/phase2-schedule-write-repository.spec.ts` for delete scope parsing and backend conflict mapping.
- Update existing component tests for changed copy: `focused-version-action-bar.spec.ts`, `version-candidate-shelf.spec.ts`, `comparison-workspace.spec.ts`, and `comparison-tools-section.spec.ts` if their visible strings change.
- Add or update E2E coverage in `tests/e2e/step5-review-hub.spec.ts` or a new focused file for Step4 existing-result branch and compare modal. If the E2E environment cannot run locally, record the blocker and keep unit/integration coverage complete.

### Performance Review

- Step5 initial load must not load compared review payloads just because a `compare` query exists. Load focused review first; load extra compared reviews only when the modal opens.
- Keep the compare modal unmounted while closed. This prevents hidden duplicate grids and candidate workspaces from consuming memory or affecting keyboard order.
- Do not perform client-side loops for "모든 안의 생성 결과 삭제". Use one backend operation/RPC so partial deletion cannot leave mixed reset state.
- Existing Step5 polling and assignment refresh must be stopped before destructive reset and restarted only if the resulting state still needs it.
- For 30 employees x 36 days, avoid rendering two full `ScheduleGrid` instances outside the modal. If `ComparisonWorkspace` renders dense comparison content, it belongs only inside the modal body scroll region.

### Failure Modes

| Codepath                            | Production failure                                              | Test required                       | Error handling                                | User-visible outcome                       |
| ----------------------------------- | --------------------------------------------------------------- | ----------------------------------- | --------------------------------------------- | ------------------------------------------ |
| Step4 ensure/compare load           | network/CORS/auth failure                                       | `baselineErrorMessage` retry test   | existing alert + retry                        | clear error, user can retry                |
| Step4 existing history modal        | modal reopens after user chose edit                             | `intent=edit-off` test              | route query guard                             | no repeated blocking modal                 |
| Step4 name create                   | backend returns `version_name_exists` after stale frontend list | stale duplicate test                | refresh baseline and show duplicate message   | user stays in modal and picks another name |
| Step4 failed overwrite              | stale failed version became finalized/solving                   | backend conflict test               | map conflict and block overwrite              | no silent overwrite                        |
| Step4 clear-all Off                 | localStorage removal fails                                      | unit test for warning + state reset | warning only, UI state resets                 | user sees current screen cleared           |
| Step5 initial detail load           | compare/review API fails                                        | initial load error test             | retry + input edit safe path                  | clear recovery path                        |
| Step5 query consume                 | old deep link opens hidden comparison state                     | resolver/route test                 | canonicalize route after consumption          | base page stays simple                     |
| Compare modal open                  | candidate review fetch fails                                    | modal-local error test              | retry inside modal, base Step5 remains usable | user can close/retry                       |
| Compare candidate delete            | candidate is finalized/solving/current                          | component + backend conflict tests  | disabled reason + 409 mapping                 | no destructive action                      |
| Selected generated result delete    | backend reset succeeds but local grid still stale               | unit test for local state clear     | clear local state before route                | no stale result flash                      |
| All active generated results delete | partial reset across versions                                   | repository integration test         | single backend atomic path                    | all-or-none reset                          |
| Whole-month delete                  | auth org mismatch                                               | API/repository test                 | existing org scope rejection                  | blocked with error                         |
| Finalized month delete              | UI enables destructive option                                   | finalized block test                | UI block + backend conflict                   | user sees clear block                      |
| Solving month delete                | delete races with solver write                                  | solving block test                  | UI block + backend conflict                   | user sees clear block                      |

No silent critical gap is allowed: every row above needs either a test, explicit error handling, or both.

### Eng NOT in Scope

- New real solver integration: keep the current mocked/phase2 solver wiring.
- New schedule lifecycle model: do not replace `schedule_versions` with another abstraction.
- New CRUD for organizations, employees, or shifts: seed-data guardrail remains.
- Reopen/unfinalize finalized months: deletion remains blocked for finalized schedules.
- Full mobile compare redesign: only safe responsive fallback is required.
- New analytics/observability infrastructure: use existing logs/errors; no new tracking system.
- New deployment/distribution artifact: this is an app-code/doc change only.

### Review Completion Summary

- Step 0: Scope Challenge — scope accepted as-is with ownership limits and no new store/service.
- Architecture Review: 3 issues found and resolved in-plan: transient route query semantics, backend delete scope, lazy compare loading.
- Code Quality Review: 4 issues found and resolved in-plan: duplicate compare helpers, thin modal, no new store, copy centralization.
- Test Review: diagram produced, 100% planned branch coverage required; E2E required for route-spanning flows.
- Performance Review: 3 issues found and resolved in-plan: lazy compared review load, unmounted modal, atomic all-version reset.
- NOT in scope: written.
- What already exists: written.
- TODOS.md updates: 0 items proposed; implementation acceptance absorbs the relevant follow-ups.
- Failure modes: 0 silent critical gaps permitted after implementation.
- Outside voice: skipped for this document update.
- Lake Score: 10/10 recommendations chose the complete option where it is a boilable lake.

## Writing-Plans 보강

이 섹션은 `@superpowers:writing-plans` 기준으로 기존 계획을 구현 가능한 작업 문서로 바꾸기 위한 실행 보강이다. 아래 내용은 Task 0~8보다 우선하는 구현 가드레일이다.

- 구현자는 `@superpowers:subagent-driven-development` 또는 `@superpowers:executing-plans`를 사용해 checkbox를 하나씩 진행한다.
- 각 slice는 `테스트 작성 -> 실패 확인 -> 최소 구현 -> 통과 확인 -> 커밋` 순서를 따른다.
- 현재 작업 트리는 이미 Step4 관련 파일에 수정이 있다. 구현 시작 전 `git status --short`로 사용자 변경을 확인하고, 관련 없는 변경을 되돌리지 않는다.
- 새 production file은 기본적으로 `src/components/schedule/review/ScheduleCompareModal.vue`와 all-version reset이 필요한 경우의 SQL migration 1개만 허용한다.
- 새 store/composable/service는 만들지 않는다. 기존 `useScheduleReviewHub`, `scheduleVersionResolver`, `phase2-schedule` 경계를 확장한다.
- 사용자-facing copy는 한국어다. 코드 주석과 테스트 이름은 기존 테스트 스타일을 따른다.
- 코드 변경 후 반드시 `pnpm lint:check`를 실행한다. 실패하면 완료가 아니다.

## Implementation File Structure

| Path                                                                      | Action                        | Responsibility                                                                                                      |
| ------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `docs/prd/PHASE2_PRD_KR.md`                                               | Modify                        | Step4 기존 결과 분기, Step5 결과 상세 중심 흐름, 사용자 용어 `근무표안` 반영                                        |
| `docs/prd/PHASE2_ENGINEERING_SPEC_KR.md`                                  | Modify                        | 내부 `schedule_versions`와 사용자-facing `근무표안` 용어 경계, transient query 규칙, delete scope contract 반영     |
| `docs/prd/PHASE2_PRD.md`                                                  | Modify                        | 영문 PRD의 always-visible compare/review hub 표현 제거                                                              |
| `docs/prd/PHASE2_ENGINEERING_SPEC.md`                                     | Modify                        | 영문 engineering spec의 compare modal, lazy review loading, delete scope contract 반영                              |
| `src/views/schedule/Step4InitialData.vue`                                 | Modify                        | 기존 결과 선택 modal copy/action, 근무표안 이름 modal, failed-plan 교체 copy, 전체 Off 요청 초기화                  |
| `src/views/schedule/Step5Result.vue`                                      | Modify                        | 기본 화면에서 비교 surface 제거, `근무표안 비교` trigger 추가, delete scope modal, focused-only initial review load |
| `src/components/schedule/review/ScheduleCompareModal.vue`                 | Create                        | `VersionCandidateShelf`와 `ComparisonWorkspace`를 modal 안에서 조합하는 thin orchestrator                           |
| `src/components/schedule/review/FocusedVersionActionBar.vue`              | Modify                        | `현재 보는 근무표안`, `선택한 근무표안`, `이 근무표안 확정` copy 정리                                               |
| `src/components/schedule/review/VersionCandidateShelf.vue`                | Modify only if needed         | modal 안 candidate action/copy/a11y 조정. 후보 key는 반드시 `version.id`                                            |
| `src/components/schedule/review/ComparisonWorkspace.vue`                  | Modify only if needed         | modal body 안에서 scroll-safe하게 렌더링되도록 class/copy 조정                                                      |
| `src/components/schedule/review/ComparisonToolsSection.vue`               | Keep or modify copy only      | Step5 기본 화면에서는 import/render하지 않는다. modal에서 재사용하지 않으면 deprecated candidate로 남겨도 된다      |
| `src/composables/useScheduleReviewHub.ts`                                 | Modify                        | initial hydrate는 focused review만 load하고, modal open/action 때 compared reviews를 lazy-load                      |
| `src/utils/scheduleVersionResolver.ts`                                    | Modify                        | `getCanonicalCompareVersionIds`를 export하고 Step5 local duplicate helper를 제거                                    |
| `src/utils/scheduleReviewCopy.ts`                                         | Modify                        | 사용자-facing review/status/action copy centralization                                                              |
| `src/types/schedule.ts`                                                   | Modify                        | `DeleteGeneratedResultsRequest`를 scoped union으로 변경                                                             |
| `src/api/schedule.ts`                                                     | Modify                        | `deletePhase2ScheduleGeneratedResults()` 호출 shape를 scoped request로 맞춤                                         |
| `supabase/functions/phase2-schedule/contracts.ts`                         | Modify                        | delete-generated-results parser가 `selected_version`/`all_active_versions` scope를 검증                             |
| `supabase/functions/phase2-schedule/repository.ts`                        | Modify                        | selected scope는 기존 RPC, all-active scope는 새 atomic RPC 호출                                                    |
| `supabase/functions/phase2-schedule/index.ts`                             | Inspect                       | route는 이미 존재한다. parser/repository 변경만으로 충분한지 확인                                                   |
| `migrations/20260502_090000_step5_all_active_generated_results_reset.sql` | Create if needed              | all active version result reset을 frontend loop 없이 atomic 처리                                                    |
| `tests/unit/step4-initial-data.spec.ts`                                   | Modify                        | Step4 branch/name/clear-all coverage                                                                                |
| `tests/unit/step5-result.spec.ts`                                         | Modify                        | Step5 detail-only page, compare modal trigger, delete scope UI coverage                                             |
| `tests/unit/schedule-compare-modal.spec.ts`                               | Create if modal owns behavior | modal open/empty/select/delete/focus return coverage                                                                |
| `tests/unit/use-schedule-review-hub.spec.ts`                              | Modify                        | focused-only hydrate와 lazy compared review load coverage                                                           |
| `tests/unit/schedule-version-resolver.spec.ts`                            | Modify                        | exported canonical compare helper coverage                                                                          |
| `tests/unit/phase2-schedule-contracts.spec.ts`                            | Modify                        | scoped delete parser coverage                                                                                       |
| `tests/unit/phase2-schedule-api.spec.ts`                                  | Modify                        | scoped API payload and conflict mapping coverage                                                                    |
| `tests/unit/phase2-schedule-write-repository.spec.ts`                     | Modify                        | selected/all-active RPC calls and conflicts coverage                                                                |
| `tests/e2e/step5-review-hub.spec.ts`                                      | Modify if e2e available       | base Step5 stays simple, modal opens only after click                                                               |
| `tests/e2e/schedule-workflow.spec.ts`                                     | Modify if better fit          | Step4 existing-result branch smoke                                                                                  |

## Current Code Anchors

구현자는 아래 existing code를 먼저 재사용하거나 이동한다. 같은 로직을 새로 만들지 않는다.

### Step4 anchors

- Existing history modal state: `showExistingHistoryChoiceModal`, `hasShownExistingHistoryChoiceModal`
- Existing history branch guard: `maybeOpenExistingHistoryChoiceModal()`, `isExplicitEditIntent()`
- Existing history actions: `handleChooseEditExistingHistory()`, `handleChooseReviewExistingHistory()`
- Version-name modal state: `isVersionNameModalOpen`, `pendingVersionName`, `duplicateVersionCandidate`
- Name helpers: `getNextVersionNameDefault()`, `normalizeVersionName()`, `findDuplicateVersionByName()`, `isVersionBlockedForOverwrite()`
- Creation actions: `openVersionNameModal()`, `handleConfirmVersionName()`, `handleConfirmOverwriteVersion()`, `executePendingHandoff()`
- Draft/request reset helpers: `resetDraftState()`, `clearRequestApplyStatus()`, `clearScopedTempPreferencesStorage()`

Current mismatches to fix:

- Existing result modal currently says `기존 생성 결과가 있습니다`, `Off 수정 후 다시 실행`, `결과 확인`. Replace with `이미 만든 근무표안이 있습니다`, `요청 수정해서 새 근무표안 만들기`, `기존 결과 보기`.
- Name modal currently says `버전 이름`, default `V1/V2`, and generic `덮어쓰기`. Replace with `근무표안 이름`, default `1안/2안`, and failed-only `실패 안 교체하고 생성`.
- `handleChooseReviewExistingHistory()` currently passes `baseline.defaultStep5CompareVersionIds` into Step5 route. New behavior must route to Step5 without an auto-open compare state.

### Step5 anchors

- Compare UI currently renders at top through `ComparisonToolsSection`, `VersionCandidateShelf`, `ComparisonWorkspace`.
- Compare state currently flows through `compareVersionIds`, `comparisonCandidateVersions`, `leftComparedVersion`, `rightComparedVersion`, `leftComparedReview`, `rightComparedReview`.
- Compare handlers to move behind modal: `handleToggleComparisonTools()`, `syncComparisonWorkspace()`, `buildNextCompareVersionIds()`, `handleFocusVersionChange()`, `handleToggleCompareVersion()`, `handleSelectCandidateVersion()`, `handleDeleteVersion()`.
- Local duplicate helper to remove: Step5 local `dedupeVersionIds()` and local `getCanonicalCompareVersionIds()`. Export the existing helper from `src/utils/scheduleVersionResolver.ts` and import it in Step5/modal.
- Delete code currently uses `handleDeleteMonthSchedule()` with a two-button `window.$dialog?.warning`. Replace this with a scope-selection modal/dialog that has three explicit radio options.
- Generated-result reset currently calls `deletePhase2ScheduleGeneratedResults(ensureScheduleId(), { sourceVersionId })`. New selected-version call is `{ scope: 'selected_version', sourceVersionId }`.

### Backend anchors

- Existing frontend type: `src/types/schedule.ts` has `DeleteGeneratedResultsRequest { sourceVersionId: string }`.
- Existing contract type/parser: `supabase/functions/phase2-schedule/contracts.ts` has the same unscoped shape.
- Existing repository path: `deleteGeneratedResults()` loads schedule/version, checks auth/schedule, and calls `reset_schedule_generated_results_atomic`.
- Existing SQL RPC: `migrations/20260501_step5_delete_actions.sql` defines `reset_schedule_generated_results_atomic(p_schedule_id, p_source_version_id, p_reset_by)`.
- Existing selected-version behavior currently archives other active versions and resets the source version. That is no longer acceptable for the new `선택한 안의 생성 결과 삭제` scope. The selected scope must preserve sibling active 근무표안 results.

## Locked Implementation Decisions

### 1. Compare UI lazy-loading contract

`useScheduleReviewHub.hydrate()` must stop loading compared reviews by default. Step5 initial load should fetch compare metadata plus the focused review only.

Implement the public API like this:

```ts
type HydrateOptions = {
  loadComparedReviews?: boolean;
};

async function hydrate(requestedQuery?: Step5QueryState | null, options: HydrateOptions = {}) {
  const nextRequestedQuery = resolveHydrateRequestedQuery(requestedQuery);
  const resolvedState = await loadCompare(nextRequestedQuery.requestedQuery, {
    canonicalizeRoute: nextRequestedQuery.canonicalizeRoute,
  });
  await loadReviews(
    options.loadComparedReviews ? resolvedState.compareVersionIds : [],
    resolvedState.previewVersionId
  );
}

async function hydrateComparedReviews() {
  await loadReviews(compareVersionIds.value, previewVersionId.value);
}
```

Step5 initial mount calls `hub.hydrate()` with default options. `ScheduleCompareModal` open flow calls `hub.hydrateComparedReviews()` before showing comparison details or after showing modal-local loading.

### 2. Compare helper ownership

`src/utils/scheduleVersionResolver.ts` already has internal `getCanonicalCompareVersionIds()`. Export it and delete the duplicate implementation in `Step5Result.vue`.

Expected implementation shape:

```ts
export function getCanonicalCompareVersionIds(
  versionIds: string[],
  focusVersionId: string | null
): string[] {
  const dedupedVersionIds = dedupeVersionIds(versionIds);

  if (!focusVersionId) {
    return dedupedVersionIds.slice(0, 2);
  }

  const withoutFocus = dedupedVersionIds.filter((versionId) => versionId !== focusVersionId);
  return [focusVersionId, ...withoutFocus].slice(0, 2);
}
```

### 3. Compare modal interface

`ScheduleCompareModal.vue` should own layout, loading/empty state, and focus return only. It must not own schedule selection rules.

Expected component contract:

```ts
const props = defineProps<{
  show: boolean;
  versions: ScheduleVersionSummary[];
  compareVersionIds: string[];
  focusedVersionId: string | null;
  selectedVersionId: string | null;
  lockedVersionId: string | null;
  leftVersion: ScheduleVersionSummary | null;
  rightVersion: ScheduleVersionSummary | null;
  leftReview: ScheduleReviewResponse | null;
  rightReview: ScheduleReviewResponse | null;
  loading?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  'toggle-compare': [versionId: string];
  'focus-version': [versionId: string];
  'select-version': [versionId: string];
  'delete-version': [versionId: string];
  'request-edit': [];
  retry: [];
}>();
```

Modal CSS target:

```vue
<n-modal
  :show="show"
  preset="card"
  class="w-[min(1180px,calc(100vw-48px))] max-sm:h-screen max-sm:w-screen"
  :mask-closable="true"
  @update:show="emit('update:show', $event)"
></n-modal>
```

### 4. Delete-generated-results request scope

Update shared types to a discriminated union:

```ts
export type DeleteGeneratedResultsRequest =
  | {
      scope: 'selected_version';
      sourceVersionId: string;
    }
  | {
      scope: 'all_active_versions';
    };
```

Parser rules:

- `scope` is required.
- `selected_version` requires valid `sourceVersionId`.
- `all_active_versions` rejects `sourceVersionId` if supplied.
- Invalid scope returns `bad_request`.

Repository rules:

- `selected_version`: use `reset_schedule_generated_results_atomic` only after its SQL is changed to reset the source version without archiving sibling active versions. If keeping the old behavior is required for compatibility, add a new `reset_schedule_selected_generated_result_atomic` RPC and call that instead.
- `all_active_versions`: call a new atomic RPC. Do not loop versions in frontend or repository code.
- Both scopes must preserve Off requests.
- Both scopes must block finalized and solving schedules in backend, even if UI already blocks them.

### 5. All-active reset migration

Create this migration if implementation confirms no existing RPC already supports all-active reset:

`migrations/20260502_090000_step5_all_active_generated_results_reset.sql`

The migration must also fix the selected-version reset semantics. Either replace `reset_schedule_generated_results_atomic` to stop archiving sibling versions, or add a new selected-only RPC and update the repository to call it. The selected-version function must:

- Lock the schedule row.
- Validate the source version belongs to the schedule and is not archived.
- Block finalized and solving schedules.
- Delete current-month assignments for only `p_source_version_id`.
- Reset current-month preference resolutions for only `p_source_version_id`.
- Reset only the source version evaluation/solver/revision fields to draft.
- Preserve all sibling active versions and their results.
- Preserve all Off requests.

Expected selected-version SQL shape if replacing the existing RPC:

```sql
CREATE OR REPLACE FUNCTION public.reset_schedule_generated_results_atomic(
  p_schedule_id uuid,
  p_source_version_id uuid,
  p_reset_by uuid DEFAULT NULL
)
RETURNS TABLE (
  schedule_id uuid,
  source_version_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month text;
  v_month_start date;
  v_month_end_exclusive date;
  v_source_status text;
  v_source_archived_at timestamptz;
  v_finalized_version_id uuid;
BEGIN
  SELECT s.month, s.finalized_version_id
  INTO v_month, v_finalized_version_id
  FROM schedules s
  WHERE s.id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'schedule_not_found';
  END IF;

  SELECT sv.status, sv.archived_at
  INTO v_source_status, v_source_archived_at
  FROM schedule_versions sv
  WHERE sv.id = p_source_version_id
    AND sv.schedule_id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  IF v_source_archived_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_archived';
  END IF;

  IF v_finalized_version_id IS NOT NULL OR v_source_status = 'finalized' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'already_finalized';
  END IF;

  PERFORM 1
  FROM schedule_versions sv
  WHERE sv.schedule_id = p_schedule_id
    AND sv.archived_at IS NULL
    AND (sv.status = 'solving' OR sv.active_solver_execution_id IS NOT NULL)
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_locked_for_solving';
  END IF;

  v_month_start := to_date(v_month || '-01', 'YYYY-MM-DD');
  v_month_end_exclusive := (v_month_start + INTERVAL '1 month')::date;

  DELETE FROM schedule_assignments sa
  WHERE sa.schedule_version_id = p_source_version_id
    AND sa.date >= v_month_start
    AND sa.date < v_month_end_exclusive;

  UPDATE schedule_preferences sp
  SET
    resolution_status = 'pending',
    resolved_shift_id = NULL,
    resolved_at = NULL,
    updated_at = now()
  WHERE sp.schedule_version_id = p_source_version_id
    AND sp.date >= v_month_start
    AND sp.date < v_month_end_exclusive;

  UPDATE schedule_versions sv
  SET
    status = 'draft',
    latest_evaluation_id = NULL,
    active_solver_execution_id = NULL,
    current_revision = 0,
    manual_edit_count = 0,
    updated_at = now()
  WHERE sv.id = p_source_version_id
    AND sv.schedule_id = p_schedule_id;

  UPDATE schedules s
  SET
    selected_version_id = COALESCE(s.selected_version_id, p_source_version_id),
    status = 'created',
    solver_execution_id = NULL,
    hard_score = NULL,
    soft_score = NULL,
    updated_at = now()
  WHERE s.id = p_schedule_id;

  schedule_id := p_schedule_id;
  source_version_id := p_source_version_id;
  RETURN NEXT;
END;
$$;
```

Add a separate all-active function:

```sql
CREATE OR REPLACE FUNCTION public.reset_schedule_all_generated_results_atomic(
  p_schedule_id uuid,
  p_reset_by uuid DEFAULT NULL
)
RETURNS TABLE (
  schedule_id uuid,
  reset_version_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month text;
  v_month_start date;
  v_month_end_exclusive date;
  v_finalized_version_id uuid;
BEGIN
  SELECT s.month, s.finalized_version_id
  INTO v_month, v_finalized_version_id
  FROM schedules s
  WHERE s.id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'schedule_not_found';
  END IF;

  IF v_finalized_version_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'already_finalized';
  END IF;

  PERFORM 1
  FROM schedule_versions sv
  WHERE sv.schedule_id = p_schedule_id
    AND sv.archived_at IS NULL
    AND (sv.status = 'solving' OR sv.active_solver_execution_id IS NOT NULL)
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_locked_for_solving';
  END IF;

  v_month_start := to_date(v_month || '-01', 'YYYY-MM-DD');
  v_month_end_exclusive := (v_month_start + INTERVAL '1 month')::date;

  WITH active_versions AS (
    SELECT sv.id
    FROM schedule_versions sv
    WHERE sv.schedule_id = p_schedule_id
      AND sv.archived_at IS NULL
      AND sv.status <> 'finalized'
    FOR UPDATE
  ),
  deleted_assignments AS (
    DELETE FROM schedule_assignments sa
    USING active_versions av
    WHERE sa.schedule_version_id = av.id
      AND sa.date >= v_month_start
      AND sa.date < v_month_end_exclusive
    RETURNING sa.schedule_version_id
  ),
  reset_preferences AS (
    UPDATE schedule_preferences sp
    SET
      resolution_status = 'pending',
      resolved_shift_id = NULL,
      resolved_at = NULL,
      updated_at = now()
    FROM active_versions av
    WHERE sp.schedule_version_id = av.id
      AND sp.date >= v_month_start
      AND sp.date < v_month_end_exclusive
    RETURNING sp.schedule_version_id
  ),
  reset_versions AS (
    UPDATE schedule_versions sv
    SET
      status = 'draft',
      latest_evaluation_id = NULL,
      active_solver_execution_id = NULL,
      current_revision = 0,
      manual_edit_count = 0,
      updated_at = now()
    FROM active_versions av
    WHERE sv.id = av.id
    RETURNING sv.id
  )
  SELECT count(*)::integer INTO reset_version_count FROM reset_versions;

  UPDATE schedules s
  SET
    status = 'created',
    solver_execution_id = NULL,
    hard_score = NULL,
    soft_score = NULL,
    updated_at = now()
  WHERE s.id = p_schedule_id;

  schedule_id := p_schedule_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_schedule_all_generated_results_atomic(uuid, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reset_schedule_all_generated_results_atomic(uuid, uuid)
TO service_role;
```

If SQL tests expose missing columns or local schema drift, keep the invariant and update column names to match existing migrations instead of weakening atomicity.

## TDD Execution Slices

아래 slice들은 기존 Task 1~8을 구현 순서로 재정렬한 것이다. 구현자는 이 순서를 따른다.

### Slice 0: Gap table and dirty-worktree checkpoint

**Files:**

- Inspect: `src/views/schedule/Step4InitialData.vue`
- Inspect: `src/views/schedule/Step5Result.vue`
- Inspect: `src/composables/useScheduleReviewHub.ts`
- Inspect: `src/utils/scheduleVersionResolver.ts`
- Inspect: `src/types/schedule.ts`
- Inspect: `supabase/functions/phase2-schedule/contracts.ts`
- Inspect: `supabase/functions/phase2-schedule/repository.ts`
- Inspect: `migrations/20260501_step5_delete_actions.sql`
- Inspect: related tests listed above

- [ ] **Step 1: Record current worktree state**

Run:

```bash
git status --short
```

Expected: shows any user changes. Do not revert unrelated files.

- [ ] **Step 2: Build gap table**

Create a short implementation note in the PR/body, not necessarily in repo docs:

```markdown
| Requirement                  | Existing anchor                       | Status    | Implementation action    |
| ---------------------------- | ------------------------------------- | --------- | ------------------------ |
| Step4 existing-result modal  | `maybeOpenExistingHistoryChoiceModal` | 부분 완료 | copy/action/query update |
| Step5 compare default hidden | `ComparisonToolsSection` top render   | 수정 필요 | move to modal            |
```

- [ ] **Step 3: Confirm no duplicated architecture**

Run:

```bash
rg -n "useScheduleReviewHub|ComparisonToolsSection|reset_schedule_generated_results_atomic|DeleteGeneratedResultsRequest" src supabase migrations tests
```

Expected: identifies the existing boundaries above. No new store/service should be proposed.

### Slice 1: Step4 branch copy and canonical Step5 route

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue`
- Test: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: Add/update failing tests**

Test cases:

```ts
it('shows user-friendly existing-result branch actions before editing Step4', async () => {
  const wrapper = await mountStep4WithExecutedHistory();

  expect(wrapper.text()).toContain('이미 만든 근무표안이 있습니다');
  expect(wrapper.text()).toContain('기존 결과 보기');
  expect(wrapper.text()).toContain('요청 수정해서 새 근무표안 만들기');
  expect(wrapper.text()).not.toContain('버전');
});

it('routes existing-result review without compare query', async () => {
  const wrapper = await mountStep4WithExecutedHistory();

  await clickButtonByText(wrapper, '기존 결과 보기');

  expect(pushMock).toHaveBeenCalledWith(
    expect.objectContaining({
      query: expect.not.objectContaining({ compare: expect.any(String) }),
    })
  );
});
```

- [ ] **Step 2: Verify tests fail**

Run:

```bash
pnpm test:unit -- tests/unit/step4-initial-data.spec.ts
```

Expected: FAIL on old copy or existing compare query behavior.

- [ ] **Step 3: Implement minimal change**

In `Step4InitialData.vue`:

- Change modal title/body/buttons to the Product Decisions copy.
- Swap visual priority so `기존 결과 보기` is primary.
- Keep `:mask-closable="false"` and `:closable="false"`.
- In `handleChooseReviewExistingHistory()`, call Step5 route builder without `baseline.defaultStep5CompareVersionIds`.

- [ ] **Step 4: Verify pass**

Run:

```bash
pnpm test:unit -- tests/unit/step4-initial-data.spec.ts
```

Expected: PASS for Step4 existing-history tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue tests/unit/step4-initial-data.spec.ts
git commit -m "fix: simplify step4 existing result branch copy"
```

### Slice 2: Step4 근무표안 name policy

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue`
- Test: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: Add/update failing tests**

Test cases:

```ts
it('defaults the first plan name to 1안 and next active plan to 2안', async () => {
  const wrapper = await mountStep4ForFirstRun();

  await clickButtonByText(wrapper, '근무표 생성');

  expect(findVersionNameInput(wrapper).attributes('value')).toBe('1안');
});

it('blocks normal duplicate names and only allows solve_failed replacement copy', async () => {
  const wrapper = await mountStep4WithVersions([
    makeVersion({ id: 'version-ready', name: '2안', status: 'review_ready' }),
    makeVersion({ id: 'version-failed', name: '실패안', status: 'solve_failed' }),
  ]);

  await fillVersionName(wrapper, ' 2안 ');
  await clickButtonByText(wrapper, '이 이름으로 생성');
  expect(wrapper.text()).toContain('이미 같은 이름의 근무표안이 있습니다.');
  expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled();

  await fillVersionName(wrapper, '실패안');
  expect(wrapper.text()).toContain('같은 이름의 생성 실패 안이 있습니다.');
  await clickButtonByText(wrapper, '실패 안 교체하고 생성');
  expect(createPhase2ScheduleVersionMock).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      creationMode: 'overwrite',
      overwriteVersionId: 'version-failed',
    })
  );
});
```

- [ ] **Step 2: Verify tests fail**

Run:

```bash
pnpm test:unit -- tests/unit/step4-initial-data.spec.ts
```

Expected: FAIL on `V1/V2`, `버전 이름`, or generic overwrite copy.

- [ ] **Step 3: Implement minimal change**

Implementation notes:

- `getNextVersionNameDefault()` returns `${latestVersionNo + 1}안`.
- `openVersionNameModal('first_run', ...)` sets `pendingVersionName.value = '1안'`.
- `handleConfirmVersionName()` only auto-overwrites `isSolverFailedVersion(duplicate)`.
- Normal duplicate sets inline error/candidate state but does not show overwrite confirm.
- Error messages use `근무표안`, not `버전`.

- [ ] **Step 4: Verify pass**

Run:

```bash
pnpm test:unit -- tests/unit/step4-initial-data.spec.ts
```

Expected: PASS for name policy tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue tests/unit/step4-initial-data.spec.ts
git commit -m "fix: rename step4 version naming to plan naming"
```

### Slice 3: Step4 모든 Off 요청 초기화

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue`
- Test: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: Add failing tests**

```ts
it('clears all applied Off requests, notes, draft state, and scoped temp storage after confirmation', async () => {
  const wrapper = await mountStep4WithAppliedRequests();

  await clickButtonByText(wrapper, '모든 Off 요청 초기화');
  expect(dialogWarningMock).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Off 요청을 모두 초기화할까요?',
    })
  );

  await runDialogPositiveClick();

  expect(wrapper.text()).not.toContain('정책상 거부된 요청');
  expect(clearScopedTempPreferencesStorageMock).toHaveBeenCalledWith(
    expect.objectContaining({
      organizationId: 'org-1',
      month: '2026-05',
    })
  );
});
```

- [ ] **Step 2: Verify fail**

Run:

```bash
pnpm test:unit -- tests/unit/step4-initial-data.spec.ts
```

Expected: FAIL because the button/action does not exist.

- [ ] **Step 3: Implement minimal change**

Add a secondary/destructive button in the left bottom action group. Its handler should:

```ts
function clearAllOffRequestsInMemory() {
  constraints.value = {};
  constraintNotes.value = {};
  policyRejectionSummaries.value = [];
  resetDraftState();
  clearRequestApplyStatus();
  clearScopedTempPreferencesStorage({
    userId: authStore.user?.id,
    organizationId: scheduleStore.basicInfo?.organizationId,
    month: scheduleStore.basicInfo?.month,
  });
}
```

Use existing discrete dialog pattern and keep global API access in script, not template.

- [ ] **Step 4: Verify pass**

Run:

```bash
pnpm test:unit -- tests/unit/step4-initial-data.spec.ts
```

Expected: PASS for clear-all tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue tests/unit/step4-initial-data.spec.ts
git commit -m "feat: add step4 clear all off requests action"
```

### Slice 4: Focused-only Step5 hydrate and resolver helper ownership

**Files:**

- Modify: `src/composables/useScheduleReviewHub.ts`
- Modify: `src/utils/scheduleVersionResolver.ts`
- Modify: `src/views/schedule/Step5Result.vue`
- Test: `tests/unit/use-schedule-review-hub.spec.ts`
- Test: `tests/unit/schedule-version-resolver.spec.ts`
- Test: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Add failing tests**

```ts
it('hydrates only the focused review by default even when compare query is present', async () => {
  routeMock.query = { version: 'version-3', compare: 'version-2' };

  const hub = await mountUseScheduleReviewHub();

  expect(getPhase2ScheduleReviewMock).toHaveBeenCalledTimes(1);
  expect(getPhase2ScheduleReviewMock).toHaveBeenCalledWith('version-3');
  expect(hub.compareVersionIds.value).toEqual(['version-3', 'version-2']);
  expect(hub.comparedReviews.value).toEqual({
    'version-3': expect.any(Object),
  });
});

it('loads compared reviews only when explicitly requested', async () => {
  const hub = await mountUseScheduleReviewHubWithCompare();

  await hub.hydrateComparedReviews();

  expect(getPhase2ScheduleReviewMock).toHaveBeenCalledWith('version-2');
});
```

- [ ] **Step 2: Verify fail**

Run:

```bash
pnpm test:unit -- tests/unit/use-schedule-review-hub.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts
```

Expected: FAIL because `hydrate()` eagerly loads compared reviews and Step5 owns duplicate helper.

- [ ] **Step 3: Implement minimal change**

- Export `getCanonicalCompareVersionIds()` from `scheduleVersionResolver.ts`.
- Import it in `Step5Result.vue`.
- Delete Step5 local `dedupeVersionIds()` and `getCanonicalCompareVersionIds()`.
- Add `hydrateComparedReviews()` to `useScheduleReviewHub`.
- Change default `hydrate()` to focused-only review loading.

- [ ] **Step 4: Verify pass**

Run:

```bash
pnpm test:unit -- tests/unit/use-schedule-review-hub.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts
```

Expected: PASS for resolver/hub focused-load tests.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useScheduleReviewHub.ts src/utils/scheduleVersionResolver.ts src/views/schedule/Step5Result.vue tests/unit/use-schedule-review-hub.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts
git commit -m "refactor: lazy load step5 comparison reviews"
```

### Slice 5: Step5 result-detail base page and compare modal

**Files:**

- Create: `src/components/schedule/review/ScheduleCompareModal.vue`
- Modify: `src/views/schedule/Step5Result.vue`
- Test: `tests/unit/step5-result.spec.ts`
- Test: `tests/unit/schedule-compare-modal.spec.ts`

- [ ] **Step 1: Add failing tests**

```ts
it('does not render comparison UI on the base Step5 page', async () => {
  const wrapper = await mountStep5WithComparableVersions();

  expect(wrapper.findComponent({ name: 'VersionCandidateShelf' }).exists()).toBe(false);
  expect(wrapper.findComponent({ name: 'ComparisonWorkspace' }).exists()).toBe(false);
  expect(wrapper.text()).toContain('근무표안 비교');
});

it('opens comparison UI only after clicking the compare button', async () => {
  const wrapper = await mountStep5WithComparableVersions({ attachTo: document.body });

  await clickButtonByText(wrapper, '근무표안 비교');

  expect(document.body.textContent).toContain('근무표안 비교');
  expect(document.body.textContent).toContain(
    '여러 안의 결과를 비교하고 최종으로 볼 안을 선택하세요.'
  );
});
```

- [ ] **Step 2: Verify fail**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts tests/unit/schedule-compare-modal.spec.ts
```

Expected: FAIL because compare UI is still rendered on the base page or modal file is missing.

- [ ] **Step 3: Implement minimal change**

- Remove top-level `ComparisonToolsSection` render from Step5.
- Add `isCompareModalOpen`, `isCompareModalLoading`, `compareModalErrorMessage`, and `compareTriggerRef`.
- Add `근무표안 비교` secondary button.
- On open:
  - set modal open/loading
  - call `hub.hydrateComparedReviews()`
  - keep errors modal-local
- Mount `ScheduleCompareModal` with `v-if="isCompareModalOpen"` so closed modal is not in DOM.
- On close, return focus to `compareTriggerRef`.

- [ ] **Step 4: Verify pass**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts tests/unit/schedule-compare-modal.spec.ts
```

Expected: PASS for base/detail and modal tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step5Result.vue src/components/schedule/review/ScheduleCompareModal.vue tests/unit/step5-result.spec.ts tests/unit/schedule-compare-modal.spec.ts
git commit -m "feat: move step5 comparison into modal"
```

### Slice 6: Scoped generated-result delete backend

**Files:**

- Modify: `src/types/schedule.ts`
- Modify: `src/api/schedule.ts`
- Modify: `supabase/functions/phase2-schedule/contracts.ts`
- Modify: `supabase/functions/phase2-schedule/repository.ts`
- Create if needed: `migrations/20260502_090000_step5_all_active_generated_results_reset.sql`
- Test: `tests/unit/phase2-schedule-contracts.spec.ts`
- Test: `tests/unit/phase2-schedule-api.spec.ts`
- Test: `tests/unit/phase2-schedule-write-repository.spec.ts`

- [ ] **Step 1: Add failing contract/API/repository tests**

```ts
expect(
  parseDeleteGeneratedResultsRequest({
    scope: 'selected_version',
    sourceVersionId: '22222222-2222-4222-8222-222222222222',
  })
).toEqual({
  scope: 'selected_version',
  sourceVersionId: '22222222-2222-4222-8222-222222222222',
});

expect(
  parseDeleteGeneratedResultsRequest({
    scope: 'all_active_versions',
  })
).toEqual({
  scope: 'all_active_versions',
});

expect(() =>
  parseDeleteGeneratedResultsRequest({
    scope: 'all_active_versions',
    sourceVersionId: '22222222-2222-4222-8222-222222222222',
  })
).toThrow('sourceVersionId is not allowed for all_active_versions');
```

Repository expectation:

```ts
expect(rpcSpies.reset_schedule_all_generated_results_atomic).toHaveBeenCalledWith({
  p_schedule_id: 'schedule-1',
  p_reset_by: AUTH_CONTEXT.userId,
});
```

- [ ] **Step 2: Verify fail**

Run:

```bash
pnpm test:unit -- tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-api.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
```

Expected: FAIL because request scope and all-active RPC path do not exist.

- [ ] **Step 3: Implement minimal change**

- Add scoped union to frontend and edge function types.
- Update parser.
- Fix selected scope so `reset_schedule_generated_results_atomic` or a new selected-only RPC resets only the requested version and preserves sibling active versions.
- Add all-active repository branch.
- Add migration for `reset_schedule_all_generated_results_atomic` if needed.
- Map `already_finalized` and `version_locked_for_solving` through existing conflict mapper.

- [ ] **Step 4: Verify pass**

Run:

```bash
pnpm test:unit -- tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-api.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
```

Expected: PASS for scoped delete backend tests.

- [ ] **Step 5: Commit**

```bash
git add src/types/schedule.ts src/api/schedule.ts supabase/functions/phase2-schedule/contracts.ts supabase/functions/phase2-schedule/repository.ts migrations/20260502_090000_step5_all_active_generated_results_reset.sql tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-api.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
git commit -m "feat: scope generated result deletion"
```

If no migration was needed, omit the migration path from `git add`.

### Slice 7: Step5 delete scope UI

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Test: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Add failing UI tests**

```ts
it('opens delete scope selection with three explicit options', async () => {
  const wrapper = await mountStep5WithReviewReadyVersion();

  await clickButtonByText(wrapper, '근무표 삭제');

  expect(wrapper.text()).toContain('선택한 안의 생성 결과 삭제');
  expect(wrapper.text()).toContain('모든 안의 생성 결과 삭제');
  expect(wrapper.text()).toContain('이번 달 근무표 전체 삭제');
});

it('blocks delete scope options for finalized months', async () => {
  const wrapper = await mountStep5WithFinalizedMonth();

  await clickButtonByText(wrapper, '근무표 삭제');

  expect(wrapper.text()).toContain('확정된 근무표는 삭제할 수 없습니다.');
  expect(wrapper.text()).not.toContain('선택한 안의 생성 결과 삭제');
});
```

- [ ] **Step 2: Verify fail**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts
```

Expected: FAIL because current UI uses the old two-action `window.$dialog?.warning`.

- [ ] **Step 3: Implement minimal change**

- Replace `handleDeleteMonthSchedule()` dialog with controlled modal state.
- Add `selectedDeleteScope` radio state.
- Disable confirm until a scope is selected.
- For `selected_version`, call:

```ts
await deletePhase2ScheduleGeneratedResults(ensureScheduleId(), {
  scope: 'selected_version',
  sourceVersionId: previewVersionId.value,
});
```

- For `all_active_versions`, call:

```ts
await deletePhase2ScheduleGeneratedResults(ensureScheduleId(), {
  scope: 'all_active_versions',
});
```

- For `whole_month`, keep `deletePhase2ScheduleMonth()`.
- Before any successful destructive route movement, call `solver.stopPolling()`, `stopAssignmentsRefresh()`, and clear local result state.

- [ ] **Step 4: Verify pass**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts
```

Expected: PASS for delete scope UI tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step5Result.vue tests/unit/step5-result.spec.ts
git commit -m "feat: add step5 delete scope selection"
```

### Slice 8: Copy sweep, docs sync, and verification

**Files:**

- Modify: `docs/prd/PHASE2_PRD_KR.md`
- Modify: `docs/prd/PHASE2_ENGINEERING_SPEC_KR.md`
- Modify: `docs/prd/PHASE2_PRD.md`
- Modify: `docs/prd/PHASE2_ENGINEERING_SPEC.md`
- Modify: `src/utils/scheduleReviewCopy.ts`
- Modify: affected tests

- [ ] **Step 1: Add/update copy assertions**

Search first:

```bash
rg -n "버전|preview|selected|solver failed|review blocked|Compare Surface|Review Hub" src/views src/components src/utils docs/prd
```

Expected before implementation: old copy remains. Expected after implementation: only internal type/code/doc context remains; user-facing text should use `근무표안`.

- [ ] **Step 2: Update docs and copy utilities**

- PRD: Step5 is `결과 상세 확인 화면`, compare opens through `근무표안 비교`.
- Engineering spec: `schedule_versions` remains internal, route query is transient, compared reviews lazy-load.
- Copy utilities: map statuses to the Korean labels in Task 5.

- [ ] **Step 3: Run focused tests**

Run:

```bash
pnpm test:unit -- tests/unit/focused-version-action-bar.spec.ts tests/unit/version-candidate-shelf.spec.ts tests/unit/comparison-workspace.spec.ts tests/unit/comparison-tools-section.spec.ts
```

Expected: PASS after copy assertion updates.

- [ ] **Step 4: Run full planned verification**

Run:

```bash
pnpm test:unit -- tests/unit/step4-initial-data.spec.ts tests/unit/step5-result.spec.ts tests/unit/use-schedule-review-hub.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-api.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
pnpm lint:check
```

Expected: both commands PASS.

- [ ] **Step 5: Optional E2E**

Run if local e2e env is healthy:

```bash
pnpm test:e2e -- tests/e2e/step5-review-hub.spec.ts tests/e2e/schedule-workflow.spec.ts
```

Expected: PASS. If blocked by auth/test data, record exact blocker in final implementation notes.

Implementation note 2026-05-02: attempted this command locally. Playwright stopped in
`tests/e2e/setup/auth.setup.ts` before the target specs because `TEST_USER_EMAIL` and
`TEST_USER_PASSWORD` are not set in the environment or `.env.test`. Unit/integration
coverage was kept complete. `tests/e2e/step4-existing-result-flow.spec.ts` now captures
the two required Step4 existing-result branch targets as skipped E2E scenarios until the
authenticated fixture is available, and the Step5 E2E helper/spec assertions were updated
to the new `근무표안 비교` modal entry point for the next authenticated run.

- [ ] **Step 6: Commit**

```bash
git add docs/prd/PHASE2_PRD_KR.md docs/prd/PHASE2_ENGINEERING_SPEC_KR.md docs/prd/PHASE2_PRD.md docs/prd/PHASE2_ENGINEERING_SPEC.md src/utils/scheduleReviewCopy.ts tests/unit
git commit -m "docs: align step4 step5 result flow terminology"
```

## Task 0: 현재 구현 상태 확인 및 Gap 분석

**Files:**

- Inspect: `src/views/schedule/Step4InitialData.vue`
- Inspect: `src/views/schedule/Step5Result.vue`
- Inspect: `src/composables/useScheduleReviewHub.ts`
- Inspect: `src/utils/scheduleVersionResolver.ts`
- Inspect: `supabase/functions/phase2-schedule/contracts.ts`
- Inspect: `supabase/functions/phase2-schedule/repository.ts`
- Inspect: `tests/unit/step4-initial-data.spec.ts`
- Inspect: `tests/unit/step5-result.spec.ts`

- [ ] 구현을 시작하기 전에 Step4/Step5의 현재 구현 상태를 먼저 확인한다.
- [ ] 이미 구현된 기능과 아직 부족한 기능을 구분해 gap 분석 표를 작성한다.
- [ ] gap 분석은 다음 네 가지 상태로 분류한다.
  - `완료`: 요구사항과 현재 구현이 이미 일치한다.
  - `부분 완료`: 큰 흐름은 있으나 copy, 위치, 조건, 테스트가 부족하다.
  - `수정 필요`: 구현은 있으나 새 요구사항과 방향이 다르다.
  - `미구현`: 새로 추가해야 한다.
- [ ] 특히 아래 기능은 이미 상당 부분 구현되어 있으므로, 중복 구현하지 말고 현재 코드를 재사용하거나 이동하는 방식으로 계획한다.
  - Step4 기존 결과 감지와 선택 모달
  - Step4 근무표안 이름 입력과 중복 이름 처리
  - `solve_failed` 근무표안 overwrite 흐름
  - Step5 결과 review/detail 렌더링
  - Step5 비교 후보/워크스페이스 컴포넌트
  - Step5 개별 안 삭제와 생성 결과 삭제 API
- [ ] gap 분석 결과를 바탕으로 이후 Task 1~8 중 이미 완료된 항목은 체크하고, 필요한 작업만 진행한다.
- [ ] 구현 PR 또는 작업 로그에는 "기존 구현 재사용", "이동/문구 수정", "신규 구현"을 구분해서 기록한다.

## Task 1: PRD와 엔지니어링 스펙 정정

**Files:**

- Modify: `docs/prd/PHASE2_PRD_KR.md`
- Modify: `docs/prd/PHASE2_ENGINEERING_SPEC_KR.md`
- Modify: `docs/prd/PHASE2_PRD.md`
- Modify: `docs/prd/PHASE2_ENGINEERING_SPEC.md`

- [ ] 기존 문서에서 Step5 compare surface가 항상 보인다는 내용을 제거한다.
- [ ] Step5의 역할을 `결과 상세 확인 화면`으로 다시 정의한다.
- [ ] 비교 기능은 `근무표안 비교` 버튼을 통해 별도 팝업/drawer에서 진행한다고 문서화한다.
- [ ] Step4의 기존 결과 분기 규칙을 문서화한다.
- [ ] `version` 중심 설명을 사용자-facing 문서에서는 `근무표안` 중심 설명으로 바꾼다.
- [ ] 엔지니어링 스펙에는 내부 구현 용어로 `schedule_versions`를 유지하되, 화면 copy에서는 `근무표안`을 사용한다고 명시한다.
- [ ] 문서 변경 후 `rg -n "always visible|Compare Surface|Review Hub|preview|selected version" docs/prd`로 남은 낡은 표현을 확인한다.

## Task 2: Step4 진입 분기와 사용자 친화 문구 정리

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue`
- Test: `tests/unit/step4-initial-data.spec.ts`

- [ ] Step4 로드 시 현재 조직/월의 schedule ensure/compare 결과를 확인한다.
- [ ] 실행 이력이 없으면 기존 Off 입력 화면을 바로 보여준다.
- [ ] 실행 이력이 있으면 입력 화면 전에 선택 모달을 보여준다.
  - `기존 결과 보기`: Step5로 이동한다.
  - `요청 수정해서 새 근무표안 만들기`: Step4에 머물며 현재 기준 Off 요청을 편집한다.
- [ ] 선택 modal 디자인은 다음을 따른다.
  - 제목: `이미 만든 근무표안이 있습니다`
  - 본문: `기존 결과를 먼저 확인하거나, Off 요청을 수정해 새 근무표안을 만들 수 있습니다.`
  - Primary action: `기존 결과 보기`
  - Secondary action: `요청 수정해서 새 근무표안 만들기`
  - 닫기/X는 제공하지 않는다. 사용자는 두 branch 중 하나를 명시적으로 선택해야 한다.
  - initial focus는 primary action에 둔다.
- [ ] 모달과 버튼 문구에서 `버전`, `실행 이력`, `preview`, `selected` 같은 개발자 용어를 제거한다.
- [ ] `intent=edit-off` query가 있으면 사용자가 이미 수정을 선택한 것으로 보고 모달을 다시 열지 않는다.
- [ ] `기존 결과 보기`는 기본 결과 focus만 가지고 Step5로 이동한다. 기본 비교 query는 붙이지 않는다.
- [ ] Step4 page header는 modal 뒤에서도 "조직명 + 대상 월 + 사전 Off 요청 입력"을 유지해 사용자가 현재 월을 잃지 않게 한다.
- [ ] 단위 테스트를 추가한다.
  - 기존 결과 없음: 모달 없이 Off 입력 가능
  - 기존 결과 있음: 선택 모달 표시
  - 기존 결과 보기: Step5 route 이동
  - 수정 선택: `intent=edit-off`로 route replace 후 Step4 유지
  - Step4 진입만으로 새 근무표안을 생성하지 않음

## Task 3: Step4 새 근무표안 이름과 중복 정책 정리

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue`
- Modify: `src/types/schedule.ts`
- Modify: `src/api/schedule.ts`
- Modify: `supabase/functions/phase2-schedule/contracts.ts`
- Modify: `supabase/functions/phase2-schedule/repository.ts`
- Test: `tests/unit/step4-initial-data.spec.ts`
- Test: `tests/unit/phase2-schedule-contracts.spec.ts`
- Test: `tests/unit/phase2-schedule-api.spec.ts`
- Test: `tests/unit/phase2-schedule-write-repository.spec.ts`

- [ ] 새 생성 또는 재생성 전에 `근무표안 이름` 입력 모달을 연다.
- [ ] 첫 생성 기본 이름은 `1안` 또는 `A안` 중 하나로 통일한다. 추천 기본값은 `1안`.
- [ ] 다음 안 기본 이름은 현재 활성 근무표안 수 기준으로 `2안`, `3안`처럼 제안한다.
- [ ] 이름 modal 디자인은 다음을 따른다.
  - 제목: `새 근무표안 이름`
  - field label: `근무표안 이름`
  - placeholder: `예: 2안`
  - helper: `나중에 비교할 때 알아보기 쉬운 이름을 입력하세요.`
  - confirm: `이 이름으로 생성`
  - cancel: `취소`
  - initial focus는 input에 둔다.
- [ ] 이름은 `trim().toLowerCase()` 기준으로 중복 검사한다.
- [ ] 같은 이름의 정상 결과가 있으면 API 호출 전에 `이미 같은 이름의 근무표안이 있습니다.`를 보여준다.
- [ ] 같은 이름의 `solve_failed` 안이 있으면 `creationMode: 'overwrite'`와 `overwriteVersionId`로 기존 실패 안을 교체한다.
- [ ] 실패 안 교체 UI는 일반 overwrite처럼 보이지 않게 한다.
  - warning text: `같은 이름의 생성 실패 안이 있습니다. 이 입력으로 실패 안을 교체해 다시 생성합니다.`
  - confirm text: `실패 안 교체하고 생성`
  - 정상/확정/생성 중 안에는 이 confirm을 보여주지 않는다.
- [ ] 같은 이름의 확정/생성중/보관 안은 교체하지 않고 다른 이름 입력을 요구한다.
- [ ] backend도 동일 정책을 보장한다. frontend 검사를 우회해도 정상 결과 중복은 `version_name_exists`로 거부한다.
- [ ] 관련 테스트를 추가한다.
  - 빈 이름 차단
  - trim/case-insensitive 중복 차단
  - 정상 결과 중복 차단
  - `solve_failed` 중복 자동 overwrite
  - 생성 중/확정된 안 overwrite 차단

## Task 4: Step4 Off 요청 전체 초기화 버튼 추가

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue`
- Test: `tests/unit/step4-initial-data.spec.ts`

- [ ] Step4 하단 보조 액션 영역에 `모든 Off 요청 초기화` 버튼을 추가한다.
- [ ] 버튼은 primary 생성 action과 시각적으로 경쟁하지 않게 secondary/destructive tone으로 둔다. 기본 위치는 하단 왼쪽 보조 action group이다.
- [ ] 버튼은 현재 Off 요청, 메모, 정책 거부 표시, 미반영 draft, 임시 저장 상태를 모두 초기화한다.
- [ ] 클릭 시 확인 dialog를 띄운다.
  - 제목: `Off 요청을 모두 초기화할까요?`
  - 설명: `현재 입력한 Off 요청과 메모가 모두 지워집니다.`
  - 확인: `초기화`
  - 취소: `취소`
- [ ] destructive confirmation은 취소 버튼에 initial focus를 둔다.
- [ ] 초기화 후 캘린더와 요청 drawer가 같은 빈 상태를 바라보게 한다.
- [ ] localStorage 임시 저장도 현재 사용자/조직/월 scope에서 제거한다.
- [ ] 테스트를 추가한다.
  - 버튼 클릭 전 확인 dialog 표시
  - 확인 후 constraints/notes/policy 표시 초기화
  - 임시 저장 삭제 호출
  - 미반영 draft 상태 초기화

## Task 5: Step5 기본 화면을 결과 상세 전용으로 단순화

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Create or Modify: `src/components/schedule/review/*`
- Test: `tests/unit/step5-result.spec.ts`

- [ ] Step5 상단에서 비교 후보 shelf와 comparison workspace를 제거한다.
- [ ] 기본 화면은 다음 순서로 구성한다.
  - 조직명, 대상 월, 근무표 식별 정보
  - 현재 보는 근무표안 이름과 상태
  - 확정 가능 여부와 주요 차단 사유
  - 배정표/하드 제약/Off 요청 탭
  - 주요 액션 1개
  - 보조 액션: `근무표안 비교`, `엑셀 다운로드`, `입력 수정`
- [ ] 정보 위계는 "상태/결정 -> 근거 확인 -> 보조 작업" 순서로 보이게 한다. 배정표 grid가 첫 화면을 독점해 확정 가능 여부를 밀어내지 않게 한다.
- [ ] 기본 화면에서 반복 card grid를 만들지 않는다. 현재 안/선택한 안 context는 `FocusedVersionActionBar` 또는 동일 역할의 단일 decision strip으로 합친다.
- [ ] 상태별 lead panel copy를 정리한다.
  - `review_ready`: `확정할 수 있습니다`
  - `review_blocked`: `확정 전 확인이 필요합니다`
  - `review_pending`: `수정 후 다시 검사가 필요합니다`
  - `infeasible`: `현재 조건으로는 생성할 수 없습니다`
  - `solve_failed`: `생성 중 오류가 발생했습니다`
  - `solving`: `근무표를 생성하는 중입니다`
- [ ] `FocusedVersionActionBar` 문구를 사용자 친화적으로 바꾼다.
  - `현재 자세히 보는 안` -> `현재 보는 근무표안`
  - `현재 기준안` -> `선택한 근무표안`
  - `버전 확정` -> `이 근무표안 확정`
- [ ] primary action은 한 번에 하나만 visually primary로 둔다. 확정/재검사/다시 생성/선택 중 하나가 primary면 나머지는 secondary 또는 숨김 처리한다.
- [ ] Step5 route에 compare query가 있어도 기본 화면에 비교 UI를 바로 렌더링하지 않는다.
- [ ] compare query가 들어오면 선택/focus state만 해석하고, 비교 modal은 사용자가 `근무표안 비교`를 눌렀을 때만 연다.
- [ ] `version`/`compare` query는 transient UI hint로만 소비하고, hydrate 후 canonical Step5 route에서 제거한다. 권위 상태는 backend `selectedVersionId/finalizedVersionId`와 hub state다.
- [ ] Step5 initial load에서는 현재 보는 근무표안의 review만 불러온다. 비교 대상 review들은 modal을 열 때 lazy-load한다.
- [ ] 결과 없음 empty state는 `아직 생성 결과가 없습니다`만 보여주지 말고 왜 비어 있는지와 다음 action을 함께 제공한다.
- [ ] 단위 테스트를 추가한다.
  - Step5 기본 화면에 비교 후보 목록이 보이지 않음
  - compare query가 있어도 비교 modal이 자동으로 열리지 않음
  - Step5 initial load에서 비교 대상 review를 선로딩하지 않음
  - 결과 상세 정보가 schedule/organization 기준으로 표시됨
  - 상태별 primary action은 하나만 강조됨
  - `근무표안 비교` 버튼이 렌더링됨

## Task 6: 근무표안 비교 팝업/drawer 분리

**Files:**

- Create: `src/components/schedule/review/ScheduleCompareModal.vue`
- Modify: `src/views/schedule/Step5Result.vue`
- Reuse: `src/components/schedule/review/VersionCandidateShelf.vue`
- Reuse: `src/components/schedule/review/ComparisonWorkspace.vue`
- Test: `tests/unit/step5-result.spec.ts`
- Test: create `tests/unit/schedule-compare-modal.spec.ts` if component-level coverage is clearer

- [ ] Step5에 `근무표안 비교` 버튼을 추가한다.
- [ ] 버튼 클릭 시 넓은 `n-modal`을 연다.
- [ ] modal은 닫혀 있을 때 DOM에 남기지 않는다. 숨겨진 후보 목록/비교 grid가 keyboard order나 memory cost를 만들면 안 된다.
- [ ] modal sizing은 desktop 기준 `width: min(1180px, calc(100vw - 48px))`, body max-height `calc(100vh - 120px)`, 내부 scroll로 잡는다.
- [ ] 900px 미만에서는 같은 component가 full-screen에 가깝게 보이도록 `width: 100vw`, `height: 100vh`, safe padding을 적용한다.
- [ ] modal 안에서만 후보안 목록, 좌우 비교, 선택/자세히 보기/삭제를 제공한다.
- [ ] modal은 기존 `VersionCandidateShelf`와 `ComparisonWorkspace`를 감싸는 thin orchestrator여야 한다. 후보 정렬, compare id 정규화, 삭제 guard를 새로 복제하지 않는다.
- [ ] compare id helper가 추가로 필요하면 `Step5Result.vue`/modal local helper가 아니라 `src/utils/scheduleVersionResolver.ts`로 옮겨 재사용한다.
- [ ] modal 제목과 문구는 사용자 용어를 사용한다.
  - 제목: `근무표안 비교`
  - 설명: `여러 안의 결과를 비교하고 최종으로 볼 안을 선택하세요.`
- [ ] modal hierarchy는 `후보안 목록 -> 핵심 차이 -> 좌우 비교` 순서로 둔다. 좌우 비교보다 선택 가능한 후보 맥락이 먼저 보여야 한다.
- [ ] 후보안이 1개 이하이면 empty state를 보여준다.
  - 제목: `비교할 다른 근무표안이 없습니다`
  - 설명: `Off 요청을 수정해 새 근무표안을 만들면 여기에서 나란히 비교할 수 있습니다.`
  - action: `요청 수정해서 새 근무표안 만들기`
- [ ] modal에서 안을 선택하면 Step5 본문은 선택한 안의 결과로 갱신된다.
- [ ] modal을 닫아도 Step5 기본 화면에는 비교 UI가 남지 않는다.
- [ ] modal close 후 focus는 `근무표안 비교` 버튼으로 돌아온다.
- [ ] 후보 삭제 button은 `aria-label="근무표안 삭제"`를 갖고, 확정/생성 중/현재 보는 안에는 disabled reason이 보이게 한다.
- [ ] 테스트를 추가한다.
  - 버튼 클릭 전 modal 없음
  - 버튼 클릭 후 modal 표시
  - modal 안에서 후보 선택 가능
  - modal 닫기 후 Step5 기본 화면 유지
  - Teleport/focus 검증이 필요하면 Vue Test Utils `attachTo: document.body`와 cleanup을 사용

## Task 7: Step5 삭제 메뉴를 범위 선택 방식으로 정리

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Modify: `src/types/schedule.ts`
- Modify: `src/api/schedule.ts`
- Modify: `supabase/functions/phase2-schedule/contracts.ts`
- Modify: `supabase/functions/phase2-schedule/repository.ts`
- Migration: create only if current RPC cannot support all-version generated result reset
- Test: `tests/unit/step5-result.spec.ts`
- Test: `tests/unit/phase2-schedule-contracts.spec.ts`
- Test: `tests/unit/phase2-schedule-api.spec.ts`
- Test: `tests/unit/phase2-schedule-write-repository.spec.ts`

- [ ] Step5 하단에 `근무표 삭제` 버튼 하나만 둔다.
- [ ] `근무표 삭제`는 보조 action group의 가장 끝에 destructive ghost button으로 둔다. primary action과 같은 색/무게를 쓰지 않는다.
- [ ] 클릭 시 삭제 범위 선택 dialog/modal을 연다. 옵션은 radio group으로 보여주고, 선택 전 confirm button은 disabled다.
  - `선택한 안의 생성 결과 삭제`
  - `모든 안의 생성 결과 삭제`
  - `이번 달 근무표 전체 삭제`
- [ ] 각 option 아래에 삭제되는 범위를 한 줄로 설명한다.
  - 선택한 안: `현재 보는 근무표안의 배정 결과와 평가만 삭제합니다. Off 요청은 유지됩니다.`
  - 모든 안: `활성 근무표안의 생성 결과를 모두 삭제합니다. Off 요청은 유지됩니다.`
  - 월 전체: `이번 달 근무표와 Off 요청을 모두 삭제하고 근무표 관리로 이동합니다.`
- [ ] 확정된 근무표가 있으면 삭제 메뉴를 차단하고 `확정된 근무표는 삭제할 수 없습니다.`를 보여준다.
- [ ] 생성 중인 안이 있으면 삭제 메뉴를 차단한다.
- [ ] 차단 상태에서는 삭제 option을 보여주지 말고 blocked explanation과 `확인` 버튼만 보여준다.
- [ ] destructive modal은 취소 button에 initial focus를 둔다.
- [ ] `선택한 안의 생성 결과 삭제`는 현재 보는 근무표안의 current-month assignments, 평가 결과, solver 상태만 초기화한다. Off 요청은 유지한다.
- [ ] `모든 안의 생성 결과 삭제`는 활성 근무표안들의 생성 결과를 모두 초기화하고, Step4에서 다시 요청을 수정할 수 있는 상태로 보낸다.
- [ ] `모든 안의 생성 결과 삭제`는 frontend에서 version별 API를 반복 호출하지 않는다. backend에서 한 번의 atomic operation으로 처리한다.
- [ ] `이번 달 근무표 전체 삭제`는 기존 schedule 전체 삭제 경로를 사용한다. Off 요청도 함께 삭제되고 홈으로 이동한다.
- [ ] `DeleteGeneratedResultsRequest`는 scope를 명시한다.
  - 선택한 안: `{ scope: 'selected_version', sourceVersionId }`
  - 모든 안: `{ scope: 'all_active_versions' }`
- [ ] backend parser/repository/RPC는 같은 scope contract를 검증한다.
  - `selected_version`은 `sourceVersionId`가 없으면 `bad_request`
  - `all_active_versions`는 확정본/생성중 안이 있으면 conflict
  - 두 scope 모두 Off 요청을 삭제하지 않음
- [ ] 테스트를 추가한다.
  - 삭제 버튼 클릭 후 3개 옵션 표시
  - 확정본 있으면 삭제 차단
  - 생성 중이면 삭제 차단
  - 선택한 안만 삭제 API 호출
  - 모든 안 결과 삭제 API 호출
  - 전체 삭제 API 호출
  - backend scope parser와 conflict mapping

## Task 8: 사용자-facing 용어 정리

**Files:**

- Modify: `src/utils/scheduleReviewCopy.ts`
- Modify: Step4/Step5 related Vue components
- Test: existing affected unit tests

- [ ] 화면 문구에서 아래 용어를 제거하거나 사용자 용어로 대체한다.
  - `version` -> `근무표안`
  - `preview` -> `현재 보는 안`
  - `selected` -> `선택한 안`
  - `compare` -> `비교`
  - `solver failed` -> `생성 실패`
  - `review blocked` -> `확인 필요`
- [ ] 사용자-facing copy에서 `기준안`은 꼭 필요한 경우에만 쓰고, 기본 표기는 `선택한 근무표안`으로 통일한다.
- [ ] `V1`, `V2` fallback이 화면에 노출되는 경우에도 label 앞뒤에 설명을 붙인다. 예: `근무표안 V2`.
- [ ] `덮어쓰기`는 정상 안에는 쓰지 않는다. 실패 안 재사용에는 `실패 안 교체`로 표현한다.
- [ ] 개발자 로그와 API 타입 이름은 유지해도 된다.
- [ ] 테스트 assertion의 사용자 문구를 새 copy에 맞춘다.
- [ ] `rg -n "버전|preview|selected|solver|review blocked|compare" src/views src/components src/utils`로 남은 노출 문구를 점검한다.

## Verification

- [ ] Unit tests:

```bash
pnpm test:unit -- tests/unit/step4-initial-data.spec.ts tests/unit/step5-result.spec.ts tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-api.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
```

- [ ] Focused component tests if created:

```bash
pnpm test:unit -- tests/unit/schedule-compare-modal.spec.ts
```

- [ ] Lint:

```bash
pnpm lint:check
```

- [ ] E2E smoke after implementation:

```bash
pnpm test:e2e -- tests/e2e/schedule-workflow.spec.ts
```

- [ ] Focused Step4/Step5 E2E if added or updated:

```bash
pnpm test:e2e -- tests/e2e/step5-review-hub.spec.ts tests/e2e/step5-finalized-readonly.spec.ts
```

- [ ] Post-implementation design QA:

```bash
/design-review
```

- [ ] Manual UI checks after implementation:
  - Step4 기존 결과 modal에서 primary/secondary action copy와 focus order 확인
  - Step4 이름 modal에서 정상 중복, 실패 안 교체, 빈 이름 validation 확인
  - Step5 기본 화면에서 비교 UI가 상시 노출되지 않는지 확인
  - Step5 비교 modal의 desktop width, small viewport fallback, close 후 focus return 확인
  - Step5 삭제 modal에서 각 삭제 범위 설명과 확정/생성 중 차단 상태 확인

## Acceptance Criteria

- Step4에서 기존 결과가 있으면 사용자는 먼저 `기존 결과 보기`와 `요청 수정해서 새 근무표안 만들기` 중 하나를 선택한다.
- Step4에서 새 요구사항을 저장할 때 사용자는 근무표안 이름을 입력한다.
- 정상 결과가 있는 같은 이름은 중복으로 차단된다.
- 실패한 같은 이름은 기존 실패 안을 교체한다.
- Step4 하단에서 모든 Off 요청을 한 번에 초기화할 수 있다.
- Step5 기본 화면은 결과 상세에 집중하고 비교 UI를 상시 노출하지 않는다.
- Step5 비교는 `근무표안 비교` 버튼을 눌렀을 때만 열린다.
- Step5 삭제는 범위를 선택하게 하며 확정본 삭제는 차단한다.
- 사용자 화면에는 개발자/엔지니어 중심 용어가 보이지 않는다.
- Step4/Step5 modal은 focus trap, initial focus, close 후 focus return, 44px 이상 touch target을 만족한다.
- Step5 기본 화면은 "현재 보는 근무표안 상태 -> 확정 가능 여부 -> 근거 확인 -> 보조 작업" 순서로 읽힌다.
- 반복 card grid나 장식성 gradient 없이 `DESIGN.md`의 calm operational app UI 방향을 유지한다.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status      | Findings                                                                                                                                           |
| ------------- | --------------------- | ------------------------------- | ---- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | —           | —                                                                                                                                                  |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | —           | —                                                                                                                                                  |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 1    | clean       | 10 issues resolved in-plan: route query semantics, lazy compare loading, delete scope contract, atomic reset, test coverage diagram, failure modes |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 1    | issues_open | score: 6/10 → 8.5/10, design decisions added for hierarchy, states, modal behavior, responsive/a11y                                                |

**UNRESOLVED:** 2 deferred design decisions: small-screen compare fallback validation, optional typed confirmation for full-month delete. Eng review has no unresolved implementation decisions.

**VERDICT:** ENG CLEARED — ready to implement after accepting the two already-deferred design follow-ups as post-implementation QA items.
