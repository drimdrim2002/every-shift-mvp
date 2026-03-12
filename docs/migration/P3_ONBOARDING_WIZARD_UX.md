# P3 Onboarding Wizard IA and Content Specification

This document is the canonical deliverable for task `P3-2.1`.
It fixes the onboarding wizard information architecture, step copy, CTA contract, and completion exit semantics without defining router/store implementation details.

Upstream source of truth:

- `docs/REFINED_PRD.md` section `5.3 [신규] 신규 조직 온보딩`
- `docs/migration/P3_ONBOARDING_STATE_MACHINE.md`
- `docs/migration/RBAC_MATRIX.md`

Out of scope:

- sidebar highlight animation details
- deep-link return-path mechanics
- Pinia state shape
- onboarding API transport
- router `beforeEach` insertion order

Those belong to later `P3-2.2`, `P3-2.3`, and `P3-3.x` tasks and must consume this document rather than reinterpret it.

## 1. Product Decision Summary

### 1.1 Route Semantics

The canonical onboarding experience is a dedicated forced route:

- route: `/onboarding`
- audience: `admin_active` only
- access rule: only while the effective organization's onboarding is incomplete

PRD wording says "popup", but the enforced-route model from `P3-1.1` takes precedence.
The UX may visually use a centered wizard card or modal-like shell, but the product semantics are a full onboarding page, not a dismissible dashboard popup.

### 1.2 Wizard Structure

The wizard has exactly three business steps and must reuse the canonical step keys from `P3-1.1`:

1. `organization_info`
2. `employee_seed`
3. `schedule_request`

The wizard shell shows all three steps in order, but only the first incomplete step is actionable.
Later steps are visible as upcoming work and remain disabled until the previous step is complete.

### 1.3 Completion Ownership Reminder

The wizard represents organization-scoped readiness, not personal setup.

Implications for copy and CTA:

- the copy must describe "our organization/team readiness", not "your personal profile setup"
- once one admin completes the flow, the same organization should not see onboarding again
- Step 2 and Step 3 copy must point to real business outcomes, not mere page visits

## 2. Shell IA

## 2.1 Entry State

When `/onboarding` opens, the page must present:

- welcome headline
- short explanation of why onboarding is required now
- 3-step progress indicator
- one expanded step card for the current incomplete step
- disabled preview cards for later steps

Recommended hero copy:

- headline: `EveryShift 시작 준비를 함께 완료해볼까요?`
- body: `조직 설정, 첫 직원 등록, 첫 스케줄 요청까지 완료하면 관리자 대시보드로 이동합니다.`

### 2.2 Persistent Shell Rules

The following rules are fixed:

- no skip CTA
- no dismiss or close icon
- no alternate exit to dashboard before completion
- completed steps show `완료` status and a short completion summary
- the next incomplete step auto-expands after a successful completion refresh

### 2.3 Step Card Layout

Each step card must contain:

- step number and status
- user-goal title
- short explanatory copy
- "what you will do" checklist
- primary CTA
- completion hint describing what unlocks next

Optional secondary actions are allowed only if they do not compete with the primary CTA.

## 3. Step Content Contract

## 3.1 Step 1: `organization_info`

### User Goal

Confirm the organization's minimum scheduling configuration so the first planning workflow has valid operating context.

### User-Facing Copy

- step label: `1단계`
- title: `조직 정보와 운영 기준을 확인하세요`
- body: `회원가입 때 입력한 조직 정보를 바탕으로 근무 유형과 주요 사이트를 확인하고, 스케줄 생성에 필요한 기본 설정을 마무리합니다.`

Recommended checklist copy:

- `조직 이름과 조직 유형을 확인합니다.`
- `근무 유형 또는 시프트 운영 방식을 확인합니다.`
- `최소 1개 이상의 근무 사이트를 확인하거나 추가합니다.`

### CTA Contract

- primary CTA label: `조직 정보 확인하기`
- primary CTA intent: open the organization configuration surface needed to confirm the minimum scheduling prerequisites

The CTA may later resolve to an inline panel, reused organization-management screen, or focused edit flow.
That navigation detail is not fixed here, but the user intent is fixed.

### Completion Messaging

On successful completion, the wizard must show:

- inline success text: `조직 기본 설정이 준비되었습니다.`
- next-step nudge: `이제 첫 직원을 등록해 스케줄링 준비를 이어가세요.`

### Completion Meaning

This step is complete only when the persisted organization-level confirmation/update event required by `P3-1.1` exists.
Viewing data without saving is not enough.

## 3.2 Step 2: `employee_seed`

### User Goal

Ensure the organization has at least one schedulable employee before the first schedule request.

### User-Facing Copy

- step label: `2단계`
- title: `첫 직원을 등록하세요`
- body: `근무표를 만들기 전에 스케줄에 포함할 직원을 최소 1명 이상 준비해야 합니다. 직접 입력하거나 엑셀 업로드 방식으로 시작할 수 있습니다.`

Recommended checklist copy:

- `근무자 이름과 식별 정보를 등록합니다.`
- `직급, 전문 분야, 근무 가능 시프트를 설정합니다.`
- `스케줄에 포함할 수 있는 직원이 최소 1명 이상 준비되었는지 확인합니다.`

### CTA Contract

- primary CTA label: `직원 등록하러 가기`
- primary CTA intent: take the admin to the employee registration entry point

Supporting guidance may mention both manual entry and Excel import, but the primary CTA must still communicate "employee registration" rather than a generic menu jump.

### Completion Messaging

On successful completion, the wizard must show:

- inline success text: `첫 직원 등록이 완료되었습니다.`
- next-step nudge: `이제 첫 스케줄 요청을 시작해 보세요.`

### Completion Meaning

This step is complete only when the organization has at least one schedulable active employee record.
Opening the employee page without creating a usable employee does not complete the step.

## 3.3 Step 3: `schedule_request`

### User Goal

Guide the admin into the first real scheduling workflow and make the transition from setup to product usage explicit.

### User-Facing Copy

- step label: `3단계`
- title: `첫 스케줄 요청을 시작하세요`
- body: `템플릿을 확인하고 초기 데이터를 입력해 첫 근무표 생성을 시작합니다. 이 단계는 실제 스케줄 생성 워크플로우를 시작하면 완료됩니다.`

Recommended checklist copy:

- `계획 월과 기본 스케줄 정보를 확인합니다.`
- `필요하면 템플릿 또는 예시 데이터를 참고합니다.`
- `첫 스케줄 생성 요청을 시작합니다.`

### CTA Contract

- primary CTA label: `첫 스케줄 요청 시작하기`
- primary CTA intent: move the admin into the first schedule-creation flow

This CTA is intentionally phrased around "request/start" rather than "upload" because `P3-1.1` fixes Step 3 completion as the first persisted scheduling workflow start event.
Template download or upload guidance is supporting UX, not the completion trigger.

### Completion Messaging

On successful completion, the wizard must show:

- inline success text: `첫 스케줄 요청이 시작되었습니다.`
- final success headline: `이제 EveryShift를 사용할 준비가 되었습니다!`
- final body: `온보딩이 완료되어 관리자 대시보드로 이동합니다.`

### Completion Meaning

This step is complete only when the organization has created its first persisted schedule request or planning-start record.
Page visit, template download, or opening an upload dialog alone is not enough.

## 4. Step-to-Step Handoff Rules

The wizard must make the next action obvious after each completion.

### 4.1 Handoff After Step 1

- Step 1 collapses into a completed summary row
- Step 2 expands immediately
- the primary message is employee readiness, not "settings saved"

### 4.2 Handoff After Step 2

- Step 2 collapses into a completed summary row
- Step 3 expands immediately
- the primary message is starting the first schedule flow

### 4.3 Handoff After Step 3

- the wizard stops showing another task list
- a dedicated completion state is shown once
- the completion state has one primary CTA: `대시보드로 이동`

## 5. Exit Semantics

## 5.1 Canonical Landing Route

The canonical post-onboarding destination for admin is:

- `/dashboard/admin`

Reason:

- `docs/REFINED_PRD.md` says onboarding ends by moving to the dashboard
- `docs/migration/RBAC_MATRIX.md` already defines `/dashboard/admin` as the admin dashboard route
- later router work should converge on that route rather than keep onboarding tied to a schedule entry route

If the current app temporarily uses `/` as an alias during transition, that is a compatibility detail only.
The UX contract remains "admin dashboard landing", and later router work should normalize `/` to `/dashboard/admin`.

### 5.2 Final CTA

The final completion state uses:

- primary CTA label: `대시보드로 이동`
- CTA behavior: navigate to `/dashboard/admin`

No competing primary CTA is allowed on the completion screen.
Optional secondary links may exist only as low-emphasis helpers after the primary destination is clear.

### 5.3 Post-Completion Reentry Rule

Once onboarding is complete:

- `/onboarding` is no longer a valid destination for that organization
- subsequent admin logins should land on `/dashboard/admin`
- the completion screen must not reappear on refresh or relogin

## 6. Copy Guardrails

The following copy rules are fixed for implementation:

- all user-facing copy is Korean
- copy should speak to admin action and organization readiness
- Step 2 must explicitly mention employee registration
- Step 3 must explicitly mention starting the first schedule request
- success text must distinguish "준비됨" from "사용 중" so the user understands setup has ended and normal workflow begins

Avoid these mistakes:

- implying Step 2 is complete on page visit alone
- implying Step 3 is complete on template download alone
- using profile/account-setup wording that sounds user-scoped
- sending the admin to schedule creation as the final landing page after onboarding completion

## 7. Review Checklist

This task should be reviewable without router/store detail by checking the following:

- each canonical step key has a matching user goal, Korean copy, and primary CTA
- each step defines a business completion meaning consistent with `P3-1.1`
- each step defines the next-step nudge after completion
- the final success state and CTA are explicit
- the default admin exit route is fixed as `/dashboard/admin`
- no part of the document relies on page visit alone as completion
