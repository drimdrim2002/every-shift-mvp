# Phase2A Slice1~5 UI 테스트 시나리오

작성 기준일: 2026-03-28  
적용 범위: 현재 저장소 구현 기준 (`src/router/index.ts`, `src/views/**/*`, `tests/e2e/*`, `tests/unit/*`)

> 용어 주의  
> 기존 문서/테스트에 남아 있는 legacy 표현인 `Step4 결과 화면`은 현재 구현 기준으로 `Step5 결과 화면`을 의미한다.  
> 현재 라우트는 `Step4 = /schedule/step4`, `Step5 = /schedule/step5/:id?version=<previewVersionId>` 이다.

## 0. 현재 기준 UI/라우트 요약

| 구분     | 실제 라우트                        | 현재 화면/카드 제목 또는 핵심 텍스트                                           |
| -------- | ---------------------------------- | ------------------------------------------------------------------------------ |
| 로그인   | `/login`                           | `EveryShift 로그인` / `로그인`                                                 |
| 대시보드 | `/`                                | `근무표 관리` / `새 근무표 생성`                                               |
| Step1    | `/schedule/step1`                  | `근무표 생성 - 기본 정보 설정`                                                 |
| Step2    | `/schedule/step2`                  | `근무표 생성 - 요일별 인력 설정`                                               |
| Step3    | `/schedule/step3`                  | `근무표 생성 - 직원 정보 입력`                                                 |
| Step4    | `/schedule/step4`                  | 상단 StepIndicator `근무 제외 정보`, 본문 헤더 `YYYY-MM월 근무 조정 일정 입력` |
| Step5    | `/schedule/step5/:id?version=<id>` | `근무표 생성 - 결과 확인`                                                      |

## 1. 테스트 목적과 범위

### 1.1 왜 지금 Slice1~5 UI 검증이 필요한가

Phase2A Slice1~5는 “버전 인지형 생성 플로우”의 최소 동작을 이미 UI에서 밟을 수 있게 만든 구간이다. 특히 지금 시점에는 아래 항목이 깨지면 이후 Slice6/7 검증도 의미가 없어지므로, 지금 UI 기준으로 먼저 고정 확인이 필요하다.

- 로그인 후 올바른 조직 컨텍스트로 진입하는지
- 대시보드에서 월을 선택하고 Step1로 진입하는 흐름이 정상인지
- Step4에서 `ensure + bootstrap V1 + version-scoped preferences save`가 일어나는지
- Step5가 `scheduleId + preview version query` 기반으로 열리는지
- Step5에서 `draft -> solving -> solved/review_pending` 흐름, 수동 수정, 저장, 재생성, 취소가 현재 구현대로 동작하는지
- 새로고침/재진입 시 wizard context와 preview query가 현재 규칙대로 복원/정규화되는지

### 1.2 이번 문서에 포함되는 범위

- 로그인 화면과 인증 성공/실패
- 대시보드 진입, 목록 확인, 새 근무표 생성 시작
- Step1 시프트 확인/수정/저장
- Step2 요일별 인력 저장
- Step3 직원 직접 입력/엑셀 업로드/저장/다음 단계 분기
- Step4 baseline version 확보, 근무 불가(O) 입력, 코멘트 저장, DB 재불러오기, Step5 이동
- Step5 draft / solving / solved / manual edit / save / regenerate / cancel
- 대시보드에서 기존 근무표 재진입
- 잘못된 `version` query 처리
- 현재 구현 기준 `localStorage` 관련 복원/정리 규칙

### 1.3 이번 문서에 포함되지 않는 범위

아래 항목은 현재 구현/범위상 이번 문서에서 본격 검증 대상으로 삼지 않는다.

- Step5 compare surface 완성형 UI
- explicit select CTA
- review hub 완성형 레이아웃
- proof / off-request 탭 완성도
- recheck / finalize / finalization gate
- stale finalize guard
- finalized version 재오픈 UI
- manual baseline import

### 1.4 Slice6/7 이후 검증으로 미루는 항목

- `review_ready`, `review_blocked`, `infeasible`, `finalized` 상태를 실제 평가 근거와 함께 검증하는 시나리오
- selected version 전환 UI와 compare history 탐색 UI
- recheck/finalize 버튼 및 proof summary 기반 검증
- “review hub” 완성형 상단 compare bar 및 명시적 선택 CTA

## 2. 테스트 환경 원칙

### 2.1 개발 DB는 1개만 사용

이번 검증은 별도 QA DB를 만들지 않고 현재 개발 DB 1개를 사용한다. 대신 계정과 조직을 분리해서 충돌을 줄인다.

### 2.2 테스트 전용 계정 + 테스트 전용 조직으로 분리

원칙은 아래와 같다.

- 실제 개발/데모에 쓰는 기본 조직을 재사용하지 않는다.
- QA 전용 Supabase 계정을 만든다.
- QA 전용 조직 1개를 만들고, 해당 계정은 그 조직만 바라보게 한다.
- 가능하면 QA 담당자별로 계정을 분리하되, 같은 조직을 공유해야 한다면 월 슬롯을 분리한다.

이렇게 해야 하는 이유:

- 대시보드의 “새 근무표 생성”은 `organization_id + month` 중복을 막는다.
- Step3 저장은 같은 조직/월의 기존 `schedules`를 삭제하려고 시도한다.
- Step5의 `더 개선하기`는 기존 schedule container 아래에 candidate version을 추가한다.
- Step5의 `근무표 취소`는 현재 월 assignment를 삭제한다.
- store의 wizard context는 사용자 단위 localStorage key를 사용한다.

즉, 같은 조직과 같은 월을 여러 사람이 동시에 쓰면 “누가 만든 기준 schedule인지”, “어느 preview version을 보고 있는지”, “누가 지웠는지”가 쉽게 섞인다.

### 2.3 충돌 회피 원칙

- 같은 조직에서 동시에 같은 월을 테스트하지 않는다.
- destructive 시나리오(삭제, 취소, regenerate)는 전용 월에서만 수행한다.
- 계정 전환 전에는 localStorage를 정리한다.
- 같은 QA 세션에서 한 번 정한 테스트 월 체계를 끝까지 유지한다.

### 2.4 테스트 월 운영 규칙 (`M0/M1/M2`)

권장 규칙:

