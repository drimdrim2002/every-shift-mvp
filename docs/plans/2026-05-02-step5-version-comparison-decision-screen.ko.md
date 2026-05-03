# Step5 근무표안 비교 판단 화면 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step5의 근무표안 비교 화면을 “버전 선택/미리보기”가 아니라 “Off 요청 차이와 필수 기준 충족 여부를 보고 확정 후보를 판단하는 화면”으로 재구성한다.

**Architecture:** 비교 판단 로직은 유틸에서 view model로 만든 뒤, `ComparisonWorkspace.vue`는 그 view model을 표시한다. 기존 modal lazy-load, 후보 선택, preview/focus 전환 흐름은 유지하고, 생성된 근무표는 보조 CTA로만 접근하게 한다.

**Tech Stack:** Vue 3, TypeScript, Vite, Tailwind CSS, Naive UI, Vitest.

---

## Summary

현재 비교 화면은 상태, 수정 횟수, 미리보기 여부 중심이라 사용자가 “어느 안이 더 좋은가”를 판단하기 어렵다. 새 화면은 아래 우선순위로 정보를 보여준다.

1. Off 요청 입력이 버전별로 어떻게 달라졌는가
2. 각 버전이 Mandatory/Optional 요구사항을 얼마나 충족했는가
3. 필요할 때 각 버전의 생성 근무표를 자세히 볼 수 있는가

이번 구현에서는 API schema를 바꾸지 않는다. 직원/날짜 단위 Off diff는 현재 응답에 없으므로 `inputDiffSummary.changedOffRequests`와 `note` 기반 요약만 표시한다.

## Key Decisions

- `ComparisonWorkspace.vue`가 비교 판단 화면의 중심이다.
- `VersionCandidateShelf.vue`는 비교할 버전 2개를 고르는 후보 shelf 역할만 유지한다.
- `VersionCompareSurface.vue`와 `ComparisonToolsSection.vue`는 기존 역할을 유지하되, 핵심 비교 정보는 추가하지 않는다.
- Mandatory 기준은 현재 프론트가 받을 수 있는 `proofSummary`와 `comparisonMetrics`에서 계산한다.
- Backend evaluator가 아직 일부 legal proof 값을 0으로만 채울 수 있어도, 프론트는 해당 필드를 신뢰해서 표시한다. evaluator 고도화는 별도 과제로 분리한다.
- 비교할 2개 안이 이미 선택된 상태에서는 modal의 첫 판단 영역이 `ComparisonWorkspace.vue`여야 한다. 후보 shelf는 비교 대상을 바꾸는 보조 컨트롤로 낮춘다.

## Design Consultation 보강

**Review verdict:** 이 계획은 방향은 맞지만, 원문만으로는 구현자가 화면 위계와 시각 톤을 임의로 결정할 여지가 있었다. `/design-consultation` 관점의 보강 후 목표 완성도는 **9/10**이다. 10/10은 구현 후 실제 화면 캡처 기반 `/design-review`에서 spacing, scroll, focus, contrast를 확인해야 달성한다.

### Product Context

- 이 화면은 APP UI다. 운영자가 여러 근무표안을 빠르게 읽고 “확정 후보로 볼 수 있는가”를 판단하는 업무 화면이다.
- `DESIGN.md`의 Step5 원칙을 따른다: decision status first, compare context second, proof/detail third.
- 이 화면의 첫 3초 목표는 “어느 안이 더 안전한지 알겠다”이지 “어떤 버전을 선택했는지 알겠다”가 아니다.
- 사용자-facing copy는 한국어이고, 내부 용어인 `version`, `preview`, `focus`는 화면에 노출하지 않는다. UI에서는 `근무표안`, `비교할 안`, `자세히 보기`를 쓴다.

### Aesthetic / Layout Contract

- **Aesthetic:** calm operational product. 장식보다 정보 순서가 신뢰를 만든다.
- **Decoration:** intentional/minimal. 새 gradient, decorative icon card grid, dashboard mosaic, marketing hero pattern을 추가하지 않는다.
- **Layout:** grid-disciplined decision workspace. 카드 갤러리가 아니라 판단 문서처럼 읽혀야 한다.
- **Color:** restrained neutral + semantic status. 통과/위반/정보 없음은 색과 텍스트를 함께 쓰며, 새 `sky-*` 계열을 판단 색으로 확산하지 않는다. 가능하면 `DESIGN.md`의 accent/semantic token intent에 맞춘다.
- **Typography:** `Pretendard Variable` 기본, 수치/비율/버전 번호 같은 inspectable metadata에는 기존 설계처럼 mono accent를 제한적으로 쓴다.
- **Spacing:** `8px` scale을 유지한다. Step5 compare/review는 major region 간 `lg`, section 내부 `md`를 기본으로 한다.

### Safe Choices

- Mandatory/Optional을 행 단위로 나란히 비교한다. 사용자는 병원 운영 기준표처럼 같은 기준을 좌우로 비교하길 기대한다.
- 생성된 근무표는 `이 근무표안 자세히 보기`로 접근한다. 판단 전에는 전체 배정표보다 Off/필수 기준 충족 여부가 먼저다.
- empty/error/loading은 modal 내부에서 처리하고 Step5 본문은 유지한다. 비교가 실패해도 결과 상세 화면까지 흔들면 안 된다.

### Product Risks Worth Taking

- **Risk 1: 후보 shelf를 첫 화면 주인공에서 내린다.** 기존 구현 관성상 후보 card가 먼저 보이기 쉽지만, 이번 화면의 차별점은 후보 선택이 아니라 확정 판단이다. 비용은 후보 변경 affordance가 덜 눈에 띌 수 있다는 점이고, 이득은 사용자가 바로 결론을 읽는다는 점이다.
- **Risk 2: 상태/수정 횟수보다 검증 행을 우선한다.** 기존 상태 chip은 익숙하지만 “수정 2회”는 확정 판단의 1차 근거가 아니다. 비용은 기존 card 정보의 존재감이 줄어드는 것이고, 이득은 Mandatory 위반/Off 반영률이 의사결정 중심에 선다는 점이다.
- **Risk 3: 직원/날짜 단위 diff를 흉내 내지 않는다.** 현재 API에 없는 세부 diff를 UI가 추정하면 신뢰를 잃는다. 비용은 비교가 덜 상세해 보이는 것이고, 이득은 거짓 정밀도를 피한다는 점이다.

### First Viewport Information Order

비교 modal이 열렸고 비교할 2개 안이 있는 경우 첫 viewport는 아래 순서를 따라야 한다.

