# EveryShift Phase2 PRD - 배포 및 운영 신뢰성 강화

## 문서 정보

- 버전: Phase2 Draft 1.0
- 작성일: 2026-03-25
- 목적: Phase1 MVP 이후 실제 병동 배포를 위한 기능 범위 정의
- 대상: 제품 기획, 설계, 구현, 파일럿 운영
- 전제: Phase1 근무표 생성 MVP는 완료되었으며, Phase2는 새 제품이 아니라 기존 제품의 배포 및 운영 레이어를 확장한다.

> 구현 동반 문서: [PHASE2_ENGINEERING_SPEC_KR.md](./PHASE2_ENGINEERING_SPEC_KR.md)

---

## 1. 문서 목적

이 문서는 다음 두 문서를 연결하기 위해 작성되었다.

- `PRD.md`: 근무표 생성 중심 Phase1 MVP 문서
- `REFINED_PRD_KR.md`: 실제 서비스 제공을 위해 필요한 확장 기능 아이디어 문서

Phase2의 목적은 단순히 기능을 추가하는 것이 아니다. 실제 병동이 EveryShift를 신뢰하고 도입할 수 있도록 다음을 제품 차원에서 완성하는 것이다.

1. 법적 하드 제약을 항상 지킨다는 신뢰
2. 공정성이 실제로 개선되었다는 증명
3. 반영되지 않은 요청과 생성 결과를 설명할 수 있는 운영 가능성
4. 병동 관리자 기준으로 실제 배포 가능한 온보딩 흐름

핵심 포지셔닝은 다음과 같다.

> EveryShift는 50명 이상 병동의 수간호사를 위해, 법적 제약과 사전 off 요청을 고려하면서 야간/주말 근무 편차를 줄이고 근무표 작성 시간을 단축하는 솔루션이다.

---

## 2. 제품 단계 정의

### 2.1 Phase1 현재 상태

Phase1은 다음 범위를 중심으로 구현이 완료되었다.

- 로그인
- 조직/시프트/직원 데이터 기반 근무표 생성 워크플로우
- Step 1~4 근무표 생성 및 수정
- 엑셀 내보내기
- off 관련 데이터 입력 기반 스케줄 생성

### 2.2 Phase1의 남은 빈틈

Phase1은 근무표를 생성할 수 있지만, 실제 병동 배포에는 다음 요소가 부족하다.

- 생성 결과에 대한 하드 제약 충족 증명
- 생성 불가능 사유 설명
- 미반영 off 요청 사유 설명
- 근무표안 간 비교 및 최종안 선택 근거
- 월별이 아닌 누적 관점의 공정성 관리
- 실제 배포를 위한 관리자 중심 초기 온보딩

### 2.3 Phase2 정의

Phase2는 다음 두 단계로 구분한다.

- `Phase2A: Go-Live Core`
  실제 병동 파일럿 및 초기 배포를 가능하게 하는 범위
- `Phase2B: Self-Serve & Scale`
  병원이 스스로 가입하고 운영할 수 있게 만드는 확장 범위

---

## 3. 제품 원칙

### 3.1 제약 우선순위

EveryShift는 모든 제약을 동일하게 다루지 않는다.

#### Hard Constraints

절대 위반할 수 없는 제약이다.

- 주 52시간 초과 근무 금지
- `NNN` 금지
- `NOD` 금지
- 최소 휴식 시간 위반 금지
- 필수 인력 미충족 금지

#### Soft Constraints

가능하면 만족시키되, Hard Constraints를 깨지 않는 범위에서 최적화한다.

- 직원별 off 요청
- 선호/비선호 근무
- 야간/주말/저녁 근무 편차 최소화
- 월별 및 누적 공정성 개선

#### Policy Constraints

운영 정책에 따라 조직이 설정하는 제약이다.

- 조직별 rank code 기준 월간 off 요청 한도
- 조직별 rank code 기준 연간 off 요청 한도
- 특정 근무 유형 허용 여부
- 특정 병동/직무별 추가 규칙