- `M0`: baseline / 재진입 / invalid query / localStorage 복원 확인용
- `M1`: Step1~5 기본 생성/수정/저장 회귀용
- `M2`: regenerate / cancel 같은 파괴적 시나리오 전용

예시:

- 기준 월을 `2026-04`로 잡으면
- `M0 = 2026-04`
- `M1 = 2026-05`
- `M2 = 2026-06`

운영 원칙:

- `M0`는 가능하면 “기준 상태 확인” 전용으로 유지한다.
- `M1`은 반복 회귀용이므로 테스트 후 대시보드에서 결과를 검토할 수 있게 남겨도 된다.
- `M2`는 취소/삭제/재생성 검증 후 다시 비워지는 것을 허용한다.

## 3. 테스트 데이터 준비 가이드

### 3.1 테스트 조직 생성 기준

테스트 조직은 아래 조건을 만족해야 한다.

- `organizations`에 고유한 QA 전용 row가 있어야 한다.
- 조직 유형은 현재 UI에서 가장 많이 쓰는 `hospital` 권장
- 조직명은 대시보드/Step1 상단에서 바로 식별되도록 `QA 병동 A`, `QA 병동 B` 같이 명확히 지정

### 3.2 테스트 계정 생성 기준

- 로그인 가능한 이메일/비밀번호 계정 1개 이상 준비
- 계정 이름보다 중요한 것은 `organization_id` metadata가 정확히 들어가는 것
- 다계정 테스트가 필요하면 “같은 조직용 계정”과 “다른 조직용 계정”을 분리 준비

### 3.3 `organization_id` metadata 연결 원칙

현재 구현상 프런트와 백엔드의 metadata 읽기 순서가 완전히 같지 않을 수 있으므로, 아래 원칙을 강제한다.

- `app_metadata.organization_id`와 `user_metadata.organization_id`에 **같은 UUID**를 넣는다.
- 둘 중 하나만 넣지 말고 둘 다 맞춘다.
- 테스트 시작 전 현재 로그인 계정이 가리키는 조직과 대시보드에 보이는 조직명이 일치하는지 확인한다.

이 원칙이 중요한 이유:

- 프런트의 organization resolution은 `user_metadata -> app_metadata`도 읽는다.
- Phase2 edge function auth는 `app_metadata -> user_metadata` 순으로 읽는다.
- 두 값이 다르면 UI는 A 조직을, 서버 함수는 B 조직을 보는 불일치가 생길 수 있다.

### 3.4 shifts / employees / site requirements 준비 기준

#### shifts

최소 준비 권장:

- `D`: 시간 있음
- `E`: 시간 있음
- `N`: 시간 있음
- `O`: 시간 없음

주의:

- Step1 테이블과 Step2는 시간 정보가 있는 시프트만 실질적으로 사용한다.
- Step2는 `O`를 제외한 시프트만 표시한다.
- 따라서 Step2 검증 기준 데이터는 사실상 `D/E/N` 3개가 핵심이다.

#### employees

권장 고정 패턴:

- 10명 이상 준비
- `employee_id`: `QA001` ~ `QA010` 같은 고정값
- `name`: `QA간호사01` ~ `QA간호사10`
- `available_shifts`: 현재 Step3 UI 기본값에 맞춰 `D/E/N` 권장

보강 패턴:

- 30명 구성은 grid scale smoke 용도로 별도 유지 가능
- 다만 기본 Slice1~5 회귀는 10명 고정 세트가 더 빠르고 재현성이 좋다

#### site requirements

권장 고정 패턴:

- 7일 x 3시프트(`D/E/N`) = 21행
- 모두 1~3명 수준의 작은 값으로 고정
- 월요일만 다른 값으로 두어 저장/재로딩 차이를 눈으로 확인하기 쉽게 한다

예시 패턴:

| 요일 | D   | E   | N   |
| ---- | --- | --- | --- |
| 월   | 2   | 1   | 1   |
| 화   | 1   | 1   | 1   |
| 수   | 1   | 1   | 1   |
| 목   | 1   | 1   | 1   |
| 금   | 2   | 1   | 1   |
| 토   | 1   | 1   | 1   |
| 일   | 1   | 1   | 1   |

### 3.5 고정 테스트 데이터 패턴

반복 회귀에서는 아래 패턴을 유지한다.

- 시프트: `D/E/N/O`
- 직원: `QA001`~`QA010`, 이름 고정
- Step4 off request 샘플:
  - `QA001` / 당월 1일 = `O`
  - `QA002` / 당월 2일 = `O` + 코멘트 `교육`
- Step5 수동 편집 샘플:
  - 첫 번째 직원, 당월 첫 날짜 셀을 `D -> E` 또는 `E -> N`으로 변경

이 패턴을 고정해야 하는 이유:

- Step4 저장/복원 확인이 쉬워진다.
- Step5 수동 저장 후 어떤 셀이 바뀌었는지 눈으로 검증하기 쉽다.
- Playwright 자동화에서 fixture를 재사용하기 쉽다.

### 3.6 각 테스트 전에 정리할 항목

테스트 시작 전 체크리스트:

1. 대상 계정이 QA 전용 계정인지 확인
2. 대상 조직이 QA 전용 조직인지 확인
3. 이번 시나리오에 사용할 월(`M0/M1/M2`)이 비어 있는지 확인
4. 대상 월의 기존 schedule card가 남아 있으면 삭제하거나 재사용 여부를 명확히 결정
5. 계정 전환 직후라면 wizard context localStorage를 비움
6. 브라우저에 남아 있는 이전 테스트 메시지/모달 상태를 초기화

### 3.7 localStorage 정리 규칙

현재 구현 기준으로 확인할 대상 key는 아래다.

- `everyshift_wizard_context_v2:<userId>`
- `everyshift_temp_preferences_<YYYY-MM>`
- `everyshift_temp_schedule_<YYYY-MM>`  
  현재 UI에서는 적극 복원 경로가 연결되어 있지 않은 legacy/보조 성격 key로 본다.

중요 구분:

- 실제 “재진입 복원”의 1차 소스는 `everyshift_wizard_context_v2:<userId>` 이다.
- Step4의 `everyshift_temp_preferences_<month>`는 현재 구현에서 자동 저장은 되지만, Step4 최초 복원 시 직접 읽는 소스는 아니다.
- Step4 재진입 시 preference는 우선 `getScheduleVersionPreferences(previewVersionId)`로 DB에서 다시 읽는다.

