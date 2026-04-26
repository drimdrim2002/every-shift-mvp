# Launch Core Slice 6 강화 구현 계획

> **에이전트 작업자용:** 필수 하위 스킬: 이 계획을 작업별로 구현하려면 `superpowers:subagent-driven-development`(권장) 또는 `superpowers:executing-plans`를 사용하세요. 단계는 추적을 위해 체크박스(`- [ ]`) 문법을 사용합니다.

**목표:** Launch Core가 구매 완료된 커스텀 도메인 대상 `everyshift.co.kr`을 연결하기 전에 Vercel 생성 URL로 배포 준비를 증명할 수 있도록 Slice 6을 재정의합니다.

**아키텍처:** 저장소가 책임지는 배포 정확성과 외부 launch-ops를 분리합니다. 저장소는 Vercel SPA 계약, local 회귀 게이트, 생성 URL smoke 기준으로 merge 가능해야 하며, Vercel 프로젝트 부트스트랩, Production 승격, `everyshift.co.kr` DNS/SSL/custom-domain smoke는 repo-ready slice를 막지 않는 단계형 게이트입니다.

**기술 스택:** Vue 3, TypeScript, Vite, Playwright, Vitest, Vercel, pnpm

---

## 현재 문제

현재 Slice 6 정의는 배포 환경이 이미 존재한다고 가정합니다.

- 아직 루트 `vercel.json`이 없음
- Vercel 프로젝트 설정이 부트스트랩 작업으로 표현되어 있지 않음
- Preview 및 Production smoke check가 URL이 이미 존재하는 것처럼 작성되어 있음
- `everyshift.co.kr` DNS, SSL, custom-domain smoke가 외부 launch-ops 게이트인데도 커스텀 도메인 준비가 암묵적으로 포함되어 있음
- 저장소가 책임지는 게이트와 외부 운영 설정이 섞여 있음

Slice 6은 `everyshift.co.kr` 연결 때문에 막히면 안 됩니다. 먼저 저장소가 Vercel 생성 URL로 안전하게 배포될 수 있음을 증명한 뒤, DNS, SSL, custom-domain smoke를 명시적인 후속 launch-ops 게이트로 만들어야 합니다.

## 범위 확인

이 계획은 문서와 배포 계약 강화만 다룹니다.

범위 내:

- 생성 Vercel URL 중심으로 Slice 6 문서 재정의
- root `vercel.json` SPA fallback 계약 추가
- local, preview, production generated-domain, custom-domain 게이트 분리
- Vercel 프로젝트 부트스트랩 명시화

범위 밖:

- 추가 도메인 구매 또는 등록 도메인 변경
- registrar DNS 구성
- OAuth provider 연결
- analytics 추가
- 스케줄 생성 동작 변경

## 목표 Slice 구조

Slice 6 이름을 다음으로 변경합니다.

```text
Slice 6: Deploy Readiness + Preview Regression Gate
```

다음 상태 레이어를 사용합니다.

```text
Repo-ready
  -> Vercel-project-ready
  -> Preview-smoke-ready
  -> Production-default-domain-ready
  -> Custom-domain-ready
```

`Repo-ready`는 merge 가능합니다. `Custom-domain-ready`는 Launch Core 배포 정확성을 증명하는 데 필요한 조건이 아니라, 공개 커스텀 도메인 런칭에만 필요한 조건입니다.

## 파일 구조

- 수정: `docs/launch/launch-core/launch-core-implementation-slices.md`
  - 현재 Slice 6 섹션을 단계형 배포 준비 모델로 교체합니다.
- 수정: `docs/launch/launch-core/launch-core-implementation-slices.ko.md`
  - Slice 6 재작성 내용을 한국어로 동일하게 반영합니다.
- 수정: `docs/launch/launch-core/launch-core-auth-and-deploy-spec.md`
  - Vercel 생성 URL이 최초 필수 대상이며, `everyshift.co.kr` 연결은 DNS, SSL, custom-domain smoke 전까지 지연된다는 점을 명확히 합니다.