### 3.2 설명 가능성 원칙

사용자는 단순히 결과를 받아보는 것이 아니라, 아래 질문에 답을 얻어야 한다.

- 이 결과는 법적으로 안전한가?
- 왜 어떤 off 요청은 반영되지 않았는가?
- 왜 이 근무표안이 다른 후보안보다 더 적합한가?
- 이 달에 공정성이 완벽하지 않다면, 누적 관점에서 어떻게 보정되는가?

### 3.3 배포 원칙

첫 배포는 완전한 셀프서브 SaaS가 아니라 병동 파일럿 기준으로 정의한다.

- 첫 배포 목표: 수간호사 1~2명이 실제 월별 근무표를 생성하고 확정할 수 있어야 한다.
- 확장 목표: 병원이 스스로 가입하고 조직을 설정하고 운영할 수 있어야 한다.

---

## 4. Phase2A - Go-Live Core

Phase2A는 실제 병동 배포에 필요한 최소 범위다.

### 4.1 목표

- Phase1 기능을 실제 병동에서 사용할 수 있게 만든다.
- 결과의 신뢰성과 설명 가능성을 확보한다.
- 관리자 기준의 초기 온보딩을 완성한다.

### 4.2 Phase2A 내부 레이어 분리

Phase2A는 하나의 큰 묶음이 아니라 다음 두 레이어로 나누어 설계한다.

- `Phase2A-1: Trust Layer`
  수간호사가 생성 결과를 신뢰하고 설명하고 확정할 수 있게 만드는 레이어
- `Phase2A-2: Go-Live Ops Layer`
  실제 파일럿 운영을 시작하기 위한 최소 운영 준비 레이어

원칙:

- Trust Layer는 Go-Live Ops Layer와 분리해 정의한다.
- 첫 파일럿의 성공 여부는 Go-Live Ops Layer보다 Trust Layer 완성도에 더 직접적으로 좌우된다.
- Go-Live Ops Layer는 가능하면 Trust Layer 직후에 붙이되, 둘을 하나의 거대한 범위로 섞지 않는다.

### 4.3 Phase2A-1 - Trust Layer

#### Trust Layer 구현 고정 규칙

- 동일 월에는 복수의 근무표안(`schedule_version`)을 만들 수 있다.
- off 요청, 고정 배정, 정책, 입력 조건이 실질적으로 달라지면 새로운 근무표안으로 본다.
- 같은 근무표안 안에서 재생성, 수동 수정, 재검증은 revision 증가로 관리한다.
- evaluation은 `version + revision` 단위의 불변 스냅샷으로 저장한다.
- 백엔드 검증기가 저장된 assignments를 기준으로 hard constraint proof, 미반영 off 요청 설명, review 상태를 계산한다.
- `review_blocked`는 결과표가 존재하지만 하드 제약 위반이 발견된 상태다.
- `infeasible`는 현재 입력 조건으로 feasible schedule을 만들지 못한 상태다.
- `solve_failed`는 시스템/네트워크/통합 오류 상태다.

#### A. 하드 제약 충족 증명

생성 완료 후 시스템은 반드시 다음 결과를 보여줘야 한다.

- 주 52시간 위반 건수
- `NNN` 위반 건수
- `NOD` 위반 건수
- 최소 휴식 시간 위반 건수
- 필요 인력 미충족 건수

출력 원칙:

- 하드 제약 위반 0건이면 `충족` 상태로 표시
- 위반이 있으면 결과 확정을 막고 원인 목록 제공
- 증명 스냅샷은 선택한 근무표안의 현재 revision 기준으로 저장되어야 한다.
- 최종 확정은 선택한 근무표안의 현재 revision에 대해 생성된 최신 passed evaluation 기준으로만 이루어져야 한다.

#### B. 생성 불가능 사유 설명

해가 존재하지 않는 경우 시스템은 단순 실패가 아니라 이유를 설명해야 한다.