```text
근무표안 비교
  1. 짧은 안내: Off 요청 차이와 필수 기준 충족 여부를 비교
  2. 핵심 판단: 2-3개 bullet
  3. Off 요청 입력 차이
  4. 요구사항 충족 비교
  5. 비교 대상 변경 / 후보 shelf
  6. 각 근무표안 자세히 보기
```

비교할 안이 0개 또는 1개뿐이면 후보/empty state가 먼저 와도 된다. 이 경우 사용자의 현재 일은 “판단”이 아니라 “비교 대상 만들기”이기 때문이다.

### State and Accessibility Contract

| State                       | UI requirement                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| 두 안 선택됨                | `핵심 판단`과 요구사항 비교가 candidate shelf보다 먼저 보인다.                                    |
| 한쪽 review 없음            | 해당 열은 `검토 정보 없음`으로 표시하고 통과처럼 보이지 않게 한다.                                |
| 둘 다 review 없음           | 판단 bullet은 neutral copy로 제한하고 상세 행은 unknown 상태를 유지한다.                          |
| Off 요청 total 0            | `요청 없음`으로 표시하고 실패/통과로 과장하지 않는다.                                             |
| `offRequestResults` 없음    | `comparisonMetrics.offRequestReflectionRate` fallback을 쓰되 fallback임을 copy가 과장하지 않는다. |
| evaluator 값이 0으로 채워짐 | 프론트는 현재 응답을 신뢰해 표시하되, backend evaluator 고도화는 별도 과제로 둔다.                |
| loading/error               | modal body 내부에서 section-local loading/error를 보여주고 Step5 본문은 유지한다.                 |

- 상태 chip은 색만으로 의미를 전달하지 않는다. `통과`, `위반 2건`, `정보 없음` 같은 텍스트를 항상 함께 둔다.
- 비교 행은 keyboard/screen reader에서 좌/우 의미가 사라지지 않게 label, left, right 순서를 유지한다.
- 버튼은 `이 근무표안 자세히 보기`처럼 목적어가 있는 문구를 쓰고, icon-only affordance를 추가하면 `aria-label`을 둔다.
- modal close 후 focus는 `근무표안 비교` trigger로 돌아와야 한다. 기존 Naive UI 동작으로 충분한지 테스트에서 확인한다.
- 900px 미만에서는 2열 비교가 1열/stack으로 바뀌어도 정보 순서는 유지한다. 767px 이하에서는 horizontal overflow를 허용하되 close/confirm/cancel 계열 touch target은 44px 이상을 유지한다.

### Not in Scope

- 직원/날짜 단위 Off diff API 추가
- backend evaluator 고도화
- Step5 기본 화면 전체 redesign
- 모바일 전용 비교 UX
- 새로운 design system, 새 폰트, 새 색상 팔레트 도입

## Plan Design Review 보강

**Review status:** `/plan-design-review` 관점에서 이 계획은 UI scope가 명확한 APP UI 변경이다. 초기 design completeness는 **7/10**이었다. 방향과 주요 위계는 좋지만, 구현자가 interaction states, responsive behavior, screen-reader order, card 사용 범위, 후보 shelf의 시각 강도를 임의로 해석할 여지가 있었다. 아래 보강 후 목표 점수는 **9/10**이다. 10/10은 구현 후 실제 캡처 기반 `/design-review`에서 spacing, scroll, focus, contrast를 확인해야 달성한다.

### System Audit

- Original plan review 당시 기록된 branch: `main`
- Recent implementation context: Step4/Step5 result flow와 comparison surface가 최근 단순화되었다.
- `DESIGN.md`: 존재한다. 모든 색, 밀도, typography, responsive, state decision은 이 문서에 맞춘다.
- `TODOS.md`: repo root에 별도 파일이 없다. 이번 review에서 발견한 design debt는 TODO로 넘기지 않고 이 plan 안에 직접 반영한다.
- Existing pattern leverage:
  - `ScheduleCompareModal.vue`는 lazy-loaded modal boundary와 loading/error/empty handling을 이미 가진다.
  - `ComparisonWorkspace.vue`는 비교 판단 workspace의 주 렌더링 대상이다.
  - `VersionCandidateShelf.vue`는 후보 선택/삭제/기준안 선택 action을 이미 가진다.
  - `VersionCompareSurface.vue`는 Step5 기본 화면의 preview 전환용 표면으로 유지한다.
  - `ComparisonToolsSection.vue`는 Step5 기본 화면의 접기/펼치기 shell로 유지한다.

### Design Scope Assessment

- **Classifier:** APP UI. 이 화면은 운영자가 병동 근무표 후보를 판단하는 작업 surface다. landing-page hero, marketing card grid, decorative motion rules는 적용하지 않는다.
- **Primary design question:** "어느 근무표안이 확정 후보로 안전한가?"
- **Secondary design question:** "필요하면 어떤 근무표안을 자세히 열어볼 것인가?"
- **Not the design question:** "몇 개 후보가 있고 어떤 카드가 선택되어 있는가?" 후보 선택은 중요하지만 첫 판단 근거가 아니다.

### Information Architecture

비교할 2개 안이 선택된 modal은 아래 DOM/visual 순서를 지킨다. 테스트도 이 순서를 검증한다.

```text
+--------------------------------------------------------------------------------+
| Modal header: 근무표안 비교                                                    |
| Helper copy: Off 요청 차이와 필수 기준 충족 여부를 비교한 뒤 자세히 확인       |
+--------------------------------------------------------------------------------+
| ComparisonWorkspace                                                            |
|   1. 핵심 판단                                                                 |
|      - 2-3개 결론형 bullet                                                     |
|      - review 없음/unknown이면 neutral copy                                    |
|                                                                                |
|   2. Off 요청 입력 차이                                                        |
|      - 변경 Off 요청 수                                                        |
|      - 변경 메모                                                               |
|      - 데이터 없음/요청 없음 state                                             |
|                                                                                |
|   3. 요구사항 충족 비교                                                        |
|      - Mandatory rows                                                          |
|      - Optional rows                                                           |
|      - left/right values in same labeled row                                   |
|                                                                                |
|   4. 보조 detail action                                                        |
|      - 이 근무표안 자세히 보기                                                 |
+--------------------------------------------------------------------------------+
| 비교 대상 변경                                                                 |
|   - VersionCandidateShelf                                                       |
|   - 후보 추가/제거/삭제/기준안 사용                                            |
+--------------------------------------------------------------------------------+
```

비교 대상이 0개 또는 1개뿐이면 empty/candidate shelf가 먼저 올 수 있다. 이때 사용자의 현재 작업은 비교 판단이 아니라 비교 대상 만들기다.

### Interaction State Coverage

