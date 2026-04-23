# Launch Core 정보 구조 문서

> 원문 기준 문서: [launch-core-information-architecture.md](./launch-core-information-architecture.md)
> 관련 계획 문서: [launch-core-plan.ko.md](./launch-core-plan.ko.md)

## 목표

공개 진입 화면과 로그인 후 작업 화면을 명확히 분리합니다.

이 분리가 중요한 이유:

- 검색 유입과 SEO 대응이 쉬워집니다.
- 사용자가 제품 구조를 더 빨리 이해합니다.
- 라우팅이 더 안전해집니다.
- `/` 와 `/app` 의 역할이 헷갈리지 않습니다.

## 전체 라우트 맵

| 경로                                | 대상 사용자   | 목적                 |
| ----------------------------------- | ------------- | -------------------- |
| `/`                                 | 공개 사용자   | 랜딩 페이지          |
| `/login`                            | 공개 사용자   | 로그인               |
| `/signup`                           | 공개 사용자   | 관리자 우선 회원가입 |
| `/access/pending`                   | 로그인 사용자 | 승인 대기 상태 안내  |
| `/access/rejected`                  | 로그인 사용자 | 승인 거절 상태 안내  |
| `/app`                              | 로그인 사용자 | 앱 홈                |
| `/app/home/user`                    | 일반 사용자   | 제한 사용자 홈       |
| `/app/admin/approval-queue`         | Super         | 가입 승인 대기열     |
| `/app/ops/organization-setup`       | Admin         | 조직 운영 기본 설정  |
| `/app/ops/off-request-policy-setup` | Admin         | 오프요청 정책 설정   |
| `/app/schedule/step1`               | Admin         | 스케줄 생성 시작     |
| `/app/schedule/step2`               | Admin         | 사이트 정보 입력     |
| `/app/schedule/step3`               | Admin         | 직원 준비            |
| `/app/schedule/step4`               | Admin         | 초기 데이터 입력     |
| `/app/schedule/step5/:scheduleKey`  | Admin         | 결과 검토 허브       |

## 공개 경로 규칙

- `/` 는 로그인 없이 읽을 수 있어야 합니다.
- 비로그인 사용자가 `/` 에 들어왔을 때 앱 셸로 보내면 안 됩니다.
- 이미 로그인된 활성 사용자가 `/` 에 들어오면 `/app` 으로 보내야 합니다.
- 검색에 노출될 내용은 공개 경로에 있어야 합니다.
- 공개 레이아웃에 앱 네비게이션이 섞이면 안 됩니다.

## 로그인 후 리다이렉트 규칙

| 접근 상태                   | 이동 경로                   |
| --------------------------- | --------------------------- |
| `super_active`              | `/app/admin/approval-queue` |
| `admin_active`              | `/app`                      |
| `user_active`               | `/app/home/user`            |
| `admin_pending`             | `/access/pending`           |
| `admin_rejected`            | `/access/rejected`          |
| `no_membership_or_inactive` | `/login`                    |

설명:

- 이 표는 로그인 완료 후 이동과, 로그인된 사용자가 인증 페이지에 접근했을 때의 이동 기준입니다.
- 별도로 `/` 규칙도 유지합니다. 즉, 활성 사용자가 공개 루트(`/`)에 오면 `/app` 으로 보내야 합니다.

## 레거시 리다이렉트 호환

첫 공개 출시 기간에는 예전 앱 URL 도 새 canonical `/app` 경로로 연결되어야 합니다.

| 예전 경로                       | 새 경로                             |
| ------------------------------- | ----------------------------------- |
| `/admin/approval-queue`         | `/app/admin/approval-queue`         |
| `/home/user`                    | `/app/home/user`                    |
| `/ops/organization-setup`       | `/app/ops/organization-setup`       |
| `/ops/off-request-policy-setup` | `/app/ops/off-request-policy-setup` |
| `/schedule/step1`               | `/app/schedule/step1`               |
| `/schedule/step2`               | `/app/schedule/step2`               |
| `/schedule/step3`               | `/app/schedule/step3`               |
| `/schedule/step4`               | `/app/schedule/step4`               |
| `/schedule/step5/:scheduleKey`  | `/app/schedule/step5/:scheduleKey`  |