예시:

- 9월 14일 야간 근무 3명 필요
- 승인된 off 요청과 전일 근무 이력을 반영한 결과 가능한 인원은 2명
- Hard Constraints를 유지하면 해당 날짜 충족 불가

필수 출력 항목:

- 불가능 날짜
- 부족한 시프트
- 필요한 인원 수와 가능한 인원 수
- 주요 충돌 원인

분류 원칙:

- `infeasible`는 현재 입력 조건으로 feasible schedule을 만들지 못한 경우에만 사용한다.
- 결과표가 생성되었지만 NOD, 주52시간, minimum rest, staffing shortfall 등 하드 제약 위반이 발견되면 `infeasible`가 아니라 `review_blocked`로 분류한다.

#### C. 미반영 off 요청 사유 설명

off 요청은 Soft Constraint이므로, 미반영된 경우 반드시 사유를 제공한다.

필수 출력 항목:

- 직원명
- 요청 날짜
- 요청 내용
- 반영 상태
- 미반영 사유
- 대체 불가 이유 요약

#### D. 근무표안 비교 리포트

같은 대상 월에 대해 생성된 여러 근무표안을 비교하고, 그중 하나를 최종 확정 대상으로 선택한다. Step5 기본 화면은 현재 보는 결과 상세에 집중하고, 비교는 `근무표안 비교` modal에서만 연다.

비교 조건:

- 동일 조직/병동
- 동일 대상 월
- 각 근무표안의 변경 입력(off 요청, 고정 배정, 정책, 수동 수정 등)이 명시적으로 기록되어야 한다.
- 비교의 목적은 하나의 최종 확정 대상 근무표안을 선택하는 것이다.

비교 지표:

- 하드 제약 위반 건수
- off 요청 반영률
- 야간 근무 편차
- 주말 근무 편차
- rolling fairness 영향
- 수동 수정 건수
- 근무표안 간 변경 사항 요약

비고:

- Phase2A의 핵심 비교 기능은 수기 기준안 입력을 기본 전제로 하지 않는다.
- 수기 근무표와의 비교 리포트는 파일럿 운영 문서나 후속 기능으로 분리 가능하다.

#### E. 결과 확정 gate

- 하드 제약 위반이 1건 이상이면 결과 확정 불가
- infeasible 상태이면 결과 확정 불가
- 미반영 off 요청은 결과 확정을 막지 않지만, 사유를 반드시 확인 가능해야 한다.
- 운영자가 선택한 근무표안을 수동 수정한 경우 상태는 `review_pending`으로 전이되어야 하며, 증명 및 설명 결과를 다시 갱신해야 한다.
- 결과 확정은 선택한 근무표안의 최신 passed evaluation이 해당 근무표안의 현재 revision과 일치할 때만 가능해야 한다.
- 확정되지 않은 다른 근무표안은 비교 modal의 비교 대상으로 유지할 수 있어야 한다.

### 4.4 Phase2A-2 - Go-Live Ops Layer

> 범위 메모:
>
> - Phase2A-2의 완료 범위는 완전한 self-serve launch가 아니라 operator-assisted pilot go-live다.
> - 운영자 또는 내부 팀이 첫 파일럿 관리자 계정을 provision하고 초기 설정을 도울 수 있다.
> - 이 단계에서 브라우저 사용자는 조직을 직접 생성하거나, 본인을 초대하거나, 본인에게 접근 권한을 부여하지 않는다.
> - `site_requirements`는 schedule generation의 canonical staffing source로 유지한다. `sites`는 파일럿 메타데이터와 active site 선택을 보조할 수 있지만, Phase2A-2는 staffing source를 `site_staffing_requirements`로 migration하지 않는다.

#### A. 관리자 bootstrap 및 초기 운영 설정

- 운영자 또는 내부 팀이 첫 관리자 계정을 provision할 수 있어야 한다.
- 관리자 로그인
- 조직 기본 정보 입력/확인
- 병동/사이트 정보 입력
- 직원 등록 및 엑셀 업로드
- 시프트 및 제약 조건 설정

