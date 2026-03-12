# P3 Onboarding Menu Highlight and Deep-Link UX Specification

This document is the canonical deliverable for task `P3-2.2`.
It defines the onboarding-specific menu highlight, deep-link, and return-path UX for guiding admins to employee registration and Excel upload surfaces.

Upstream source of truth:

- `docs/migration/P3_ONBOARDING_STATE_MACHINE.md`
- `docs/migration/P3_ONBOARDING_WIZARD_UX.md`
- `docs/migration/RBAC_MATRIX.md`

Out of scope:

- onboarding page composition and component tree
- router `beforeEach` insertion order
- Pinia/store field shape
- API contract and persistence model
- full employee module IA beyond the onboarding entry path

## 1. Scope Fix

This task only covers the onboarding `employee_seed` step.

It does **not** redefine:

- `organization_info` CTA behavior
- `schedule_request` CTA behavior
- the full onboarding page integration plan from `P3-2.3`

Reason:

- `P3-2.1` already fixed the wizard copy and CTA intent
- this task exists only to make the Step 2 destination obvious and reversible
- broader route/store/page composition belongs to later integration work

## 2. UX Goal

The user must be able to do two things without guessing:

1. find the correct destination for Step 2 employee setup
2. return to `/onboarding` with clear progress context after taking action

The UX must support both:

- manual employee entry
- Excel-based batch employee creation

## 3. Target Matrix

| Onboarding context | Primary user intent | Sidebar target | In-page target | Canonical deep link | Compatibility fallback | Step completion trigger |
| --- | --- | --- | --- | --- | --- | --- |
| `employee_seed` primary CTA | 직원 1명을 직접 등록 | `직원 관리` menu | `+ 직원 추가` CTA / employee form | `/admin/employees?source=onboarding&step=employee_seed&entry=manual&returnTo=%2Fonboarding&returnStep=employee_seed` | `/schedule/step3?source=onboarding&step=employee_seed&entry=manual&returnTo=%2Fonboarding&returnStep=employee_seed` | first persisted schedulable employee exists |
| `employee_seed` supporting link | 엑셀로 여러 직원을 한 번에 등록 | `직원 관리` menu | `엑셀 업로드` tab + upload panel | `/admin/employees?source=onboarding&step=employee_seed&entry=excel&returnTo=%2Fonboarding&returnStep=employee_seed` | `/schedule/step3?source=onboarding&step=employee_seed&entry=excel&returnTo=%2Fonboarding&returnStep=employee_seed` | first persisted schedulable employee exists |

Important boundary:

- the canonical destination is the future employee-management route from `RBAC_MATRIX`
- the current app does not yet have that route or menu
- until `P6` exists, onboarding must use the compatibility fallback route and must not invent a fake permanent sidebar IA

## 4. Canonical Deep-Link Contract

### 4.1 Query Keys

Onboarding deep links use the following query contract:

- `source=onboarding`
- `step=employee_seed`
- `entry=manual | excel`
- `returnTo=/onboarding`
- `returnStep=employee_seed`

No other query key is required for `P3-2.2`.

### 4.2 Entry Resolution

`entry` resolves as follows:

- `manual`: open the employee page in manual-registration mode
- `excel`: open the employee page in Excel-upload mode
- unknown value: fallback to `manual`

### 4.3 Return Path Sanitization

`returnTo` must be sanitized before use.

Allowed:

- internal app path only
- canonical onboarding fallback: `/onboarding`

Rejected:

- external URL
- empty string
- malformed path

Fallback rule:

- if `returnTo` is invalid, use `/onboarding`

### 4.4 Compatibility Retirement Rule

The compatibility fallback to `/schedule/step3` is temporary.

It should retire only when all of the following are true:

- the shipped admin IA includes a real `직원 관리` sidebar destination
- that destination supports both manual entry and Excel upload entry modes
- the onboarding return banner can be rendered on that destination without relying on schedule-step UI

Until those conditions are satisfied in a released build:

- onboarding UX continues to point to the compatibility fallback
- the canonical route remains the product target, not the implementation default

## 5. Sidebar Highlight Rules

### 5.1 Highlight Target

When the user enters the employee destination via onboarding deep link:

- highlight the `직원 관리` sidebar item if that menu exists
- auto-expand its parent group if the future IA nests it under `마스터 관리`

### 5.2 Compatibility Behavior in the Current App

The current app only exposes `근무표 생성` in [`src/components/layout/Sidebar.vue`](/home/brown/projects/every-shift-mvp/src/components/layout/Sidebar.vue).

Therefore the compatibility rule is:

- do not fabricate a temporary `직원 관리` item only for onboarding
- keep the existing schedule menu behavior unchanged
- rely on route navigation plus in-page emphasis inside [`src/views/schedule/Step3EmployeeInfo.vue`](/home/brown/projects/every-shift-mvp/src/views/schedule/Step3EmployeeInfo.vue) until the dedicated employee menu exists

This preserves scope and avoids locking temporary MVP structure into the final IA.

### 5.3 Highlight Lifetime

Highlighting has two layers:

1. attention pulse
2. persistent guided state

Rules:

- animated pulse lasts for up to `8 seconds`
- the pulse ends early if the user hovers, focuses, clicks, or navigates within the target surface
- after the pulse ends, a static highlighted state remains while the onboarding context is still active

### 5.4 Highlight Clear Conditions

The static highlighted state clears when any of the following becomes true:

- Step 2 is completed and onboarding progress refresh confirms it
- the user leaves the onboarding-target subtree and no onboarding return banner is active
- the route no longer contains a valid onboarding source context
- the current user is not eligible for onboarding UX
- the user explicitly dismisses the onboarding helper banner