| Feature              | Loading                                                                    | Empty                                                                              | Error                                                                              | Success                                                      | Partial                                                              |
| -------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| Compare modal shell  | modal body 안에 spinner와 `비교할 근무표안 정보를 불러오는 중입니다.` 표시 | 후보가 1개 이하이면 현재 empty state + `요청 수정해서 새 근무표안 만들기` CTA 유지 | `근무표안 비교를 불러오지 못했습니다` alert와 `다시 시도` 버튼                     | modal은 닫지 않고 판단 workspace를 보여준다                  | Step5 본문 상태는 유지하고 modal 내부만 바뀐다                       |
| 핵심 판단            | review payload가 로딩 중이면 summary를 렌더하지 않고 modal loading에 포함  | 두 안이 선택되지 않았으면 `비교할 근무표안을 하나 더 선택하세요`                   | review fetch 실패는 modal error로 흡수                                             | 2-3개 결론형 bullet 표시                                     | 한쪽 review 없음이면 `검토 정보 없음`을 포함한 neutral bullet만 허용 |
| Off 요청 입력 차이   | modal loading에 포함                                                       | changed off count가 없으면 `변경된 Off 요청 정보가 없습니다` 표시                  | input diff parse 실패 시 빈 값처럼 숨기지 말고 `변경 정보를 읽을 수 없습니다` 표시 | 변경 수와 note를 행 단위로 표시                              | total 0은 `요청 없음`으로 표시하고 실패/통과로 보이지 않게 한다      |
| 요구사항 충족 비교   | modal loading에 포함                                                       | review가 없으면 각 cell은 `검토 정보 없음`                                         | 계산 중 예외는 해당 cell `정보 없음` + 테스트 fixture 추가                         | `통과`, `위반 N건`, `N건 중 M건 반영 (P%)` visible text 표시 | 한쪽만 review 있으면 다른 쪽은 unknown column으로 유지               |
| 비교 대상 변경 shelf | modal loading 이후 렌더                                                    | 후보가 충분하지 않으면 empty CTA가 shelf를 대체                                    | shelf action 실패는 기존 Step5 action error path를 유지                            | 후보 추가/제거/기준안 사용 state chip 업데이트               | locked version이 있으면 잠김 chip과 disabled controls 유지           |
| 자세히 보기 action   | button 자체 loading은 추가하지 않는다                                      | version이 없으면 button을 렌더하지 않는다                                          | focus 전환 실패 시 기존 error handling 사용                                        | focus된 근무표안 detail로 이동하고 modal 안 상태 문구 갱신   | close 후 focus는 `근무표안 비교` trigger로 돌아간다                  |

### User Journey & Emotional Arc

| Step | User does                         | User feels                               | Plan specifies                                      |
| ---- | --------------------------------- | ---------------------------------------- | --------------------------------------------------- |
| 1    | `근무표안 비교` modal을 연다      | "두 안 중 어느 쪽이 안전하지?"           | 첫 화면이 후보 card가 아니라 핵심 판단으로 시작한다 |
| 2    | 핵심 판단 bullet을 읽는다         | "대략 결론을 알겠다"                     | 결론형 copy와 unknown copy를 구분한다               |
| 3    | Off 요청 입력 차이를 확인한다     | "왜 결과가 달라졌는지 알겠다"            | API에 없는 직원/날짜 diff를 꾸며내지 않는다         |
| 4    | Mandatory/Optional row를 비교한다 | "확정 가능 여부를 신뢰할 수 있다"        | 같은 기준을 좌/우 같은 행에서 비교한다              |
| 5    | 필요한 안을 자세히 연다           | "결정 전에 전체 근무표를 확인할 수 있다" | detail CTA는 보조 action으로만 둔다                 |
| 6    | 후보를 바꾼다                     | "다른 안도 같은 기준으로 볼 수 있다"     | 후보 shelf는 `비교 대상 변경` 영역으로 낮춘다       |

5-second target: 사용자는 첫 화면에서 더 안전한 후보와 주요 불확실성을 읽는다.  
5-minute target: 사용자는 Off 변경, 필수 기준, 자세히 보기 사이를 왕복해 최종 확정 후보를 고른다.  
5-year trust target: UI가 없는 데이터를 꾸며내지 않고 `검토 정보 없음`을 정직하게 보여준다는 신뢰를 만든다.

### AI Slop Risk Assessment

- Hard rejection risk: **app UI made of stacked cards instead of layout**. 해결: `ComparisonWorkspace`는 하나의 outer panel 안에서 section band와 row table로 구성하고, `n-card` 반복이나 카드 안 카드 구조를 늘리지 않는다.
- Hard rejection risk: **dashboard-card mosaic**. 해결: 후보 shelf는 하단 보조 control이고, 판단 surface는 문서형/표형 hierarchy를 따른다.
- Hard rejection risk: **icons in colored circles / decorative gradients**. 해결: 새 장식 icon, gradient, blob, hero-like section을 추가하지 않는다.
- Litmus check:
  - Brand/product unmistakable in first screen? **YES**: `근무표안 비교`, Off 요청, 필수 기준이 즉시 보인다.
  - One strong visual anchor present? **YES**: `핵심 판단` + 요구사항 비교 table이 anchor다.
  - Page understandable by scanning headlines only? **YES**: `핵심 판단`, `Off 요청 입력 차이`, `요구사항 충족 비교`, `비교 대상 변경`.
  - Each section has one job? **YES**: 판단, 입력 차이, 요구사항, 후보 변경을 분리한다.
  - Cards actually necessary? **PARTIAL**: 후보 shelf card는 interaction이므로 허용한다. 판단 정보는 card grid가 아니라 row/table로 구현한다.
  - Motion improves hierarchy? **N/A**: 새 motion은 추가하지 않는다. 기존 expand/collapse/focus transitions만 유지한다.
  - Premium without decorative shadows? **YES**: hierarchy는 spacing, type, row grouping, semantic status로 만든다.

### Design System Alignment

- Use `DESIGN.md` Step5 principle: decision status first, compare context second, proof/detail third.
- Typography:
  - Korean copy: project font stack `Pretendard Variable`.
  - Version labels, counts, percentages: `font-mono` 또는 기존 mono accent만 제한적으로 사용.
- Color:
  - Pass: success semantic intent (`emerald`/success token).
  - Fail: error semantic intent (`rose`/error token).
  - Unknown: neutral/slate.
  - Focus/selection affordance can keep existing `sky` usage, but pass/fail judgment must not use `sky`.
- Spacing:
  - Major regions: `lg` gap.
  - Section internal spacing: `md`.
  - Table/row compact spacing: `xs-sm`.
- Surface:
  - One outer workspace panel.
  - Section bands or row groups inside it.
  - Candidate shelf can remain card-based because each card is an actionable candidate.

