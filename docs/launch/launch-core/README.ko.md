# Launch Core 문서 안내

`Launch Core` 는 EveryShift 를 처음으로 외부에 공개할 때 반드시 갖춰야 하는 최소 출시 범위입니다.

이 폴더는 아래 질문에 답하기 위한 문서 모음입니다.

`EveryShift를 외부 사용자가 이해할 수 있고, 실제로 배포 가능하며, 바로 사용 가능한 상태로 만들려면 무엇을 준비해야 하는가?`

## 문서 목록

1. [launch-core-plan.ko.md](./launch-core-plan.ko.md)
2. [launch-core-implementation-slices.ko.md](./launch-core-implementation-slices.ko.md)
3. [launch-core-information-architecture.ko.md](./launch-core-information-architecture.ko.md)
4. [launch-core-auth-and-deploy-spec.ko.md](./launch-core-auth-and-deploy-spec.ko.md)
5. [launch-core-qa-checklist.ko.md](./launch-core-qa-checklist.ko.md)
6. [launch-core-slice0-execution-plan.ko.md](./launch-core-slice0-execution-plan.ko.md)

## Launch Core 범위 요약

### 포함

- `/` 공개 랜딩 페이지
- 공개 경로와 앱 경로 분리
- 기존 이메일/비밀번호 로그인, 회원가입 유지
- 실제로 동작하는 회원가입 및 도입 문의 CTA
- Vercel 배포
- 출시 차단용 QA 체크

### 제외

- Google 로그인
- Kakao 로그인
- OAuth callback 배포
- 로그인 제공자별 계정 연결 복잡도

## 이번 출시에서 고정된 결정

- 공개 헤더 액션은 `로그인`, `회원 가입`, `도입 문의`
- 랜딩 페이지의 기본 CTA 는 `회원 가입`
- `도입 문의` 는 실제 Google Form 으로 연결

## 읽는 순서 추천

1. 전체 방향은 [launch-core-plan.ko.md](./launch-core-plan.ko.md)
2. 구현 순서는 [launch-core-implementation-slices.ko.md](./launch-core-implementation-slices.ko.md)
3. 화면 구조는 [launch-core-information-architecture.ko.md](./launch-core-information-architecture.ko.md)
4. 인증/배포 조건은 [launch-core-auth-and-deploy-spec.ko.md](./launch-core-auth-and-deploy-spec.ko.md)
5. 최종 점검은 [launch-core-qa-checklist.ko.md](./launch-core-qa-checklist.ko.md)
6. Slice 0 상세 실행은 [launch-core-slice0-execution-plan.ko.md](./launch-core-slice0-execution-plan.ko.md)

## 원문 문서

영문 원문은 같은 폴더의 아래 파일들입니다.

- [README.md](./README.md)
- [launch-core-plan.md](./launch-core-plan.md)
- [launch-core-implementation-slices.md](./launch-core-implementation-slices.md)
- [launch-core-information-architecture.md](./launch-core-information-architecture.md)
- [launch-core-auth-and-deploy-spec.md](./launch-core-auth-and-deploy-spec.md)
- [launch-core-qa-checklist.md](./launch-core-qa-checklist.md)
- [launch-core-slice0-execution-plan.md](./launch-core-slice0-execution-plan.md)
