# Launch Core QA Checklist

> Supporting checklist for [launch-core-plan.md](./launch-core-plan.md)

## Landing

- [ ] `/` loads for unauthenticated users
- [ ] active authenticated user hitting `/` is redirected to `/app`
- [ ] public header renders correctly
- [ ] header order is `로그인`, `회원 가입`, `도입 문의`
- [ ] `회원 가입` CTA is real, not placeholder
- [ ] `도입 문의` CTA is real, not placeholder
- [ ] mobile layout works
- [ ] no app chrome leaks onto landing
- [ ] hero shows `회원 가입` as the primary CTA
- [ ] hero shows `도입 문의` as the secondary CTA

## Auth

- [ ] email/password login works
- [ ] email/password admin signup works
- [ ] pending admins land on `/access/pending`
- [ ] rejected admins land on `/access/rejected`
- [ ] successful login lands on the role-appropriate canonical workspace destination

## Routing

- [ ] `/` is public
- [ ] `/login` is public
- [ ] `/signup` is public
- [ ] `/app` requires authentication
- [ ] `/app/*` deep links survive refresh
- [ ] `/admin/approval-queue` redirects to `/app/admin/approval-queue`
- [ ] `/home/user` redirects to `/app/home/user`
- [ ] `/ops/organization-setup` redirects to `/app/ops/organization-setup`
- [ ] `/ops/off-request-policy-setup` redirects to `/app/ops/off-request-policy-setup`
- [ ] `/schedule/step1` redirects to `/app/schedule/step1`
- [ ] `/schedule/step5/:scheduleKey` redirects to `/app/schedule/step5/:scheduleKey`

## Inquiry Form

- [ ] `도입 문의` opens the real Google Form
- [ ] header, hero, and bottom inquiry CTAs all use the same configured inquiry URL
- [ ] `요청 내용` supports multi-select
- [ ] `소개 자료 다운로드` option exists
- [ ] `한 달 무료 사용하기` option exists
- [ ] `기타` option exists and supports direct input
- [ ] `병원 이름` is required
- [ ] `병동 이름` is required
- [ ] `이메일 주소` is required
- [ ] personal-information consent copy is visible before submit
- [ ] consent checkbox exists if required by the final form copy
- [ ] form completion message explains follow-up expectation
- [ ] manual inquiry form QA result is recorded with tested URL, date, and tester

## RBAC and Navigation

- [ ] super users reach `/app/admin/approval-queue`
- [ ] admin users reach `/app`
- [ ] user users reach `/app/home/user`
- [ ] sidebar visibility matches role

## Responsive and Accessibility

- [ ] mobile menu exposes `로그인`, `회원 가입`, `도입 문의`
- [ ] hero CTA order remains clear on mobile
- [ ] keyboard-only users can reach all public actions
- [ ] focus states are visible on header actions and CTAs
- [ ] external inquiry link announces new-tab behavior if used

## Deployment Smoke

- [ ] preview deploy reachable
- [ ] production deploy reachable
- [ ] preview env vars correct
- [ ] production env vars correct
- [ ] `VITE_PUBLIC_INQUIRY_FORM_URL` is set in preview
- [ ] `VITE_PUBLIC_INQUIRY_FORM_URL` is set in production
- [ ] root `vercel.json` rewrite is present and `/app/*` refresh works in preview

## Final Gate

- [ ] `pnpm lint:check` passed
- [ ] focused tests passed
- [ ] manual landing QA completed
- [ ] manual routing QA completed
- [ ] manual inquiry form QA completed
- [ ] manual deployment smoke completed