비고:

- 첫 배포에서는 `일반 직원 셀프 회원가입` 없이 운영 가능하다.
- 필요 시 운영자가 초기 데이터를 직접 세팅하는 assisted pilot 방식 허용
- 여기서 말하는 bootstrap은 Phase2B의 셀프 회원가입 및 승인 플로우와 구분한다.

#### B. off 요청 정책 관리

- 직원별 off 요청 입력
- 월간 off 요청 한도 관리
- 연간 off 요청 누적 관리
- 조직별 rank code 기준 off 요청 한도 정책 설정
- 반영된 요청 / 미반영된 요청 상태 표시

비고:

- rank는 조직별 코드로 관리하며, 조직에 rank 체계가 없을 수도 있다.
- rank가 없는 조직은 조직 공통 기본 정책으로 동작해야 한다.

#### C. rolling fairness ledger

공정성은 단일 월이 아니라 누적 기준으로 관리한다.

- 최근 3개월 N/E/주말 근무 누적
- 최근 6개월 N/E/주말 근무 누적
- 최근 12개월 N/E/주말 근무 누적
- 운영자 검토를 위한 read-only 누적 fairness 요약

비고:

- rolling fairness ledger는 확정 근무표안 기준으로만 적재한다.
- draft 상태, review 중인 근무표안, compare 전용 후보안은 ledger를 오염시키면 안 된다.
- Phase2A-2는 finalized-only ledger write와 read-only aggregate 요약까지만 포함한다.
- rolling fairness 이력을 solver 최적화에 반영하는 작업은 후속 단계로 분리한다.

#### D. 파일럿 운영 진입 가이드

- 첫 로그인 후 운영자가 무엇을 어떤 순서로 해야 하는지 안내
- 조직 정보 확인
- 직원 등록 유도
- 첫 스케줄 요청 유도

비고:

- Phase2A에서는 guided checklist 수준이면 충분하다.
- 완전한 self-serve onboarding wizard는 Phase2B 범위로 본다.

#### E. Phase2A-2 Assisted Pilot 범위와 Deferred 항목

아래 항목은 누락된 요구사항이 아니다. Phase2A-2를 operator-assisted pilot go-live로 제한하기 위해 의도적으로 후속 단계로 분리한 범위다.

| 항목                                                                       | Phase2A-2에서 제외한 이유                                                                                            | 다음 단계 방향                                                                                          |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| rolling fairness context의 solver 반영                                     | Phase2A-2는 finalized-only ledger 기록과 read-only 요약까지만 포함하며, 해당 이력으로 solver 동작을 튜닝하지 않는다. | pilot 사용에서 ledger 무결성과 finalized history 의미가 검증된 뒤 다시 연다.                            |
| `site_requirements`에서 `site_staffing_requirements`로 canonical migration | 파일럿 설정 중 staffing source를 전환하면 schedule generation 입력이 중복될 위험이 있다.                             | multi-site 또는 더 풍부한 staffing model이 새 canonical source를 요구할 때만 검토한다.                  |
| reopen/unfinalize 또는 fairness correction workflow                        | Phase2A-2는 finalized month를 read-only로 유지하고 Trust Layer finalization lifecycle을 바꾸지 않는다.               | finalized schedule을 다시 열기 전에 reversal semantics, audit trail, ledger correction rule을 정의한다. |
| self-signup 또는 invite-driven onboarding                                  | assisted pilot launch는 operator-provisioned access로 운영 가능하며 self-serve acquisition flow가 필요하지 않다.     | 병원이 직접 조직과 사용자를 생성해야 하는 시점에 Phase2B self-serve onboarding으로 옮긴다.              |
| approval queue semantics                                                   | assisted pilot 범위에는 end-user approval queue가 없다.                                                              | self-signup, invite acceptance, organization membership request가 생길 때 추가한다.                     |
| membership-based auth rewrite                                              | assisted pilot 운영에는 기존 organization-scoped access가 충분하다.                                                  | multi-organization membership, invite flow, organization별 role assignment가 필요해질 때 재검토한다.    |
| full RBAC                                                                  | Phase2A-2에는 좁은 operator/admin access가 필요하며 완전한 permission matrix는 필요하지 않다.                        | Phase2B scale-up에서 super/admin/user role과 multi-organization administration 요구에 맞춰 확장한다.    |
| advanced operations dashboard 또는 analytics                               | Phase2A-2에는 guided readiness checklist가 필요하며 넓은 analytics surface는 필요하지 않다.                          | pilot metric을 통해 반복적으로 답해야 할 운영 질문이 확인된 뒤 만든다.                                  |
| 모든 Phase2B self-serve feature                                            | Phase2B는 assisted pilot go-live와 분리된 self-serve 및 scale-up 단계다.                                             | pilot blocker로 명확히 입증되지 않는 한 Phase2B에 유지한다.                                             |