### Responsive & Accessibility

- Desktop is the primary target. Step5 compare mode is not mobile-first.
- `>= 900px`: left/right values can sit in a 3-column row: criterion label, left value, right value.
- `< 900px`: each criterion row stacks as label first, then left/right values with repeated labels so screen-reader and visual meaning remain clear.
- `<= 767px`: modal may use horizontal overflow for dense comparison, but close/action buttons keep at least 44px touch target.
- Keyboard:
  - Candidate cards acting as controls must remain keyboard reachable.
  - `focus-visible` ring must be visible on compare, detail, select, delete, retry, close actions.
  - DOM order must match visual decision order: summary -> Off diff -> requirement rows -> detail actions -> shelf.
- Screen readers:
  - Requirement rows expose criterion label before left/right values.
  - Icon-only delete stays `aria-label="이 근무표안 삭제"`.
  - Detail buttons include the object: `이 근무표안 자세히 보기`.
- Contrast:
  - Essential warnings and disabled/finalization blockers must not use muted text only.
  - `정보 없음` is neutral but still readable at WCAG AA body-text target.

### Unresolved Design Decisions

No open design decisions remain for this plan. The review locks these choices:

1. `ComparisonWorkspace` appears before `VersionCandidateShelf` when two plans are selected.
2. Mandatory/Optional comparison is row/table-first, not card-grid-first.
3. Unknown review data is shown as `검토 정보 없음`, never inferred as pass.
4. Off detail only uses current API fields; no fake employee/date diff.
5. Candidate shelf remains interactive card UI because the card itself is the selection/delete/select interaction.
6. Mobile-specific redesign is out of scope; narrow behavior preserves order and readability only.

### NOT in scope

- 직원/날짜 단위 Off diff: current API does not provide it, and fake precision would reduce trust.
- New backend evaluator semantics: this plan consumes current proof values and leaves evaluator improvement separate.
- Step5 default page redesign: this plan changes the compare modal/workspace only.
- Dedicated mobile compare UX: Step5 compare is desktop-first in `DESIGN.md`.
- New design tokens, fonts, or palette: `DESIGN.md` remains source of truth.

### TODOS.md updates

No `TODOS.md` update is proposed. The discovered design gaps are directly captured in this implementation plan, so deferring them would create unnecessary design debt.

### Design Review Completion Summary

```text
+====================================================================+
|         DESIGN PLAN REVIEW - COMPLETION SUMMARY                    |
+====================================================================+
| System Audit         | DESIGN.md exists, Step5 compare modal scope |
| Step 0               | 7/10 initial, APP UI, focus: IA/states/a11y |
| Pass 1  (Info Arch)  | 7/10 -> 9/10 after hierarchy diagram        |
| Pass 2  (States)     | 6/10 -> 9/10 after state matrix             |
| Pass 3  (Journey)    | 7/10 -> 9/10 after journey storyboard       |
| Pass 4  (AI Slop)    | 7/10 -> 9/10 after hard-risk constraints    |
| Pass 5  (Design Sys) | 8/10 -> 9/10 after token/surface alignment  |
| Pass 6  (Resp/A11y)  | 6/10 -> 9/10 after viewport/a11y contract   |
| Pass 7  (Decisions)  | 6 resolved, 0 deferred                      |
+--------------------------------------------------------------------+
| NOT in scope         | written (5 items)                           |
| What already exists  | written                                     |
| TODOS.md updates     | 0 items proposed                            |
| Decisions made       | 6 added to plan                             |
| Decisions deferred   | 0                                           |
| Overall design score | 7/10 -> 9/10                                |
+====================================================================+
```

Plan is design-complete for implementation. Run `/design-review` after implementation for visual QA.

## Plan Eng Review 보강

**Review verdict:** `/plan-eng-review` 관점에서 이 계획은 구현 가능한 범위다. 다만 원문은 UI 위계와 구현 task는 충분했지만, 데이터 흐름, 실패 모드, 정확한 테스트 coverage, 성능 경계가 구현자 해석에 남아 있었다. 아래 보강 후 engineering completeness는 **9/10**이다. 10/10은 구현 후 `pnpm lint:check`와 targeted Vitest, 필요 시 Step5 compare E2E까지 통과해야 달성한다.

### Step 0: Scope Challenge

1. **What already exists**
   - `ScheduleCompareModal.vue`: modal lazy-load boundary, loading/error/empty state, retry/request-edit action을 이미 가진다. 이번 계획은 이 shell을 재사용하고 modal-local 상태만 조정한다.
   - `useScheduleReviewHub.ts`: `compareVersionIds`, `comparedReviews`, `leftComparedVersion`, `rightComparedVersion`, `leftComparedReview`, `rightComparedReview`를 이미 만든다. 이번 계획은 이 flow를 건드리지 않는다.
   - `scheduleComparisonSummary.ts`: 비교 bullet 생성 유틸이 이미 있다. 새 decision model은 같은 파일에 추가해 파생 판단 로직을 한 곳에 둔다.
   - `ComparisonWorkspace.vue`: 현재 comparison display boundary다. 이번 계획은 이 컴포넌트를 판단 workspace로 재구성한다.
   - `VersionCandidateShelf.vue`, `VersionCompareSurface.vue`, `ComparisonToolsSection.vue`: 후보 선택, 기본 Step5 preview surface, 접기/펼치기 shell을 이미 제공한다. 새 지표를 여기에도 복제하지 않는다.
   - Existing tests: `schedule-comparison-summary.spec.ts`, `comparison-workspace.spec.ts`, `schedule-compare-modal.spec.ts`, `version-candidate-shelf.spec.ts`, `step5-review-hub.spec.ts`가 주요 회귀 지점을 이미 잡고 있다.

2. **Minimum change set**
   - Required: `scheduleComparisonSummary.ts`, `ComparisonWorkspace.vue`, `ScheduleCompareModal.vue`, 관련 unit tests.
   - Inspect only: `VersionCandidateShelf.vue`, `VersionCompareSurface.vue`, `ComparisonToolsSection.vue`.
   - Not required: store/composable/API/schema/router 변경. 이 중 하나라도 수정이 필요해지면 scope creep로 보고 근거를 남긴다.

3. **Complexity check**
   - Planned write scope는 production 3 files + tests 3 files다. 8 files 초과 또는 2개 초과 service/class 추가 smell에 걸리지 않는다.
   - 새 abstraction은 `buildScheduleComparisonDecisionModel` 1개뿐이며, UI template에 계산식을 흩뿌리지 않기 위한 최소 추출이다.

