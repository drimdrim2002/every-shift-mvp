# Step5 Schedule Compliance Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step5 결과 화면에서 생성된 근무표가 법적 기준을 준수하는지 즉시 검증하고, Off 요청 반영률을 사용자가 쉽게 확인할 수 있게 한다.

**Architecture:** 검증 로직은 순수 TypeScript utility로 분리하고, Step5는 현재 표시 중인 배정표와 Off 요청 상태를 utility에 전달해 UI를 렌더링한다. 프론트엔드 즉시 검증을 먼저 구현해 수동 편집 직후에도 결과가 갱신되게 하며, 백엔드 evaluator와 DB schema는 이번 범위에서 변경하지 않는다.

**Tech Stack:** Vue 3, TypeScript, Vite, Tailwind CSS, Naive UI, Vitest.

---

## Summary

Step5에 `법적 기준 검증` 패널을 추가한다. Mandatory 기준은 하나라도 위반되면 `법적 기준 위반`으로 표시하고 확정 버튼을 막는다. Optional Off 요청은 확정 차단 기준이 아니며, 요청 일수 대비 최종 배정이 `O`인 일수와 반영률을 보여준다.

이 패널의 목적은 "근무표가 안전한가"를 첫눈에 답하는 것이다. 기존 Step5의 배정표와 비교 기능은 유지하되, 현재 보는 근무표안의 확정 가능 여부를 `DESIGN.md`의 Step5 원칙처럼 decision status first, proof/detail second 순서로 올린다.

확정된 규칙 의미:

- `NOD 금지`: 날짜상 연속 3일의 셀 값이 `N -> O -> D`이면 위반이다.
- `3연속 야간 금지`: 날짜상 연속 3일의 셀 값이 `N -> N -> N`이면 위반이다.
- `2연속 야간 후 48시간 휴식`: `N -> N` 이후 첫 실제 근무(`D/E/N`) 시작 시간이 두 번째 Night 종료 후 48시간 미만이면 위반이다.
- `월 야간 15회 이하`: 대상 월 내부의 `N`만 카운트하고 16회 이상이면 위반이다.
- Off 요청 수락: 요청 날짜의 최종 배정이 정확히 `O`이면 수락이다.

## Design Consultation Review

**Review verdict:** 원문은 법적 규칙과 데이터 흐름은 충분히 명확하지만, Step5 사용자가 화면에서 무엇을 먼저 보고 어떤 상태를 어떻게 해석해야 하는지가 부족했다. `/design-consultation` 관점으로 아래 UX contract를 추가하면 계획 완성도는 **9/10**이다. 10/10은 구현 후 실제 Step5 화면 캡처 기반 spacing, overflow, focus, contrast 검증까지 끝났을 때 달성한다.

### Product Context

- 이 기능은 APP UI의 trust layer다. 수간호사/운영자가 생성된 근무표를 확정해도 되는지 판단하는 화면이다.
- 첫 3초 목표는 "위반이 있는가, 확정 가능한가, Off 요청은 얼마나 반영됐는가"를 바로 읽는 것이다.
- `DESIGN.md`의 Step5 review hub 원칙을 따른다: decision status first, compare context second, detailed proof and inspection third.
- 사용자-facing copy는 한국어를 사용한다. `mandatory`, `optional`, `compliance`, `violation` 같은 내부 용어는 화면에 그대로 노출하지 않는다.

### Aesthetic / Layout Contract

- **Aesthetic:** calm operational product. 장식보다 정보 순서가 신뢰를 만든다.
- **Decoration:** intentional/minimal. 새 gradient, decorative icon grid, dashboard mosaic, oversized status card를 추가하지 않는다.
- **Layout:** grid-disciplined review panel. 새 패널은 독립 랜딩 섹션이 아니라 현재 보는 근무표안의 판단 요약이어야 한다.
- **Color:** restrained neutral + semantic status. 통과는 success, 위반은 error, Off 요청은 neutral/info 계열로 처리한다. 색만으로 의미를 전달하지 말고 항상 `충족`, `위반 N건`, `요청 없음` 같은 텍스트를 함께 둔다.
- **Typography:** `Pretendard Variable` 기본. 건수, 비율, 날짜 범위처럼 inspectable metadata는 기존 설계처럼 mono accent를 제한적으로 쓸 수 있다.
- **Spacing:** `8px` scale을 유지한다. 패널 내부는 `md`, Step5 주요 영역 사이 간격은 `lg`를 기본으로 한다.

### First Viewport Information Order

Step5에 생성 결과가 있고 현재 버전이 표시되는 경우 첫 판단 영역은 아래 순서를 따른다.

```text
근무표 생성 - 결과 확인
  1. 생성/버전 상태
  2. 법적 기준 검증 요약
     - 최상위 상태: 법적 기준 충족 / 법적 기준 위반 N건
     - Mandatory 4개 기준 summary
     - Off 요청 반영률 summary
     - 확정 차단 reason if any
  3. 현재 근무표안 상세 탭
     - 배정표
     - 하드 제약
     - Off 요청
  4. 주요 액션
     - 비교, 재생성, Excel, 확정
```

패널은 `VersionReviewDetail`의 tab보다 위에 둔다. 이유는 배정표를 보기 전에 이 안이 확정 가능한지 먼저 알아야 하기 때문이다. 구현은 `VersionReviewDetail`에 `compliance` slot을 추가하는 방식으로 고정한다. 이 방식이 현재 보는 근무표안 context와 검증 결과를 같은 review surface 안에 묶고, 카드 안 카드처럼 보이는 구조를 피한다.

### Panel Content Contract

`ScheduleCompliancePanel.vue`는 하나의 outer panel 안에서 아래 section band를 나눈다.

1. **Decision header**
   - Pass: `법적 기준 충족`
   - Fail: `법적 기준 위반 N건`
   - Subcopy pass: `확정 전 필수 기준을 모두 확인했습니다.`
   - Subcopy fail: `위반 항목을 수정한 뒤 확정할 수 있습니다.`
2. **Mandatory summaries**
   - 4개 rule을 같은 높이의 compact rows로 표시한다.
   - 각 row는 rule name, status text, count/detail hint를 가진다.
   - 0건은 `충족`, 1건 이상은 `위반 N건`, 계산 불가 상태가 생기면 `확인 필요`로 표시한다.
3. **Violation details**
   - 위반이 없으면 상세 목록을 렌더링하지 않는다.
   - 위반이 있으면 첫 3-5건을 먼저 표시하고, 초과분은 접기/펼치기 또는 `외 N건` 요약으로 처리한다.
   - 직원명, 날짜/범위, 이유 순서로 읽히게 한다.
4. **Off request summary**
   - `Off 요청 반영 X / 요청 Y일`
   - `Y > 0`이면 percentage를 함께 표시한다.
   - `Y === 0`이면 `요청 없음`으로 표시하고 실패/통과처럼 보이지 않게 한다.
   - Off 요청은 확정 차단 기준이 아니므로 error styling을 쓰지 않는다.

### State and Accessibility Contract

| State                       | UI requirement                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------- |
| mandatory 통과              | success status와 `법적 기준 충족` 텍스트를 함께 표시한다.                               |
| mandatory 위반              | error status와 `법적 기준 위반 N건` 텍스트를 함께 표시하고 확정 차단 reason을 노출한다. |
| 위반 상세 0건               | 빈 리스트 대신 상세 영역 자체를 숨긴다.                                                 |
| 위반 상세 다수              | 첫 화면이 목록에 밀리지 않도록 상위 N건만 우선 표시한다.                                |
| Off 요청 0건                | `요청 없음`으로 표시하고 반영률 계산을 생략한다.                                        |
| previous-month context 포함 | 날짜가 전월이면 detail에서 날짜를 그대로 표시해 왜 위반이 잡혔는지 숨기지 않는다.       |
| 수동 편집 직후              | 패널의 상태와 확정 차단 reason이 즉시 갱신된다.                                         |

- 상태 chip은 색만으로 의미를 전달하지 않는다.
- Panel heading은 semantic heading으로 두고, summary rows는 list나 table-like structure로 screen reader 순서가 보존되게 한다.
- 버튼/CTA 주변에는 확정 차단 사유가 visible text로 있어야 한다. disabled button click event에 의존하지 않는다.
- 900px 미만에서는 summary rows가 2열에서 1열로 stack되어도 rule name과 status가 붙어서 읽히게 한다.
- 767px 이하에서는 버튼 touch target을 44px 이상으로 유지한다.

### Safe Choices

- Step5에 새 화면을 만들지 않고 현재 결과 상세 안에 trust panel을 추가한다. 사용자는 이미 Step5를 확정 판단 화면으로 이해하고 있다.
- Mandatory 4개 기준은 같은 구조의 row로 보여준다. 법적 기준은 병원 운영 표처럼 스캔 가능해야 한다.
- Off 요청은 별도 summary band로 둔다. 법적 위반과 같은 red treatment를 쓰면 soft constraint가 hard block처럼 오해된다.

### Product Risks Worth Taking