정리 원칙:

- 계정 전환 전: `everyshift_wizard_context_v2:<oldUserId>` 삭제
- 월 전환 전: 대상 월의 `everyshift_temp_preferences_<month>` 삭제
- legacy 충돌 방지: 남아 있다면 `everyshift_temp_schedule_<month>`도 함께 삭제

## 4. 시나리오 카탈로그

## 4.1 인증/로그인

### AUTH-01 로그인 성공

- 시나리오 ID: `AUTH-01`
- 목적: QA 전용 계정으로 정상 로그인 후 대시보드(`/`)에 진입하는지 확인
- 사전조건: 테스트 계정이 존재하고 `organization_id` metadata가 올바르게 연결되어 있음
- 테스트 데이터: QA 전용 이메일/비밀번호
- 실행 절차:
  1. `/login`으로 이동한다.
  2. 카드 제목이 `EveryShift 로그인`인지 확인한다.
  3. `이메일`, `비밀번호` 입력란에 테스트 계정 정보를 입력한다.
  4. `로그인` 버튼을 클릭한다.
  5. 성공 메시지 `로그인 성공` 노출 여부를 확인한다.
  6. URL이 `/`로 이동하는지 확인한다.
- 기대 결과:
  - 로그인 성공 후 대시보드 `근무표 관리` 화면이 열린다.
  - 조직 로딩 실패 메시지가 없어야 한다.
- 실패 시 의심 지점:
  - `src/views/auth/Login.vue`
  - `src/stores/auth.ts`
  - `src/stores/organization.ts`의 metadata 기반 organization resolution
- 자동화 적합 여부: 자동화 후보

### AUTH-02 로그인 실패

- 시나리오 ID: `AUTH-02`
- 목적: 잘못된 비밀번호 입력 시 로그인 실패 메시지가 노출되는지 확인
- 사전조건: 테스트 계정 이메일은 유효함
- 테스트 데이터: 올바른 이메일 + 잘못된 비밀번호
- 실행 절차:
  1. `/login`으로 이동한다.
  2. 유효한 이메일과 잘못된 비밀번호를 입력한다.
  3. `로그인` 버튼을 클릭한다.
- 기대 결과:
  - `/`로 이동하지 않는다.
  - 에러 메시지(`로그인 실패` 또는 Supabase 에러 원문)가 노출된다.
- 실패 시 의심 지점:
  - `src/stores/auth.ts`의 `login`
  - Naive message 표시
- 자동화 적합 여부: 자동화 후보

## 4.2 대시보드 진입

### DASH-01 대시보드 기본 진입

- 시나리오 ID: `DASH-01`
- 목적: 로그인 직후 대시보드가 현재 조직 기준 schedule 목록을 정상 로드하는지 확인
- 사전조건: 로그인 완료
- 테스트 데이터: QA 조직의 기존 schedule 0개 또는 1개 이상
- 실행 절차:
  1. 대시보드 상단 제목 `근무표 관리`를 확인한다.
  2. 우측 상단 CTA `새 근무표 생성`을 확인한다.
  3. 목록이 없으면 empty state `생성된 근무표가 없습니다` 또는 `첫 근무표 생성하기`를 확인한다.
  4. 목록이 있으면 각 카드에 `YYYY-MM 근무표`, 상태 badge, `수정`, `삭제` 버튼이 보이는지 확인한다.
- 기대 결과:
  - loading 후 목록 또는 empty state 중 하나가 안정적으로 렌더링된다.
  - 조직 로딩 실패 시 에러 메시지가 보여야 하고 무한 로딩이 없어야 한다.
- 실패 시 의심 지점:
  - `src/views/Dashboard.vue`
  - `getScheduleList`
  - `organizationStore.loadOrganization`
- 자동화 적합 여부: 자동화 후보

## 4.3 새 근무표 생성

### NEW-01 월 선택 모달에서 새 근무표 생성 시작

- 시나리오 ID: `NEW-01`
- 목적: 대시보드에서 월 선택 후 Step1로 진입하는지 확인
- 사전조건: 대상 월에 기존 schedule이 없음
- 테스트 데이터: `M1` 또는 비어 있는 임의의 미래 월
- 실행 절차:
  1. 대시보드에서 `새 근무표 생성`을 클릭한다.
  2. 모달 제목 `근무표 생성`을 확인한다.
  3. `계획월` 선택 드롭다운을 연다.
  4. 테스트 월을 선택한다.
  5. `확인`을 클릭한다.
- 기대 결과:
  - `scheduleStore.basicInfo.month`가 선택 월로 세팅된다.
  - `/schedule/step1`로 이동한다.
  - Step1에서 선택한 계획월이 읽기 전용으로 표시된다.
- 실패 시 의심 지점:
  - `Dashboard.vue`의 `handleMonthConfirm`
  - duplicate month 체크
  - `scheduleStore.reset/setBasicInfo`
- 자동화 적합 여부: 자동화 후보

### NEW-02 중복 월 차단

- 시나리오 ID: `NEW-02`
- 목적: 같은 조직/월 schedule이 이미 있을 때 새 생성이 차단되는지 확인
- 사전조건: QA 조직에 대상 월 schedule이 이미 1개 존재
- 테스트 데이터: 기존 schedule이 있는 `M0` 또는 `M1`
- 실행 절차:
  1. 대시보드에서 `새 근무표 생성` 클릭
  2. 기존 schedule이 있는 월 선택
  3. `확인` 클릭
- 기대 결과:
  - 에러 메시지 `YYYY-MM 근무표가 이미 존재합니다. 다른 월을 선택해주세요.`가 노출된다.
  - 모달이 닫히지 않거나 Step1로 이동하지 않는다.
- 실패 시 의심 지점:
  - `Dashboard.vue` duplicate check
  - `schedules` unique state
- 자동화 적합 여부: 자동화 후보

## 4.4 Step1

### STEP1-01 기본 정보 확인 후 Step2 이동