## 6. In-Page Guidance Rules

Because the current compatibility route lands inside a schedule step page rather than a future dedicated employee module, page-level guidance is mandatory.

### 6.1 Manual Entry (`entry=manual`)

The page must:

- keep the default manual tab active
- visually emphasize the `+ 직원 추가` action as the main next step
- show a small onboarding helper banner that explains: `직원을 1명 이상 저장하면 온보딩으로 돌아가 다음 단계를 진행할 수 있습니다.`

### 6.2 Excel Entry (`entry=excel`)

The page must:

- auto-select the `엑셀 업로드` tab on arrival
- scroll the upload panel into view on first render
- visually emphasize the upload entry surface, not the whole page
- keep the same onboarding helper banner with Excel-specific wording

Recommended helper copy:

- `엑셀 파일로 직원을 한 번에 등록할 수 있습니다. 업로드 후 저장이 완료되면 온보딩으로 돌아가세요.`

### 6.3 Persisted Completion Reminder

Neither tab is sufficient by itself.

The page-level guidance must reinforce that:

- tab visit is not completion
- file selection is not completion
- saving at least one schedulable employee is the completion event

## 7. Return Path UX

### 7.1 Persistent Return Banner

When `source=onboarding` is valid and the current user is eligible:

- show a persistent top-of-page helper banner
- banner primary action: `온보딩으로 돌아가기`
- banner secondary text: current onboarding step context (`2단계: 첫 직원 등록`)

The banner exists to preserve orientation while the user works inside another page.

### 7.2 Return Navigation Rule

Clicking `온보딩으로 돌아가기` must:

- navigate to sanitized `returnTo`
- include enough state to reopen the current incomplete step
- default to `/onboarding` with Step 2 expanded if no extra state is available

### 7.3 After Successful Save

After the first successful persisted employee save/import:

- show success feedback
- keep the user on the current page
- provide a prominent follow-up CTA: `온보딩으로 돌아가기`

This task does **not** auto-return immediately after save.

Reason:

- admins may want to add more than one employee
- forced navigation would create unnecessary context loss
- onboarding completion is organization-scoped and should be confirmed on refresh when the user returns

### 7.4 Unsaved Changes Rule

If the user tries to return to onboarding while unsaved changes exist:

- show a confirmation dialog
- warn that unsaved employee edits/upload results may be lost
- allow cancel and continue editing

### 7.5 Browser Back Fallback

If the deep-linked page was opened directly and browser history does not contain `/onboarding`:

- the return CTA must use sanitized router navigation, not `history.back()`

## 8. Access Control and Invalid Deep-Link Handling

### 8.1 Eligible User

The onboarding highlight/deep-link UX is enabled only when all are true:

- authenticated user
- access state is `admin_active`
- effective organization onboarding is incomplete
- route access itself is otherwise allowed

### 8.2 Non-Admin or Blocked Access States

For all other access states:

- onboarding query parameters must not activate highlight UI
- normal RBAC/access guards take precedence
- the link must not bypass `admin_pending`, `admin_rejected`, or unauthenticated redirects

Specific outcomes:

- `unauthenticated` -> `/login`
- `admin_pending` -> `/access/pending`
- `admin_rejected` -> `/access/rejected`
- `user_active` -> standard non-admin route policy applies; onboarding helper UI is suppressed
- `super_active` -> onboarding helper UI is suppressed

### 8.3 Completed Onboarding

If an `admin_active` user opens an onboarding deep link after organization onboarding is already complete:

- open the target page normally
- strip or ignore onboarding helper state
- do not show highlight persistence or return banner

### 8.4 Malformed or Stale Deep Links

Malformed or stale links degrade gracefully:

- invalid `entry` -> use manual mode
- invalid `returnTo` -> use `/onboarding`
- target surface unavailable in current build -> keep the route, show manual mode, and show a non-blocking info message

For the current MVP build, this means:

- if Excel-tab activation fails for any reason, fall back to the manual tab
- the user must still have a visible route back to onboarding

### 8.5 User-Facing Recovery Messages

Malformed deep links must show calm, non-blocking guidance instead of hard failure UI.

Required message intent by case:

- invalid `entry`: `직원 등록 화면으로 이동했습니다. 엑셀 업로드 경로를 확인할 수 없어 직접 입력 화면을 먼저 보여드립니다.`
- invalid `returnTo`: `온보딩 복귀 경로를 확인할 수 없어 온보딩 첫 화면으로 돌아가도록 안내합니다.`
- unavailable Excel target in current build: `이 화면에서는 엑셀 업로드 경로를 바로 열 수 없어 직원 등록 화면으로 먼저 안내합니다.`

Message rules:

- tone must stay informational, not error-heavy
- message appears once per invalid arrival
- message must not block employee registration or onboarding return actions
- helper banner and return CTA must still render after the message

## 9. Implementation Handoff to P3-2.3

The later page-composition task should consume this document as-is and wire it into implementation.

Minimum handoff requirements:

- sidebar accepts an onboarding highlight state without changing base RBAC visibility
- employee page reads the onboarding query contract
- employee page can switch tab/focus based on `entry`
- onboarding return CTA uses sanitized internal navigation
- completion refresh clears the helper state instead of leaving stale highlights behind

## 10. Acceptance Checklist

This task is complete only if later implementers can answer all of the following from this document alone:

- Which onboarding step uses menu highlighting?
- What is the canonical deep link for manual entry and Excel upload?
- What is the current-app fallback route?
- What gets highlighted in the sidebar and in the page body?
- How long does highlight emphasis persist, and when does it clear?
- How does the user return to onboarding?
- What happens for non-admin users or malformed deep links?
- When does the product stop using the `/schedule/step3` compatibility fallback?