- **Risk 1: 배정표보다 검증 요약을 먼저 둔다.** 기존 사용자는 표를 먼저 보고 싶을 수 있지만, 확정 의사결정에서는 안전 여부가 먼저다. 이득은 법적 위반 상태를 놓치지 않는 것이고, 비용은 표까지 한 번 더 스크롤할 수 있다는 점이다.
- **Risk 2: 위반 상세를 전체 펼침으로 시작하지 않는다.** 모든 위반을 즉시 펼치면 Step5 첫 viewport가 목록에 잠긴다. 이득은 결론을 유지하는 것이고, 비용은 사용자가 전체 위반 목록을 보려면 한 번 더 펼쳐야 한다는 점이다.
- **Risk 3: Off 요청 반영률을 긍정/부정 점수처럼 과장하지 않는다.** 반영률은 판단에 중요하지만 확정 차단 조건은 아니다. 이득은 legal gate와 preference quality를 명확히 분리하는 것이고, 비용은 Off 요청 만족도가 덜 강하게 보일 수 있다는 점이다.

### Not in Scope

- 새 design system, 새 폰트, 새 컬러 팔레트 도입
- Step5 전체 redesign
- 모바일 전용 Step5 UX
- backend evaluator/schema 변경
- Off 요청 미반영 사유 생성 로직 추가
- 법적 기준을 조직별 정책으로 편집하는 기능

## Plan Design Review 보강

**Review status:** `/plan-design-review` 관점에서 이 계획은 UI scope가 명확한 APP UI 변경이다. 초기 design completeness는 **7/10**이었다. 법적 규칙과 데이터 흐름은 탄탄하지만, 원문만으로는 구현자가 패널 위치, 상태 우선순위, 좁은 화면 처리, screen-reader 순서, finalization blocker copy를 임의로 해석할 여지가 있었다. 아래 보강 후 목표 점수는 **9/10**이다. 10/10은 구현 후 실제 Step5 캡처 기반 `/design-review`에서 spacing, overflow, focus, contrast를 확인해야 달성한다.

### System Audit

- Branch recorded during the original plan review: `main`
- Base branch detection: `gh`가 로컬에 없어 skill fallback에 따라 `main`을 기준으로 본다.
- Recent implementation context: Step4/Step5 result flow가 최근 단순화되어 Step5 기본 화면은 결과 상세 중심이고, 비교는 modal로 이동했다.
- `DESIGN.md`: 존재한다. 모든 색, 밀도, typography, responsive, state decision은 이 문서에 맞춘다.
- `TODOS.md`: repo root에 별도 파일이 없다. 이번 review에서 발견한 design debt는 TODO로 넘기지 않고 이 plan 안에 직접 반영한다.
- Current plan file status: 아직 git tracked 상태가 아니다. 구현 전에 이 문서가 포함된 branch/commit에서 review log를 다시 확인한다.

### What already exists

- `Step5Result.vue`는 initial loading, initial error, solver running, policy rejection alert, previous-month display control, read-only alert, compare modal, bottom action bar를 이미 소유한다.
- `VersionReviewDetail.vue`는 하나의 outer review surface, focus heading, backend review lead panel, tab controls, `grid`/`proof`/`offRequests` slots를 이미 가진다.
- `VersionReviewDetail.vue`에 `compliance` slot을 추가하면 새 패널을 tab 위에 넣을 수 있고, Step5가 카드 안 카드 구조를 늘리지 않아도 된다.
- `isFinalizeActionDisabled`와 `handleFinalizeAction`는 finalization guard의 단일 진입점이다. 새 법적 기준 blocker는 여기와 CTA 주변 visible copy에 같이 연결한다.
- `src/utils/message.ts`는 Naive UI discrete API 사용을 안전하게 감싼다. Compliance 실패 toast는 이 유틸을 사용한다.
- `DESIGN.md`의 Step5 원칙은 `decision status first, compare context second, detailed proof and inspection third`다. 이번 패널은 그 첫 번째 decision status를 강화한다.

### Design Scope Assessment

- **Classifier:** APP UI. 이 화면은 병원 운영자가 생성된 근무표안을 확정해도 되는지 판단하는 작업 surface다.
- **Primary design question:** "이 근무표안을 법적으로 확정해도 안전한가?"
- **Secondary design question:** "Off 요청은 얼마나 반영됐고, 미반영은 확정 차단 사유인가?"
- **Not the design question:** "검증 패널을 얼마나 눈에 띄게 꾸밀 것인가?" 이 기능은 decoration이 아니라 trust layer다.
- **10/10 target:** 첫 viewport에서 사용자가 `법적 기준 충족/위반`, 위반 rule, Off 요청 반영 상태, 확정 가능 여부를 순서대로 읽고, keyboard와 screen reader에서도 같은 순서로 이해한다.

### Information Architecture

Step5에 생성 결과가 있는 경우 DOM/visual 순서는 아래를 따른다. 테스트는 최소한 `compliance panel -> review tabs -> action bar blocker/finalize CTA` 순서를 검증한다.

```text
--------------------------------------------------------------------------------+
| Step5Result                                                                    |
|   StepIndicator                                                                 |
|   n-card: 근무표 생성 - 결과 확인                                               |
|     1. Existing status/solver/policy/readonly notices                           |
|     2. VersionReviewDetail                                                      |
|        2.1 현재 보는 근무표안 context                                           |
|        2.2 법적 기준 검증 panel                                                 |
|            - Decision header: 법적 기준 충족 / 법적 기준 위반 N건               |
|            - Mandatory rule rows                                                |
|            - Violation details, capped by default                               |
|            - Off request reflection summary                                     |
|        2.3 Existing backend review lead panel, if needed                        |
|        2.4 Tabs: 배정표 / 하드 제약 / Off 요청                                  |
|     3. Bottom action bar                                                        |
|        - visible finalization block reason                                      |
|        - 비교 / 재생성 / Excel / 확정                                           |
+--------------------------------------------------------------------------------+
```

The compliance panel belongs inside `VersionReviewDetail` through a new `compliance` slot. Rendering it as a separate sibling above `VersionReviewDetail` is not the default because it visually separates the decision from the schedule version it judges.

### Interaction State Coverage

| Feature                | Loading                                                                      | Empty                                                                      | Error                                                                                     | Success                                                    | Partial                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Compliance panel shell | Step5 initial loading을 그대로 사용하고 패널 자체 skeleton은 추가하지 않는다 | 결과 assignments가 없으면 패널을 렌더하지 않는다                           | utility 예외는 `확인 필요` row와 visible warning copy로 degrade한다                       | `법적 기준 충족` header와 four rule rows 표시              | previous-month context가 있으면 detail 날짜에 전월 날짜를 그대로 표시한다                   |
| Mandatory rule rows    | panel shell loading에 포함                                                   | rule 대상 데이터가 없으면 `확인 필요`로 표시하고 통과처럼 보이지 않게 한다 | 해당 rule row에 `확인 필요` + 짧은 이유 표시                                              | `충족` text와 success semantic treatment 표시              | 한 직원에게 여러 위반이 있으면 rule row는 count, detail list는 capped rendering             |
| Violation details      | panel shell loading에 포함                                                   | 위반 0건이면 detail section 자체를 숨긴다                                  | detail formatting 실패 시 전체 패널을 숨기지 말고 row count는 유지한다                    | 첫 3-5건을 직원명, 날짜/범위, 이유 순서로 표시             | 초과분은 `외 N건` 또는 펼침 control로 제공한다                                              |
| Off request summary    | panel shell loading에 포함                                                   | target-month 요청이 0건이면 `요청 없음` 표시                               | off request map parse 실패 시 `확인 필요` neutral state                                   | `Off 요청 반영 X / 요청 Y일`과 percentage 표시             | 미반영이 있어도 error styling이나 확정 차단 copy를 쓰지 않는다                              |
| Manual edit update     | edit 후 별도 loading 없이 즉시 재계산한다                                    | 변경 전 assignments가 없으면 기존 result empty state 유지                  | 재계산 예외는 `확인 필요`로 드러낸다                                                      | panel text와 finalization blocker가 같은 tick에서 갱신된다 | changed-cells copy와 compliance blocker가 동시에 보일 수 있다                               |
| Finalization CTA       | primary action loading은 기존 상태를 유지한다                                | finalize action이 없으면 blocker copy를 렌더하지 않는다                    | compliance fail 상태에서 우회 호출되면 `src/utils/message.ts`로 같은 blocker message 표시 | compliance pass + backend gate pass일 때만 확정 가능       | compliance fail과 backend disabledReason이 동시에 있으면 compliance blocker를 먼저 보여준다 |

Finalization blocker priority:

1. 법적 기준 위반이 있으면 CTA 주변 visible copy는 `법적 기준 위반 N건을 해결한 뒤 확정할 수 있습니다.`를 우선한다.
2. 법적 기준은 통과했지만 backend `primaryAction.disabledReason`이 있으면 기존 disabled reason을 보여준다.
3. 둘 다 없고 finalize가 가능하면 blocker copy를 렌더하지 않는다.

### User Journey & Emotional Arc

| Step | User does                | User feels                                     | Plan specifies                                                      |
| ---- | ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------- |
| 1    | Step5 결과 화면을 연다   | "이 안을 확정해도 되나?"                       | 현재 근무표안 context 바로 아래 compliance panel을 둔다             |
| 2    | decision header를 읽는다 | "안전/위험 여부를 바로 알겠다"                 | `법적 기준 충족` 또는 `법적 기준 위반 N건`을 가장 먼저 보여준다     |
| 3    | mandatory rows를 훑는다  | "어떤 기준이 문제인지 알겠다"                  | 4개 rule을 같은 구조의 compact row로 표시한다                       |
| 4    | 위반 detail을 확인한다   | "누구의 어느 날짜를 고쳐야 하는지 알겠다"      | 직원명, 날짜/범위, 이유 순서와 capped list를 지정한다               |
| 5    | Off 요청 반영률을 본다   | "선호 반영 품질은 알지만 차단 조건은 아니구나" | Off summary는 별도 neutral/info band로 분리한다                     |
| 6    | 확정 버튼을 확인한다     | "왜 확정할 수 없는지 숨겨지지 않는다"          | disabled click에 의존하지 않고 CTA 주변 visible blocker copy를 둔다 |

