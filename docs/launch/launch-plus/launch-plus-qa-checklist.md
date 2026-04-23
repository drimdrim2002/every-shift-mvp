# Launch Plus QA Checklist

> Supporting checklist for [launch-plus-plan.md](./launch-plus-plan.md)

## Social Login

- [ ] Google login works
- [ ] Kakao login works
- [ ] OAuth callback returns to `/auth/callback`
- [ ] provider login preserves access-state redirects

## Identity Safety

- [ ] duplicate-account handling does not create a second app identity for the same email
- [ ] no-email provider response fails clearly

## Deployment Smoke

- [ ] preview Google callback works
- [ ] preview Kakao callback works
- [ ] production Google callback works
- [ ] production Kakao callback works

## Final Gate

- [ ] provider QA passed in preview
- [ ] provider QA passed in production
- [ ] callback route resolved correctly in every environment