4. **Search check**
   - **[Layer 1] Vue computed/view-model pattern:** Vue 공식 문서는 복잡한 template logic은 computed 또는 파생 상태로 빼는 것을 권장한다. 이번 계획은 `ComparisonWorkspace.vue` template이 아니라 pure utility + computed에서 판단 model을 만든다.
   - **[Layer 1] Vue conditional/list rendering:** row/table rendering은 `v-for` key를 stable label/group 기반으로 두고, conditional state는 `unknown` cell copy로 표현한다. user-editable field를 key로 쓰지 않는다.
   - No new infrastructure, concurrency primitive, package, artifact, or distribution pipeline is introduced.

5. **TODOS cross-reference**
   - Repo root `TODOS.md`는 없다. 이 계획에서 발견한 필수 구현/검증 항목은 TODO로 넘기지 않고 plan 안에 직접 반영한다.

6. **Completeness check**
   - Shortcut risk는 “happy path UI만 바꾸고 unknown/error/fallback tests를 생략”하는 것이다.
   - Recommendation: complete version을 선택한다. Human: ~1 day / CC+gstack: ~15-25 min. Edge cases and tests are a boilable lake.

7. **Distribution check**
   - 새 artifact type이 없다. Vite app 내부 UI 변경이므로 별도 build/publish pipeline은 scope 밖이다.

### Architecture Review

Opinionated recommendation: **current component boundary를 유지하고, 판단 계산만 pure utility로 모은다.** 이 방식이 minimal diff와 explicit-over-clever 선호에 맞다.

```text
+--------------------------------------------------------------------------------+
| Step5Result.vue                                                               |
|   - owns modal open/close and focused/selected version actions                 |
|   - passes compared versions/reviews from useScheduleReviewHub                 |
+----------------------------------------+---------------------------------------+
                                         |
                                         v
+--------------------------------------------------------------------------------+
| ScheduleCompareModal.vue                                                       |
|   loading/error/empty stay modal-local                                         |
|   when two versions exist: workspace first, candidate shelf second              |
+----------------------------------------+---------------------------------------+
                                         |
                    +--------------------+--------------------+
                    v                                         v
+-----------------------------------------+   +-----------------------------------+
| ComparisonWorkspace.vue                 |   | VersionCandidateShelf.vue          |
|   computed decisionModel                |   | compare target changes only         |
|   renders summary/off diff/requirements |   | no duplicated decision metrics      |
+--------------------+--------------------+   +-----------------------------------+
                     |
                     v
+--------------------------------------------------------------------------------+
| scheduleComparisonSummary.ts                                                   |
|   buildScheduleComparisonSummary() remains                                     |
|   buildScheduleComparisonDecisionModel() added                                 |
|   maps proofSummary + comparisonMetrics + offRequestResults to display rows     |
+--------------------------------------------------------------------------------+
```

Production failure scenarios:

| Codepath                               | Realistic failure                                                                         | Plan coverage                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `buildScheduleComparisonDecisionModel` | `latestEvaluation` is null for one side                                                   | Return `unknown` rows with `검토 정보 없음`; unit test required               |
| Off reflection formatting              | backend sends `0.81` in one path and `81` in another                                      | normalize both to `81%`; unit test required                                   |
| Off results fallback                   | `offRequestResults` missing/empty but `comparisonMetrics.offRequestReflectionRate` exists | use fallback copy without claiming exact fulfilled/total; unit test required  |
| `nightShiftMax` rule                   | null is treated as pass by accident                                                       | null means `unknown`, not pass; unit test required                            |
| Modal ordering                         | candidate shelf remains first when two versions exist                                     | unit test must compare DOM order                                              |
| Focus/detail action                    | modal close or detail click loses user context                                            | use existing events; unit/focus check required, E2E optional if unit is flaky |

Security/data access impact: none. The plan consumes already-loaded review/compare responses and does not change auth, RLS, Supabase functions, or API contracts.

### Code Quality Review

- Keep `ScheduleComparisonDecisionModel` and row/status types exported from `scheduleComparisonSummary.ts` unless another file already owns schedule UI view-model types. Avoid a new `types` file for one local model.
- Use small helpers inside the utility: `formatPercent`, `getEvaluation`, `buildViolationRow`, `buildOffRequestRow`, `formatOffReflection`. This is DRY enough without creating classes.
- Do not mutate `ScheduleVersionSummary` or `ScheduleReviewResponse`. The decision model must be derived data only.
- Do not read from `window.$message`, stores, route, or API inside `ComparisonWorkspace.vue`. It should remain a pure presentational boundary fed by props.
- Keep Korean user-facing copy in Vue/templates and utility return strings. Code identifiers stay English.
- Avoid nested cards: one outer workspace panel, then section bands/table rows. Candidate cards remain only in `VersionCandidateShelf.vue` because they are actionable items.
- Stable keys:
  - requirement rows: `${group}:${label}`
  - off rows: `label`
  - summary bullets: content is acceptable only if generated strings are unique; if duplicate risk appears, key by index plus string in this static list.

### Test Review

Detected framework: Vitest unit tests and Playwright E2E are available through `package.json`. No dedicated `vitest.config.*` file exists; tests currently rely on project/Vite defaults.