5-second target: 사용자는 위반 여부와 확정 가능 여부를 먼저 읽는다.  
5-minute target: 사용자는 위반 detail과 grid edit를 왕복하며 상태가 즉시 바뀌는 것을 확인한다.  
5-year trust target: UI가 hard legal gate와 soft Off preference를 절대 섞지 않는다는 신뢰를 만든다.

### AI Slop Risk Assessment

- Hard rejection risk: **app UI made of stacked cards instead of layout**. 해결: `ScheduleCompliancePanel`은 하나의 outer panel 안에서 section band와 compact row를 사용하고, 반복 `n-card`를 만들지 않는다.
- Hard rejection risk: **dashboard-card mosaic**. 해결: 4개 법적 기준을 KPI card처럼 키우지 않고 rule rows/table-like structure로 보여준다.
- Hard rejection risk: **red alert wall**. 해결: fail 상태는 header와 failing rows에서만 semantic error를 쓰고, Off 요청은 neutral/info로 유지한다.
- Hard rejection risk: **decorative icon/gradient treatment**. 해결: 새 gradient, icon-in-circle, blob, hero-like visual을 추가하지 않는다.
- Litmus check:
  - Brand/product unmistakable in first screen? **YES**: `근무표 생성 - 결과 확인`, `법적 기준`, `Off 요청`이 즉시 보인다.
  - One strong visual anchor present? **YES**: compliance decision header가 anchor다.
  - Page understandable by scanning headlines only? **YES**: `법적 기준 검증`, `필수 기준`, `위반 상세`, `Off 요청 반영`.
  - Each section has one job? **YES**: gate, rule scan, proof detail, preference summary를 분리한다.
  - Cards actually necessary? **PARTIAL**: Step5 outer `n-card`는 기존 surface라 유지한다. Compliance 내부에는 decorative cards를 추가하지 않는다.
  - Motion improves hierarchy? **N/A**: 새 motion은 추가하지 않는다. 위반 목록 펼침이 생기면 comprehension 목적의 expand/collapse만 허용한다.
  - Premium without decorative shadows? **YES**: hierarchy는 type, spacing, row grouping, semantic status로 만든다.

### Design System Alignment

- Use `DESIGN.md` Step5 principle: decision status first, compare context second, proof/detail third.
- Typography:
  - Korean copy: project font stack `Pretendard Variable`.
  - Counts, percentages, date ranges: `font-mono` 또는 기존 mono accent만 제한적으로 사용.
- Color:
  - Pass: success semantic intent.
  - Fail: error semantic intent.
  - Off request summary: neutral/info semantic intent.
  - Unknown/check-needed: warning or neutral, never success.
  - Do not spread new `sky-*` or purple/blue gradient treatments into judgment UI.
- Spacing:
  - Step5 major region gap: `lg`.
  - Compliance panel internal gap: `md`.
  - Rule row internal spacing: `xs-sm`.
- Surface:
  - One outer review surface from `VersionReviewDetail`.
  - One compliance panel section inside it.
  - Section bands/rows inside the compliance panel.
  - No nested `n-card` inside the compliance panel.

### Responsive & Accessibility

- Desktop is the primary target. Step5 is not mobile-first in `DESIGN.md`.
- `>= 900px`: mandatory summaries may use two columns only if each row keeps rule name, status, and count together; detail list remains one readable column.
- `< 900px`: mandatory summaries stack to one column. Rule name appears before status in every row.
- `<= 767px`: bottom action buttons and any expand/collapse control keep at least 44px touch target. Dense detail content may wrap; text must not overlap status chips.
- Keyboard:
  - Any violation expand/collapse control is a real button with visible focus.
  - DOM order matches visual order: context -> compliance decision -> rule rows -> detail -> Off summary -> tabs -> CTA blocker -> finalize.
- Screen readers:
  - Compliance panel uses a semantic heading, e.g. `h3` text `법적 기준 검증`.
  - Mandatory rule rows expose rule name before status/count.
  - Off request summary reads as preference quality, not error.
  - Disabled finalize has a nearby visible explanation; do not rely on disabled button events or tooltip-only explanations.
- Contrast:
  - Essential blocker copy must not use muted gray only.
  - `확인 필요`, `위반 N건`, `요청 없음` must remain readable at WCAG AA body-text target.

### Unresolved Design Decisions

No open design decisions remain for this plan. The review locks these choices:

1. Compliance panel is rendered through a new `compliance` slot inside `VersionReviewDetail`, before tab controls.
2. Mandatory rules are row/table-first, not card-grid-first.
3. Off request reflection is neutral/info and never blocks finalization.
4. Compliance blocker copy takes priority over backend disabled reason when both are present.
5. Unknown/calculation-error states are shown as `확인 필요`, never inferred as pass.
6. Mobile-specific Step5 redesign is out of scope; narrow behavior preserves order, wrapping, and touch targets only.

### NOT in scope

- New mobile-native Step5 interaction model: `DESIGN.md` treats Step5 as desktop-first.
- New backend evaluator semantics: this plan adds frontend immediate validation and leaves backend enforcement separate.
- Organization-specific legal rule editing: MVP rules remain fixed.
- New visual tokens, font, palette, or component library.
- Turning Off request reflection into a score/ranking system.

### TODOS.md updates

No `TODOS.md` update is proposed. The discovered design gaps are directly captured in this implementation plan, so deferring them would create unnecessary design debt.

### Design Review Completion Summary

```text
+====================================================================+
|         DESIGN PLAN REVIEW - COMPLETION SUMMARY                    |
+====================================================================+
| System Audit         | DESIGN.md exists, Step5 compliance UI scope |
| Step 0               | 7/10 initial, APP UI trust-layer focus      |
| Pass 1  (Info Arch)  | 7/10 -> 9/10 after DOM/visual order lock    |
| Pass 2  (States)     | 6/10 -> 9/10 after state matrix             |
| Pass 3  (Journey)    | 7/10 -> 9/10 after journey storyboard       |
| Pass 4  (AI Slop)    | 7/10 -> 9/10 after row/table constraints    |
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

**Review status:** `/plan-eng-review` 관점에서 이 계획은 구현 가능한 작은 lake다. 초기 engineering completeness는 **7/10**이었다. UI/UX contract는 충분했지만, 구현자가 검증 입력 범위, unknown 상태, finalization gate 우선순위, 테스트 경계, failure mode를 임의로 해석할 여지가 있었다. 아래 보강 후 목표 점수는 **9/10**이다. 10/10은 구현 후 unit/e2e 검증과 실제 Step5 수동 편집 QA까지 통과했을 때 달성한다.

### Step 0 Scope Challenge

1. **Existing code reuse:** `Step5Result.vue` already owns current/previous assignment loading, version focus, manual edit state, backend primary action, compare modal, and finalization dispatch. This plan reuses those flows and adds only a local compliance read model.
2. **Minimum complete change:** one pure utility, one presentational panel, one `VersionReviewDetail` slot, Step5 wiring, and focused tests. No backend route/schema/evaluator rewrite is needed for this slice.
3. **Complexity check:** planned touched files are 7 total: 3 source creates/modifies, 1 type file, 3 tests. This is below the 8-file smell threshold and avoids adding a service class.
4. **Search check:** no new framework, concurrency primitive, infrastructure component, artifact type, or package is introduced. [Layer 1] Vue computed state + pure TypeScript + Vitest is the boring default for this repo.
5. **TODOS cross-reference:** `TODOS.md` does not exist. Engineering gaps are captured directly in this plan instead of being deferred.
6. **Completeness check:** choose the complete frontend validation lake: all four mandatory rules, unknown/error states, Off reflection, finalization blocker, and unit coverage from the first implementation PR.
7. **Distribution check:** not applicable. This plan adds app code only; it does not introduce a binary, package, container, or mobile artifact.

### Engineering What Already Exists

- `src/views/schedule/Step5Result.vue` already has `currentScheduleAssignments`, `previousMonthAssignments`, `offRequestsCurrentMonth`, `grid.employees.value`, `organizationStore.shifts`, `scheduleStore.basicInfo.month`, `isFinalizeActionDisabled`, and `handleFinalizeAction`. The plan must reuse these instead of creating a second Step5 data loader.
- `src/components/schedule/review/VersionReviewDetail.vue` already provides the single review surface and tab order. The plan adds a `compliance` slot inside it rather than rendering a separate sibling review card.
- `src/utils/scheduleReviewState.ts` already centralizes backend review lead/default-tab decisions. Local compliance can sit beside it conceptually, but must not change backend review-state semantics.
- `supabase/functions/phase2-schedule/engine.ts` already computes persisted trust artifacts for backend evaluation, but currently focuses on staffing/off-request evaluation. This frontend utility must not import the edge-function evaluator or claim to be the server authority.
- `tests/unit/step5-result.spec.ts`, `tests/unit/schedule-review.spec.ts`, and existing Step5 E2E specs already cover review-hub behavior. New tests should extend these patterns, not introduce a parallel test harness.

### Architecture Review

**Verdict:** proceed with the current architecture, with stricter input and authority boundaries.

```text
Step5Result.vue
  │
  ├─ currentScheduleAssignments        target-month generated/manual state
  ├─ previousMonthAssignments          loaded previous-month context, not slider-visible state
  ├─ offRequestsCurrentMonth           version-scoped target-month Off requests
  ├─ grid.employees.value              employee id/name labels
  ├─ organizationStore.shifts          shift time contract + fallback target
  └─ scheduleStore.basicInfo.month     target month
          │
          ▼ computed
   complianceInput
          │
          ▼ pure utility
   evaluateScheduleCompliance()
          │
          ├─ mandatory summaries + details
          ├─ unknown/check-needed rows
          └─ Off request reflection
          │
          ▼
   ScheduleCompliancePanel.vue
          │
          ├─ visible decision status
          └─ visible finalize blocker copy
