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

### Repo-ready

- [ ] 루트 `vercel.json` 이 있다
- [ ] 루트 `vercel.json` 이 `/(.*)` 를 `/index.html` 로 rewrite 한다
- [ ] 런칭 문의 URL 로 `pnpm check-env` 가 통과했다
- [ ] 로컬 `pnpm build` 가 통과했다
- [ ] 핵심 unit 런칭 회귀 테스트가 통과했다
- [ ] 핵심 E2E 런칭 회귀 테스트가 통과했거나 blocked 사유가 명시되어 있다

### Vercel-project-ready

- [ ] GitHub 저장소가 Vercel 프로젝트에 연결되어 있다
- [ ] Framework Preset 이 Vite 이거나 Vite 자동 감지가 확인되어 있다
- [ ] Install Command 는 `pnpm install` 또는 Vercel 기본값의 `pnpm` 사용이다
- [ ] Build Command 는 `pnpm build` 다
- [ ] Output Directory 는 `dist` 다
- [ ] Root Directory 는 프로젝트 구조가 바뀌지 않았다면 repository root 다
- [ ] preview 환경변수가 올바르다
- [ ] production 환경변수가 올바르다
- [ ] preview 에 `VITE_PUBLIC_INQUIRY_FORM_URL` 이 설정되어 있다
- [ ] production 에 `VITE_PUBLIC_INQUIRY_FORM_URL` 이 설정되어 있다

### Preview-smoke-ready

- [ ] generated Preview URL 이 기록되어 있다
- [ ] generated Preview URL 에서 `/` 가 열린다
- [ ] generated Preview URL 에서 `/login`, `/signup`, `/access/pending` 에 앱 크롬이 보이지 않는다
- [ ] generated Preview URL 에서 활성 로그인 사용자의 `/` 접근이 `/app` 으로 이동한다
- [ ] generated Preview URL 에서 `/app/*` 딥링크 새로고침이 동작한다
- [ ] generated Preview URL 에서 레거시 리다이렉트 매트릭스가 통과한다
- [ ] generated Preview URL 에서 공개 문의 CTA 가 설정된 Google Form 을 연다
- [ ] preview 스모크 날짜, 담당자, 결과가 기록되어 있다

### Production-default-domain-ready

- [ ] generated Production URL 이 기록되어 있다
- [ ] generated Production URL 에서 `/` 가 열린다
- [ ] generated Production URL 에서 활성 로그인 사용자의 `/` 접근이 `/app` 으로 이동한다
- [ ] generated Production URL 에서 `/app/*` 딥링크 새로고침이 동작한다
- [ ] generated Production URL 에서 레거시 리다이렉트 매트릭스가 통과한다
- [ ] generated Production URL 에서 공개 문의 CTA 가 설정된 Google Form 을 연다
- [ ] production 기본 URL 스모크 날짜, 담당자, 결과가 기록되어 있다

### Custom-domain-ready

- [ ] `everyshift.co.kr` 이 Vercel 프로젝트에 추가되어 있다
- [ ] Vercel 이 안내한 DNS record 가 도메인 제공업체에 설정되어 있다
- [ ] Vercel 이 HTTPS certificate status 를 active 로 표시한다
- [ ] `https://everyshift.co.kr/` 에서 공개 랜딩이 열린다
- [ ] `https://everyshift.co.kr/app/*` 딥링크 새로고침이 동작한다
- [ ] `https://everyshift.co.kr` 에서 레거시 리다이렉트 매트릭스가 통과한다
- [ ] `https://everyshift.co.kr` 에서 공개 문의 CTA 가 설정된 Google Form 을 연다
- [ ] custom-domain 스모크 날짜, 담당자, 결과가 기록되어 있다

## 최종 게이트

- [ ] `pnpm lint:check` 통과
- [ ] 핵심 테스트 통과
- [ ] 수동 랜딩 QA 완료
- [ ] 수동 라우팅 QA 완료
- [ ] 수동 문의 폼 QA 완료
- [ ] Repo-ready 단계 완료
- [ ] Vercel-project-ready 단계 완료
- [ ] Preview-smoke-ready 단계 완료
- [ ] Production-default-domain-ready 단계 완료
- [ ] Custom-domain-ready 단계 완료 또는 명시적인 런칭 결정 기록