- 수정: `docs/launch/launch-core/launch-core-auth-and-deploy-spec.ko.md`
  - 배포 spec 명확화 내용을 한국어로 동일하게 반영합니다.
- 수정: `docs/launch/launch-core/launch-core-qa-checklist.md`
  - 배포 QA를 local, preview, production default domain, custom domain 섹션으로 분리합니다.
- 수정: `docs/launch/launch-core/launch-core-qa-checklist.ko.md`
  - QA 체크리스트 분리를 한국어로 동일하게 반영합니다.
- 생성: `vercel.json`
  - `/app/*` hard refresh에 필요한 Vite SPA fallback rewrite를 추가합니다.

## Task 1: Slice 6 범위와 상태 모델 재작성

**파일:**

- 수정: `docs/launch/launch-core/launch-core-implementation-slices.md`
- 수정: `docs/launch/launch-core/launch-core-implementation-slices.ko.md`

- [ ] **Step 1: Slice 6 제목 교체**

다음을 사용합니다.

```markdown
## Slice 6: Deploy Readiness + Preview Regression Gate
```

한국어:

```markdown
## Slice 6: 배포 준비 + Preview 회귀 게이트
```

- [ ] **Step 2: Slice 6 목표 교체**

다음 의미를 사용합니다.

```text
저장소를 배포 가능한 상태로 만들고, 최초 Vercel preview 경로를 부트스트랩하며, `everyshift.co.kr` 연결이나 DNS/SSL 준비를 요구하지 않고 최종 런칭 회귀 게이트를 정의합니다.
```

- [ ] **Step 3: 명시적 가정 추가**

Slice 6 섹션에 다음 가정을 추가합니다.

- 구매 완료된 커스텀 도메인은 `everyshift.co.kr`임
- 아직 Vercel 프로젝트가 존재하지 않을 수 있음
- 첫 검증 대상은 Vercel 생성 URL임
- registrar DNS와 SSL 준비는 외부 launch-ops 작업임
- Slice 6 코드/문서는 `everyshift.co.kr` 연결과 SSL 준비 전에 merge 가능함

- [ ] **Step 4: 범위 내 작업 분리**

다음 하위 섹션을 사용합니다.

- Repo deploy contract
- Vercel project bootstrap checklist
- Preview smoke gate
- Production default-domain smoke gate
- Deferred custom-domain checklist

- [ ] **Step 5: markdown 검색 check 실행**

실행:

```bash
rg -n "Slice 6|custom domain|domain|Vercel preview|production" docs/launch/launch-core
```

예상 결과: Slice 6 참조가 커스텀 도메인 설정보다 Vercel 생성 URL을 먼저 일관되게 설명합니다.

## Task 2: 저장소가 책임지는 Vercel SPA 계약 추가

**파일:**

- 생성: `vercel.json`
- 수정: `docs/launch/launch-core/launch-core-implementation-slices.md`
- 수정: `docs/launch/launch-core/launch-core-implementation-slices.ko.md`

- [ ] **Step 1: `vercel.json` 생성**

다음을 사용합니다.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

- [ ] **Step 2: 이것이 저장소 책임인 이유 문서화**

짧은 note를 추가합니다.

```text
이 파일은 Vercel 프로젝트가 존재하기 전에도 필요합니다. Vercel이 저장소를 배포한 뒤 Vite SPA deep link를 어떻게 제공할지 정의하기 때문입니다.
```

- [ ] **Step 3: local build가 계속 동작하는지 검증**

실행:

```bash
pnpm build
```

예상 결과: `vue-tsc -b && vite build`가 성공적으로 완료됩니다.

## Task 3: Local 게이트를 Vercel과 독립시키기

**파일:**

- 수정: `docs/launch/launch-core/launch-core-implementation-slices.md`
- 수정: `docs/launch/launch-core/launch-core-implementation-slices.ko.md`
- 필요 시 수정: `tests/e2e/public-launch.spec.ts`
- 필요 시 수정: `tests/e2e/helpers.ts`

- [ ] **Step 1: local repo-ready 게이트 정의**

다음을 사용합니다.