- 시나리오 ID: `STEP1-01`
- 목적: Step1에서 조직/계획월/시프트가 올바르게 보이고 `다음 단계 →`가 동작하는지 확인
- 사전조건: `NEW-01` 완료
- 테스트 데이터: 시간 정보가 있는 시프트 `D/E/N` 존재
- 실행 절차:
  1. 카드 제목 `근무표 생성 - 기본 정보 설정` 확인
  2. `조직명`, `조직 유형`, `계획월` 읽기 전용 표시 확인
  3. 시프트 테이블에 시간 정보가 있는 시프트만 보이는지 확인
  4. `다음 단계 →` 클릭
- 기대 결과:
  - 성공 메시지 `기본 정보가 저장되었습니다.` 또는 기존 스케줄 편집 시 `기존 스케줄 정보를 유지하고 다음 단계로 이동합니다.` 노출
  - `/schedule/step2`로 이동
- 실패 시 의심 지점:
  - `Step1BasicInfo.vue`
  - `organizationStore.loadOrganization`
  - `scheduleStore.setBasicInfo`
- 자동화 적합 여부: 자동화 후보

### STEP1-02 시프트 추가/수정/삭제

- 시나리오 ID: `STEP1-02`
- 목적: Step1에서 시프트 관리 모달과 테이블 반영이 동작하는지 확인
- 사전조건: Step1 진입 상태
- 테스트 데이터: 신규 시프트 코드 예: `X`
- 실행 절차:
  1. `+ 시프트 추가` 클릭
  2. 새 시프트를 입력하고 저장한다.
  3. 테이블 반영 여부를 확인한다.
  4. 같은 시프트를 다시 열어 수정 후 저장한다.
  5. `삭제` 버튼으로 삭제 confirm을 수행한다.
- 기대 결과:
  - 중복 코드면 에러 메시지 `시프트 코드 'X'가 이미 존재합니다.` 노출
  - 정상 저장 시 `시프트가 추가되었습니다.` / `시프트가 수정되었습니다.` / `시프트가 삭제되었습니다.` 메시지 노출
- 실패 시 의심 지점:
  - `createShift`, `updateShift`, `deleteShift`
  - `ShiftManager` 입력 검증
- 자동화 적합 여부: 수동 우선

## 4.5 Step2

### STEP2-01 요일별 필요 인력 저장

- 시나리오 ID: `STEP2-01`
- 목적: Step2의 요일별 인력 입력이 저장되고 Step3로 이동하는지 확인
- 사전조건: Step1 완료
- 테스트 데이터: 고정 site requirements 패턴
- 실행 절차:
  1. 제목 `근무표 생성 - 요일별 인력 설정` 확인
  2. 월~일 7행이 모두 보이는지 확인
  3. `D/E/N` 열에 고정값을 입력한다.
  4. `Total` 값이 요일별 합계로 즉시 갱신되는지 확인한다.
  5. `다음 단계 →` 클릭
- 기대 결과:
  - 성공 메시지 `요일별 인력이 저장되었습니다.`
  - `/schedule/step3`로 이동
  - Step3 재진입 후 다시 Step2로 돌아왔을 때 저장값이 유지된다.
- 실패 시 의심 지점:
  - `Step2SiteInfo.vue`
  - `replaceSiteRequirements`, `loadSiteRequirements`
- 자동화 적합 여부: 자동화 후보

### STEP2-02 이전 단계 confirm

- 시나리오 ID: `STEP2-02`
- 목적: Step2의 이전 버튼이 confirm을 거쳐 Step1로 이동하는지 확인
- 사전조건: Step2에서 입력값 일부 수정
- 테스트 데이터: 임의 수정값
- 실행 절차:
  1. `← 이전` 버튼 클릭
  2. confirm 문구 `이전 단계로 돌아가면 현재 입력한 데이터가 초기화됩니다. 계속하시겠습니까?` 확인
  3. 취소 후 그대로 머무는지 확인
  4. 다시 시도하여 승인 후 Step1로 이동
- 기대 결과:
  - 취소 시 Step2 유지
  - 승인 시 `/schedule/step1` 이동
- 실패 시 의심 지점:
  - Step2 popconfirm wiring
  - `scheduleStore.prevStep`
- 자동화 적합 여부: 자동화 후보

## 4.6 Step3

### STEP3-01 직접 입력으로 직원 저장

- 시나리오 ID: `STEP3-01`
- 목적: `직접 입력` 탭에서 직원 추가/수정/삭제 후 저장이 되는지 확인
- 사전조건: Step2 완료
- 테스트 데이터: `QA001`~`QA003`
- 실행 절차:
  1. 제목 `근무표 생성 - 직원 정보 입력` 확인
  2. 기본 탭이 `직접 입력`인지 확인
  3. `+ 직원 추가`로 3명 입력
  4. 한 명 수정, 한 명 삭제를 수행
  5. `저장` 클릭
- 기대 결과:
  - 추가/수정/삭제 메시지가 각각 노출된다.
  - 최종 저장 시 `직원 정보가 저장되었습니다.`
  - 저장 후 버튼 라벨의 `저장 *` 표시가 사라진다.
- 실패 시 의심 지점:
  - `EmployeeTable.vue`
  - `createEmployeesBatch`, `deleteOrganizationEmployees`
  - Step3의 기존 employee/schedule 정리 로직
- 자동화 적합 여부: 자동화 후보

### STEP3-02 저장되지 않은 변경사항 차단

- 시나리오 ID: `STEP3-02`
- 목적: 수정 후 저장하지 않으면 `다음 단계 →`가 막히는지 확인
- 사전조건: Step3 진입
- 테스트 데이터: 직원 1명 추가
- 실행 절차:
  1. 직원을 1명 추가한다.
  2. 저장하지 않은 상태에서 `다음 단계 →` 클릭
- 기대 결과:
  - 경고 메시지 `변경사항을 먼저 저장해주세요.`
  - Step4로 이동하지 않는다.
- 실패 시 의심 지점:
  - `hasUnsavedChanges`
  - Step3 `handleNext`
- 자동화 적합 여부: 자동화 후보

### STEP3-03 엑셀 업로드

- 시나리오 ID: `STEP3-03`
- 목적: `엑셀 업로드` 탭에서 템플릿 다운로드/업로드/파싱 검증이 동작하는지 확인
- 사전조건: Step3 진입
- 테스트 데이터: 유효한 `.xlsx` 1개, 잘못된 확장자 1개
- 실행 절차:
  1. `엑셀 업로드` 탭으로 이동
  2. 안내 문구와 `📥 직원 템플릿 다운로드` 버튼 확인
  3. 유효한 엑셀 파일 업로드
  4. `업로드된 직원 목록` 렌더링 확인
  5. 잘못된 확장자 또는 5MB 초과 파일 업로드 시도
