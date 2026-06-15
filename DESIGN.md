# Design System — EveryShift

## Product Context

- **What this is:** EveryShift is a nurse scheduling product for hospitals. The MVP is centered on monthly schedule generation, review, manual edits, and export.
- **Who it's for:** Head nurses, operations admins, and internal operators who need to set up staffing rules, generate schedules quickly, and trust the result.
- **Space/industry:** Hospital operations software. This is not a lifestyle app, generic SaaS landing page, or consumer productivity product.
- **Project type:** Hybrid product. It needs a public front door for launch credibility and a dense authenticated app for operational work.
- **Primary user promise:** Reduce schedule creation time while preserving trust, legality, and explainability.
- **Primary UI surfaces:**
  - Public launch surfaces: `/`, `/login`, `/signup`
  - App shell: `/app`, sidebar, header, dashboard
  - Workflow surfaces: schedule Step 1-5
  - Critical work surfaces: Step 3 employee grid, Step 5 review/comparison hub

## Implementation Contract

This document is the canonical implementation contract for UI decisions in this repo. It is not a moodboard and not optional guidance.

### Source of Truth Order

1. `DESIGN.md` defines the system.
2. `src/style.css` owns root CSS variables, font-family defaults, and truly global element rules.
3. `App.vue` with `NConfigProvider` owns Naive UI theme alignment.
4. `main.ts` owns `createDiscreteApi` alignment for message, dialog, notification, and loading bar.
5. `tailwind.config.js` may expose repeated design tokens to utilities.
6. Component-local Tailwind and scoped CSS consume the system.

### Wiring Model

```text
DESIGN.md
   │
   ├── src/style.css
   │    ├── :root tokens
   │    ├── base font assignment
   │    └── global interaction rules
   │
   ├── App.vue
   │    └── NConfigProvider theme overrides
   │
   ├── main.ts
   │    └── createDiscreteApi theme alignment
   │
   ├── tailwind.config.js
   │    └── repeated utility-facing tokens only
   │
   └── Vue components
        ├── Tailwind composition
        └── scoped CSS for complex behavior
```

### Non-Authoritative Files

- `src/assets/index.css` is legacy commentary only. It must not act as a second design system.
- If a rule exists in both `src/style.css` and `src/assets/index.css`, `src/style.css` wins.
- If `src/assets/index.css` is ever imported, consolidate or delete duplicated guidance first.

### Completion Rule

A UI PR is not aligned with `DESIGN.md` unless:

- the root style entrypoint uses the documented font stack and color tokens
- `NConfigProvider` is intentionally aligned or intentionally deferred with rationale
- `createDiscreteApi` surfaces are intentionally aligned or intentionally deferred with rationale
- the changed screen matches the hierarchy, state, and responsive rules below
- gray/slate token drift is reduced rather than expanded
- no new visual decision bypasses this contract

## Design Thesis

- **Direction:** Calm operational product with a restrained brand layer.
- **Decoration level:** Intentional, not expressive.
- **Mood:** Precise, trustworthy, and quietly capable. Users should feel "this looks serious enough for hospital operations" within the first three seconds.
- **Why this direction fits:** The product handles high-stakes staffing work. It must feel more credible than a marketing template and more human than a raw back-office tool.
- **Anti-goals:**
  - Do not look like a generic SaaS starter
  - Do not use decorative purple/blue gradients
  - Do not center everything
  - Do not rely on oversized rounded cards and shadows to create hierarchy
  - Do not make the app feel like a dashboard mosaic

## Experience Model

### Public vs App

- **Public (`/`) is for discovery:** explain what the product is, who it helps, and what the next action is.
- **Auth (`/login`, `/signup`) is for transition:** reduce uncertainty and get the user into the correct next state.
- **App (`/app`) is for work:** dense, calm, and efficient. Decorative branding recedes once the user enters the workspace.

### Hierarchy Rules

