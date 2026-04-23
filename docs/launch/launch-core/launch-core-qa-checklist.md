# Launch Core QA Checklist

> Supporting checklist for [launch-core-plan.md](./launch-core-plan.md)

## Landing

- [ ] `/` loads for unauthenticated users
- [ ] public header renders correctly
- [ ] CTA is real, not placeholder
- [ ] mobile layout works
- [ ] no app chrome leaks onto landing

## Auth

- [ ] email/password login works
- [ ] email/password admin signup works
- [ ] pending admins land on `/access/pending`
- [ ] rejected admins land on `/access/rejected`
- [ ] active admins land inside `/app`

## Routing

- [ ] `/` is public
- [ ] `/login` is public
- [ ] `/signup` is public
- [ ] `/app` requires authentication
- [ ] `/app/*` deep links survive refresh

## RBAC and Navigation

- [ ] super users reach `/app/admin/approval-queue`
- [ ] admin users reach `/app`
- [ ] user users reach `/app/home/user`
- [ ] sidebar visibility matches role

## Deployment Smoke

- [ ] preview deploy reachable
- [ ] production deploy reachable
- [ ] preview env vars correct
- [ ] production env vars correct

## Final Gate

- [ ] `pnpm lint:check` passed
- [ ] focused tests passed
- [ ] manual landing QA completed
- [ ] manual routing QA completed
- [ ] manual deployment smoke completed
