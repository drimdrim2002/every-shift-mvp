# Launch Core QA 체크리스트

> 원문 기준 문서: [launch-core-qa-checklist.md](./launch-core-qa-checklist.md)
> 관련 계획 문서: [launch-core-plan.ko.md](./launch-core-plan.ko.md)
> Slice 6 지원 문서: [Launch Core 구현 슬라이스 가이드](./launch-core-implementation-slices.ko.md#slice-6-배포-계약--최종-회귀-게이트), [Launch Core 인증 및 배포 스펙](./launch-core-auth-and-deploy-spec.ko.md)

이 체크리스트는 Launch Core 스모크 테스트 실행 기록입니다. 마스터 slice 문서는 단계 흐름을 정의하고, 인증 및 배포 스펙은 설정 기준을 정의합니다.

## 랜딩 페이지

- [ ] 비로그인 사용자가 `/` 에 접근할 수 있다
- [ ] 활성 로그인 사용자가 `/` 에 접근하면 `/app` 으로 이동한다
- [ ] 공개 헤더가 올바르게 렌더링된다
- [ ] 헤더 순서가 `로그인`, `회원 가입`, `도입 문의` 이다
- [ ] `회원 가입` CTA 가 실제로 동작한다
- [ ] `도입 문의` CTA 가 실제로 동작한다
- [ ] 모바일 레이아웃이 깨지지 않는다
- [ ] 랜딩 페이지에 앱 크롬이 새어 나오지 않는다
- [ ] 히어로의 기본 CTA 가 `회원 가입` 이다
- [ ] 히어로의 보조 CTA 가 `도입 문의` 이다

## 인증

- [ ] 이메일/비밀번호 로그인 동작
- [ ] 이메일/비밀번호 관리자 회원가입 동작
- [ ] 승인 대기 관리자는 `/access/pending` 으로 이동
- [ ] 승인 거절 관리자는 `/access/rejected` 로 이동
- [ ] 로그인 성공 후 권한에 맞는 canonical 작업 경로로 이동

## 라우팅

- [ ] `/` 는 공개 경로다
- [ ] `/login` 은 공개 경로다
- [ ] `/signup` 은 공개 경로다
- [ ] `/app` 은 인증이 필요하다
- [ ] `/app/*` 딥링크가 새로고침 후에도 유지된다
- [ ] `/admin/approval-queue` 가 `/app/admin/approval-queue` 로 리다이렉트된다
- [ ] `/home/user` 가 `/app/home/user` 로 리다이렉트된다
- [ ] `/ops/organization-setup` 가 `/app/ops/organization-setup` 로 리다이렉트된다
- [ ] `/ops/off-request-policy-setup` 가 `/app/ops/off-request-policy-setup` 로 리다이렉트된다
- [ ] `/schedule/step1` 이 `/app/schedule/step1` 로 리다이렉트된다
- [ ] `/schedule/step5/:scheduleKey` 가 `/app/schedule/step5/:scheduleKey` 로 리다이렉트된다

## 도입 문의 폼

- [ ] `도입 문의` 가 실제 Google Form 을 연다
- [ ] 헤더, 히어로, 하단 문의 CTA 가 모두 같은 inquiry URL 을 사용한다
- [ ] `요청 내용` 이 다중 선택을 지원한다
- [ ] `소개 자료 다운로드` 옵션이 있다
- [ ] `한 달 무료 사용하기` 옵션이 있다
- [ ] `기타` 옵션이 있고 직접 입력 가능하다
- [ ] `병원 이름` 이 필수다
- [ ] `병동 이름` 이 필수다
- [ ] `이메일 주소` 가 필수다
- [ ] 제출 전 개인정보 동의 안내가 보인다
- [ ] 최종 폼 문구상 필요하다면 동의 체크박스가 있다
- [ ] 제출 완료 메시지에 후속 안내가 있다
- [ ] 수동 문의 폼 QA 결과에 테스트한 URL, 날짜, 담당자를 기록했다

## RBAC 와 네비게이션

- [ ] super 사용자는 `/app/admin/approval-queue` 로 이동한다
- [ ] admin 사용자는 `/app` 으로 이동한다
- [ ] user 사용자는 `/app/home/user` 로 이동한다
- [ ] 사이드바 노출이 권한과 일치한다

## 반응형 / 접근성

- [ ] 모바일 메뉴에 `로그인`, `회원 가입`, `도입 문의` 가 보인다
- [ ] 모바일에서도 히어로 CTA 순서가 분명하다
- [ ] 키보드만으로 공개 액션에 모두 접근할 수 있다
- [ ] 헤더 액션과 CTA 의 포커스 상태가 보인다
- [ ] 외부 문의 링크가 새 탭 동작을 쓴다면 이를 사용자에게 알린다

## Slice 6 배포 스모크 테스트

### 로컬 저장소 준비 상태

- [ ] 루트 `vercel.json` 이 있다
- [ ] 루트 `vercel.json` 이 `/(.*)` 를 `/index.html` 로 rewrite 한다
- [ ] `pnpm lint:check` 통과
- [ ] `pnpm check-env` 통과
- [ ] `pnpm test:unit tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/public-landing.spec.ts tests/unit/check-env.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts` 통과
- [ ] `pnpm test:e2e -- --no-deps tests/e2e/public-launch.spec.ts` 통과
- [ ] `pnpm build` 통과
- [ ] `TEST_USER_EMAIL` 또는 `TEST_USER_PASSWORD` 가 없으면 인증 정보 기반 E2E 상태를 별도로 기록했다

### Vercel 프로젝트 부트스트랩

- [ ] GitHub 저장소를 Vercel 로 가져왔고 Vercel 프로젝트에 연결되어 있다
- [ ] 프레임워크 프리셋이 `Vite` 이거나 Vite 자동 감지가 확인되어 있다
- [ ] root directory 는 프로젝트 구조가 바뀌지 않았다면 repository root 다
- [ ] 설치 명령이 `pnpm install` 이다
- [ ] 빌드 명령이 `pnpm build` 이다
- [ ] 출력 디렉터리가 `dist` 이다
- [ ] 프리뷰 `VITE_SUPABASE_URL` 이 설정되어 있다
- [ ] 프리뷰 `VITE_SUPABASE_ANON_KEY` 가 설정되어 있다
- [ ] 프리뷰 `VITE_API_BASE_URL` 이 비어 있거나 제거되어 있다
- [ ] 프리뷰 `VITE_PUBLIC_INQUIRY_FORM_URL` 이 설정되어 있다
- [ ] 프로덕션 `VITE_SUPABASE_URL` 이 설정되어 있다
- [ ] 프로덕션 `VITE_SUPABASE_ANON_KEY` 가 설정되어 있다
- [ ] 프로덕션 `VITE_API_BASE_URL` 이 비어 있거나 제거되어 있다
- [ ] 프로덕션 `VITE_PUBLIC_INQUIRY_FORM_URL` 이 설정되어 있다
- [ ] 프리뷰의 `VITE_PUBLIC_INQUIRY_FORM_URL` 이 실제 Google Form URL 이다
- [ ] 프로덕션의 `VITE_PUBLIC_INQUIRY_FORM_URL` 이 실제 Google Form URL 이다
- [ ] `VITE_*` 에 비밀값을 저장하지 않았다

### 프리뷰 생성 URL

- [ ] 프리뷰 URL 기록: `https://<vercel-preview-deployment>.vercel.app`
- [ ] 로그아웃 상태의 `/` 에 공개 랜딩 페이지가 보인다
- [ ] 로그인 상태의 `/` 이 `/app` 으로 이동한다
- [ ] `/login`, `/signup`, `/access/*` 가 앱 크롬 없이 렌더링된다
- [ ] 활성 관리자 계정이 `/app` 에 접근하면 앱 크롬과 함께 로드된다
- [ ] `/app/schedule/step1` 하드 새로고침이 404 가 아니다
- [ ] 기존 `/admin/*`, `/home/*`, `/ops/*`, `/schedule/*` URL 이 표준 `/app/*` 로 리다이렉트된다
- [ ] `도입 문의` 가 설정된 Google Form 을 연다
- [ ] 승인 대기, 승인 거절, 제한 사용자 경로가 올바른 도착지로 이동한다
- [ ] preview 스모크 날짜, 담당자, 결과가 기록되어 있다

### 프로덕션 생성 URL

- [ ] 프로덕션 URL 기록: `https://<vercel-project>.vercel.app`
- [ ] 프리뷰 생성 URL 과 같은 스모크 매트릭스 통과
- [ ] 프리뷰 스모크 통과 후에만 프로덕션 승격을 진행했다
- [ ] production 기본 URL 스모크 날짜, 담당자, 결과가 기록되어 있다

### 커스텀 도메인

- [ ] 구매한 커스텀 도메인 대상 확인: `everyshift.co.kr`
- [ ] Vercel 프로젝트에 `everyshift.co.kr` 를 추가했다
- [ ] Vercel 안내에 따라 registrar DNS record 를 설정했다
- [ ] Vercel SSL 인증서가 유효하다
- [ ] `https://everyshift.co.kr` 에서 `/`, `/app`, `/login`, `/signup`, `/access/*` 전체와 `/app/schedule/*` 중 하나의 하드 새로고침이 모두 통과했다
- [ ] 사이트 메타데이터 또는 표준 URL 동작이 있을 때만 `VITE_PUBLIC_SITE_URL` 을 업데이트했다
- [ ] custom-domain 스모크 날짜, 담당자, 결과가 기록되어 있다

## 최종 게이트

- [ ] Repo-ready 단계 완료
- [ ] 7개 슬라이스 모두 완료
- [ ] 모든 저장소 준비 슬라이스 게이트가 통과 상태다
- [ ] 최종 출시 회귀 테스트 묶음이 통과 상태다
- [ ] Vercel 프로젝트 부트스트랩 완료
- [ ] 프리뷰 생성 URL 스모크 통과
- [ ] 프로덕션 생성 URL 스모크 통과
- [ ] `everyshift.co.kr` 커스텀 도메인 체크리스트 완료, 또는 커스텀 도메인 출시 명시적 연기
- [ ] 수동 확인을 수행한 항목은 본 체크리스트 또는 `launch-core-qa-checklist.md` 에 테스트한 URL, 날짜, 담당자를 기록했다
