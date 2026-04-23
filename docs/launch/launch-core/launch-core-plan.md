# Launch Core Plan

> Status: Canonical plan for the first public launch gate

## Objective

Ship the minimum scope that makes EveryShift a real public product.

That means:

- a public landing page exists at `/`
- search and crawl traffic land on public content, not on the app shell
- authenticated users work under `/app`
- the current app remains stable after the route split
- the frontend is deployable on Vercel
- the public CTAs lead to real flows

## What Launch Core Is

`Launch Core` is not "marketing only."
It is the first release where the product has:

- a front door
- a protected workspace
- a deploy contract
- a launch QA gate

It is also the first release where a new visitor can do three concrete things without confusion:

- log in
- start admin signup
- submit an introduction inquiry

## What Launch Core Is Not

It is not:

- a full auth expansion
- a complete marketing site program
- a rewrite of the schedule-generation workflow
- a social-login launch

## Scope

In scope:

- keep `pnpm lint:check` green
- split public routes and app routes
- make `/` the public landing page
- move the authenticated product root to `/app`
- preserve existing email/password login and signup
- lock real CTA paths for admin signup and inquiry
- configure preview and production deployment on Vercel
- run launch-blocking QA

Out of scope:

- Google login
- Kakao login
- shared OAuth callback route rollout
- provider-specific account-linking rules
- deep launch polish beyond what is needed for public credibility

## Launch UX Contract

Launch Core must describe what the user sees, not only what the router does.

### First Impression

The landing page must answer three questions within the first screen:

1. What is this product?
2. Who is it for?
3. What should I do next?

The first screen should communicate:

- product: `EveryShift`
- audience: hospitals and nursing operations teams
- promise: easier schedule generation and review
- actions: `회원 가입` and `도입 문의`

### Public Header

Desktop header, right side:

- `로그인`
- `회원 가입`
- `도입 문의`

Rules:

- order must stay exactly as above
- `로그인` goes to `/login`
- `회원 가입` goes to `/signup?role=admin`
- `도입 문의` opens the real Google Form in a new tab
- public header must not show app sidebar or authenticated workspace controls

### Hero CTA Hierarchy

- primary CTA: `회원 가입`
- secondary CTA: `도입 문의`
- login stays available in the header for returning users

This is the locked `3C` decision:

- the launch still optimizes for direct signup
- inquiry remains visible for hospitals that want human contact first

### Landing Page Section Order

The landing page should not feel like an app dashboard or a generic SaaS card grid.

Required section order:

1. hero
2. workflow summary
3. trust and launch readiness signals
4. inquiry reinforcement
5. footer

Each section gets one job:

- hero: explain product and push action
- workflow summary: show the schedule-generation flow in plain language
- trust signals: prove the product is real and safe to evaluate
- inquiry reinforcement: give a low-pressure path for hospitals not ready to sign up

### Public Hero Content Hierarchy

The hero must read in this order:

1. `EveryShift`
2. one headline about nurse schedule generation for hospitals
3. one supporting sentence about the current MVP scope
4. `회원 가입` button
5. `도입 문의` button or text-link button

Avoid:

- generic marketing copy
- 3-column SaaS feature cards as the first impression
- decorative blobs or purple gradient defaults
- a hero image that is louder than the product name

### Core Conversion Paths

- returning user path: `로그인` -> `/login`
- new admin path: `회원 가입` -> `/signup?role=admin`
- evaluation path: `도입 문의` -> Google Form

No CTA may lead to a placeholder, disabled state, or dead end.

## Why This Must Ship First

The product cannot launch publicly if:

- `/` still behaves like the internal app home
- early traffic hits placeholder CTAs
- deployment behavior is undefined

## Information Hierarchy Diagram

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
   └─ Google Form path for hospitals needing intro material or trial help
