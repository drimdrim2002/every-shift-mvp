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
- `/` must not immediately redirect into the app shell
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

## Public Header

Recommended structure:

- `EveryShift`
- `서비스 소개`
- `기능`
- `도입 문의`
- `로그인`
- `관리자로 시작하기`

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