```text
CODE PATH COVERAGE
==================
[+] src/utils/scheduleComparisonSummary.ts
    |
    +-- buildScheduleComparisonDecisionModel()
    |   +-- [GAP] both reviews present, all mandatory pass
    |   +-- [GAP] left failed/right passed for each mandatory proof field
    |   +-- [GAP] nightShiftMax <= 15 pass, > 15 fail, null unknown
    |   +-- [GAP] offRequestResults total/fulfilled/rate exact copy
    |   +-- [GAP] comparisonMetrics.offRequestReflectionRate fallback
    |   +-- [GAP] percent normalization: 0.81 and 81 both display 81%
    |   +-- [GAP] missing latestEvaluation returns unknown, not pass
    |   +-- [GAP] total Off requests 0 displays 요청 없음
    |
    +-- buildScheduleComparisonSummary()
        +-- [★★ TESTED] reflection-rate comparison from version metrics
        +-- [★★ TESTED] neutral copy when rates unavailable
        +-- [GAP] preserve existing export behavior after new model is added

[+] src/components/schedule/review/ComparisonWorkspace.vue
    |
    +-- decision sections
    |   +-- [GAP] DOM order: 핵심 판단 -> Off 요청 입력 차이 -> 요구사항 충족 비교 -> detail actions
    |   +-- [GAP] status text visible for pass/fail/unknown
    |   +-- [GAP] one-sided review missing displays 검토 정보 없음
    |   +-- [GAP] criterion label precedes left/right values
    |   +-- [GAP] no status/manual-edit card appears before decision sections
    |   +-- [GAP] narrow layout keeps label/value meaning through repeated labels or accessible text
    |
    +-- focus-version action
        +-- [★★ TESTED] existing focus event from detail button
        +-- [GAP] button copy is 이 근무표안 자세히 보기

[+] src/components/schedule/review/ScheduleCompareModal.vue
    |
    +-- modal body states
    |   +-- [★★ TESTED] empty state emits request-edit
    |   +-- [★★ TESTED] error state emits retry
    |   +-- [GAP] loading copy remains modal-local
    |   +-- [GAP] helper copy matches Off/mandatory decision intent
    |
    +-- success layout
        +-- [GAP] [->E2E optional] two selected versions render workspace before shelf
        +-- [GAP] one or zero candidates render empty/shelf path before workspace
        +-- [GAP] close returns focus to 근무표안 비교 trigger or documents jsdom limitation

USER FLOW COVERAGE
==================
[+] Compare two generated schedule plans
    |
    +-- [GAP] [->E2E] open Step5 compare modal and see decision workspace first
    +-- [GAP] [->E2E] inspect Off/request criteria, then open detail for one plan
    +-- [GAP] switch compare candidates and verify workspace recalculates

[+] Partial data / trust-preserving states
    |
    +-- [GAP] one side has no review: no false pass
    +-- [GAP] both sides have no review: neutral summary only
    +-- [GAP] Off total 0 is request absence, not success

------------------------------------------------------------
COVERAGE BEFORE IMPLEMENTATION: 4/29 paths partially covered
GAPS TO ADD TO PLAN: 25 paths
E2E: 1 required smoke if implementation changes modal order visibly; 2 optional interaction flows
QUALITY TARGET: all utility branches ★★★, component user states at least ★★
------------------------------------------------------------
```

Required test additions:

- `tests/unit/schedule-comparison-summary.spec.ts`
  - Add factory cases for `latestEvaluation.proofSummary` and `latestEvaluation.comparisonMetrics`.
  - Assert each mandatory row: pass, fail with count/value, unknown.
  - Assert Off rows prefer `offRequestResults` over fallback metric when both exist.
  - Assert fallback metric copy never invents fulfilled/total counts.
  - Assert `buildScheduleComparisonSummary` existing tests still pass.

- `tests/unit/comparison-workspace.spec.ts`
  - Assert section order by text index in `wrapper.text()`.
  - Assert visible status text exists for `통과`, `위반 N건`, `검토 정보 없음`, `요청 없음`.
  - Assert `상태:` and `수정 N회` are not rendered before `핵심 판단`.
  - Assert `focus-version` event still emits from both detail buttons.

- `tests/unit/schedule-compare-modal.spec.ts`
  - Assert helper copy uses Off/필수 기준 language.
  - Assert success DOM order: `[data-test="comparison-workspace"]` before candidate shelf. Add a `data-test` to candidate shelf section if needed.
  - Assert loading/error/empty states remain modal-local and do not render `ComparisonWorkspace`.
  - Assert focus return if jsdom/Naive UI supports it; otherwise document manual QA in the test name/comment.

- `tests/e2e/step5-review-hub.spec.ts`
  - Add one smoke path only if unit tests cannot reliably verify real modal order/focus. Human: ~2h / CC+gstack: ~10m.

### Performance Review

- The decision model is O(number of fixed criteria + offRequestResults length). Current fixed criteria count is 5 and Off requests are monthly employee requests, so this is safe.
- Do not scan assignments or the 30 x 36 schedule grid in `ComparisonWorkspace.vue`; that would couple comparison to grid-size data and create unnecessary render work.
- Use computed derivation once per prop change. Avoid calling row builders directly in template expressions.
- No caching layer is needed. The data is already loaded by `useScheduleReviewHub`, and adding cache state would increase invalidation risk.
- Keep `VersionCandidateShelf.vue` visually lower priority but do not unmount/remount it on every row interaction; modal success layout should be stable.

### Failure Modes

| Failure mode                     | Test covers?                       | Error handling/copy exists?                     | User impact                                 |
| -------------------------------- | ---------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| Review fetch fails               | Existing modal error test, keep it | Yes: modal alert + retry                        | Clear recovery                              |
| One review missing               | Add unit test                      | Yes: `검토 정보 없음`                           | Clear uncertainty                           |
| Both reviews missing             | Add unit test                      | Yes: neutral bullets + unknown rows             | Clear uncertainty                           |
| Off total is 0                   | Add unit test                      | Yes: `요청 없음`                                | Not misread as pass/fail                    |
| Fallback metric only             | Add unit test                      | Add copy that avoids exact counts               | No fake precision                           |
| Evaluator returns null night max | Add unit test                      | `검토 정보 없음`                                | No false pass                               |
| Modal order regresses            | Add unit test, optional E2E        | No runtime error; test catches trust regression | Would harm first 3-second decision          |
| Focus return unreliable          | Unit or manual QA note             | Existing Naive modal behavior expected          | Potential keyboard annoyance, not data loss |

Critical silent gaps after this plan: **0**, assuming all listed tests are implemented with the feature.

### NOT in scope

- Employee/date-level Off diff API: current response does not provide it, and inferred detail would be false precision.
- Backend evaluator semantics: frontend consumes current `proofSummary`, `comparisonMetrics`, and `offRequestResults`.
- Store/composable route-state rewrite: existing `useScheduleReviewHub` already resolves compared versions and reviews.
- Step5 default review/detail redesign: this plan changes compare modal/workspace priority only.
- Dedicated mobile compare product redesign: responsive preservation is required; mobile-first UX is deferred.
- New design tokens, package dependencies, cache layer, or distribution artifact.
- `TODOS.md` creation: no deferred engineering item is valuable enough to track separately for this plan.

### Eng Review Completion Summary

```text
+====================================================================+
|            PLAN ENG REVIEW - COMPLETION SUMMARY                    |
+====================================================================+
| Step 0: Scope Challenge  | scope accepted as-is                    |
| Architecture Review      | 0 blocking issues, boundaries clarified |
| Code Quality Review      | 0 blocking issues, helper rules added   |
| Test Review              | diagram produced, 25 gaps identified    |
| Performance Review       | 0 issues, O(fixed rows + off requests)  |
| NOT in scope             | written                                 |
| What already exists      | written                                 |
| TODOS.md updates         | 0 items proposed                         |
| Failure modes            | 0 critical silent gaps after tests       |
| Outside voice            | skipped                                  |
| Lake Score               | 1/1 complete-option recommendations     |
+====================================================================+
```

## Implementation Tasks

### Task 1: 비교 view model 유틸 추가