- **Public landing:** brand, problem statement, credibility, CTA.
- **Auth pages:** title, one short reassurance line, form, next step.
- **Dashboard:** what to do next, what is blocked, what is ready, what can be acted on now.
- **Step 3 grid:** employee/date matrix first, supporting summary second, helper text third.
- **Step 5 review hub:** decision status first, compare context second, detailed proof and inspection third.

### Design Principle

- Trust is built by information order, not decoration.
- A screen should feel readable before it feels branded.
- Each section gets one job. If a section needs two jobs, split it.

## Typography

- **Primary UI font:** `Pretendard Variable`
  - Use for Korean body copy, labels, forms, headings, buttons, table labels.
  - Reason: strong Korean readability, modern but neutral tone, good density for operational UI.
- **Data/technical accent font:** `IBM Plex Mono`
  - Use for counts, version IDs, status chips, score values, timestamps, and compare deltas when added.
  - Reason: helps dense operational data feel inspectable without turning the whole UI into a developer tool.
- **Do not introduce a third font** unless there is a strong product reason.

### Font Stack Contract

- Sans stack:
  - `"Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif`
- Mono stack:
  - `"IBM Plex Mono", "SFMono-Regular", "Consolas", monospace`

### Font Loading Strategy

- **Default implementation:** self-host both fonts through local assets or a project-managed font package.
- **Temporary fallback:** CDN preload is allowed only for a short-lived launch branch, not as the long-term default.
- **Injection point:** define font-family variables and base application font assignment in `src/style.css`.
- **Naive UI alignment:** `NConfigProvider` theme values should inherit the same base font family.
- **Discrete API alignment:** `createDiscreteApi` surfaces must use the same token and typography intent as root Naive UI components.
- **Do not fall back to `system-ui`, `Arial`, `Helvetica`, or default Vite starter stacks as the intentional design choice.**

### Font Loading Decision

- Default decision: ship with self-hosted `Pretendard Variable` and `IBM Plex Mono`.
- Why: stable Korean rendering, lower CLS risk, explicit deploy contract, and fewer environment-dependent surprises.
- If temporary CDN loading is used in an early rollout PR, the PR must also capture the self-hosting follow-up as a TODO or tracked task.

### Type Scale

- `text-xs / 12px`: meta labels, helper copy, chip labels, timestamps
- `text-sm / 14px`: default UI body, form hints, table metadata
- `text-base / 16px`: primary body copy, default reading size on public/auth surfaces
- `text-lg / 18px`: important labels, section-level lead copy
- `text-xl / 20px`: page subsection headings
- `text-2xl / 24px`: page titles in app surfaces
- `text-3xl / 30px`: public/auth hero titles on compact surfaces
- `text-4xl / 36px`: landing hero heading only

### Weight and Tracking

- Body: `400-500`
- Section titles: `600`
- Page titles: `700`
- Overlines/kickers: `500`, uppercase only when the label is short and operational
- Tracking:
  - Default: normal
  - Operational kicker labels: `0.08em` to `0.14em`
  - Never use aggressive tracking on Korean body text

## Color System

- **Approach:** restrained neutrals with one meaningful brand accent.
- **Core principle:** the app should read as mostly neutral; color is for status, emphasis, and trust cues.

### Core Tokens

- `--font-sans: "Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif`
- `--font-mono: "IBM Plex Mono", "SFMono-Regular", "Consolas", monospace`
- `--color-bg-canvas: #F4F7FB`
- `--color-bg-app: #F8FAFC`
- `--color-surface-primary: #FFFFFF`
- `--color-surface-secondary: #F1F5F9`
- `--color-surface-muted: #E9EFF5`
- `--color-border-subtle: #D8E1EA`
- `--color-border-strong: #B8C6D6`
- `--color-text-strong: #16202B`
- `--color-text-default: #334155`
- `--color-text-muted: #64748B`
- `--color-text-soft: #94A3B8`
- `--color-accent-primary: #0F766E`
- `--color-accent-primary-hover: #115E59`
- `--color-accent-soft: #CCFBF1`
- `--color-accent-ink: #134E4A`

