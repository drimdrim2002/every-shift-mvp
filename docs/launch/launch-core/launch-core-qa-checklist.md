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

### Local Repo-Ready

- [ ] root `vercel.json` exists
- [ ] root `vercel.json` rewrites `/(.*)` to `/index.html`
- [ ] `pnpm lint:check` passed
- [ ] `pnpm check-env` passed
- [ ] `pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/public-landing.spec.ts tests/unit/check-env.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts` passed
- [ ] `pnpm test:e2e -- --no-deps tests/e2e/public-launch.spec.ts` passed
- [ ] `pnpm build` passed
- [ ] credential-backed E2E status recorded separately if `TEST_USER_EMAIL` or `TEST_USER_PASSWORD` is missing

### Vercel Project Bootstrap

- [ ] GitHub repo imported into Vercel and connected to the Vercel project
- [ ] framework preset is `Vite` or Vite auto-detection is confirmed
- [ ] root directory is repository root unless the project layout changed
- [ ] install command is `pnpm install`
- [ ] build command is `pnpm build`
- [ ] output directory is `dist`
- [ ] Preview `VITE_SUPABASE_URL` is set
- [ ] Preview `VITE_SUPABASE_ANON_KEY` is set
- [ ] Preview `VITE_API_BASE_URL` is set
- [ ] Preview `VITE_PUBLIC_INQUIRY_FORM_URL` is set
- [ ] Production `VITE_SUPABASE_URL` is set
- [ ] Production `VITE_SUPABASE_ANON_KEY` is set
- [ ] Production `VITE_API_BASE_URL` is set
- [ ] Production `VITE_PUBLIC_INQUIRY_FORM_URL` is set
- [ ] `VITE_PUBLIC_INQUIRY_FORM_URL` is a real Google Form URL in Preview
- [ ] `VITE_PUBLIC_INQUIRY_FORM_URL` is a real Google Form URL in Production
- [ ] no secrets are stored in `VITE_*`

### Preview Generated URL

- [ ] Preview URL recorded: `https://<vercel-preview-deployment>.vercel.app`
- [ ] logged-out `/` shows public landing
- [ ] logged-in `/` redirects to `/app`
- [ ] `/login`, `/signup`, and `/access/*` render without app chrome
- [ ] `/app` loads with app chrome for an active admin
- [ ] `/app/schedule/step1` hard refresh does not 404
- [ ] legacy `/admin/*`, `/home/*`, `/ops/*`, and `/schedule/*` URLs redirect to canonical `/app/*`
- [ ] `도입 문의` opens the configured Google Form
- [ ] pending, rejected, and restricted-user routes land correctly
- [ ] preview smoke date, tester, and result are recorded

### Production Generated URL

- [ ] Production URL recorded: `https://<vercel-project>.vercel.app`
- [ ] same smoke matrix from Preview Generated URL passed
- [ ] production promotion happened only after Preview smoke passed
- [ ] production default-domain smoke date, tester, and result are recorded

### Custom Domain

- [ ] purchased custom-domain target confirmed: `everyshift.co.kr`
- [ ] `everyshift.co.kr` added to Vercel project
- [ ] registrar DNS records configured as instructed by Vercel
- [ ] Vercel SSL certificate is valid
- [ ] `/`, `/app`, `/login`, `/signup`, `/access/*`, and one `/app/schedule/*` hard refresh passed on `https://everyshift.co.kr`
- [ ] `VITE_PUBLIC_SITE_URL` updated only if site metadata or canonical URL behavior exists
- [ ] custom-domain smoke date, tester, and result are recorded

## Final Gate

- [ ] repo-ready stage completed
- [ ] all 7 slices are complete
- [ ] every repo-ready slice gate is green
- [ ] final launch regression suite is green
- [ ] Vercel project bootstrap is complete
- [ ] Preview generated URL smoke passed
- [ ] Production generated URL smoke passed
- [ ] `everyshift.co.kr` custom-domain checklist is complete, or custom-domain launch is explicitly deferred
- [ ] `launch-core-qa-checklist.md` is complete with tested URL, date, and tester recorded where manual checks were performed