```

Implementation constraints:

- The compliance input must merge `previousMonthAssignments` + `currentScheduleAssignments` directly. It must not use `grid.assignments.value`, because that value changes when the previous-month display slider changes.
- Sequence/rest checks use every loaded assignment date in the merged input. Monthly night limit and Off request reflection filter inside the utility to `date.startsWith(month)`.
- The frontend compliance result is a UI trust layer and local finalization guard only. Backend finalization remains the source of truth; if the backend rejects, show the backend error.
- If local compliance fails and backend `primaryAction.disabledReason` also exists, show local compliance first because it is the actionable thing currently visible in the grid. Keep backend copy available when local compliance passes.
- Unknown or invalid inputs must degrade to `확인 필요` and block finalization locally. Do not infer pass from missing shift times, malformed dates, unknown employee ids, or unknown shift codes.

### Data Contracts

Add a dedicated type file instead of exporting all types from the utility. This follows the repo rule that structured types live in `src/types/`.

```text
src/types/scheduleCompliance.ts
  ScheduleComplianceRuleCode
  ScheduleComplianceRuleStatus = 'passed' | 'failed' | 'check_required'
  ScheduleComplianceViolation
  ScheduleComplianceRuleSummary
  OffRequestComplianceSummary
  ScheduleComplianceResult
  EvaluateScheduleComplianceInput
```

Recommended result shape:

```ts
interface ScheduleComplianceResult {
  mandatoryPassed: boolean;
  canFinalizeLocally: boolean;
  mandatoryViolationCount: number;
  checkRequiredCount: number;
  summaries: ScheduleComplianceRuleSummary[];
  violations: ScheduleComplianceViolation[];
  offRequests: OffRequestComplianceSummary;
}
```

`mandatoryPassed` and `canFinalizeLocally` are both false when any mandatory rule is `failed` or `check_required`. This is explicit over clever and avoids accidentally enabling finalization when validation could not run.

### Rule Processing Pipeline

```text
evaluateScheduleCompliance(input)
  │
  ├─ normalize employees
  │   ├─ known employee -> name from grid
  │   └─ missing employee -> employee id fallback + check_required warning
  │
  ├─ normalize shifts
  │   ├─ use organizationStore.shifts time data when complete
  │   ├─ fallback D/E/N/O times from this plan
  │   └─ unknown work code -> check_required
  │
  ├─ build sorted employee timelines from all assignment dates
  │   ├─ N O D -> nod_pattern
  │   ├─ N N N -> triple_night
  │   └─ N N then next work interval < 48h -> rest_after_two_nights
  │
  ├─ count target-month N assignments only
  │   └─ > 15 -> monthly_night_limit
  │
  └─ count target-month Off requests only
      ├─ request O + assignment O -> fulfilled
      └─ request O + anything else/missing -> unfulfilled
```

Shift interval rules:

- `D` fallback: logical date `08:00:00 -> 16:00:00`
- `E` fallback: logical date `16:00:00 -> next-day 00:00:00`
- `N` fallback: logical date maps to actual next-day `00:00:00 -> 08:00:00`
- `O`: no work interval
- Custom `Shift.startTime`/`Shift.endTime` may be used only when both exist. If `endTime <= startTime`, treat the end as next day. Keep the special `N` logical-date offset unless product rules explicitly change it later.

### Code Quality Review

**Verdict:** keep the implementation boring and small.

- Put all date/interval logic inside `src/utils/scheduleCompliance.ts`; do not spread rule logic across Vue computed blocks.
- Keep `ScheduleCompliancePanel.vue` presentational. It receives a result object and emits nothing unless a reveal interaction is needed.
- Add stable `data-test` hooks: `compliance-panel`, `compliance-decision-status`, `compliance-rule-{code}`, `compliance-violation-list`, `compliance-off-summary`, `finalize-block-reason`.
- Prefer maps and sorted arrays over nested ad hoc string scans. Deterministic ordering matters for both UI and tests.
- Do not introduce a class/service abstraction. A pure function plus small helper functions is enough.
- Do not import `supabase/functions/phase2-schedule/engine.ts` into browser code. Edge-function runtime contracts and frontend bundle contracts should stay separate.

### Test Framework Detection

- Unit framework: Vitest (`pnpm test:unit`)
- E2E framework: Playwright (`pnpm test:e2e`)
- Required for this slice: Vitest unit/component tests first. E2E can remain follow-up unless implementation changes cross-component user flow behavior beyond the visible blocker.

### Code Path Coverage Diagram

```text
CODE PATH COVERAGE TARGET
=========================
[+] src/utils/scheduleCompliance.ts
    │
    ├── evaluateScheduleCompliance()
    │   ├── [GAP] valid pass, zero violations
    │   ├── [GAP] nod_pattern: N -> O -> D
    │   ├── [GAP] triple_night: N -> N -> N
    │   ├── [GAP] rest_after_two_nights fail: N -> N -> O -> D
    │   ├── [GAP] rest_after_two_nights pass: N -> N -> O -> O -> D
    │   ├── [GAP] monthly_night_limit fail at 16 target-month N
    │   ├── [GAP] previous-month N excluded from monthly night cap
    │   ├── [GAP] previous-month context included in sequence/rest checks
    │   ├── [GAP] unknown shift/malformed date -> check_required + local block
    │   └── [GAP] Off request target-month counting and O-only fulfillment
    │
[+] src/components/schedule/review/ScheduleCompliancePanel.vue
    │
    ├── [GAP] pass header + four success rows
    ├── [GAP] fail header + capped violation details + remaining count
    ├── [GAP] check_required row is not styled as success
    ├── [GAP] Off request 0 -> 요청 없음
    └── [GAP] reveal control, if added, is a button with Korean accessible text
    │
[+] src/components/schedule/review/VersionReviewDetail.vue
    │
    └── [GAP] compliance slot renders after focus context and before lead panel/tabs
    │
[+] src/views/schedule/Step5Result.vue
    │
    ├── [GAP] compliance input uses previousMonthAssignments, not grid.assignments/display slider
    ├── [GAP] panel renders after assignments load
    ├── [GAP] local mandatory fail disables finalize
    ├── [GAP] visible compliance blocker appears near CTA
    ├── [GAP] compliance blocker wins over backend disabled reason
    ├── [GAP] backend disabled reason remains visible when local compliance passes
    ├── [GAP] manual grid edit updates compliance result immediately
    └── [GAP] non-disabled invocation path still shows same blocker via message util
```

```text
USER FLOW COVERAGE TARGET
=========================
[+] Step5 generated-result review
    │
    ├── [GAP] [->UNIT] User sees legal pass/fail before tabs
    ├── [GAP] [->UNIT] User edits a cell and blocker updates in the same UI state
    ├── [GAP] [->UNIT] User cannot finalize a locally failing schedule
    ├── [GAP] [->UNIT] User sees Off request reflection without it blocking finalization
    └── [GAP] [->E2E OPTIONAL] Full browser smoke: generated result -> violation visible -> edit -> blocker clears