### Semantic Tokens

- `--color-success-bg: #ECFDF3`
- `--color-success-text: #166534`
- `--color-warning-bg: #FFF7ED`
- `--color-warning-text: #B45309`
- `--color-error-bg: #FEF2F2`
- `--color-error-text: #B91C1C`
- `--color-info-bg: #EFF6FF`
- `--color-info-text: #1D4ED8`

### Shift Tokens

Keep the shift palette semantically stable for MVP continuity.

- `--color-shift-day: #92D050`
- `--color-shift-evening: #FFC000`
- `--color-shift-night: #4472C4`
- `--color-shift-off: #D9D9D9`

Use these for shift chips, cells, legends, and Excel-aligned affordances. Do not repurpose them as brand colors.

### Public Surface Accent Use

- Public pages may use `accent-primary` more visibly than the app.
- Even on public pages, avoid gradient-heavy, high-saturation hero treatments.
- If texture is needed, use soft tonal panels, subtle gridlines, or restrained background blocks instead of blobs or glow.

### Dark Mode

- No dark mode is required for MVP.
- Do not let the default Vite `color-scheme: light dark` behavior define the product.
- If dark mode is added later, it must be intentionally designed and documented instead of inherited from browser defaults.

### Brand Logo Tokens

- Logo is vector (`BrandLogo.vue`); do not ship raster wordmarks for UI chrome.
- Colors use `--brand-logo-mark-{1,2,3}` and `--brand-logo-wordmark`.
- Light surfaces: default `:root` tokens; `[color-scheme='only light']` shells re-lock light tokens when OS prefers dark.
- Do not apply dark logo tokens from OS `prefers-color-scheme` alone on light MVP chrome.
- Future in-app dark mode: `.dark` / `[data-theme='dark']` uses dark overrides.
- Do not add white background patches behind the logo.

### Token Mapping Rule

- Global color decisions should prefer semantic CSS variables over raw Tailwind color literals.
- Repeated Tailwind utilities may be added only after the CSS variable exists.
- Existing `shift.*` Tailwind colors remain valid because they represent domain semantics, not general UI tone.

## Spacing and Density

- **Base unit:** `8px`
- **Density target:** compact-to-comfortable
- **Reason:** schedule and review screens need high information density, but forms and public surfaces need enough air to feel trustworthy.

### Spacing Scale

- `2xs: 4px`
- `xs: 8px`
- `sm: 12px`
- `md: 16px`
- `lg: 24px`
- `xl: 32px`
- `2xl: 48px`
- `3xl: 64px`

### Density Rules by Surface

- Public landing: `lg-xl` gaps between sections, `md-lg` inside sections
- Auth forms: `md` between form items, `lg` between major blocks
- App dashboard/settings: `md-lg`
- Step 3 grid: keep controls compact; use spacing to separate tool groups, not to enlarge every cell
- Step 5 compare/review: `md` inside cards, `lg` between major regions

## Layout

- **Approach:** hybrid
  - Public/auth: composition-first within a disciplined grid
  - App/workflow: grid-disciplined and workspace-first

### Widths

- Public content max width: `1200px`
- Auth shell max width: `440px` for login, `640px` for signup
- Dashboard/app content max width: `1280px` unless the surface is grid-driven
- Full-bleed exception: Step 4 grid and Step 5 compare workspace may exceed standard content width as needed

### Grid Guidance

- Mobile: `4 columns`
- Tablet: `8 columns`
- Desktop: `12 columns`
- App chrome: top navigation and app content share the same horizontal frame; do not center individual pages with one-off widths

### App Shell Width Contract

- Header height target: `64px`
- Authenticated app pages use `src/components/layout/AppContainer.vue` as the official horizontal container
- Default app container: `max-w-7xl` with responsive horizontal padding
- Wide work surfaces may opt out with `width="full"`; Step 4 uses this for the grid workspace

### Border Radius