- 기대 결과:
  - 정상 업로드 시 `N명의 직원이 업로드되었습니다.`
  - 잘못된 파일이면 `엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.` 또는 파일 크기 에러
- 실패 시 의심 지점:
  - `EmployeeExcelUpload.vue`
  - XLSX 파싱
- 자동화 적합 여부: 수동 우선

### STEP3-04 기존 완료 스케줄 재사용 시 Step5 직행

- 시나리오 ID: `STEP3-04`
- 목적: 같은 조직/월에 완료된 schedule이 있으면 Step4가 아니라 Step5로 분기하는지 확인
- 사전조건: 해당 월 schedule이 이미 `complete` 또는 `changed`
- 테스트 데이터: 기존 완료 schedule 1개
- 실행 절차:
  1. Step3에서 직원 저장을 완료한 상태로 `다음 단계 →` 클릭
  2. compare 조회 성공 시 최종 이동 위치 확인
- 기대 결과:
  - `/schedule/step5/:id?version=<previewVersionId>`로 이동
  - preview query가 포함된다.
- 실패 시 의심 지점:
  - `getTargetScheduleForNextStep`
  - `resolveStep5VersionState`
  - Step3 `handleNext`
- 자동화 적합 여부: 자동화 후보

## 4.7 Step4 baseline/bootstrap 및 preferences

### STEP4-01 baseline V1 확보와 기존 preference 복원

- 시나리오 ID: `STEP4-01`
- 목적: Step4 진입 시 baseline version(V1)을 확보하고 해당 version의 preference를 읽어오는지 확인
- 사전조건: Step3 완료, 기존 completed schedule 분기 아님
- 테스트 데이터: 대상 월에 새 container가 없거나, 기존 container는 있지만 V1 존재
- 실행 절차:
  1. `/schedule/step4` 진입
  2. StepIndicator의 Step4 라벨 `근무 제외 정보` 확인
  3. 본문 헤더 `YYYY-MM월 근무 조정 일정 입력` 확인
  4. 기존 preference가 있으면 info 메시지 `저장된 요청 데이터를 불러왔습니다.` 확인
- 기대 결과:
  - 내부적으로 `ensurePhase2Schedule`이 수행된다.
  - `selectedVersionId`는 backend selection을 유지하더라도 Step4 저장 대상은 V1 preview여야 한다.
  - 초기화 실패 시 `Step4 초기화 실패` alert와 `다시 시도` 버튼이 보인다.
- 실패 시 의심 지점:
  - `ensurePhase2Schedule`
  - `resolveStep4VersionState`
  - `getScheduleVersionPreferences`
- 자동화 적합 여부: 자동화 후보

### STEP4-02 O 입력, 코멘트 저장, 임시 저장

- 시나리오 ID: `STEP4-02`
- 목적: Step4 grid에서 근무 불가(O)와 코멘트 저장이 되는지 확인
- 사전조건: Step4 정상 진입
- 테스트 데이터:
  - 직원 1명 / 당월 1일 = O
  - 코멘트 = `교육`
- 실행 절차:
  1. 임의 셀을 클릭해 빈칸 ↔ `O` 토글이 가능한지 확인
  2. `O` 셀에서 우클릭하여 `코멘트 입력` 모달 오픈
  3. 코멘트를 저장한다.
  4. 날짜 헤더를 클릭해 `YYYY-MM-DD 요약` 모달이 열리는지 확인한다.
  5. 하단 `임시 저장` 클릭
- 기대 결과:
  - `O`가 아닌 셀 우클릭 시 `근무 불가(O) 셀에서만 사유를 입력할 수 있습니다.`
  - 코멘트 저장 시 `코멘트가 저장되었습니다.`
  - `임시 저장되었습니다.`
  - 저장 대상은 `schedule_version_id = previewVersionId(V1)` 기준이어야 한다.
- 실패 시 의심 지점:
  - `handleAssignmentUpdate`, `handleContextMenu`, `handleSaveComment`
  - `saveScheduleVersionPreferences`
  - `CommentModal`, `DaySummaryModal`
- 자동화 적합 여부: 수동 우선

### STEP4-03 다음 단계 이동과 Step5 query 부여

- 시나리오 ID: `STEP4-03`
- 목적: Step4 저장 후 Step5로 이동할 때 preview version query가 붙는지 확인
- 사전조건: Step4 정상 진입
- 테스트 데이터: 최소 1개 `O` request
- 실행 절차:
  1. Step4에서 데이터 입력
  2. `다음 단계 →` 클릭
- 기대 결과:
  - 먼저 `임시 저장`과 동일한 version-scoped save가 수행된다.
  - 당월 assignment 정리 로직이 실행된다.
  - `/schedule/step5/<scheduleId>?version=<previewVersionId>`로 이동한다.
- 실패 시 의심 지점:
  - `deleteThisMonthVersionAssignments`
  - `buildStep5Route`
  - Step4 `handleNext`
- 자동화 적합 여부: 자동화 후보

### STEP4-04 초기화 실패와 재시도

- 시나리오 ID: `STEP4-04`
- 목적: baseline initialization 실패 시 저장이 차단되고 재시도가 가능한지 확인
- 사전조건: API 실패를 유도할 수 있는 테스트 환경 또는 mock
- 테스트 데이터: 없음
- 실행 절차:
  1. Step4 진입 시 ensure 실패를 유도
  2. 상단 alert `Step4 초기화 실패` 확인
  3. `다시 시도` 클릭
- 기대 결과:
  - 실패 상태에서는 `임시 저장`, `다음 단계 →`가 비활성화되어야 한다.
  - 재시도 성공 시 alert가 사라지고 저장 가능 상태가 된다.
- 실패 시 의심 지점:
  - `baselineErrorMessage`, `canPersistStep4`
- 자동화 적합 여부: 자동화 후보

## 4.8 Step5 draft / solving / solved / manual edit / save / regenerate / cancel

### STEP5-01 draft 상태 진입