COVERAGE BEFORE IMPLEMENTATION: 0/26 new paths tested
QUALITY TARGET: all utility branches ★★★, Step5/component paths at least ★★
```

### Required Test Additions

- Create `tests/unit/schedule-compliance.spec.ts` for all pure utility branches.
- Create `tests/unit/schedule-compliance-panel.spec.ts` for panel rendering, capped details, Off summary, and accessibility hooks.
- Extend `tests/unit/step5-result.spec.ts` for Step5 wiring, DOM order, finalization block priority, and manual edit recomputation.
- Extend `tests/unit/schedule-review.spec.ts` only if `buildPrimaryActionSupportCopy` is changed; otherwise keep this slice out of `scheduleReviewState.ts`.

### Failure Modes

| Codepath                     | Production failure                                       | Test required | Handling required                                                       | User-visible result                           |
| ---------------------------- | -------------------------------------------------------- | ------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| Assignment merge             | previous-month slider hides dates and changes validation | yes           | use `previousMonthAssignments`, not `grid.assignments.value`            | stable compliance result                      |
| Shift interval normalization | missing/unknown shift time lets a rest violation pass    | yes           | row becomes `확인 필요`, local finalize blocks                          | clear warning, not silent pass                |
| Date parsing                 | malformed date enters assignment map                     | yes           | skip unsafe interval math and add check-required warning                | clear warning                                 |
| Sequence checks              | month-boundary `N O D` is missed                         | yes           | sort all loaded dates per employee                                      | violation detail includes previous-month date |
| Monthly night cap            | previous-month N is incorrectly counted                  | yes           | filter to target month inside utility                                   | accurate monthly count                        |
| Off reflection               | missing assignment counted as fulfilled                  | yes           | only exact final `O` fulfills                                           | accurate `반영 X / 요청 Y일`                  |
| Step5 finalization           | disabled button click never fires                        | yes           | visible blocker copy + `handleFinalizeAction` guard                     | user sees why 확정 is blocked                 |
| Backend/local conflict       | local pass but backend stale evaluation blocks           | yes           | keep backend disabled reason when local passes                          | backend reason visible                        |
| Manual edit recompute        | compliance panel lags behind edited cell                 | yes           | computed result depends on `currentScheduleAssignments` identity update | immediate text update                         |

**Critical silent gaps after plan update:** 0. Every failure mode above has either a required test, explicit error handling, or visible user copy.

### Performance Review

- Expected complexity is `employees * assignmentDates`. MVP scale is 30 employees x 36 days, so the utility is comfortably small.
- Do one computed evaluation per reactive change. Do not add watchers that clone large maps repeatedly.
- Use deterministic maps built inside the computed/utility call. Avoid persistent mutable caches; stale cache risk is higher than the cost saved.
- Cap initial violation rendering to 3-5 rows so a bad schedule does not push Step5 tabs and CTA far below the first viewport.

### Engineering NOT in Scope

- Backend evaluator/schema/finalize transaction changes: backend remains canonical and will be handled in a separate trust-layer hardening slice.
- Organization-editable compliance policies: MVP rules are fixed in this plan.
- New solver integration or real-time evaluator API call: this slice is frontend immediate validation only.
- Full mobile Step5 redesign: narrow behavior only preserves order, wrapping, and touch targets.
- New observability pipeline: no app telemetry or backend metrics are added in this frontend-only slice.

### Plan Eng Review Completion Summary

```text
+====================================================================+
|          ENG PLAN REVIEW - COMPLETION SUMMARY                      |
+====================================================================+
| Step 0 Scope Challenge | scope accepted as-is with tighter contracts|
| Architecture Review    | 3 issues converted into plan constraints  |
| Code Quality Review    | 4 issues converted into plan constraints  |
| Test Review            | coverage diagram produced, 26 gaps listed |
| Performance Review     | 1 issue converted into render cap rule    |
| NOT in scope           | written                                   |
| What already exists    | written                                   |
| TODOS.md updates       | 0 items proposed                          |
| Failure modes          | 0 critical silent gaps after update       |
| Outside voice          | skipped for this document-only pass       |
| Lake Score             | 8/8 recommendations chose complete option |
+====================================================================+
```

## Writing-Plans Execution Map

This section follows `@superpowers:writing-plans`. Implementers should use `@superpowers:subagent-driven-development` for task-by-task execution, or `@superpowers:executing-plans` for inline execution with checkpoints. The user-provided path `docs/plans/2026-05-02-step5-schedule-compliance-validation.md` overrides the skill default path.

### File Responsibility Map

| File                                                         | Action | Responsibility                                                                                                                  | Must not do                                                                                                |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/types/scheduleCompliance.ts`                            | Create | Export the compliance domain types used by utility, panel, and Step5.                                                           | No runtime logic, no Vue imports.                                                                          |
| `src/utils/scheduleCompliance.ts`                            | Create | Pure TypeScript evaluation for legal rules, check-required degradation, and Off request reflection.                             | No UI text beyond result messages, no Pinia, no Supabase, no browser globals.                              |
| `src/components/schedule/review/ScheduleCompliancePanel.vue` | Create | Presentational Step5 trust panel. Receives `ScheduleComplianceResult`, renders Korean visible status, details, and Off summary. | No rule calculation, no store reads, no backend calls.                                                     |
| `src/components/schedule/review/VersionReviewDetail.vue`     | Modify | Add one `compliance` slot after the focus context and before backend lead panels/tabs.                                          | Do not restructure existing tabs or lead panel logic.                                                      |
| `src/views/schedule/Step5Result.vue`                         | Modify | Build compliance input, render the panel, and gate finalization locally.                                                        | Do not change solver start, compare modal, regenerate, Excel export, or backend finalization API behavior. |
| `tests/unit/schedule-compliance.spec.ts`                     | Create | Utility branch coverage for all rules, month-boundary behavior, unknown inputs, and Off reflection.                             | Do not mount Vue components here.                                                                          |
| `tests/unit/schedule-compliance-panel.spec.ts`               | Create | Panel rendering coverage for pass/fail/check-required, detail cap, Off summary, and accessible controls.                        | Do not mock schedule stores here.                                                                          |
| `tests/unit/step5-result.spec.ts`                            | Modify | Step5 wiring coverage for DOM order, finalization guard priority, previous-month merge, and manual edit recompute.              | Do not duplicate pure utility rule tests here.                                                             |

### Dependency Direction

```text
Step5Result.vue
  ├─ imports evaluateScheduleCompliance()
  ├─ imports ScheduleCompliancePanel.vue
  └─ passes ScheduleComplianceResult

ScheduleCompliancePanel.vue
  └─ imports scheduleCompliance types only

scheduleCompliance.ts
  ├─ imports scheduleCompliance types
  ├─ imports AssignmentMap / ConstraintMap types
  └─ imports Shift type
```

No dependency should point from `src/utils/scheduleCompliance.ts` into Vue, Pinia, Naive UI, Supabase, or `supabase/functions`.

### Execution Rules

- Work in the order below. Each task should leave the app in a testable state.
- Write the failing test first, run the targeted command, then implement only enough to pass that task.
- Keep commits frequent. Each task below includes a commit command; do not wait until the whole plan is done.
- User-facing UI copy is Korean. Implementation comments and test names may be English.
- If a targeted test fails for a reason unrelated to the current task, stop and diagnose before continuing.
- Final verification requires both targeted unit tests and `pnpm lint:check`.

### Shared Test Fixtures

Use these fixtures across utility and Step5 tests so date and shift behavior stays consistent.

```ts
const employees = [
  { id: 'emp-1', name: '김간호사' },
  { id: 'emp-2', name: '이간호사' },
];

const shifts = [
  {
    id: 'shift-d',
    organizationId: 'org-1',
    code: 'D',
    name: 'Day',
    colorCode: '#92D050',
    startTime: '08:00:00',
    endTime: '16:00:00',
  },
  {
    id: 'shift-e',
    organizationId: 'org-1',
    code: 'E',
    name: 'Evening',
    colorCode: '#FFC000',
    startTime: '16:00:00',
    endTime: '00:00:00',
  },
  {
    id: 'shift-n',
    organizationId: 'org-1',
    code: 'N',
    name: 'Night',
    colorCode: '#4472C4',
    startTime: '00:00:00',
    endTime: '08:00:00',
  },
  {
    id: 'shift-o',
    organizationId: 'org-1',
    code: 'O',
    name: 'Off',
    colorCode: '#D9D9D9',
    startTime: null,
    endTime: null,
  },
];

function evaluate(overrides = {}) {
  return evaluateScheduleCompliance({
    month: '2025-12',
    employees,
    shifts,
    assignments: {},
    offRequests: {},
    ...overrides,
  });
}
```

## Implementation Changes

### 1. Add Pure Compliance Utility

**Files:**

- Create: `src/types/scheduleCompliance.ts`
- Create: `src/utils/scheduleCompliance.ts`
- Test: `tests/unit/schedule-compliance.spec.ts`

- [ ] Create exported types:
  - `ScheduleComplianceResult`
  - `ScheduleComplianceRuleSummary`
  - `ScheduleComplianceViolation`
  - `OffRequestComplianceSummary`
  - `ScheduleComplianceRuleCode`
  - `ScheduleComplianceRuleStatus`
  - `EvaluateScheduleComplianceInput`
- [ ] Put those types in `src/types/scheduleCompliance.ts`; keep `src/utils/scheduleCompliance.ts` focused on logic.
- [ ] Implement `evaluateScheduleCompliance(input)` as a pure function.
- [ ] Inputs:
  - `month: string`
  - `employees: Array<{ id: string; name: string }>`
  - `assignments: AssignmentMap`
  - `offRequests: ConstraintMap`
  - `shifts: Shift[]`
- [ ] Output must include:
  - `mandatoryPassed: boolean`
  - `canFinalizeLocally: boolean`
  - `mandatoryViolationCount: number`
  - `checkRequiredCount: number`
  - one summary row per mandatory rule
  - rule summary status: `passed`, `failed`, or `check_required`
  - violation details with employee id/name, rule code, dates, and Korean message
  - Off request total, fulfilled count, unfulfilled count, and percentage rate
- [ ] Use all assignment dates available in `assignments` for sequence/rest checks, including previous-month context.
- [ ] Use only dates starting with `month` for monthly night count and Off request rate.
- [ ] Use PRD fallback shift times when `shifts` lacks times:
  - `D`: `08:00:00 -> 16:00:00`
  - `E`: `16:00:00 -> 00:00:00`
  - `N`: logical schedule date maps to actual next-day `00:00:00 -> 08:00:00`
  - `O`: no work interval