- `radius-sm: 6px`
- `radius-md: 10px`
- `radius-lg: 16px`
- `radius-pill: 9999px`

Rules:

- Inputs, buttons, compact chips: `sm-md`
- Cards, panels, sectional containers: `md-lg`
- Do not make every element equally round

### Shadow

- Default: minimal
- Use one soft shadow family only for elevated panels:
  - `shadow-soft: 0 8px 24px rgba(15, 23, 42, 0.06)`
- Do not stack borders plus multiple shadows plus tinted backgrounds on the same component unless there is a real state change

## Motion

- **Approach:** minimal-functional
- Motion should improve comprehension, not show off polish.

### Duration

- Micro: `80-120ms`
- Short: `160-220ms`
- Medium: `240-320ms`

### Easing

- Enter: `ease-out`
- Exit: `ease-in`
- Reposition: `ease-in-out`

### Allowed Motion

- Route entry fade/slide on public/auth surfaces
- Hover emphasis for actionable cards and rows
- Expand/collapse transitions for compare and checklist sections
- Toast and status transitions via Naive UI

### Avoid

- Looping ornament
- Scroll gimmicks in the app
- Large parallax or floating-shape motion on the landing page

## Interaction State Matrix

State design is mandatory. Engineers should not invent loading, empty, error, or success behavior ad hoc.

| Surface           | Loading                                                              | Empty                                                                        | Error                                                   | Success                                                   | Partial / Transitional                                                 |
| ----------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Public landing    | Render usable structure fast; avoid skeleton-heavy marketing loading | Not applicable as a full page state                                          | Inline section-safe fallback, never blank white page    | CTA remains clearly available                             | If one block fails, preserve hero and CTA                              |
| Login             | Spinner only inside submit button or auth status block               | Not applicable                                                               | Inline alert above form with recovery action            | Short success toast + immediate redirect                  | Pending/rejected/no-membership states explain next step                |
| Signup            | Button loading + section-local loading for hospital search           | Search empty state with warmth, context, and retry guidance                  | Inline field or alert state, never generic failure only | Completion message tied to actual next state              | Admin/user branch swap keeps shared shell and resets irrelevant fields |
| Dashboard         | Section-local loading preferred over whole-page blocking             | Warm empty state with primary CTA and clear context                          | Section error card with retry action                    | Toast or inline confirmation for create/delete/update     | Checklist ready/not-ready stays visible without losing main work area  |
| Step 3 grid       | Load shell, employee/date structure, then data                       | Distinguish "no employees yet" from "no assignments yet"                     | Inline banner plus preserved grid chrome where possible | Save confirmation visible and brief                       | Partial hydration or fallback data is visibly labeled                  |
| Step 5 review hub | Load selected version context first, then secondary compare details  | Distinguish "no candidate yet" from "candidate exists but no proof artifact" | Error card with retry and safe back path                | Recheck/finalize/select actions get explicit confirmation | Running / changed / stale proof states are visually distinct           |

### Empty State Rules

- Every empty state must answer:
  - what is missing
  - why it matters
  - what the user can do next
- "No items found" by itself is not acceptable.

### Error State Rules

- The user must be able to tell:
  - what failed
  - whether the action was saved
  - what to do now
- Silent fallback is not allowed for user-visible failures.

## Responsive Behavior

Responsive design here means intentional layout shifts, not simple stacking.

### Public Landing

- Mobile:
  - single-column composition
  - brand + value statement + CTA remain above the fold
  - public header collapses to logo + one primary action + menu sheet
- Tablet:
  - content may move to asymmetric split blocks
  - trust section can become 2-column
- Desktop:
  - hero reads as one composition, not stacked cards

### Login / Signup

- Mobile:
  - auth shell uses edge breathing room, not a tiny centered card with oversized padding
  - admin/user role switching stays in one column
  - hospital search input and button may wrap to two rows if needed
- Tablet and up:
  - keep auth shell centered and narrow
  - preserve visual continuity between login and signup

### App Shell