```

## Implementation Order

### 1. Public/App Route Split

- public routes remain at `/`, `/login`, `/signup`
- authenticated product routes move under `/app`
- post-login redirects target `/app`
- app shell no longer owns `/`

### 2. Public Landing Page

- hero and product explanation
- workflow summary
- trust signals
- SEO-ready copy and structure
- visible public header actions: `로그인`, `회원 가입`, `도입 문의`
- CTA hierarchy locked as `회원 가입` primary, `도입 문의` secondary
- mobile header behavior and touch targets
- accessibility and keyboard navigation requirements

### 3. Conversion Path

- `회원 가입` routes to `/signup?role=admin`
- `도입 문의` routes to a real Google Form
- keep both visible on the public surface
- avoid placeholder dead ends
- do not ask the user to hunt for a contact method in the footer only

### 3A. Inquiry Form Requirements

The Google Form must include these required fields:

- `요청 내용`
  - checkbox, multi-select allowed
  - options:
    - `소개 자료 다운로드`
    - `한 달 무료 사용하기`
    - `기타`
  - if `기타` is selected, show a short-answer field for direct input
- `병원 이름`
- `병동 이름`
- `이메일 주소`

Form behavior rules:

- `병원 이름`, `병동 이름`, `이메일 주소` are required
- use one explicit `이메일 주소` field; do not create a duplicate email capture path unless operations require it
- after submit, show a completion message that sets expectation for follow-up timing
- the form must be reachable from header and landing secondary CTA

### 3B. Personal Information Notice

Because the inquiry flow stores identifiable contact information for follow-up, the form must include a visible personal-information collection/use notice before submission.

At minimum, the notice must disclose:

- purpose of collection and use
- collected items
- retention period
- right to refuse and the disadvantage if refused

Recommended launch-safe approach:

- make a required checkbox for consent before submit
- keep the purpose narrow: inquiry response, intro material delivery, and free-trial follow-up
- keep the retention period explicit in the form copy

The exact legal wording should be reviewed before launch, especially because Google Form may involve third-party processing or overseas storage handling.

### 4. Deployment

- Vercel preview deploy
- Vercel production deploy
- environment variables
- SPA deep-link support for `/app/*`

### 5. QA and Release Gate

- landing QA
- auth QA
- routing QA
- menu and RBAC QA
- preview and production smoke QA
- inquiry form QA
- mobile and keyboard QA

## Interaction State Coverage

| Feature                  | Loading                                                      | Empty                                                                     | Error                                                                            | Success                                       | Partial                                                             |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| Landing page             | skeleton or stable first paint without layout jump           | not applicable                                                            | friendly retry copy with persistent header actions                               | page loads with both CTAs visible             | some trust content delayed but hero and actions visible             |
| Header actions           | buttons render immediately                                   | not applicable                                                            | broken target shows fallback message or disabled hidden state before launch only | target opens correct route or tab             | one action unavailable does not hide the others                     |
| Signup CTA               | button shows pending state only if route resolution is async | not applicable                                                            | route failure shows clear retry guidance                                         | `/signup?role=admin` opens correctly          | signup page loads but hospital search data later                    |
| Inquiry CTA              | button/link shows external-open affordance                   | not applicable                                                            | broken form link is treated as launch blocker                                    | Google Form opens and is submittable          | form opens but a non-critical optional field fails                  |
| Login page               | form submit loading                                          | no banner state by default                                                | inline validation and submit failure message                                     | redirects to correct post-auth route          | auth succeeds but access state routes to pending or rejected screen |
| Signup page              | hospital search and submit loading states                    | hospital search empty state explains no hospital found and suggests retry | inline field errors and request failure message                                  | pending or active completion message is shown | search works but some optional lookup context is missing            |
| Pending / rejected state | state screen content loads without redirect loop             | not applicable                                                            | fallback message if membership context missing                                   | user understands next step and can log out    | rejection reason missing but state explanation still renders        |

## User Journey Storyboard

| Step | User Does                          | User Feels                                              | Plan Must Specify                                                     |
| ---- | ---------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| 1    | lands on `/`                       | "Is this a real hospital scheduling product?"           | strong first headline, visible actions, no app chrome leak            |
| 2    | scans header                       | "Can I log in, sign up, or ask first?"                  | right-side header actions in the locked order                         |
| 3    | reads hero                         | "This seems relevant to nursing operations."            | one clear value proposition and one concrete next step                |
| 4    | chooses `회원 가입` or `도입 문의` | "I know which path fits me."                            | split between direct signup and inquiry path                          |
| 5    | opens signup                       | "I can start without guessing what role to choose."     | admin-first signup default and hospital search guidance               |
| 6    | opens inquiry form                 | "I can leave contact info without hunting for details." | required fields, consent notice, and response expectation             |
| 7    | completes auth or inquiry          | "The product is real and the team will follow up."      | success states, pending/rejected handling, and follow-up expectations |

## Responsive and Accessibility Requirements

### Responsive

- desktop header shows `로그인`, `회원 가입`, `도입 문의` inline on the right
- mobile header collapses into a menu sheet or drawer, but the same three actions remain first-level actions
- hero CTA group stacks vertically on narrow screens
- no section may depend on hover only
- external inquiry link must remain obvious on mobile without requiring footer scroll

### Accessibility

- all interactive targets use visible focus states
- touch targets are at least 44px high
- header and main content use semantic landmarks
- CTA labels stay in Korean and remain understandable without surrounding art
- external inquiry link must announce that it opens a new tab if implemented that way
- color contrast for text and buttons must meet accessible contrast requirements

## What Already Exists

Reuse existing product patterns where they already work:

- no repo-level `DESIGN.md` exists today, so Launch Core should align to current auth/app surfaces plus universal design rules rather than inventing a new broad visual system
- auth pages already use centered Naive UI card layouts
- pending and rejected access states already exist
- the authenticated workspace already uses the app header and sidebar structure
- post-auth routing logic already understands active, pending, and rejected users

Launch Core should reuse those working patterns for `/login`, `/signup`, `/access/pending`, `/access/rejected`, and `/app`.

The new work is the public surface at `/`, not a redesign of the existing app workspace.

## NOT in Scope

- new in-app inquiry management UI: inquiry is handled by Google Form for Launch Core
- social login buttons or provider-specific callback UX
- a full standalone marketing site program with many subpages
- advanced brand-motion system beyond the landing page actions and basic section reveals
- collecting more inquiry data than needed for intro material, trial request, and reply

## Release Gate

Launch Core is not ready unless:

- `pnpm lint:check` passes
- focused auth/router tests pass
- `/` is public
- `/app` is protected
- deployed `/app` deep links survive refresh
- signup and inquiry CTA paths are real and verified
- preview and production are both reachable

## KPI

Track from day one:

- visits to `/`
- signup CTA click-through rate
- inquiry CTA click-through rate
- signup starts
- signup completions
- inquiry submissions
- approved admins reaching `/app`

If these are invisible, launch learning is weak even if the site is technically live.