### 4.5 Phase2A 성공 기준

Trust Layer 기준:

- 하드 제약 위반 0건
- 후보안 간 비교 시 선택한 근무표안의 장단점을 운영자가 이해하고 선택할 수 있음
- 미반영 off 요청에 대해 운영자가 납득 가능한 설명 제공
- 결과 확정 전에 증명 및 설명 결과를 확인할 수 있음

Go-Live Ops Layer 기준:

- 관리자 1~2명이 초기 설정을 마치고 월별 생성 플로우에 진입할 수 있음
- 수간호사 기준 작성/수정 시간 6시간에서 30분 수준으로 감소
- 실제 병동 파일럿에서 월별 생성과 확정이 가능

### 4.6 Phase2A 산출물

Trust Layer 산출물:

- 하드 제약 충족 증명 화면
- 생성 불가능 사유 화면
- 미반영 off 요청 사유 화면
- 근무표안 비교 리포트
- 결과 확정 gate

Go-Live Ops Layer 산출물:

- 병동 운영 가능 버전 배포
- 관리자 bootstrap 및 파일럿 운영 진입 가이드
- off 요청 정책 관리 화면
- rolling fairness 기반 누적 공정성 데이터 구조

### 4.7 Engineering-ready 구현 규칙

#### A. 핵심 엔터티

- 하나의 대상 월은 하나의 schedule container로 관리한다.
- 하나의 schedule container 아래에 여러 근무표안이 존재할 수 있다.
- 각 근무표안은 여러 revision을 가질 수 있다.
- evaluation은 `version + revision` 단위로 저장되는 불변 검토 기록이다.

#### B. 상태 수명주기

```text
draft
-> solving
-> review_ready | review_blocked | infeasible | solve_failed

review_ready
-> finalized

review_ready
-> review_pending
-> review_ready | review_blocked
```

- `review_ready`: 현재 revision 기준 최신 evaluation이 passed
- `review_blocked`: 결과표는 있으나 하드 제약 위반 존재
- `review_pending`: 수동 수정 후 재검증 대기
- `infeasible`: 현재 입력 조건으로 feasible schedule 생성 불가
- `solve_failed`: 시스템 오류

#### C. finalization 규칙

- finalization은 월 전체가 아니라 선택한 근무표안 단위로 수행한다.
- finalization은 `선택한 근무표안 + current revision + latest passed evaluation`이 모두 일치할 때만 허용한다.
- finalized 상태의 근무표안만 운영 확정본으로 간주하며, rolling fairness ledger 적재도 finalized 상태의 근무표안 기준으로 수행한다.

#### D. compare 규칙

- 비교의 기본 단위는 수기 기준안이 아니라 근무표안이다.
- Step5 기본 화면에는 비교 화면을 항상 표시하지 않고, `근무표안 비교` modal에서 근무표안 간 입력 차이와 결과 차이를 함께 보여준다.
- 운영자는 비교 후 하나의 근무표안을 선택해 finalization해야 한다.