- 시나리오 ID: `STEP5-01`
- 목적: Step5가 draft/pre-run 상태로 열리고 `근무표 생성 (AI)` CTA가 보이는지 확인
- 사전조건: Step4에서 정상 이동
- 테스트 데이터: Step4 저장된 off request 1건
- 실행 절차:
  1. 카드 제목 `근무표 생성 - 결과 확인` 확인
  2. 상태 badge가 `생성 전` 또는 error 재시도 상태인지 확인
  3. `전월 데이터 표시 일수` 슬라이더 확인
  4. `근무표 생성 (AI)` 버튼 확인
- 기대 결과:
  - draft에서는 start solver CTA가 보인다.
  - preview version이 editable이면 read-only warning이 보이지 않는다.
- 실패 시 의심 지점:
  - `mapVersionStatusToSolverStatus`
  - `isPreRun`, `isVersionReadOnly`
- 자동화 적합 여부: 자동화 후보

### STEP5-02 solver 시작과 solving 상태

- 시나리오 ID: `STEP5-02`
- 목적: `근무표 생성 (AI)` 클릭 후 solving 상태와 polling UI를 확인
- 사전조건: draft 상태의 preview version
- 테스트 데이터: 유효한 site requirements / employees / off requests
- 실행 절차:
  1. `근무표 생성 (AI)` 클릭
  2. 성공 메시지 `근무표 생성을 시작했습니다.` 확인
  3. 상태 badge가 `생성 중`으로 바뀌는지 확인
  4. progress bar 표시 여부 확인
  5. 충분한 시간 동안 partial result가 없으면 info alert `중간 결과 대기 중 ...` 노출 여부 확인
- 기대 결과:
  - solving 중에는 grid가 read-only 이어야 한다.
  - preview version status가 `solving`이면 mutation CTA가 잠겨야 한다.
  - 다른 version이 이미 생성 중이면 `다른 버전이 생성 중입니다. 완료 후 다시 시도해주세요.`가 보여야 한다.
- 실패 시 의심 지점:
  - `useAISolver`
  - `handleStartSolver`
  - `syncVersionStateFromCompare`
  - `startAssignmentsRefresh`
- 자동화 적합 여부: 수동 우선

### STEP5-03 solved 상태와 수동 수정

- 시나리오 ID: `STEP5-03`
- 목적: 결과가 로드된 뒤 grid 수동 편집과 changed warning이 동작하는지 확인
- 사전조건: solver 완료 또는 review-ready preview version
- 테스트 데이터: 결과가 채워진 current month cell 1개
- 실행 절차:
  1. grid에서 당월 셀 1개를 다른 시프트로 바꾼다.
  2. warning alert `N개의 변경사항이 있습니다. "저장" 버튼을 클릭하여 저장하세요.` 확인
  3. `변경 사항 취소` 버튼 클릭 전/후 동작 확인
- 기대 결과:
  - 편집 후 `changedCells.size > 0` 상태가 된다.
  - `변경 사항 취소` confirm 후 원래 값으로 돌아온다.
  - preview version이 `solving` 또는 `finalized`면 편집되지 않아야 한다.
- 실패 시 의심 지점:
  - `handleAssignmentUpdate`
  - `handleReset`
  - `isReadonlyGrid`
- 자동화 적합 여부: 자동화 후보

### STEP5-04 저장

- 시나리오 ID: `STEP5-04`
- 목적: 수동 수정 저장이 version-scoped patch로 반영되고 대시보드로 복귀하는지 확인
- 사전조건: `STEP5-03`로 변경사항 1건 이상 존재
- 테스트 데이터: 변경 셀 1개 이상
- 실행 절차:
  1. `저장` 클릭
  2. dialog `근무표 저장`에서 positive action 클릭
  3. 저장 완료 후 이동 경로 확인
- 기대 결과:
  - 변경사항이 없으면 `변경사항이 없습니다` 후 대시보드(`/`)로 이동한다.
  - 변경사항이 있으면 patch 후 `저장되었습니다` 메시지 노출
  - 저장 후 `/`로 이동
- 실패 시 의심 지점:
  - `patchPhase2ScheduleVersionAssignments`
  - shiftCode -> shiftId 변환
  - 저장 후 compare 재동기화
- 자동화 적합 여부: 자동화 후보

### STEP5-05 더 개선하기(regenerate)

- 시나리오 ID: `STEP5-05`
- 목적: `더 개선하기`가 새 candidate version을 만들고 그 version으로 재생성 시작하는지 확인
- 사전조건: editable finished preview version
- 테스트 데이터: 기존 preview version 1개 이상
- 실행 절차:
  1. `더 개선하기` 클릭
  2. URL query의 `version` 값이 새 version id로 바뀌는지 확인
  3. 이어서 solver가 자동 시작되는지 확인
- 기대 결과:
  - 새 candidate version이 생성된다.
  - 기존 selected version이 자동 변경되지 않는지 비교 응답 기준으로 확인한다.
  - 새 preview version route로 canonical replace 된다.
- 실패 시 의심 지점:
  - `createPhase2ScheduleVersion`
  - `router.replace(buildStep5Route(...))`
  - `handleRegenerate`
- 자동화 적합 여부: 자동화 후보

### STEP5-06 근무표 취소

- 시나리오 ID: `STEP5-06`
- 목적: 현재 월 assignment만 삭제하고 Step4로 돌아가는지 확인
- 사전조건: current month assignment가 존재하거나 finished 상태
- 테스트 데이터: `M2` 전용 월
- 실행 절차:
  1. `근무표 취소` 클릭
  2. warning dialog의 설명 문구를 확인한다.
  3. positive action `삭제` 수행
- 기대 결과:
  - 성공 메시지 `이번달 근무표가 삭제되었습니다. 지난달 데이터는 보존되었습니다.`
  - `/schedule/step4`로 이동
  - 대상 월의 `everyshift_temp_schedule_<month>`, `everyshift_temp_preferences_<month>`가 삭제된다.
- 실패 시 의심 지점:
  - `deleteThisMonthVersionAssignments`
  - Step5 `handleCancelSchedule`
  - localStorage cleanup
- 자동화 적합 여부: 수동 우선

### STEP5-07 엑셀 다운로드