**Files:**

- Modify: `src/utils/scheduleComparisonSummary.ts`
- Test: `tests/unit/schedule-comparison-summary.spec.ts`

- [ ] `buildScheduleComparisonSummary`의 기존 public export는 유지한다.
- [ ] 새 export를 추가한다. 이름은 `buildScheduleComparisonDecisionModel`로 한다.
- [ ] 입력은 `leftVersion`, `rightVersion`, `leftReview`, `rightReview`를 받는다.
- [ ] 출력은 다음 구조로 한다.

```ts
type ScheduleComparisonRequirementStatus = 'passed' | 'failed' | 'unknown';

interface ScheduleComparisonDecisionModel {
  summaryBullets: string[];
  offInputRows: Array<{
    label: string;
    leftText: string;
    rightText: string;
  }>;
  requirementRows: Array<{
    group: 'mandatory' | 'optional';
    label: string;
    leftStatus: ScheduleComparisonRequirementStatus;
    rightStatus: ScheduleComparisonRequirementStatus;
    leftText: string;
    rightText: string;
  }>;
}
```

- [ ] Mandatory row 매핑:
  - `NOD 근무 불가`: `latestEvaluation.proofSummary.nodViolations`
  - `3연속 야간(N) 근무 불가`: `latestEvaluation.proofSummary.nnnViolations`
  - `2연속 야간(N) 후 48시간 이상 휴식`: `latestEvaluation.proofSummary.minimumRestViolations`
  - `야간 근무 월 15회 이하`: `latestEvaluation.comparisonMetrics.nightShiftMax`
- [ ] Optional row 매핑:
  - `Off 요청 준수`: `latestEvaluation.offRequestResults`
- [ ] 값이 없으면 `unknown`으로 두고, “검토 정보 없음”을 표시한다.
- [ ] Off 요청 반영률은 `fulfilled / total`로 계산한다. total이 0이면 “요청 없음”으로 표시한다.
- [ ] `comparisonMetrics.offRequestReflectionRate`는 보조 fallback으로만 사용한다. `offRequestResults`가 있으면 그것을 우선한다.
- [ ] fallback metric만 있을 때는 `반영률 83%`처럼 표시하고, `18건 중 15건` 같은 정확한 count를 만들어내지 않는다.
- [ ] 퍼센트 포맷은 `0.81`과 `81` 모두 `81%`로 표시되게 처리한다.
- [ ] summary copy는 결론형으로 작성한다. 예: `2안은 필수 기준을 모두 통과했고 Off 요청 18건 중 15건을 반영했습니다.`
- [ ] 직원/날짜 단위 세부 diff가 있는 것처럼 보이는 문구를 만들지 않는다.
- [ ] `latestEvaluation`이 없거나 metric 값이 `null`이면 `passed`가 아니라 `unknown`으로 둔다.

### Task 2: 비교 workspace UI 재구성

**Files:**

- Modify: `src/components/schedule/review/ComparisonWorkspace.vue`
- Test: `tests/unit/comparison-workspace.spec.ts`

- [ ] 기존 `summaryBullets` computed를 새 decision model computed로 교체한다.
- [ ] 상단 설명을 “Off 요청 차이와 필수 기준 충족 여부를 비교합니다.” 계열 문구로 바꾼다.
- [ ] 첫 번째 섹션은 `핵심 판단`으로 두고 `summaryBullets`를 표시한다.
- [ ] 두 번째 섹션은 `Off 요청 입력 차이`로 둔다.
  - 변경 Off 요청 수
  - 변경 메모
  - 비교할 버전이 없거나 데이터가 없을 때의 empty state
- [ ] 세 번째 섹션은 `요구사항 충족 비교`로 둔다.
  - Mandatory와 Optional을 시각적으로 구분한다.
  - 통과는 녹색, 위반은 붉은색, 정보 없음은 회색 계열로 표시한다.
  - 문구 예: `통과`, `위반 2건`, `최대 16회`, `18건 중 15건 반영 (83%)`
- [ ] 기존 좌/우 version card는 하단 보조 영역으로 낮춘다.
  - 버튼 문구는 `이 근무표안 자세히 보기`로 통일한다.
  - 상태/수정 횟수는 핵심 섹션보다 먼저 보이지 않게 한다.
- [ ] nested card처럼 보이지 않도록 기존 디자인 톤을 유지하되, 섹션 간 위계만 명확히 한다.
- [ ] `ComparisonWorkspace.vue`는 하나의 outer panel 안에서 section band를 나누는 방식으로 구성한다. 반복 `n-card`나 카드 안 카드 구조를 늘리지 않는다.
- [ ] 요구사항 비교는 card grid가 아니라 criterion label + left value + right value가 한 행으로 읽히는 table/row 구조로 구현한다.
- [ ] 상태는 색만으로 전달하지 않고 status text를 함께 노출한다.
- [ ] 좌/우 비교 row는 좁은 화면에서 stack되더라도 기준 label이 각 값과 함께 읽히게 한다.
- [ ] 판단 상태에는 semantic pass/fail/unknown 색만 쓰고, `sky-*`는 focus/selection affordance에만 제한한다.
- [ ] Template 안에서 proof/Off 계산식을 직접 풀지 않는다. `decisionModel` computed가 만든 row만 렌더링한다.
- [ ] requirement row key는 user-editable 값이 아니라 stable label/group 기반으로 둔다.

### Task 3: 비교 modal copy 조정

**Files:**

- Modify: `src/components/schedule/review/ScheduleCompareModal.vue`
- Test: `tests/unit/schedule-compare-modal.spec.ts`

- [ ] modal header는 `근무표안 비교`를 유지한다.
- [ ] 안내 문구를 다음 의도로 바꾼다.
  - “Off 요청 차이와 필수 기준 충족 여부를 비교한 뒤 필요한 근무표안을 자세히 확인하세요.”
- [ ] empty state 문구는 유지하되, “Off 요청을 수정해 새 근무표안을 만들면...” 흐름이 깨지지 않게 한다.
- [ ] 비교할 2개 안이 있으면 `ComparisonWorkspace`를 `VersionCandidateShelf`보다 먼저 렌더링한다.
- [ ] 후보 shelf는 `비교 대상 변경` 보조 영역으로 낮추고, 사용자가 다른 안을 고를 때만 강하게 보이게 한다.
- [ ] loading/error/empty state는 modal body 내부에서 처리하고 Step5 본문 상태를 바꾸지 않는다.
- [ ] modal close 후 focus가 `근무표안 비교` trigger로 돌아오는지 확인한다.
- [ ] candidate shelf section에 DOM order 검증용 `data-test`가 없으면 추가한다.

