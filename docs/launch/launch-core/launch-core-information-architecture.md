# Launch Core Information Architecture

> Supporting spec for [launch-core-plan.md](./launch-core-plan.md)

## Goal

Separate the public front door from the authenticated work area.

This matters for:

- SEO
- product clarity
- safer routing
- cleaner mental model for users

## Route Map

| Route                               | Audience           | Purpose                  |
| ----------------------------------- | ------------------ | ------------------------ |
| `/`                                 | Public             | Landing page             |
| `/login`                            | Public             | Login page               |
| `/signup`                           | Public             | Admin-first signup page  |
| `/access/pending`                   | Authenticated      | Pending state            |
| `/access/rejected`                  | Authenticated      | Rejected state           |
| `/app`                              | Authenticated      | App home                 |
| `/app/home/user`                    | Authenticated user | Restricted user home     |
| `/app/admin/approval-queue`         | Super              | Approval queue           |
| `/app/ops/organization-setup`       | Admin              | Ops setup                |
| `/app/ops/off-request-policy-setup` | Admin              | Off-request policy setup |
| `/app/schedule/step1`               | Admin              | Schedule workflow start  |
| `/app/schedule/step2`               | Admin              | Site info                |
| `/app/schedule/step3`               | Admin              | Employee prep            |
| `/app/schedule/step4`               | Admin              | Initial data             |
| `/app/schedule/step5/:scheduleKey`  | Admin              | Review hub               |

## Public Route Rules

- `/` must be readable without authentication
- `/` must not redirect unauthenticated visitors into the app shell
- active authenticated users who hit `/` should be redirected to `/app` so discovery and workspace surfaces stay separate
- SEO-sensitive content must live on public routes
- app navigation must not leak into public layout

## Post-Login Redirect Rules

| Access State                | Redirect                    |
| --------------------------- | --------------------------- |
| `super_active`              | `/app/admin/approval-queue` |
| `admin_active`              | `/app`                      |
| `user_active`               | `/app/home/user`            |
| `admin_pending`             | `/access/pending`           |
| `admin_rejected`            | `/access/rejected`          |
| `no_membership_or_inactive` | `/login`                    |

This matrix governs login completion and authenticated visits to auth pages. The separate `/` rule above still applies: active authenticated users who hit the public root should be redirected into `/app`.

## Legacy Redirect Compatibility

During the first launch window, old app URLs must redirect to the new canonical `/app` paths.

| Legacy Route                    | Canonical Route                     |
| ------------------------------- | ----------------------------------- |
| `/admin/approval-queue`         | `/app/admin/approval-queue`         |
| `/home/user`                    | `/app/home/user`                    |
| `/ops/organization-setup`       | `/app/ops/organization-setup`       |
| `/ops/off-request-policy-setup` | `/app/ops/off-request-policy-setup` |
| `/schedule/step1`               | `/app/schedule/step1`               |
| `/schedule/step2`               | `/app/schedule/step2`               |
| `/schedule/step3`               | `/app/schedule/step3`               |
| `/schedule/step4`               | `/app/schedule/step4`               |
| `/schedule/step5/:scheduleKey`  | `/app/schedule/step5/:scheduleKey`  |

These redirects are part of Launch Core because the current repo, test fixtures, and likely saved bookmarks still point at the legacy shape.

## Public Header

Recommended structure:

- `EveryShift`
- `로그인`
- `회원 가입`
- `도입 문의`

Rules:

- right-side order is locked to `로그인` -> `회원 가입` -> `도입 문의`
- `회원 가입` points to `/signup?role=admin`
- `도입 문의` points to the real Google Form
- do not replace these labels with vague copy such as `시작하기` or `문의하기` without context

## Landing Page Structure

```text
Public Header
  ├─ Brand: EveryShift
  └─ Actions: 로그인 | 회원 가입 | 도입 문의

Hero
  ├─ Product identity
  ├─ One-sentence value proposition
  ├─ Primary action: 회원 가입
  └─ Secondary action: 도입 문의

Workflow Summary
  ├─ 기본 정보
  ├─ 사이트 정보
  ├─ 직원 정보
  ├─ 초기 데이터
  └─ 결과 확인 / 수정 / 내보내기

Trust Signals
  ├─ protected `/app` workspace
  ├─ admin approval gate
  └─ real public beta launch status

Inquiry Reinforcement
  └─ hospital intro / trial / other request path
```

## Route Tree Ownership

```text
/
├─ Public landing route
├─ /login
├─ /signup
├─ /access/pending
├─ /access/rejected
└─ /app
   └─ DefaultLayout
      ├─ dashboard
      ├─ approval queue
      ├─ user home
      ├─ ops setup
      └─ schedule steps
```

Rule:

- `DefaultLayout` only mounts under `/app`
- public and access-state routes stay outside the app shell
- child routes under `/app` use relative segments, not leading `/`, so the layout boundary remains explicit

## CTA Behavior Map

| Surface | Label       | Destination          | Role                          |
| ------- | ----------- | -------------------- | ----------------------------- |
| Header  | `로그인`    | `/login`             | Returning users               |
| Header  | `회원 가입` | `/signup?role=admin` | New admin evaluation          |
| Header  | `도입 문의` | Google Form          | Intro / trial / other request |
| Hero    | `회원 가입` | `/signup?role=admin` | Primary conversion            |
| Hero    | `도입 문의` | Google Form          | Secondary conversion          |

## External Entry

The Google Form is not an internal route.

Treat it as an external destination tied to public CTAs:

- destination type: external form
- entry surfaces: header `도입 문의`, hero secondary CTA
- purpose: introduction request, one-month free trial request, other inquiry

## Mobile IA Rules

- brand remains top-left
- action menu remains top-right
- `로그인`, `회원 가입`, `도입 문의` stay first-level actions inside the mobile menu
- do not bury `도입 문의` only in the footer on mobile
- hero CTA order remains `회원 가입` first, `도입 문의` second

## App Sidebar

### Super

- `대시보드`
- `가입 승인`
- `운영 기본 설정`
- `직원 준비`
- `근무표 생성`

### Admin

- `대시보드`
- `운영 기본 설정`
- `직원 준비`
- `근무표 생성`

### User

- `내 홈`

## IA Rule

`/` is for discovery.
`/app` is for work.

Do not mix the two concerns again in Launch Core.