이 리다이렉트는 선택이 아니라 Launch Core 범위에 포함됩니다. 현재 코드, 테스트, 저장된 북마크가 아직 예전 경로를 사용하고 있기 때문입니다.

## 공개 헤더 구조

권장 구조:

- `EveryShift`
- `로그인`
- `회원 가입`
- `도입 문의`

규칙:

- 오른쪽 액션 순서는 반드시 `로그인` -> `회원 가입` -> `도입 문의`
- `회원 가입` 은 `/signup?role=admin`
- `도입 문의` 는 실제 Google Form
- 맥락 없이 `시작하기`, `문의하기` 같은 모호한 문구로 바꾸지 않습니다.

## 랜딩 페이지 구조

```text
Public Header
  ├─ 브랜드: EveryShift
  └─ 액션: 로그인 | 회원 가입 | 도입 문의

Hero
  ├─ 제품 정체성
  ├─ 한 줄 가치 제안
  ├─ 기본 액션: 회원 가입
  └─ 보조 액션: 도입 문의

Workflow Summary
  ├─ 기본 정보
  ├─ 사이트 정보
  ├─ 직원 정보
  ├─ 초기 데이터
  └─ 결과 확인 / 수정 / 내보내기

Trust Signals
  ├─ 보호된 `/app` 작업 공간
  ├─ 관리자 승인 절차
  └─ 실제 공개 베타 운영 상태

Inquiry Reinforcement
  └─ 소개 자료 / 무료 사용 / 기타 문의 경로
```

## 라우트 트리 소유 구조

```text
/
├─ 공개 랜딩
├─ /login
├─ /signup
├─ /access/pending
├─ /access/rejected
└─ /app
   └─ DefaultLayout
      ├─ dashboard
      ├─ approval queue
      ├─ user home
      ├─ ops setup
      └─ schedule steps
```

규칙:

- `DefaultLayout` 은 `/app` 아래에서만 마운트됩니다.
- 공개 경로와 접근 상태 경로는 앱 셸 밖에 있어야 합니다.
- `/app` 아래 child route 는 상대 경로를 써서 레이아웃 경계를 분명하게 유지합니다.

## CTA 동작 맵

| 위치   | 라벨        | 목적지               | 역할                         |
| ------ | ----------- | -------------------- | ---------------------------- |
| Header | `로그인`    | `/login`             | 기존 사용자 진입             |
| Header | `회원 가입` | `/signup?role=admin` | 신규 관리자 신청             |
| Header | `도입 문의` | Google Form          | 소개 / 무료 사용 / 기타 문의 |
| Hero   | `회원 가입` | `/signup?role=admin` | 기본 전환 경로               |
| Hero   | `도입 문의` | Google Form          | 보조 전환 경로               |

## 외부 문의 경로

Google Form 은 내부 라우트가 아닙니다.

공개 CTA 와 연결된 외부 목적지로 취급합니다.

- 목적지 유형: 외부 폼
- 진입 위치: 헤더 `도입 문의`, 히어로 보조 CTA
- 목적: 소개 요청, 한 달 무료 사용 요청, 기타 문의

## 모바일 IA 규칙

- 브랜드는 왼쪽 위에 유지
- 액션 메뉴는 오른쪽 위에 유지
- `로그인`, `회원 가입`, `도입 문의` 는 모바일 메뉴 안에서도 1차 액션으로 보여야 합니다.
- `도입 문의` 를 모바일에서 푸터 안에만 숨기면 안 됩니다.
- 히어로 CTA 순서는 모바일에서도 `회원 가입` 먼저, `도입 문의` 나중입니다.

## 앱 사이드바

### Super

- `대시보드`
- `가입 승인`
- `운영 기본 설정`
- `직원 준비`
- `근무표 생성`

### Admin

- `대시보드`
- `운영 기본 설정`
- `직원 준비`
- `근무표 생성`

### User

- `내 홈`

## 핵심 IA 규칙

`/` 는 제품 소개용입니다.

`/app` 은 실제 업무용입니다.

Launch Core 에서는 이 둘을 다시 섞지 않습니다.