### Task 4: 기존 후보/표면 컴포넌트 영향 확인

**Files:**

- Inspect: `src/components/schedule/review/VersionCandidateShelf.vue`
- Inspect: `src/components/schedule/review/VersionCompareSurface.vue`
- Inspect: `src/components/schedule/review/ComparisonToolsSection.vue`
- Test: existing unit tests

- [ ] `VersionCandidateShelf.vue`는 비교 후보 선택 기능만 유지한다.
- [ ] `VersionCompareSurface.vue`는 Step5 기본 화면에서 preview 변경용으로 유지한다.
- [ ] `ComparisonToolsSection.vue`는 접기/펼치기 컨테이너 역할만 유지한다.
- [ ] 새 핵심 지표를 이 세 컴포넌트에 중복 표시하지 않는다.
- [ ] 후보 card의 hover/selected/focus-visible 상태는 유지하되, 판단 섹션보다 시각적으로 강하지 않게 한다.
- [ ] 사용자-facing copy에서 `version`, `preview`, `focus`가 새로 노출되지 않는지 확인한다.
- [ ] `VersionCompareSurface.vue`의 기존 Off reflection display와 새 modal decision display가 서로 다른 목적임을 유지한다. 기본 화면 preview 지표를 삭제하거나 새 modal row를 중복 이식하지 않는다.

## Test Plan

- [ ] `tests/unit/schedule-comparison-summary.spec.ts`
  - Mandatory 4개 기준의 passed/failed/unknown 계산을 검증한다.
  - `nightShiftMax <= 15`는 통과, `nightShiftMax > 15`는 위반으로 표시되는지 검증한다.
  - Off 요청 total/fulfilled/rate 문구를 검증한다.
  - `offRequestResults`가 있으면 fallback metric보다 우선되는지 검증한다.
  - fallback metric만 있을 때 exact count를 만들지 않고 rate만 표시하는지 검증한다.
  - `0.81`과 `81`이 모두 `81%`로 표시되는지 검증한다.
  - review가 없으면 거짓 성공 대신 `unknown`을 반환하는지 검증한다.
  - 기존 `buildScheduleComparisonSummary` export의 현재 동작이 깨지지 않는지 검증한다.

- [ ] `tests/unit/comparison-workspace.spec.ts`
  - 렌더링 순서가 `핵심 판단 -> Off 요청 입력 차이 -> 요구사항 충족 비교 -> 자세히 보기`인지 검증한다.
  - 기존 상태/수정 횟수 중심 문구가 핵심 정보보다 먼저 나오지 않는지 검증한다.
  - 한쪽 review만 있을 때도 화면이 깨지지 않고 “검토 정보 없음”을 표시하는지 검증한다.
  - 상태 chip/text가 색상 class에만 의존하지 않고 visible text를 갖는지 검증한다.
  - 요구사항 행에서 criterion label이 좌/우 값보다 먼저 렌더링되는지 검증한다.
  - Off 요청 total 0과 review 없음이 각각 `요청 없음`, `검토 정보 없음`으로 구분되는지 검증한다.
  - `이 근무표안 자세히 보기` 버튼이 좌/우 version id로 `focus-version`을 emit하는지 검증한다.

- [ ] `tests/unit/schedule-compare-modal.spec.ts`
  - 새 안내 문구를 검증한다.
  - loading/error/empty state 기존 동작이 유지되는지 검증한다.
  - 비교할 2개 안이 있을 때 `ComparisonWorkspace`가 `VersionCandidateShelf`보다 먼저 렌더링되는지 검증한다.
  - modal close 후 focus return이 유지되는지 검증한다. 테스트 환경에서 focus return이 불안정하면 원인과 수동 검증 항목을 남긴다.
  - 후보가 1개 이하일 때 empty CTA가 먼저 보이고 판단 workspace가 렌더링되지 않는지 검증한다.

- [ ] `tests/e2e/step5-review-hub.spec.ts`
  - Unit test로 modal DOM order/focus를 안정적으로 검증할 수 없으면, compare modal smoke에 `핵심 판단`이 `비교 대상 변경`보다 먼저 보이는 검증을 추가한다.

- [ ] Final verification
  - Run: `pnpm lint:check`
  - Run targeted unit specs:
    - `pnpm test:unit -- tests/unit/schedule-comparison-summary.spec.ts tests/unit/comparison-workspace.spec.ts tests/unit/schedule-compare-modal.spec.ts`
  - If E2E smoke was changed, run:
    - `pnpm test:e2e -- tests/e2e/step5-review-hub.spec.ts`

## Acceptance Criteria

- 비교 modal을 열었을 때 사용자가 먼저 보는 정보가 Off 요청 차이와 요구사항 충족 여부다.
- Mandatory 기준 4개가 버전별로 같은 행에서 비교된다.
- Optional 기준으로 Off 요청 총 일수, 반영 일수, 반영률이 보인다.
- 생성 근무표는 기본 판단 정보가 아니라 “자세히 보기”를 통해 확인하는 보조 정보로 남는다.
- 비교할 2개 안이 있는 modal 첫 화면에서 후보 shelf가 판단 섹션보다 먼저 보이지 않는다.
- 색상만으로 통과/위반/정보 없음 상태를 전달하지 않는다.
- 새 UI는 `DESIGN.md`의 Step5 review hub, restrained color, compact-to-comfortable density 규칙을 따른다.
- API schema 변경 없이 현재 데이터 구조로 구현된다.
- `pnpm lint:check`가 통과한다.

## Assumptions

- 사용자-facing UI text는 모두 Korean으로 작성한다.
- 이번 작업은 Step5 schedule-generation review/compare flow 안에서만 수행한다.
- `DESIGN.md`가 UI 시각/상호작용 결정의 source of truth다.
- `NOD`, `NNN`, `minimumRest`, `nightShiftMax` 값의 정확한 산출 책임은 backend evaluator에 있다.
- 직원/날짜 단위 Off 입력 diff는 별도 API 응답이 생기기 전까지 표시하지 않는다.
- `comparisonMetrics.offRequestReflectionRate`는 현재 코드에서 `0..1`과 `0..100` 표현이 섞일 수 있으므로 frontend formatter가 둘 다 수용한다.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status | Findings                                              |
| ------------- | --------------------- | ------------------------------- | ---- | ------ | ----------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | -      | -                                                     |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | -      | -                                                     |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 2    | clean  | latest: 25 test gaps captured, 0 critical gaps        |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 2    | clean  | latest score: 7/10 -> 9/10, 6 decisions, 0 unresolved |

**UNRESOLVED:** 0 decisions.
**VERDICT:** DESIGN + ENG CLEARED - ready for implementation.