```bash
pnpm lint:check
pnpm check-env
pnpm test:unit tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/public-landing.spec.ts tests/unit/check-env.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts
pnpm test:e2e -- --no-deps tests/e2e/public-launch.spec.ts
pnpm build
```

예상 결과: 모든 command가 local `.env.local`을 사용해 통과합니다. E2E는 live Vercel URL을 요구하지 않습니다.

- [ ] **Step 2: credential-backed E2E를 별도 게이트로 유지**

이를 별도 게이트로 문서화합니다.

```bash
pnpm test:e2e -- tests/e2e/signup-flow.spec.ts tests/e2e/multi-org-rbac.spec.ts
```

예상 결과: `.env.test`에 필요한 test account credential이 있을 때만 실행됩니다.

- [ ] **Step 3: blocker를 명시적으로 기록**

credential-backed E2E를 실행할 수 없으면 다음을 기록합니다.

```text
TEST_USER_EMAIL/TEST_USER_PASSWORD 누락으로 local에서 막힘. Slice 6 repo-readiness 실패가 아님.
```

## Task 4: Vercel 프로젝트 부트스트랩 체크리스트 추가

**파일:**

- 수정: `docs/launch/launch-core/launch-core-implementation-slices.md`
- 수정: `docs/launch/launch-core/launch-core-implementation-slices.ko.md`
- 수정: `docs/launch/launch-core/launch-core-auth-and-deploy-spec.md`
- 수정: `docs/launch/launch-core/launch-core-auth-and-deploy-spec.ko.md`

- [ ] **Step 1: 설정 체크리스트 추가**

필수 Vercel 프로젝트 설정을 문서화합니다.

- GitHub repo를 Vercel로 import
- framework preset: Vite
- install command: `pnpm install`
- build command: `pnpm build`
- output directory: `dist`
- Node version: 나중에 project constraint가 추가되지 않는 한 Vercel default 사용

- [ ] **Step 2: environment variable 체크리스트 추가**

