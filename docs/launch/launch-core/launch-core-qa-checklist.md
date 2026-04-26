# Launch Core QA Checklist

> Slice 6 supporting checklist for [Launch Core Implementation Slices](./launch-core-implementation-slices.md#slice-6-deploy-contract-and-launch-regression-gate),
> [Launch Core Auth and Deploy Spec](./launch-core-auth-and-deploy-spec.md), and [launch-core-plan.md](./launch-core-plan.md)

Use this as the execution record for Launch Core smoke. The master slice plan defines the stage flow, and the auth/deploy spec defines the settings.

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

## Slice 6 Deployment Smoke

### Repo-ready

- [ ] root `vercel.json` exists
- [ ] root `vercel.json` rewrites `/(.*)` to `/index.html`
- [ ] `pnpm check-env` passed with the launch inquiry URL
- [ ] `pnpm build` passed locally
- [ ] focused unit launch regression tests passed
- [ ] focused E2E launch regression tests passed or are explicitly blocked with reason

### Vercel-project-ready

- [ ] GitHub repository is connected to the Vercel project
- [ ] Framework Preset is Vite or Vite auto-detection is confirmed
- [ ] Install Command is `pnpm install` or Vercel default using `pnpm`
- [ ] Build Command is `pnpm build`
- [ ] Output Directory is `dist`
- [ ] Root Directory is repository root unless the project layout changed
- [ ] preview environment variables are correct
- [ ] production environment variables are correct
- [ ] `VITE_PUBLIC_INQUIRY_FORM_URL` is set in preview
- [ ] `VITE_PUBLIC_INQUIRY_FORM_URL` is set in production

### Preview-smoke-ready

- [ ] generated Preview URL is recorded
- [ ] generated Preview URL loads `/`
- [ ] generated Preview URL loads `/login`, `/signup`, and `/access/pending` without app chrome
- [ ] generated Preview URL redirects active authenticated `/` visits to `/app`
- [ ] generated Preview URL keeps `/app/*` deep links working after refresh
- [ ] generated Preview URL passes the legacy redirect matrix
- [ ] generated Preview URL opens the configured Google Form from public inquiry CTAs
- [ ] preview smoke date, tester, and result are recorded

### Production-default-domain-ready

- [ ] generated Production URL is recorded
- [ ] generated Production URL loads `/`
- [ ] generated Production URL redirects active authenticated `/` visits to `/app`
- [ ] generated Production URL keeps `/app/*` deep links working after refresh
- [ ] generated Production URL passes the legacy redirect matrix
- [ ] generated Production URL opens the configured Google Form from public inquiry CTAs
- [ ] production default-domain smoke date, tester, and result are recorded

### Custom-domain-ready

- [ ] `everyshift.co.kr` is added to the Vercel project
- [ ] DNS records shown by Vercel are configured at the domain provider
- [ ] Vercel reports HTTPS certificate status as active
- [ ] `https://everyshift.co.kr/` loads the public landing
- [ ] `https://everyshift.co.kr/app/*` deep links work after refresh
- [ ] `https://everyshift.co.kr` passes the legacy redirect matrix
- [ ] `https://everyshift.co.kr` opens the configured Google Form from public inquiry CTAs
- [ ] custom-domain smoke date, tester, and result are recorded

## Final Gate

- [ ] `pnpm lint:check` passed
- [ ] focused tests passed
- [ ] manual landing QA completed
- [ ] manual routing QA completed
- [ ] manual inquiry form QA completed
- [ ] repo-ready stage completed
- [ ] Vercel-project-ready stage completed
- [ ] Preview-smoke-ready stage completed
- [ ] Production-default-domain-ready stage completed
- [ ] Custom-domain-ready stage completed or explicit launch decision recorded