- [ ] If custom shift times are present and `endTime <= startTime`, treat the end as next day.
- [ ] Unknown shift codes, malformed dates, or missing required inputs must produce `check_required` and `canFinalizeLocally: false`; do not throw from normal UI evaluation.
- [ ] Do not import or bundle `supabase/functions/phase2-schedule/engine.ts` into browser code.

#### TDD Execution Steps

- [ ] **Step 1: Write failing utility tests**

Create `tests/unit/schedule-compliance.spec.ts` with one `describe('evaluateScheduleCompliance')` block and these test names:

```ts
it('passes when mandatory rules have no violations');
it('reports N O D as a nod_pattern violation');
it('reports N N N as a triple_night violation');
it('blocks when first work after two nights starts before 48 hours');
it('passes rest_after_two_nights when the next work starts after 48 hours');
it('counts only target-month nights for monthly_night_limit');
it('uses previous-month context for sequence checks');
it('degrades unknown shift codes to check_required');
it('counts only target-month Off requests and only O as fulfilled');
```

Minimum first failing test:

```ts
import { describe, expect, it } from 'vitest';
import { evaluateScheduleCompliance } from '@/utils/scheduleCompliance';

describe('evaluateScheduleCompliance', () => {
  it('reports N O D as a nod_pattern violation', () => {
    const result = evaluate({
      assignments: {
        'emp-1': {
          '2025-12-01': 'N',
          '2025-12-02': 'O',
          '2025-12-03': 'D',
        },
      },
    });

    expect(result.mandatoryPassed).toBe(false);
    expect(result.canFinalizeLocally).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleCode: 'nod_pattern',
          employeeId: 'emp-1',
          dates: ['2025-12-01', '2025-12-02', '2025-12-03'],
        }),
      ])
    );
  });
});
```

- [ ] **Step 2: Run the utility test and verify it fails for the right reason**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-compliance.spec.ts
```

Expected: FAIL because `@/utils/scheduleCompliance` does not exist yet. If it fails for store setup, router setup, or a syntax error in an unrelated file, fix the test setup before implementation.

- [ ] **Step 3: Add type-only contract**

Create `src/types/scheduleCompliance.ts` with this public shape:

```ts
import type { AssignmentMap, ConstraintMap } from './schedule';
import type { Shift } from './shift';

export type ScheduleComplianceRuleCode =
  | 'nod_pattern'
  | 'triple_night'
  | 'rest_after_two_nights'
  | 'monthly_night_limit';

export type ScheduleComplianceRuleStatus = 'passed' | 'failed' | 'check_required';

export interface ScheduleComplianceViolation {
  id: string;
  ruleCode: ScheduleComplianceRuleCode;
  employeeId: string;
  employeeName: string;
  dates: string[];
  message: string;
}

export interface ScheduleComplianceRuleSummary {
  code: ScheduleComplianceRuleCode;
  label: string;
  status: ScheduleComplianceRuleStatus;
  violationCount: number;
  message: string;
}

export interface OffRequestComplianceSummary {
  totalRequests: number;
  fulfilledRequests: number;
  unfulfilledRequests: number;
  reflectionRate: number | null;
}

export interface ScheduleComplianceResult {
  mandatoryPassed: boolean;
  canFinalizeLocally: boolean;
  mandatoryViolationCount: number;
  checkRequiredCount: number;
  summaries: ScheduleComplianceRuleSummary[];
  violations: ScheduleComplianceViolation[];
  offRequests: OffRequestComplianceSummary;
}

export interface EvaluateScheduleComplianceInput {
  month: string;
  employees: Array<{ id: string; name: string }>;
  assignments: AssignmentMap;
  offRequests: ConstraintMap;
  shifts: Shift[];
}
```

- [ ] **Step 4: Implement minimal utility with deterministic helper functions**

Create `src/utils/scheduleCompliance.ts`. Keep this helper layout so future workers can audit rule behavior quickly:

```text
RULE_LABELS
FALLBACK_SHIFT_TIMES
evaluateScheduleCompliance(input)
  normalizeInput()
  buildEmployeeTimelines()
  evaluateNodPattern()
  evaluateTripleNight()
  evaluateRestAfterTwoNights()
  evaluateMonthlyNightLimit()
  evaluateOffRequests()
  buildSummaries()
parseDate()
buildWorkInterval()
isTargetMonthDate()
```

Implementation requirements:

- `evaluateScheduleCompliance()` must catch normal validation problems and return `check_required`; it must not throw for malformed UI input.
- Summary order must always be `nod_pattern`, `triple_night`, `rest_after_two_nights`, `monthly_night_limit`.
- Violation ordering must be deterministic: employee order from `input.employees`, then ascending date, then rule order.
- Unknown employee ids should use the id as `employeeName` and add one check-required summary message.
- `reflectionRate` is `null` when `totalRequests === 0`; otherwise round to the nearest integer percentage.

- [ ] **Step 5: Run utility tests until they pass**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-compliance.spec.ts
```

Expected: PASS for all utility tests. Do not continue to Vue components while any utility branch fails.

- [ ] **Step 6: Commit the utility slice**

```bash
git add src/types/scheduleCompliance.ts src/utils/scheduleCompliance.ts tests/unit/schedule-compliance.spec.ts
git commit -m "feat: add schedule compliance evaluator"
```

### 2. Add Step5 Compliance Panel

**Files:**

- Create: `src/components/schedule/review/ScheduleCompliancePanel.vue`
- Modify: `src/components/schedule/review/VersionReviewDetail.vue`
- Test: `tests/unit/schedule-compliance-panel.spec.ts`
- Test: `tests/unit/schedule-review.spec.ts` or the `VersionReviewDetail` mount inside `tests/unit/schedule-compliance-panel.spec.ts`

- [ ] Add a `compliance` slot to `VersionReviewDetail`.
- [ ] Render `ScheduleCompliancePanel` through that slot, after the current schedule version context and before backend lead panels/review tab controls.
- [ ] Render the slot only when `$slots.compliance` exists so empty spacing is not introduced.
- [ ] Show top-level status:
  - Pass: `법적 기준 충족`
  - Fail: `법적 기준 위반 N건`
  - Check required: `법적 기준 확인 필요`
- [ ] Show four mandatory rule summaries:
  - `NOD 금지`
  - `3연속 야간 금지`
  - `2연속 야간 후 48시간 휴식`
  - `월 야간 15회 이하`
- [ ] Show violation details with employee name, date/date range, and reason.
- [ ] Show Optional Off request summary:
  - `Off 요청 반영 X / 요청 Y일`
  - percentage if `Y > 0`
  - `요청 없음` if `Y === 0`
- [ ] Use the panel content contract from `Design Consultation Review`.
- [ ] Use the `Plan Design Review 보강` DOM order:
  - current schedule version context
  - compliance panel
  - existing backend review lead panel if needed
  - review tabs
- [ ] Avoid nested card visuals:
  - one outer panel
  - section bands/rows inside it
  - no repeated `n-card` inside the review card
- [ ] Use visible status text with semantic color:
  - success + `충족`
  - error + `위반 N건`
  - neutral/info + `요청 없음` or Off request rate
- [ ] Limit initial violation detail rendering to the first 3-5 items and expose the remaining count.
- [ ] If violation details need a reveal interaction, use a real button with visible focus and Korean label.
- [ ] Preserve responsive readability at `<900px` and `<767px`.
- [ ] Preserve screen-reader order: rule name, status/count, detail hint.
- [ ] Add stable test hooks:
  - `data-test="compliance-panel"`
  - `data-test="compliance-decision-status"`
  - `data-test="compliance-rule-{ruleCode}"`
  - `data-test="compliance-violation-list"`
  - `data-test="compliance-off-summary"`
- [ ] Keep user-facing UI text Korean.
- [ ] Use Tailwind and existing Naive UI patterns. Do not introduce new UI libraries.

#### TDD Execution Steps

- [ ] **Step 1: Write failing panel tests**

Create `tests/unit/schedule-compliance-panel.spec.ts`. Mount only `ScheduleCompliancePanel.vue`; do not mount Step5. Required test names:

```ts
it('renders the pass decision and four passed rule rows');
it('renders the fail decision with capped violation details');
it('renders check-required as 확인 필요 instead of success');
it('renders 요청 없음 when there are no Off requests');
it('renders Off request fulfilled and total counts without error styling');
it('uses a real button for reveal when hidden violations remain');
it('does not render nested n-card surfaces');
```

Minimum first failing test:

```ts
const wrapper = mount(ScheduleCompliancePanel, {
  props: {
    result: {
      mandatoryPassed: true,
      canFinalizeLocally: true,
      mandatoryViolationCount: 0,
      checkRequiredCount: 0,
      summaries: [
        {
          code: 'nod_pattern',
          label: 'NOD 금지',
          status: 'passed',
          violationCount: 0,
          message: '충족',
        },
        {
          code: 'triple_night',
          label: '3연속 야간 금지',
          status: 'passed',
          violationCount: 0,
          message: '충족',
        },
        {
          code: 'rest_after_two_nights',
          label: '2연속 야간 후 48시간 휴식',
          status: 'passed',
          violationCount: 0,
          message: '충족',
        },
        {
          code: 'monthly_night_limit',
          label: '월 야간 15회 이하',
          status: 'passed',
          violationCount: 0,
          message: '충족',
        },
      ],
      violations: [],
      offRequests: {
        totalRequests: 0,
        fulfilledRequests: 0,
        unfulfilledRequests: 0,
        reflectionRate: null,
      },
    },
  },
});

expect(wrapper.get('[data-test="compliance-decision-status"]').text()).toContain('법적 기준 충족');
expect(wrapper.findAll('[data-test^="compliance-rule-"]')).toHaveLength(4);
expect(wrapper.get('[data-test="compliance-off-summary"]').text()).toContain('요청 없음');
```