- Desktop first by default.
- Under tablet width:
  - sidebar behavior must be explicitly redesigned before broad rollout
  - do not silently collapse the full app into a hamburger-only experience and call it done
- MVP rule:
  - dashboard/settings may support tablet
  - Step 3 and Step 5 are desktop-first operational surfaces

### Step 3 Grid

- Mobile is not a first-class target for the full grid.
- Tablet:
  - only acceptable if horizontal scroll, sticky headers, and sticky summary remain understandable
- Desktop:
  - primary target
- If a future PR claims Step 3 mobile support, it must define a different interaction model rather than shrinking the existing table.

### Step 5 Review Hub

- Mobile is not a first-class target for the full compare workspace.
- Tablet:
  - may support reduced compare density, but selected version status must remain first
- Desktop:
  - primary target

## Accessibility

- Minimum touch target: `44px`
- Visible keyboard focus is required on buttons, inputs, cards acting as buttons, and grid controls.
- Never communicate state with color alone.
- Contrast target:
  - body text: WCAG AA minimum
  - muted text: only for secondary information, never for essential actions or warnings
- Screen reader guidance:
  - form labels must remain explicit
  - step indicators and compare controls should have meaningful names
  - icon-only affordances need text labels or ARIA names

### Focus and Keyboard Contract

- Focus ring must be visible on all interactive elements.
- The ring should use an accent-derived outline that remains visible on both white and muted surfaces.
- Cards acting as buttons must be keyboard reachable and activatable.
- Grid controls must preserve visible focus location.
- Sidebar and header actions must remain navigable without a pointer.

## Surface Patterns

### Public Landing

- Goal: explain the product fast and earn enough trust for a CTA click.
- First viewport structure:
  - Brand
  - One clear statement of value
  - One supporting line
  - One primary CTA
  - One secondary CTA or supporting trust cue
- Recommended content blocks:
  - Problem and outcome
  - 4-step schedule workflow summary
  - Trust and operational credibility
  - CTA footer
- Supporting decision:
  - the landing page should explain schedule generation as an operational workflow, not as generic "AI productivity"
- Avoid:
  - three-column icon grids
  - generic feature cards with decorative icons
  - long centered paragraphs

### Login

- Visual tone: calm, direct, low-friction
- Required hierarchy:
  - Title
  - One-line reassurance
  - Alerts and status
  - Form
  - Next-step link
- Keep the form shell visually lighter than the main app dashboard. It is a bridge, not a workspace.
- Required support copy:
  - one line that tells the user what happens after login
  - status-specific messaging for signup complete, pending approval, and rejected access
- Recovery behavior:
  - failed login keeps field context
  - no-membership or invalid access state explains why the user was sent back

### Signup

- Same auth shell as login, but with stronger structure for role-dependent fields.
- Admin signup is the primary public path.
- Role switching must feel like changing mode, not jumping to a different app.
- Hospital search, hospital selection, and invite code branches need clear containment and helper copy.
- Branch rules:
  - shared identity fields stay fixed at the top
  - role-specific fields render in one clearly labeled section
  - switching roles clears only irrelevant branch-specific values
- Search rules:
  - loading, no-result, and error states must stay inside the hospital selection context

### App Shell

- Header and sidebar should feel infrastructural, not promotional.
- Sidebar labels should be concise and operational.
- Header should prioritize context, account state, org switching, and logout.
- Prefer subtle borders and tonal separation over heavy background fills.
- Navigation rule:
  - `/app` shell must visually separate navigation chrome from work content
  - public navigation patterns must never leak into app layout

### Dashboard

- The first block answers: what should I do next?
- The second block answers: what monthly work can I act on?
- Empty states must be warm and directive, not dead ends.
- Cards are acceptable here only when each card represents a true action container or schedule entity.
- Dashboard hierarchy contract:
  - 1st: readiness and next action
  - 2nd: schedule work area
  - 3rd: lower-priority metadata
- Existing empty-state problem:
  - emoji-first empty states should be replaced by product-consistent operational empty states

