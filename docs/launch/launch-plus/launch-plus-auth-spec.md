# Launch Plus Auth Spec

> Supporting spec for [launch-plus-plan.md](./launch-plus-plan.md)

## Goal

Add social login without creating duplicate app identities or inconsistent routing.

## Providers

- Google
- Kakao

## Shared Flow

1. user starts provider login
2. provider returns to `/auth/callback`
3. app resolves session
4. app loads RBAC/access context
5. app redirects by access state

## Account Linking Rules

1. Use email-first identity matching
2. Do not create a second app identity only because auth provider changed
3. If provider returns no usable email, stop with a clear error state
4. Do not auto-promote role through provider login

## Redirect Matrix

| State                       | Redirect                    |
| --------------------------- | --------------------------- |
| `super_active`              | `/app/admin/approval-queue` |
| `admin_active`              | `/app`                      |
| `user_active`               | `/app/home/user`            |
| `admin_pending`             | `/access/pending`           |
| `admin_rejected`            | `/access/rejected`          |
| `no_membership_or_inactive` | `/login`                    |

## Additional Environment Variable

- `VITE_OAUTH_CALLBACK_PATH=/auth/callback`

## Redirect URL Matrix

| Environment | Redirect URL                                    |
| ----------- | ----------------------------------------------- |
| Local       | `http://localhost:5173/auth/callback`           |
| Preview     | `https://<vercel-preview-domain>/auth/callback` |
| Production  | `https://<production-domain>/auth/callback`     |