- 시나리오 ID: `STEP5-07`
- 목적: 완료된 결과를 엑셀로 내보낼 수 있는지 확인
- 사전조건: finished state, grid employees 존재
- 테스트 데이터: 결과가 채워진 schedule
- 실행 절차:
  1. `엑셀 다운로드` 클릭
  2. 브라우저 다운로드 이벤트 또는 파일명 확인
- 기대 결과:
  - 파일명 형식 `schedule_<YYYY-MM>.xlsx`
  - 실패 시 `다운로드 실패` 메시지
- 실패 시 의심 지점:
  - `exportToExcel`
  - 브라우저 download 권한
- 자동화 적합 여부: 수동 우선

## 4.9 대시보드 재진입

### REENTRY-01 기존 schedule card 클릭 시 Step5 재진입

- 시나리오 ID: `REENTRY-01`
- 목적: 대시보드에서 기존 schedule card 클릭 시 canonical preview query와 함께 Step5로 진입하는지 확인
- 사전조건: 완료된 schedule 1개 이상 존재
- 테스트 데이터: `M1` 저장 완료 schedule
- 실행 절차:
  1. 대시보드로 돌아간다.
  2. 해당 월 schedule card 본문을 클릭한다.
  3. 이동 URL 확인
- 기대 결과:
  - compare 조회 후 `/schedule/step5/<scheduleId>?version=<previewVersionId>`로 이동
  - 선택된 backend selected version이 있으면 그것이 기본 preview로 사용된다.
- 실패 시 의심 지점:
  - `Dashboard.vue`의 `handleViewSchedule`
  - `resolveStep5VersionState`
- 자동화 적합 여부: 자동화 후보

### REENTRY-02 수정 버튼으로 Step1 재진입

- 시나리오 ID: `REENTRY-02`
- 목적: 대시보드의 `수정` 버튼이 Step1부터 재진입시키는지 확인
- 사전조건: schedule card 1개 이상 존재
- 테스트 데이터: 아무 schedule 1개
- 실행 절차:
  1. 대시보드 card의 `수정` 클릭
- 기대 결과:
  - `/schedule/step1`로 이동
  - 기존 `scheduleId`, `month`, `organization` 정보는 유지된 상태여야 한다.
- 실패 시 의심 지점:
  - `Dashboard.vue`의 `handleEdit`
- 자동화 적합 여부: 자동화 후보

## 4.10 잘못된 version query 처리

### VERSION-01 query 없음 -> canonical query 부여

- 시나리오 ID: `VERSION-01`
- 목적: legacy Step5 URL처럼 query 없이 들어오면 canonical preview query로 정규화되는지 확인
- 사전조건: scheduleId 유효, compare 응답에서 selected version 또는 V1 존재
- 테스트 데이터: `/schedule/step5/<scheduleId>`
- 실행 절차:
  1. query 없는 Step5 URL로 직접 진입
- 기대 결과:
  - `router.replace`로 `?version=<selectedVersionId 또는 V1>`가 붙는다.
- 실패 시 의심 지점:
  - `resolveStep5VersionState`
  - `syncVersionStateFromCompare`
- 자동화 적합 여부: 자동화 후보

### VERSION-02 잘못된 query -> selected 또는 V1로 치환

- 시나리오 ID: `VERSION-02`
- 목적: 존재하지 않는 `version` query가 들어오면 유효한 preview로 치환되는지 확인
- 사전조건: scheduleId 유효
- 테스트 데이터: `/schedule/step5/<scheduleId>?version=missing-version`
- 실행 절차:
  1. 잘못된 query를 붙인 Step5 URL로 직접 진입
- 기대 결과:
  - 선택된 selected version이 있으면 그 값으로 치환
  - selected가 없으면 V1로 치환
  - 잘못된 query 그대로 유지되면 안 된다
- 실패 시 의심 지점:
  - `scheduleVersionResolver.ts`
- 자동화 적합 여부: 자동화 후보

## 4.11 localStorage 복원

### STORAGE-01 same user / same organization wizard context 복원

- 시나리오 ID: `STORAGE-01`
- 목적: Step4 또는 Step5 도중 새로고침해도 wizard context가 사용자 범위로 복원되는지 확인
- 사전조건: 로그인 상태 유지, same user, same organization
- 테스트 데이터:
  - `everyshift_wizard_context_v2:<userId>` 생성 가능한 상태
  - 현재 단계 Step4 또는 Step5
- 실행 절차:
  1. Step4 또는 Step5까지 진입한다.
  2. 브라우저 새로고침을 수행한다.
  3. 같은 계정 세션이 유지된 상태에서 화면이 어디로 열리는지 확인한다.
  4. DevTools Application 탭에서 `everyshift_wizard_context_v2:<userId>` 값 확인
- 기대 결과:
  - `basicInfo`, `selectedVersionId`, `previewVersionId`, `currentStep`가 복원된다.
  - Step4/Step5에서 Step1로 튕기지 않고 현재 흐름을 계속 탈 수 있어야 한다.
- 실패 시 의심 지점:
  - `scheduleStore.syncWithAuthUser`
  - `hydrateWizardContext`
  - route guard와 auth session restore 순서
- 자동화 적합 여부: 자동화 후보

### STORAGE-02 다른 조직 스코프에서는 복원 거부

- 시나리오 ID: `STORAGE-02`
- 목적: 다른 조직 계정으로 로그인하면 기존 wizard context를 재사용하지 않는지 확인
- 사전조건: 조직 A 계정으로 Step4까지 진행 후 localStorage 존재
- 테스트 데이터: 조직 B 계정
- 실행 절차:
  1. 조직 A 계정으로 Step4까지 진입
  2. 로그아웃 또는 다른 계정으로 전환
  3. 조직 B 계정으로 로그인
- 기대 결과:
  - 기존 wizard context는 복원되지 않는다.
  - `everyshift_wizard_context_v2:<oldUserId>`는 제거되거나 무시된다.
  - 현재 흐름은 Step1 초기 상태여야 한다.
- 실패 시 의심 지점:
  - `shouldHydratePersistedWizardContext`
  - `syncWithAuthUser(null)`
- 자동화 적합 여부: 수동 우선

### STORAGE-03 월별 temp key 정리 확인