### Forms and Settings

- Treat setup forms as operational checklists, not marketing forms.
- Use top-aligned labels.
- Place helper text under the field or section title, not inside placeholder-only experiences.
- Reserve stronger color for validation and status, not decoration.
- Validation states:
  - default
  - focused
  - invalid
  - disabled
  - saved or persisted confirmation where relevant

### Step 3 Grid

- This is the critical high-density surface.
- Priorities:
  - readable header structure
  - legible employee and date scanning
  - stable sticky behavior
  - clear D/E/N/O semantics
- The grid may be visually denser than the rest of the app, but surrounding chrome should stay quiet.
- Avoid introducing decorative treatments inside the grid container.
- Desktop-first contract:
  - Step 3 is a desktop operational tool first
  - mobile support for Step 3 is explicitly out of scope unless the interaction model changes
- Grid status requirements:
  - loading preserves table scaffolding
  - empty employee roster must not look like an empty schedule
  - sticky header and sticky summary visual treatments should come from tokens, not arbitrary hard-coded grays

### Step 5 Review Hub

- This is the most sophisticated surface in the product.
- Priorities:
  - selected version state
  - finalization and recheck status
  - compare context
  - proof and explanation detail
- Review panels should look more like decision workspaces than cards in a gallery.
- Use mono accents for version labels, metrics, and machine-like states where helpful.
- Desktop-first contract:
  - compare mode is primarily desktop-targeted
  - tablet support may reduce simultaneous compare density
- State requirements:
  - running, review-ready, review-blocked, stale-proof, and finalized states must all read differently at a glance

## Component State Contract

Every reusable component should define at least the following when applicable:

- default
- hover
- focus-visible
- active or pressed
- disabled
- selected
- destructive
- loading
- error

## Default Component Guidance

- **Primary button:** accent-primary background, white text, modest radius
  - states: hover darkens, focus ring visible, disabled lowers contrast without becoming unreadable
- **Secondary button:** neutral surface with border, text-default
  - states: hover uses muted surface, focus ring matches system
- **Ghost/tertiary button:** no fill, text-default, subtle hover surface
- **Cards and panels:** surface-primary with subtle border first; shadow only when elevation matters
  - clickable cards require hover, focus, and selected states
- **Badges and chips:** pill radius, smaller type, semantic tint backgrounds
- **Alerts:** semantic background + semantic text; do not oversaturate
- **Tables and grid headers:** use neutral surface blocks and reserve saturated backgrounds for true data semantics only

## Content Style

- User-facing UI text is Korean.
- System and design documentation remain English.
- Product copy should sound operational and clear, not aspirational or startup-generic.
- Prefer:
  - what the user can do now
  - what is blocked
  - what happens next
- Avoid:
  - "unlock the power of"
  - "all-in-one"
  - vague adjectives like "smart", "modern", "seamless" without context

## Naive UI + Tailwind Rules

- Naive UI remains the base component library.
- Tailwind handles spacing, layout, and local composition.
- Prefer theming and shared tokens over ad hoc per-component color classes.

### Implementation Rules

- Use CSS variables as the source of truth for color tokens.
- Map tokens into Tailwind config only when repeated utility use is needed.
- Override Naive UI theme values to align with the documented palette instead of fighting defaults per component.
- `App.vue` should be the only place that wires `NConfigProvider` theme intent at the root.
- `main.ts` should align `createDiscreteApi` surfaces with the same typography and color contract used by the root provider.
- `src/style.css` should be the only global CSS entrypoint imported from `main.ts`.
- Use custom CSS only for:
  - complex grid and sticky behavior
  - token declarations
  - component cases Naive/Tailwind cannot express cleanly

### Avoid

- Mixing `gray-*` and `slate-*` with no system
- Leaving Vite starter globals in place as accidental product styling
- Treating Naive defaults as the final aesthetic

## Current Repo Alignment

### What already aligns