- [ ] **Step 2: Run panel tests and verify missing component failure**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-compliance-panel.spec.ts
```

Expected: FAIL because `ScheduleCompliancePanel.vue` does not exist yet.

- [ ] **Step 3: Create the presentational panel**

Create `src/components/schedule/review/ScheduleCompliancePanel.vue` with these implementation decisions:

- Props: `result: ScheduleComplianceResult`, `initialDetailLimit?: number`.
- Default detail limit: `5`.
- Local state only for reveal/collapse when `violations.length > initialDetailLimit`.
- Decision header text:
  - `checkRequiredCount > 0`: `법적 기준 확인 필요`
  - `mandatoryViolationCount > 0`: `법적 기준 위반 ${mandatoryViolationCount}건`
  - otherwise: `법적 기준 충족`
- Decision subcopy:
  - check required: `일부 기준을 안전하게 계산하지 못했습니다. 확인 후 확정하세요.`
  - fail: `위반 항목을 수정한 뒤 확정할 수 있습니다.`
  - pass: `확정 전 필수 기준을 모두 확인했습니다.`
- Detail list is hidden when `violations.length === 0`.
- Off summary text:
  - `totalRequests === 0`: `요청 없음`
  - otherwise: `Off 요청 반영 ${fulfilledRequests} / 요청 ${totalRequests}일`

Template skeleton:

```vue
<section data-test="compliance-panel" class="rounded-xl border border-slate-200 bg-white p-4">
  <header>
    <p class="text-xs font-medium text-slate-500">법적 기준 검증</p>
    <h3 data-test="compliance-decision-status" class="text-base font-semibold">
      {{ decisionTitle }}
    </h3>
    <p class="mt-1 text-sm">{{ decisionDescription }}</p>
  </header>

  <div class="mt-4 grid gap-2 md:grid-cols-2">
    <div
      v-for="summary in result.summaries"
      :key="summary.code"
      :data-test="`compliance-rule-${summary.code}`"
      class="rounded-lg border border-slate-200 p-3"
    >
      <span>{{ summary.label }}</span>
      <strong>{{ summary.message }}</strong>
    </div>
  </div>

  <ul v-if="visibleViolations.length > 0" data-test="compliance-violation-list">
    <li v-for="violation in visibleViolations" :key="violation.id">
      {{ violation.employeeName }} · {{ violation.dates.join(' ~ ') }} · {{ violation.message }}
    </li>
  </ul>

  <button v-if="hiddenViolationCount > 0" type="button">
    위반 {{ hiddenViolationCount }}건 더 보기
  </button>

  <div data-test="compliance-off-summary">
    {{ offRequestText }}
  </div>
</section>
```

The skeleton is intentionally plain. Use Tailwind semantic border/background/text classes, but do not add `n-card`, decorative icons, gradients, or nested cards.

- [ ] **Step 4: Run panel tests until they pass**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-compliance-panel.spec.ts
```

Expected: PASS for all panel tests.

- [ ] **Step 5: Add `compliance` slot test for `VersionReviewDetail`**

Extend `tests/unit/schedule-review.spec.ts` if it already mounts `VersionReviewDetail`; otherwise create the smallest mount in `tests/unit/schedule-compliance-panel.spec.ts`. Test that slot content appears after `[data-test="review-focus-heading"]` and before `[data-test="review-tab-grid"]`.

Expected DOM assertion pattern:

```ts
const html = wrapper.html();
expect(html.indexOf('data-test="review-focus-heading"')).toBeLessThan(
  html.indexOf('data-test="compliance-panel"')
);
expect(html.indexOf('data-test="compliance-panel"')).toBeLessThan(
  html.indexOf('data-test="review-tab-grid"')
);
```

- [ ] **Step 6: Add slot to `VersionReviewDetail.vue`**

Insert after the focus heading block and before `leadPanel` blocks:

```vue
<div v-if="$slots.compliance" class="mb-4">
  <slot name="compliance" />
</div>
```

Do not change existing `leadPanel`, `tabOptions`, or slot names.

- [ ] **Step 7: Run panel and review tests**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-compliance-panel.spec.ts tests/unit/schedule-review.spec.ts
```

Expected: PASS. If `tests/unit/schedule-review.spec.ts` does not cover this component after inspection, run only the panel test file and document the reason in the commit body.

- [ ] **Step 8: Commit the panel slice**

```bash
git add src/components/schedule/review/ScheduleCompliancePanel.vue src/components/schedule/review/VersionReviewDetail.vue tests/unit/schedule-compliance-panel.spec.ts tests/unit/schedule-review.spec.ts
git commit -m "feat: add Step5 compliance review panel"
```

### 3. Wire Step5 State and Finalization Guard

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Test: `tests/unit/step5-result.spec.ts`

- [ ] Import `evaluateScheduleCompliance` and `ScheduleCompliancePanel`.
- [ ] Add a computed `complianceResult`.
- [ ] Build the validation assignment input from merged display context:
  - sequence/rest checks need `previousMonthAssignments + currentScheduleAssignments`
  - use `previousMonthAssignments` directly, not `grid.assignments.value`
  - do not let the previous-month display slider change validation results
  - monthly night cap and Off request rate stay target-month only inside utility
- [ ] Recalculate automatically when these change:
  - `currentScheduleAssignments`
  - `previousMonthAssignments`
  - `offRequestsCurrentMonth`
  - `grid.employees.value`
  - `organizationStore.shifts`
  - `scheduleStore.basicInfo.month`
- [ ] Include `!complianceResult.mandatoryPassed` in `isFinalizeActionDisabled`.
- [ ] Treat `check_required` the same as a local finalization blocker.
- [ ] Do not rely on disabled button click events. Disabled Naive UI buttons will not emit a normal click.
- [ ] Show a visible finalization block reason near the CTA when compliance fails:
  - `법적 기준 위반 N건을 해결한 뒤 확정할 수 있습니다.`
- [ ] Show a visible finalization block reason near the CTA when compliance is check-required:
  - `법적 기준을 확인한 뒤 확정할 수 있습니다.`
- [ ] Add `data-test="finalize-block-reason"` to the visible blocker copy.
- [ ] If compliance fails and `primaryAction.disabledReason` also exists, show the compliance blocker first; backend disabled reason may remain secondary support copy.
- [ ] If compliance passes but `primaryAction.disabledReason` exists, show the existing backend disabled reason.
- [ ] If `handleFinalizeAction` is invoked through a non-disabled path while compliance fails, show the same message via `src/utils/message.ts`:
  - `법적 기준 위반 N건을 해결한 뒤 확정할 수 있습니다.`
- [ ] If `handleFinalizeAction` is invoked through a non-disabled path while compliance is check-required, show the same check-required message via `src/utils/message.ts`.
- [ ] Do not change solver start, regenerate, save, compare modal, or backend review API behavior.

#### TDD Execution Steps

- [ ] **Step 1: Add failing Step5 wiring tests**

Extend `tests/unit/step5-result.spec.ts` with these test names near existing finalization/review tests:

```ts
it('renders compliance panel before review tabs after assignments load');
it('disables finalization when local compliance has mandatory violations');
it('shows local compliance blocker before backend disabled reason');
it('keeps backend disabled reason when local compliance passes');
it('uses previousMonthAssignments instead of slider-visible assignments for validation');
it('updates compliance text after a manual grid edit');
it('shows check-required blocker when validation cannot safely run');
```

Mock the panel only if existing Step5 tests become too brittle. If mocked, the mock must still expose `data-test="compliance-panel"` and print the `result` status so the Step5 recompute behavior remains testable.

Recommended component mock:

```ts
vi.mock('@/components/schedule/review/ScheduleCompliancePanel.vue', () => ({
  default: {
    props: ['result'],
    template: `
      <section data-test="compliance-panel">
        <span data-test="compliance-decision-status">
          {{ result.mandatoryViolationCount > 0 ? '법적 기준 위반 ' + result.mandatoryViolationCount + '건' : result.checkRequiredCount > 0 ? '법적 기준 확인 필요' : '법적 기준 충족' }}
        </span>
        <span data-test="compliance-off-summary">
          {{ result.offRequests.totalRequests === 0 ? '요청 없음' : 'Off 요청 반영 ' + result.offRequests.fulfilledRequests + ' / 요청 ' + result.offRequests.totalRequests + '일' }}
        </span>
      </section>
    `,
  },
}));
```

- [ ] **Step 2: Run Step5 tests and verify they fail before wiring**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts
```

Expected: FAIL because `Step5Result.vue` does not yet render the compliance panel or local blocker.

- [ ] **Step 3: Import utility and panel**

Modify `src/views/schedule/Step5Result.vue` imports:

```ts
import ScheduleCompliancePanel from '@/components/schedule/review/ScheduleCompliancePanel.vue';
import { evaluateScheduleCompliance } from '@/utils/scheduleCompliance';
```

- [ ] **Step 4: Add compliance input and blocker computed values**

Add computed values near `primaryAction` / finalize computed state:

```ts
function mergeComplianceAssignments(
  previousAssignments: AssignmentMap,
  currentAssignments: AssignmentMap
): AssignmentMap {
  const merged: AssignmentMap = {};

  for (const [employeeId, dateMap] of Object.entries(previousAssignments || {})) {
    merged[employeeId] = { ...(dateMap || {}) };
  }

  for (const [employeeId, dateMap] of Object.entries(currentAssignments || {})) {
    merged[employeeId] = {
      ...(merged[employeeId] || {}),
      ...(dateMap || {}),
    };
  }

  return merged;
}

const complianceAssignments = computed<AssignmentMap>(() => {
  return mergeComplianceAssignments(
    previousMonthAssignments.value,
    currentScheduleAssignments.value
  );
});

const complianceResult = computed(() => {
  return evaluateScheduleCompliance({
    month: scheduleStore.basicInfo?.month ?? '',
    employees: grid.employees.value.map((employee) => ({
      id: employee.id,
      name: employee.name,
    })),
    assignments: complianceAssignments.value,
    offRequests: offRequestsCurrentMonth.value,
    shifts: organizationStore.shifts,
  });
});

const complianceFinalizeBlockReason = computed(() => {
  if (complianceResult.value.checkRequiredCount > 0) {
    return '법적 기준을 확인한 뒤 확정할 수 있습니다.';
  }

  if (complianceResult.value.mandatoryViolationCount > 0) {
    return `법적 기준 위반 ${complianceResult.value.mandatoryViolationCount}건을 해결한 뒤 확정할 수 있습니다.`;
  }

  return null;
});

const visibleFinalizeBlockReason = computed(() => {
  return complianceFinalizeBlockReason.value ?? primaryAction.value.disabledReason;
});
```

Do not use `grid.assignments.value` here. Do not use `mergeAssignmentMapsWithFallback()` here; that helper is for previous-month fallback windows and filters by an allowed-date list. Required behavior: every loaded previous-month date remains available for sequence/rest validation, and current-month assignments win when keys overlap.

- [ ] **Step 5: Render the panel through the new slot**

Inside `VersionReviewDetail`, before `#headerActions`, add:

```vue
<template #compliance>
  <ScheduleCompliancePanel :result="complianceResult" />
</template>
```

Render only in the existing `shouldShowResultDetails` branch. Do not render a standalone panel outside `VersionReviewDetail`.

- [ ] **Step 6: Gate finalize disabled state**

Update `isFinalizeActionDisabled`:

```ts
const isFinalizeActionDisabled = computed(() => {
  return (
    isPrimaryActionRunning.value ||
    primaryAction.value.kind !== 'finalize' ||
    !primaryAction.value.targetVersionId ||
    Boolean(complianceFinalizeBlockReason.value) ||
    Boolean(primaryAction.value.disabledReason)
  );
});
```

This intentionally blocks `check_required` through `complianceFinalizeBlockReason`.

- [ ] **Step 7: Add visible CTA blocker copy**

Near the finalize button group, before the row containing actions if possible, render:

```vue
<p
  v-if="shouldShowFinalizeAction && visibleFinalizeBlockReason"
  data-test="finalize-block-reason"
  class="text-sm font-medium text-rose-700"
>
  {{ visibleFinalizeBlockReason }}
</p>
```

If local compliance blocks and backend `primaryAction.disabledReason` also exists, the visible text must show local compliance first. Backend copy may be rendered as secondary muted support only when it does not confuse the primary blocker.

- [ ] **Step 8: Guard non-disabled invocation path**

Update `handleFinalizeAction()` so programmatic or non-button invocation gets the same message:

```ts
async function handleFinalizeAction() {
  if (complianceFinalizeBlockReason.value) {
    showInfo(complianceFinalizeBlockReason.value);
    return;
  }

  if (isFinalizeActionDisabled.value) {
    if (primaryAction.value.disabledReason) {
      showInfo(primaryAction.value.disabledReason);
    }
    return;
  }

  await handlePrimaryAction();
}
```

Keep `showInfo` from `src/utils/message.ts`; do not use `window.$message`.

- [ ] **Step 9: Run Step5 tests until they pass**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts
```

Expected: PASS. If Step5 tests reveal the panel mock hides integration bugs, remove the mock for the DOM order test and mount the real panel in that test.

- [ ] **Step 10: Commit the Step5 wiring slice**

```bash
git add src/views/schedule/Step5Result.vue tests/unit/step5-result.spec.ts
git commit -m "feat: gate Step5 finalization on compliance"
```

## Test Plan

### Targeted Test Checklist

- [ ] Add `tests/unit/schedule-compliance.spec.ts`.
- [ ] Test a no-violation schedule returns `mandatoryPassed: true` and four passed summaries.
- [ ] Test `N -> O -> D` is reported as `nod_pattern`.
- [ ] Test `N -> N -> N` is reported as `triple_night`.
- [ ] Test `N -> N -> O -> D` fails the 48-hour rest rule.
- [ ] Test `N -> N -> O -> O -> D` passes the 48-hour rest rule.
- [ ] Test 16 target-month `N` assignments fail `monthly_night_limit`.
- [ ] Test previous-month `N` assignments are excluded from monthly night count.
- [ ] Test previous-month context can trigger sequence/rest violations across the month boundary.
- [ ] Test unknown shift code or malformed date returns `check_required` and blocks local finalization.
- [ ] Test Off request fulfillment counts only requested target-month dates and only final `O` as fulfilled.
- [ ] Add `tests/unit/schedule-compliance-panel.spec.ts`.
- [ ] Test pass, fail, and check-required decision headers.
- [ ] Test initial violation detail cap and remaining count.
- [ ] Test Off request `요청 없음` and `반영 X / 요청 Y일` text.
- [ ] Test optional reveal control, if implemented, is a real button with Korean accessible text.
- [ ] Test panel does not render repeated nested `n-card` surfaces.
- [ ] Extend `tests/unit/step5-result.spec.ts`.
- [ ] Test Step5 renders the compliance panel after assignments load.
- [ ] Test the compliance panel appears before review tab buttons in DOM order.
- [ ] Test Step5 disables finalization when mandatory violations exist.
- [ ] Test Step5 disables finalization when compliance result is `확인 필요`.
- [ ] Test Step5 shows visible compliance block reason near the finalize CTA when mandatory violations exist.
- [ ] Test Step5 shows visible check-required block reason near the finalize CTA when validation cannot safely run.
- [ ] Test Step5 uses `previousMonthAssignments`, not slider-visible `grid.assignments.value`, for validation.
- [ ] Test compliance blocker copy takes priority when backend disabled reason also exists.
- [ ] Test backend disabled reason remains visible when compliance passes but backend gate blocks finalization.
- [ ] Test manual grid edit updates the compliance text immediately.
- [ ] Test Off request summary text displays `반영 X / 요청 Y일`.
- [ ] Test Off request summary displays `요청 없음` when there are no target-month Off requests.
- [ ] Test the first render shows only the initial violation detail limit and reports the remaining count.
- [ ] Test the panel exposes status as visible text, not only color classes.
- [ ] Test `확인 필요` state for missing/invalid rule inputs if the utility supports that state.
- [ ] Test a violation reveal control, if added, is a button with accessible Korean text.
- [ ] Test no repeated `n-card` is introduced inside the compliance panel component.

Verification commands:

```bash
pnpm test:unit -- tests/unit/schedule-compliance.spec.ts tests/unit/schedule-compliance-panel.spec.ts tests/unit/step5-result.spec.ts
pnpm lint:check
```

Expected final output:

- `pnpm test:unit -- ...` exits `0` with all three targeted files passing.
- `pnpm lint:check` exits `0`; warnings are acceptable under the current repo script, ESLint errors are not.
- If lint reports fixable errors, run `pnpm lint:fix`, then rerun `pnpm lint:check`.

### Full Completion Checklist

- [ ] Utility tests prove every legal rule, previous-month sequence behavior, target-month-only night count, target-month-only Off reflection, and unknown-input blocking.
- [ ] Panel tests prove visible Korean status text, capped details, Off summary neutrality, reveal button accessibility, and no nested `n-card`.
- [ ] Step5 tests prove panel placement, local blocker priority, backend blocker fallback, previous-month direct validation input, and manual edit recomputation.
- [ ] `pnpm lint:check` passes.
- [ ] All task commits are present and scoped:
  - `feat: add schedule compliance evaluator`
  - `feat: add Step5 compliance review panel`
  - `feat: gate Step5 finalization on compliance`
- [ ] Final implementation notes mention that backend enforcement remains out of scope.

## Assumptions

- This task is frontend validation and UI-level finalization guarding only.
- API-level hard enforcement remains a follow-up backend evaluator task.
- Off request reflection does not block finalization.
- The Step5 grid may display previous-month days, but the monthly night limit is strictly target-month only.
- Night logical date follows existing solver behavior: a schedule cell marked `N` belongs to that schedule date, while the actual work interval is `00:00-08:00` on the next calendar day.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status | Findings                                                  |
| ------------- | --------------------- | ------------------------------- | ---- | ------ | --------------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | —      | —                                                         |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | —      | —                                                         |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 3    | clean  | 8 issues converted into plan constraints, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 2    | clean  | score: 7/10 -> 9/10, 6 decisions                          |

- **UNRESOLVED:** 0
- **VERDICT:** ENG + DESIGN CLEARED — ready to implement from this updated plan.
