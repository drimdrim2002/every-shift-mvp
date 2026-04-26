# Launch Plus Information Architecture

> Supporting spec for [launch-plus-plan.md](./launch-plus-plan.md)

## Goal

Extend the public auth entry flow without changing the Launch Core route model.

## Additional Routes

| Route            | Audience | Purpose                   |
| ---------------- | -------- | ------------------------- |
| `/auth/callback` | Public   | Shared OAuth return route |

## IA Rules

- `/auth/callback` must remain public
- social login must inherit the same post-login routing table as email/password login
- Launch Plus must not re-open the `/` vs `/app` decision

## Entry Surface Additions

### Login

Optional Launch Plus buttons:

- `Google로 계속`
- `Kakao로 계속`

### Signup

If exposed, social entry on signup must still preserve the admin-first public intent.