Preview와 Production에 필요:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`
- `VITE_PUBLIC_INQUIRY_FORM_URL`

canonical/meta 작업이 존재하기 전까지 optional:

- `VITE_PUBLIC_SITE_URL`

- [ ] **Step 3: environment rule 추가**

문서화:

- `VITE_*`에는 secret을 넣지 않음
- Preview와 Production을 별도로 설정
- 값을 review하지 않은 상태에서 `.env.local` 내용을 source of truth로 사용하지 않음
- `VITE_PUBLIC_INQUIRY_FORM_URL`은 template placeholder가 아니라 실제 Google Form URL이어야 함

## Task 5: Vercel 생성 URL에서 Preview Smoke 게이트 정의

**파일:**

- 수정: `docs/launch/launch-core/launch-core-implementation-slices.md`
- 수정: `docs/launch/launch-core/launch-core-implementation-slices.ko.md`
- 수정: `docs/launch/launch-core/launch-core-qa-checklist.md`
- 수정: `docs/launch/launch-core/launch-core-qa-checklist.ko.md`

- [ ] **Step 1: preview 대상 정의**

다음을 사용합니다.

```text
Preview URL: https://<vercel-preview-deployment>.vercel.app
```

- [ ] **Step 2: manual preview smoke check 추가**

필수 check:

- 로그아웃 상태의 `/`는 public landing을 표시함
- 로그인 상태의 `/`는 `/app`으로 redirect함
- `/login`, `/signup`, `/access/*`는 app chrome 없이 render됨
- `/app`은 active admin에게 app chrome과 함께 load됨
- `/app/schedule/step1` hard refresh가 404를 반환하지 않음
- `/admin/*`, `/home/*`, `/ops/*`, `/schedule/*`는 canonical `/app/*`로 redirect함
- inquiry CTA가 설정된 Google Form을 엶
- pending/rejected/restricted-user route가 올바른 위치에 도달함

- [ ] **Step 3: failure handling 추가**

문서화:

```text
preview smoke가 실패하면 production으로 승격하지 않습니다. 먼저 repo 또는 Vercel env/config를 수정합니다.
```

## Task 6: Production Default-Domain 게이트 정의

**파일:**

- 수정: `docs/launch/launch-core/launch-core-implementation-slices.md`
- 수정: `docs/launch/launch-core/launch-core-implementation-slices.ko.md`
- 수정: `docs/launch/launch-core/launch-core-qa-checklist.md`
- 수정: `docs/launch/launch-core/launch-core-qa-checklist.ko.md`

- [ ] **Step 1: 커스텀 도메인 연결 전 production 대상 정의**

다음을 사용합니다.

```text
Production URL before custom-domain connection: https://<vercel-project>.vercel.app
```

- [ ] **Step 2: preview smoke matrix 재사용**

Task 5의 동일한 check를 production generated URL에 대해 실행합니다.

- [ ] **Step 3: promotion rule 추가**

문서화:

```text
production deployment는 생성된 Vercel domain에서 검증할 수 있습니다. `everyshift.co.kr` custom-domain launch는 DNS, SSL, custom-domain smoke가 완료될 때까지 계속 blocked 상태입니다.
```

## Task 7: Custom Domain을 Launch Ops로 지연

**파일:**

- 수정: `docs/launch/launch-core/launch-core-implementation-slices.md`
- 수정: `docs/launch/launch-core/launch-core-implementation-slices.ko.md`
- 수정: `docs/launch/launch-core/launch-core-auth-and-deploy-spec.md`
- 수정: `docs/launch/launch-core/launch-core-auth-and-deploy-spec.ko.md`
- 수정: `docs/launch/launch-core/launch-core-qa-checklist.md`
- 수정: `docs/launch/launch-core/launch-core-qa-checklist.ko.md`

- [ ] **Step 1: deferred checklist 추가**

Custom domain checklist:

- 구매 완료된 custom-domain target이 `everyshift.co.kr`인지 확인
- Vercel project에 `everyshift.co.kr` 추가
- Vercel 안내에 따라 registrar DNS record 구성
- Vercel SSL certificate가 valid 상태가 될 때까지 대기
- `https://everyshift.co.kr`에서 `/`, `/app`, `/login`, `/signup`, `/access/*`, 그리고 하나의 `/app/schedule/*` hard refresh를 smoke test
- site metadata 또는 canonical URL 동작이 구현된 경우에만 `VITE_PUBLIC_SITE_URL` update

- [ ] **Step 2: non-blocking rule 추가**

문서화:

```text
`everyshift.co.kr` 연결 때문에 Slice 6 repo completion을 block하지 않습니다. 대신 이 checklist로 public custom-domain launch를 block합니다.
```

## Task 8: 최종 Launch 게이트 문구 업데이트

**파일:**

- 수정: `docs/launch/launch-core/launch-core-implementation-slices.md`
- 수정: `docs/launch/launch-core/launch-core-implementation-slices.ko.md`

- [ ] **Step 1: final gate 교체**

다음을 사용합니다.

```text
Launch Core는 repo-ready, Vercel-project-ready, preview-smoke-ready, production-default-domain-ready가 완료되면 deployment-ready 상태입니다.
Launch Core는 custom-domain checklist가 완료된 뒤에만 custom-domain launch-ready 상태입니다.
```

- [ ] **Step 2: recommended commit message 업데이트**

다음을 사용합니다.

```bash
git commit -m "docs: harden launch core slice 6 deploy readiness"
```

같은 구현에서 `vercel.json`을 생성한다면 다음을 사용합니다.

```bash
git commit -m "chore: add vercel spa deploy contract"
```

## 검증

이 계획을 구현한 뒤 다음을 실행합니다.

```bash
pnpm lint:check
pnpm check-env
pnpm test:unit tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/public-landing.spec.ts tests/unit/check-env.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts
pnpm test:e2e -- --no-deps tests/e2e/public-launch.spec.ts
pnpm build
```

예상 결과: 모든 repo-ready check가 local에서 통과합니다.

그런 다음 Vercel 설정이 존재하게 된 뒤, 커스텀 도메인 작업 전에 생성된 Vercel URL을 대상으로 Preview 및 Production smoke checklist를 manual로 실행합니다.