---

## 5. Phase2B - Self-Serve & Scale

Phase2B는 서비스 확장 단계다.

### 5.1 목표

- 병원이 스스로 가입하고 운영할 수 있게 한다.
- 관리자/직원/조직 단위 운영 기능을 확장한다.
- 멀티조직 및 타 산업 확장을 준비한다.

### 5.2 기능 범위

#### A. 회원가입 및 승인 플로우

- 관리자 셀프 회원가입
- 직원 셀프 회원가입
- 조직 선택 및 승인 흐름
- super/admin/user 권한별 승인 체계

#### B. 신규 조직 셀프 온보딩

- 관리자 최초 로그인 시 온보딩 wizard
- 조직 정보 확인
- 직원 등록 유도
- 첫 스케줄 요청 유도

#### C. 운영 대시보드

- 직원별 야간/주말 근무 현황
- 기간별 fairness 추이
- 미반영 off 요청 현황
- 병동별 스케줄 상태
- 필터 및 Excel/CSV export

#### D. 알림 시스템

- 승인/반려 알림
- 생성 완료 알림
- 운영 공지 알림
- 알림 수신 설정

#### E. 고도화된 권한 및 조직 관리

- 멀티조직 관리
- super/admin/user별 권한 정교화
- 조직/직원 관리 UI 고도화

#### F. 산업 확장

- 병원 외 소방/경찰/공장 도메인 확장
- 도메인별 근무 유형 및 정책 모델 확장

### 5.3 Phase2B는 첫 배포 필수가 아니다

Phase2B는 제품 확장에 중요하지만, 첫 병동 배포의 블로커로 간주하지 않는다.

---

## 6. 근무표안 비교 리포트 템플릿

다음 리포트는 실제 병동 파일럿에서 기본적으로 제공되어야 한다.

### 6.1 리포트 목적

- 동일 월에 대해 생성한 여러 근무표안 중 어떤 안을 확정할지 선택 근거 제공
- 공정성, 요청 반영률, 하드 제약 상태를 근무표안 단위로 비교

### 6.2 리포트 템플릿

#### 기본 정보

- 대상 조직:
- 대상 병동:
- 대상 월:
- 비교 목적:
  - 동일 월 근무표안 비교
  - 최종 확정 대상 선택

#### 후보안 요약

| 근무표안 | 생성 방식 | 입력 변경 요약      | 평가 상태      | 확정 가능 여부 |
| -------- | --------- | ------------------- | -------------- | -------------- |
| 1안      | 초기 생성 | 기본 off 요청 기준  | review_ready   | 가능           |
| 2안      | 재생성    | 일부 off 요청 조정  | review_ready   | 가능           |
| 3안      | 재생성    | 필요 인원 요구 수정 | review_blocked | 불가           |

#### 비교 요약

| 지표                | 1안   | 2안   | 3안   | 선택안 |
| ------------------- | ----- | ----- | ----- | ------ |
| 하드 제약 위반 건수 | 0     | 0     | 2     | 2안    |
| off 요청 반영률     | 72%   | 81%   | 79%   | 2안    |
| 야간 근무 최소/최대 | 0 / 7 | 4 / 5 | 3 / 6 | 2안    |
| 주말 근무 최소/최대 | 1 / 6 | 3 / 4 | 2 / 5 | 2안    |
| 수동 수정 건수      | 0건   | 1건   | 0건   | 2안    |

#### 입력 차이 상세

| 근무표안 | 변경된 off 요청 | 변경된 정책 | 변경된 고정 배정 | 비고          |
| -------- | --------------- | ----------- | ---------------- | ------------- |
| 1안      | 없음            | 없음        | 없음             | 초기안        |
| 2안      | 2건 조정        | 없음        | 없음             | 요청 현실화   |
| 3안      | 없음            | 1건 변경    | 없음             | staffing 실험 |

#### 해석 요약

