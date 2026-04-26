# Launch Core 인증 및 배포 스펙

> 원문 기준 문서: [launch-core-auth-and-deploy-spec.md](./launch-core-auth-and-deploy-spec.md)
> 관련 계획 문서: [launch-core-plan.ko.md](./launch-core-plan.ko.md)
> Slice 6 지원 문서: [Launch Core 구현 슬라이스 가이드](./launch-core-implementation-slices.ko.md#slice-6-배포-계약--최종-회귀-게이트)

## 문서 역할

이 문서는 Slice 6을 지원하는 인증, 환경변수, Vercel 프로젝트, 도메인, SSL 기준을 기록합니다. 단계 흐름은 [Launch Core 구현 슬라이스 가이드](./launch-core-implementation-slices.ko.md)에 있고, 실제 클릭 및 확인 순서는 [Launch Core QA 체크리스트](./launch-core-qa-checklist.ko.md)에 있습니다.

## 목표

불필요하게 인증 복잡도를 늘리지 않으면서, 공개 출시가 가능한 상태를 만드는 것이 목표입니다.

## 인증 범위

### 포함

- 이메일/비밀번호 로그인
- 이메일/비밀번호 회원가입
- active / pending / rejected 상태별 라우팅
- `/app` 이동 이후에도 로그인 후 리다이렉트가 정확할 것
- 로그인 사용자가 `/` 에 접근했을 때 처리 규칙
- 기존 앱 URL 을 canonical `/app` 으로 넘기는 임시 리다이렉트

### 제외

- Google 로그인
- Kakao 로그인
- `/auth/callback`
- provider-linking 로직

## 진입 화면

### 로그인

반드시 포함:

- 이메일 입력
- 비밀번호 입력
- `로그인` 버튼
- `회원 가입` 링크

### 회원가입

공개 베타에서는 관리자 우선 흐름을 유지합니다.

- 기본 role 은 `admin`
- 공개 CTA 는 `/signup?role=admin` 으로 연결 가능

## 로그인 사용자 접근 규칙

- 비로그인 사용자는 `/` 에 머물 수 있습니다.
- 활성 로그인 사용자가 `/` 에 들어오면 `/app` 으로 보내야 합니다.
- pending, rejected 사용자는 계속 `/access/pending`, `/access/rejected` 로 가야 합니다.
- `/login`, `/signup` 은 로그인 사용자의 대체 홈 화면이 되어서는 안 됩니다.

## 로그인 후 이동 매트릭스

성공적으로 인증되면 권한에 맞는 canonical 작업 경로로 바로 이동해야 합니다.

| 접근 상태      | canonical 도착 경로         |
| -------------- | --------------------------- |
| `super_active` | `/app/admin/approval-queue` |
| `admin_active` | `/app`                      |
| `user_active`  | `/app/home/user`            |

규칙:

- 이 표는 로그인 완료 후와 `/login`, `/signup` 재접속 시 이동 규칙을 결정합니다.
- 별도로 `/` 접근 규칙도 유지합니다. 활성 사용자가 공개 랜딩(`/`)에 오면 `/app` 으로 보내야 합니다.
- blocked 상태는 작업 공간으로 보내지 않고 `/access/pending` 또는 `/access/rejected` 로 보냅니다.

## 공개 도입 문의

반드시 실제 Google Form 이어야 하며, placeholder 문구로 대체하면 안 됩니다.

### 필수 항목

- `요청 내용` (체크박스, 복수 선택 가능)
  - `소개 자료 다운로드`
  - `한 달 무료 사용하기`
  - `기타`
- `기타 상세 내용` (`기타` 와 함께 자연스럽게 연결)
- `병원 이름`
- `병동 이름`
- `이메일 주소`

### 동작 규칙

- `병원 이름`, `병동 이름`, `이메일 주소` 는 필수입니다.
- `요청 내용` 은 체크박스로 여러 의도를 함께 선택할 수 있어야 합니다.
- `기타` 를 선택한 경우 사용자가 직접 내용을 적을 입력란이 있어야 합니다.
- 제출 완료 문구에는 이후 어떤 안내가 오는지 적혀 있어야 합니다.

## 개인정보 안내

문의 폼은 개인을 식별할 수 있는 연락 정보를 저장하므로, 제출 전에 개인정보 수집/이용 안내가 보여야 합니다.

### 최소 안내 항목

- 수집 목적: 문의 응답, 소개 자료 전달, 무료 사용 조율
- 수집 항목: 병원 이름, 병동 이름, 이메일 주소, 요청 내용
- 보관 기간: 폼 안에 명시된 기간
- 거부 권리: 거부는 가능하지만 문의 처리가 제한될 수 있음

### 권장 결정

- 제출 전 필수 동의 체크박스를 추가
- 수집 목적은 운영상 필요한 범위로 좁게 유지
- 공개 출시 전 최종 문구를 다시 검토

참고:

- 이는 실무적인 준수 권고사항이며, 법률 확정 의견은 아닙니다.
- Google Form 을 사용하므로 제3자 처리, 저장 위치, 해외 이전 관련 추가 고지가 필요한지 출시 전에 검토해야 합니다.

## 배포 계약

### 플랫폼

- Vercel preview
- Vercel production
- Vercel generated preview / production URL
- DNS 와 SSL 활성화 후 `everyshift.co.kr`

### 배포 준비 레이어

Launch Core 배포는 다음 순서로 단계화합니다.

```text
Repo-ready
  -> Vercel-project-ready
  -> Preview-smoke-ready
  -> Production-default-domain-ready
  -> Custom-domain-ready
```

`Repo-ready` 는 저장소를 Vercel 용으로 빌드, 테스트, 설정할 수 있음을 증명합니다. `Custom-domain-ready` 는 `everyshift.co.kr` 을 위한 출시 운영 게이트이며, Vercel 프로젝트 설정, DNS 설정, SSL 준비가 끝난 뒤에만 시작합니다.

### 초기 배포 대상

- first Preview target: `https://<vercel-preview-deployment>.vercel.app`
- first Production target: `https://<vercel-project>.vercel.app`
- custom domain target: `https://everyshift.co.kr`, DNS 와 SSL 이 준비될 때까지 보류

초기 배포 증명에는 Vercel 이 생성한 URL 이 필요합니다. `everyshift.co.kr` 연결은 Slice 6 저장소 준비 완료 조건이 아닙니다.

### Vercel 프로젝트 부트스트랩

필수 프로젝트 설정:

- framework preset: `Vite`
- install command: `pnpm install`
- build command: `pnpm build`
- output directory: `dist`
- Node version: Vercel default unless a project constraint is added later

Preview 와 Production 에 필요한 환경변수:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`
- `VITE_PUBLIC_INQUIRY_FORM_URL`

canonical/meta 작업이 생기기 전까지는 선택:

- `VITE_PUBLIC_SITE_URL`

환경 규칙:

- Preview 와 Production 값을 각각 설정한다
- `VITE_*` 에 비밀값을 넣지 않는다
- `.env.local` 에서 값을 복사하기 전에 검토한다
- `VITE_PUBLIC_INQUIRY_FORM_URL` 은 템플릿 placeholder 가 아니라 실제 Google Form URL 이어야 한다

### 반드시 만족해야 하는 동작

- 정적 프론트엔드가 정상 배포된다
- `/app/*` 딥링크가 새로고침 후에도 동작한다
- 환경변수가 환경별로 분리된다
- 공개 페이지와 앱 페이지가 모두 정상 접근된다
- 공개 문의 CTA 가 올바른 Google Form 을 연다
- 출시 기간에는 예전 앱 URL 이 canonical `/app` 으로 리다이렉트된다
- 예전 `/ops/*`, `/schedule/*` 딥링크도 출시 기간 동안 사용 가능해야 한다

### Vercel 프로젝트 설정값

Vercel 프로젝트를 만들거나 검토할 때 아래 값을 사용합니다. 최종 확인 값은 [Launch Core QA 체크리스트](./launch-core-qa-checklist.ko.md)에 기록합니다.

| 설정             | Launch Core 값                                  |
| ---------------- | ----------------------------------------------- |
| Git provider     | 이 프로젝트의 GitHub 저장소                     |
| Framework Preset | Vite 또는 Vite 자동 감지 확인                   |
| Install Command  | `pnpm install` 또는 Vercel 기본값의 `pnpm` 사용 |
| Build Command    | `pnpm build`                                    |
| Output Directory | `dist`                                          |
| Root Directory   | 프로젝트 구조가 바뀌지 않았다면 repository root |

참고:

- Vercel 이 Vite 설정을 자동 감지할 수 있어도, 런칭 QA 에서는 화면에 보이는 값을 기록합니다.
- Production 배포는 의도한 production branch 또는 명시적인 production deploy command 에서 나와야 합니다.
- Production 승격 전에는 branch 또는 pull request 의 generated Preview URL 로 먼저 스모크 테스트합니다.

### 필수 라우팅 설정

Vite SPA 는 명시적인 rewrite 가 없으면 Vercel 에서 딥링크 새로고침이 깨질 수 있습니다.

따라서 Launch Core 에는 루트 `vercel.json` 이 필요합니다.

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

## 필수 환경변수

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`
- `VITE_PUBLIC_INQUIRY_FORM_URL`

현재 canonical / meta 작업까지 같이 한다면 선택:

- `VITE_PUBLIC_SITE_URL`

규칙:

- `VITE_PUBLIC_INQUIRY_FORM_URL` 은 공개 설정값이므로 클라이언트에 노출될 수 있습니다.
- 어떤 비밀값도 `VITE_*` 변수에 넣으면 안 됩니다.
- 문의 폼 URL 이 비어 있으면 출시 전 검증 단계에서 실패해야 합니다.
- Preview 와 Production 값은 Vercel 에서 각각 설정합니다.
- Vercel 환경변수를 바꾼 뒤에는 해당 환경을 다시 배포합니다.

## Generated URL 스모크

Vercel 은 배포마다 URL 을 생성합니다. Slice 6에서는 아래 순서로 확인합니다.

1. branch 또는 pull request 의 Preview URL
2. Production generated `vercel.app` URL
3. 도메인 설정 후 `https://everyshift.co.kr`

스모크 확인 범위:

- `/`
- `/login`
- `/signup`
- `/access/pending`
- `/app`
- 최소 하나의 `/app/schedule/*` 딥링크 새로고침
- `/admin/*`, `/home/*`, `/ops/*`, `/schedule/*` 레거시 리다이렉트 예시
- 공개 문의 CTA

## Custom Domain 과 SSL

팀이 공개 도메인을 붙일 준비가 되면 `everyshift.co.kr` 을 런칭 도메인 대상으로 사용합니다.

진행 기준:

- Vercel 프로젝트 Domains 설정에 `everyshift.co.kr` 을 추가한다.
- Vercel 이 안내한 DNS record 값을 도메인 제공업체에 설정한다.
- DNS 전파가 끝날 때까지 기다린 뒤 launch-ready 로 판단한다.
- Vercel 이 HTTPS certificate 발급을 active 로 표시하는지 확인한다.
- production generated URL 에서 통과한 스모크 확인을 `https://everyshift.co.kr` 에서도 반복한다.

Vercel 공식 문서 기준 참고:

- Vercel 은 빌드 후 설정된 Output Directory 의 파일만 정적으로 제공하므로, Launch Core 는 Vite 빌드 산출물인 `dist` 를 기록합니다.
- Vercel 환경변수는 Production, Preview, custom environment, Development 기준으로 적용 범위를 선택합니다.
- Vercel custom domain 설정은 apex 또는 subdomain 구성에 따라 필요한 DNS record 를 안내합니다.
- 도메인이 추가되고 DNS 검증이 가능해지면 Vercel 이 SSL certificate 생성을 자동으로 시도합니다.

## CI 게이트

최소 게이트:

- `pnpm lint:check`
- 핵심 auth / router / RBAC unit test
- `/`, `/app`, 로그인 후 리다이렉트, 레거시 리다이렉트를 다루는 핵심 launch E2E
- 문의 폼 링크와 개인정보 안내 문구 수동 확인