- 시나리오 ID: `STORAGE-03`
- 목적: Step4/Step5 관련 월별 temp key의 생성/삭제 타이밍을 확인
- 사전조건: Step4, Step5 접근 가능
- 테스트 데이터: `M2`
- 실행 절차:
  1. Step4에서 O/코멘트를 수정한 뒤 2초 이상 대기한다.
  2. DevTools에서 `everyshift_temp_preferences_<month>`가 생성되는지 확인한다.
  3. Step5에서 `근무표 취소`를 수행한다.
  4. 같은 key와 `everyshift_temp_schedule_<month>`가 삭제되는지 확인한다.
- 기대 결과:
  - Step4 수정 후 `everyshift_temp_preferences_<month>`가 기록된다.
  - Step5 취소 후 두 key가 삭제된다.
- 실패 시 의심 지점:
  - Step4 `watchDebounced`
  - Step5 `handleCancelSchedule`
- 자동화 적합 여부: 수동 우선

## 5. 자동화 전략

### 5.1 지금 바로 Playwright로 옮기기 좋은 시나리오

아래는 현재 UI 구조상 자동화 가치가 높고, 브라우저 상호작용도 비교적 안정적인 시나리오다.

- `AUTH-01`, `AUTH-02`
- `DASH-01`
- `NEW-01`, `NEW-02`
- `STEP1-01`
- `STEP2-01`, `STEP2-02`
- `STEP3-01`, `STEP3-02`, `STEP3-04`
- `STEP4-01`, `STEP4-03`, `STEP4-04`
- `STEP5-01`, `STEP5-03`, `STEP5-04`, `STEP5-05`
- `REENTRY-01`, `REENTRY-02`
- `VERSION-01`, `VERSION-02`
- `STORAGE-01`

이유:

- route 이동과 메시지/버튼 상태가 명확하다
- 결과 판정이 URL, 버튼 visible 여부, alert 문구로 비교적 명확하다
- destructive browser native 기능(다운로드, 파일 drag, context menu) 의존도가 낮다

### 5.2 수동 우선 시나리오

- `STEP1-02` 시프트 CRUD
- `STEP3-03` 엑셀 업로드
- `STEP4-02` 우클릭 코멘트/날짜 요약 모달
- `STEP5-02` solving 중 intermediate result / waiting hint
- `STEP5-06` 근무표 취소
- `STEP5-07` 엑셀 다운로드
- `STORAGE-02`, `STORAGE-03`

이유:

- Naive UI modal / upload / confirm / browser download / context menu는 selector 안정성이 낮다
- solver timing과 partial result 노출은 환경 의존성이 크다
- multi-account / localStorage 스코프 전환은 사람이 확인하는 편이 빠르다

### 5.3 기존 `tests/e2e/helpers.ts`, `tests/e2e/schedule-workflow.spec.ts` 해석 방법

현재 파일들은 “완전히 버릴 것”이 아니라 “legacy 흐름의 의도만 참고할 것”으로 본다.

#### 유지할 점

- 로그인 -> wizard -> 결과 확인이라는 큰 의도
- localStorage/validation을 E2E로 보려는 방향
- helper 분리 전략 자체

#### 그대로 믿으면 안 되는 점

- login helper는 성공 후 `/schedule/step1` 진입을 가정하지만, 현재 구현은 `/` 대시보드로 이동한다.
- `completeStep1`은 Step1에서 월을 고르는 legacy 흐름을 가정하지만, 현재 월 선택은 대시보드 모달에서 한다.
- `completeStep2`는 제목 `사이트 정보 설정`을 찾지만 실제 제목은 `요일별 인력 설정`이다.
- `completeStep3`는 Step3를 grid 입력 화면으로 보지만, 현재 Step3는 `직원 정보 입력`이고 grid는 Step4에 있다.
- `verifyStep4Results`는 legacy 명칭이다. 현재 기준으로는 Step5 결과 화면 검증이다.
- `getTempScheduleFromStorage`는 `everyshift_temp_schedule` 고정 key를 보는데, 현재 key는 월 suffix가 붙고 실제 UI 복원도 이 key 중심이 아니다.

정리:

- 기존 E2E는 “Phase1/legacy 구조를 기준으로 한 skeleton”으로만 해석한다.
- Slice1~5 자동화는 새 spec로 다시 짜는 것이 맞다.

### 5.4 `data-testid` 권장 포인트

현재 UI는 텍스트 기반 selector로도 어느 정도 테스트 가능하지만, Step4/Step5부터는 안정적인 test id가 필요하다.

권장 추가 위치:

- 로그인
  - `login-email`
  - `login-password`
  - `login-submit`
- 대시보드
  - `dashboard-create-schedule`
  - `dashboard-month-select`
  - `dashboard-month-confirm`
  - `schedule-card-<month>`
  - `schedule-card-edit-<month>`
  - `schedule-card-delete-<month>`
- Step1
  - `step1-next`
  - `step1-cancel`
  - `step1-add-shift`
- Step2
  - `step2-prev`
  - `step2-next`
  - `site-req-<day>-<shift>`
- Step3
  - `step3-tab-manual`
  - `step3-tab-excel`
  - `step3-save`
  - `step3-next`
  - `employee-add`
- Step4
  - `step4-save`
  - `step4-next`
  - `step4-retry-baseline`
  - `step4-cell-<employeeId>-<date>`
  - `step4-comment-save`
  - `step4-day-summary-<date>`
- Step5
  - `step5-start-solver`
  - `step5-reset`
  - `step5-regenerate`
  - `step5-save`
  - `step5-cancel`
  - `step5-export`
  - `step5-status-badge`
  - `step5-grid-cell-<employeeId>-<date>`

## 6. 실행 명령 참고

아래는 참고용 현재 repo 명령이다. 이번 문서 작성 작업에서는 실제 실행하지 않는다.

```bash
pnpm dev
pnpm test:e2e
pnpm test:e2e:ui
pnpm lint:check
```

## 7. 마무리 메모

- 현재 Slice1~5 검증의 핵심은 “버전 쿼리와 version-scoped 저장이 UI 이동과 함께 맞물리는지”다.
- Step4는 여전히 baseline V1을 다루는 준비 화면이고, Step5는 아직 compare/review hub 완성형이 아니라 결과 확인 중심 화면이다.
- 따라서 이번 문서는 Step5를 “현행 결과 화면”으로 검증하되, Slice6/7 이후에 붙을 review/finalize 검증과 섞지 않는다.
