# Launch Core Docs

`Launch Core` is the must-ship scope for the first public release.

Use this folder when the question is:
"What do we need to ship so EveryShift is publicly understandable, deployable, and usable?"

## Documents

1. [launch-core-plan.md](./launch-core-plan.md)
2. [launch-core-information-architecture.md](./launch-core-information-architecture.md)
3. [launch-core-auth-and-deploy-spec.md](./launch-core-auth-and-deploy-spec.md)
4. [launch-core-qa-checklist.md](./launch-core-qa-checklist.md)

## Scope Summary

Included:

- public landing page
- public/app route split
- existing email/password auth continuity
- real signup and inquiry CTA paths
- Vercel deployment
- launch-blocking QA

Explicitly excluded:

- Google login
- Kakao login
- OAuth callback rollout
- provider-specific linking complexity

Locked launch decisions:

- public header actions are `로그인`, `회원 가입`, `도입 문의`
- `회원 가입` is the primary landing CTA
- `도입 문의` routes to a real Google Form