- 운영자는 근무표안 간 입력 차이와 결과 차이를 함께 보며 최종 확정 대상을 선택한다.
- `review_blocked` 근무표안은 비교 대상에는 남길 수 있으나 finalization 대상이 될 수 없다.
- 선택한 근무표안은 최신 passed evaluation 기준으로만 finalization 가능하다.

---

## 7. 미반영 off 요청 사유 설명 포맷

### 7.1 목적

- 사용자가 결과를 신뢰할 수 있도록 설명 제공
- “왜 안 되었는가”를 운영자가 직원에게 설명할 수 있게 지원

### 7.2 포맷

| 직원 | 날짜       | 요청 | 상태   | 미반영 사유                                                                                  | 비고             |
| ---- | ---------- | ---- | ------ | -------------------------------------------------------------------------------------------- | ---------------- |
| 김OO | 2026-09-18 | Off  | 미반영 | 해당 날짜 N근무 최소 인원 충족이 우선이며, 대체 가능한 인원은 모두 휴식/주52시간 제약에 걸림 | 재조정 후보 없음 |

### 7.3 상세 설명 템플릿

```text
[직원명]의 [날짜] off 요청은 반영되지 않았습니다.
이유: [핵심 충돌 요약].
세부 설명:
- 해당 날짜 필요한 [시프트] 인원: [숫자]
- 배정 가능한 대체 인원: [숫자]
- 제외된 주요 사유: [휴식 제약 / 주52시간 / 전일 야간 / skill 부족 / rank 부족]
결론: Hard Constraints를 유지하는 범위에서 본 요청은 이번 달 배정안에 반영할 수 없습니다.
```

---

## 8. 배포 전략

### 8.1 1차 배포 목표

첫 배포는 `Phase2A 완료 시점`으로 본다.

배포 기준:

- 병동 관리자가 직접 로그인할 수 있다.
- 조직 및 직원 데이터를 입력/업로드할 수 있다.
- off 요청을 입력하고 결과를 생성할 수 있다.
- 생성 결과가 법적으로 안전하다는 증명을 볼 수 있다.
- 미반영 요청과 개선 결과를 확인할 수 있다.

### 8.2 2차 배포 목표

`Phase2B` 완료 이후에는 셀프서브 도입 및 확장 운영을 목표로 한다.

---

## 9. 구현 우선순위

### Priority 1

- Trust Layer 전체
- 하드 제약 충족 증명
- 생성 불가능 사유 설명
- 미반영 off 요청 사유 설명
- 근무표안 비교 리포트
- 결과 확정 gate

### Priority 2

- Go-Live Ops Layer 전체
- 관리자 bootstrap 및 파일럿 운영 진입 가이드
- off 요청 한도 정책
- rolling fairness ledger

### Later

- 셀프 회원가입 및 승인 플로우
- 관리자용 운영 대시보드
- 알림
- 조직/권한 고도화
- 타 산업 확장

---

## 10. 오픈 이슈

- rolling fairness 점수를 어떤 수식으로 계산할 것인가
- 근무표안 비교에서 어떤 입력 차이(diff)를 기본 표시 항목으로 고정할 것인가
- 월간/연간 off 요청 한도를 조직별 rank code 기준으로 어떻게 운영할 것인가
- 불가능한 달의 경우 대안 스케줄안을 몇 개까지 제공할 것인가
- 실제 병동 파일럿에서 가장 중요한 구매 지표를 무엇으로 고정할 것인가

---

## 11. 결론

Phase2는 새 제품이 아니다. Phase1 MVP를 병원이 실제로 도입 가능한 제품으로 바꾸는 단계다.

- Phase2A는 배포 필수 기능
- Phase2B는 확장 필수 기능

EveryShift의 핵심 차별점은 다음과 같이 유지한다.

1. 법적 하드 제약 100% 준수
2. 누적 기준의 공정성 개선
3. 결과와 미반영 요청에 대한 설명 가능성
4. 수간호사의 작성/수정 시간 절감