- Newer dashboard and review surfaces are moving toward a calm slate-based operational language.
- The product already distinguishes shift-specific colors from general UI neutrals.
- The app uses Naive UI for structure and Tailwind for local layout, which is compatible with this system.

### What needs alignment

- `src/style.css` still contains Vite starter defaults:
  - default system font stack
  - implicit light/dark color-scheme behavior
  - generic anchor and button styling
- `src/assets/index.css` contains a design-system comment block, but it is not authoritative and conflicts with the desired repo-level source of truth.
- Auth screens still use a flatter gray-only style and should be brought into the same system as dashboard and review screens.
- Older app surfaces mix `gray-*` and `slate-*` tokens and use radius and shadow inconsistently.

## Migration Sequence

Implement this system in the following order. Do not try to polish everything everywhere in one pass.

### Phase 1: Global Foundation

1. Replace Vite starter defaults in `src/style.css`.
2. Define root font variables and color tokens.
3. Remove implicit `color-scheme: light dark`.
4. Confirm `main.ts` imports only `src/style.css` as the global entrypoint.

### Phase 2: Naive UI Alignment

1. Add root-level `NConfigProvider` theme alignment in `App.vue`.
2. Ensure Naive typography, borders, and primary color no longer drift from system tokens.
3. Align `createDiscreteApi` feedback surfaces in `main.ts` so toasts, dialogs, notifications, and loading bars do not drift from the provider theme.

### Phase 3: Surface Alignment

1. Auth screens
2. Dashboard and setup forms
3. Step 3 grid chrome
4. Step 5 review hub

### Phase 4: Cleanup

1. Remove or clearly deprecate stale guidance in `src/assets/index.css`.
2. Reduce `gray-*` and `slate-*` mixing in touched components.
3. Normalize radius and shadow usage in touched surfaces.

### Legacy CSS Rule

- `src/assets/index.css` does not have to be physically deleted in every UI PR.
- It must not gain new design guidance.
- If a PR changes a decision that `src/assets/index.css` also comments on, that stale comment should be removed or replaced in the same PR.

## Definition of Done

A design alignment PR is done only when:

- the changed surface uses the documented type, spacing, and color rules
- interactive states are defined and visible
- loading, empty, error, and success behavior is explicit
- responsive behavior is stated for the affected surface
- no file changed by the PR remains an accidental second source of truth for the same decision
- if the PR touches a decision also described in `src/assets/index.css`, that stale guidance is removed or explicitly deprecated in the same PR

## Not in Scope

- A dark mode specification
- A full marketing brand program beyond what launch credibility requires
- Illustration systems, mascot systems, or high-expression campaign art
- Multi-brand or white-label theming
- A fully mobile-native redesign for Step 3 or Step 5
- A broad component-library rewrite beyond token and theme alignment

## Decisions Log

| Date       | Decision                                                                                          | Rationale                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 2026-04-23 | Established a hybrid design system for public launch + operator app                               | The product now needs one source of truth that covers both launch surfaces and dense operational workflows       |
| 2026-04-23 | Chose Pretendard Variable + IBM Plex Mono                                                         | Korean readability and dense operational data were more important than novelty                                   |
| 2026-04-23 | Chose restrained slate + teal UI palette with preserved shift colors                              | The app needs trust-first hierarchy while keeping D/E/N/O semantics stable                                       |
| 2026-04-23 | Locked `src/style.css` as the global token entrypoint and `App.vue` as the Naive theme entrypoint | This avoids three competing style sources and makes implementation reviewable                                    |
| 2026-04-23 | Declared Step 3 and Step 5 desktop-first surfaces                                                 | Shrinking the existing table and compare workspace into mobile would produce fragile UX rather than real support |
| 2026-04-23 | Added `main.ts` discrete API alignment to the contract                                            | Feedback surfaces like toast and dialog must not visually drift from the provider-themed app shell               |
| 2026-04-23 | Narrowed definition-of-done scope for legacy CSS cleanup                                          | This keeps PR completion criteria strict without forcing unrelated cleanup on every surface change               |
