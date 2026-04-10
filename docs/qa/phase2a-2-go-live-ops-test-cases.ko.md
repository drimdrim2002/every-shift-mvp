# Phase2A-2 Go-Live Ops 테스트 케이스

> 한국어 버전입니다. 원본 문서가 이미 한국어로 작성되어 있어 동일한 테스트 범위를 유지했습니다.

## 1. 개요

이 문서는 Phase2A-2 Go-Live Ops 작업이 운영 파일럿을 안전하게 시작할 수 있는지 검증하기 위한 테스트 케이스 문서다. 자동화 테스트 구현이 아니라, 제3자가 수동 QA나 후속 자동화 작업을 수행할 때 그대로 따라갈 수 있는 테스트 기준을 정리한다.

검증 범위는 다음 Phase2A-2 기능으로 제한한다.

- O1: 관리자 bootstrap 계약과 operator-assisted bootstrap 흐름
- O2: 조직 프로필, 사이트, 근무 제약 설정 및 `site_requirements` canonical staffing 보존
- O3: 직원 import validate/apply 분리, Step3 파괴적 apply 확인, finalized month 차단, `rankCode` 보존
- O4: Off 요청 정책 설정, 서버 측 정책 평가/저장, `request_code === 'O'`만 정책 카운팅
- O5: finalized-only rolling fairness ledger finalization boundary와 read-only aggregate summary
- O6: 파일럿 checklist와 dashboard entry
- 최종 review fix: pilot admin non-bootstrap ops auth, CORS/OPTIONS, foundation backend routes, inactive rank code rejection, atomic off-request policy replacement RPC, default-only policy blank rank-code draft filter

테스트하지 않는 범위는 다음과 같다.

- Phase2B 기능: self-signup, approval flow, invite flow, membership auth rewrite, full RBAC
- Trust Layer 재설계 또는 기존 schedule/version/finalize lifecycle 변경
- public fairness-ledger write endpoint
- solver fairness tuning, advanced dashboard analytics, finalized month reopen/unfinalize
- `site_requirements`에서 `site_staffing_requirements`로 canonical source를 이전하는 작업

## 2. 사전 조건

브랜치와 worktree:

- 권장 작업 위치: `/Users/brown/workspace/every-shift-mvp/.worktrees/phase2b-start-review`
- 구현 기준 브랜치: `phase2a-2-go-live-ops-sdd`
- 통합 기준 브랜치: `phase2b-start`
- 구현 계획 원문: `docs/plans/phase2a-2-go-live-ops-implementation-plan.md`
- 리뷰 시 참고 명령:
  - `git diff --stat phase2b-start...HEAD`
  - `git log --oneline phase2b-start..HEAD`
  - `rg -n "fairness|ledger|finalize|rankCode|request_code|site_requirements|bootstrap|checklist|off_request|policy" src supabase tests migrations docs`

환경 변수:

- 로컬 앱/E2E: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- E2E 로그인: `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`
- Edge Function 수동 호출 또는 배포 환경: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, 그리고 `SB_PUBLISHABLE_KEY` 또는 `SUPABASE_ANON_KEY`
- finalized read-only E2E를 확장해서 실행하는 경우: `TEST_FINALIZED_MONTH`

사용자/권한 상태:

- bootstrap 검증용 operator 계정: `profiles.global_role`이 `admin` 또는 `super`, `account_status`가 `active`
- 일반 ops 검증용 pilot admin 계정: `profiles.role`이 admin 계열이고 `account_status`가 `active`, `organization_id`가 대상 조직과 일치
- 권한 실패 검증용 계정: active가 아니거나 다른 `organization_id`를 가진 계정
- bootstrap 대상 사용자: Supabase Auth에는 존재하지만 profile/onboarding/auth metadata가 일부 없거나 오래된 사용자

테스트 데이터 조건:

- 대상 `organizations` row 1개
- 최소 1개의 schedule-active `sites` row와 `organization_settings.pilot_site_id`
- `shifts` 및 `site_requirements` 데이터. 특히 staffing 검증은 반드시 `site_requirements`를 기준으로 확인한다.
- Step3용 직원 30명 수준의 roster 데이터와 일부 `rankCode` 포함 데이터
- Off 요청 정책 검증용 active/inactive rank code, default monthly/annual policy, rank-specific override
- schedule 상태별 데이터: open draft/review_pending/review_ready, selected version, compare-only version, finalized month
- ledger 검증용 `fairness_ledger_monthly`에는 finalized/passed row와 noise row를 분리해서 준비한다.

## 3. 정상 흐름 테스트 케이스

### TC-N01: Operator-assisted pilot admin bootstrap

- ID: TC-N01
- 목적: 내부 operator가 첫 pilot admin을 bootstrap하면 profile, onboarding progress, auth metadata가 일관되게 맞춰지는지 확인한다.
- 사전 조건: operator 계정은 `global_role=admin|super`, `account_status=active`이고 대상 auth user는 존재한다.
- 테스트 단계:
  1. `POST /functions/v1/phase2-ops/bootstrap-admin`에 `organizationId`, `targetEmail`, `displayName`, `onboardingInitializationFlags`를 보낸다.
  2. 응답의 `organizationId`, `targetEmail`, `displayName`, `operatorUserId`를 확인한다.
  3. `profiles`에 대상 user row가 생성 또는 갱신됐는지 확인한다.
  4. `onboarding_progress`가 없으면 생성됐고, 이미 있으면 기존 진행 상태가 보존됐는지 확인한다.
  5. 대상 auth user metadata에 `organization_id` 계열 키가 보강됐는지 확인한다.
- 기대 결과:
  - 200 응답을 반환한다.
  - profile, onboarding progress, auth metadata가 같은 `organizationId`를 가리킨다.
  - 브라우저 UI에는 bootstrap endpoint로 이동하는 링크가 없다.
- 관련 자동화 테스트: `tests/unit/phase2-ops-contracts.spec.ts`, `tests/unit/phase2-ops-auth.spec.ts`, `tests/unit/phase2-ops-repository.spec.ts`

### TC-N02: Pilot admin non-bootstrap ops access

- ID: TC-N02
- 목적: pilot admin이 bootstrap 권한 없이도 일반 ops endpoint를 사용할 수 있는지 확인한다.
- 사전 조건: pilot admin profile은 `account_status=active`, `organization_id`가 대상 조직과 일치하지만 `global_role`은 `admin|super`가 아니다.
- 테스트 단계:
  1. pilot admin bearer token으로 `GET /functions/v1/phase2-ops/checklist?organizationId=<org>`를 호출한다.
  2. 같은 token으로 `GET /organization-profile`, `GET /sites`, `GET /off-request-policies`를 호출한다.
  3. 같은 token으로 `POST /bootstrap-admin`을 호출한다.
- 기대 결과:
  - non-bootstrap ops route는 접근 가능하다.
  - bootstrap route는 `organization_access_denied` 또는 403으로 차단된다.
- 관련 자동화 테스트: `tests/unit/phase2-ops-auth.spec.ts`, `tests/unit/phase2-ops-api.spec.ts`

### TC-N03: CORS preflight and route method handling

- ID: TC-N03
- 목적: 브라우저의 authenticated ops 호출이 OPTIONS preflight에서 차단되지 않는지 확인한다.
- 사전 조건: 배포된 `phase2-ops` 또는 로컬 edge function endpoint가 있다.
- 테스트 단계:
  1. `OPTIONS /functions/v1/phase2-ops/off-request-policies`를 `Origin`과 `Access-Control-Request-Headers: authorization,apikey,content-type` 헤더와 함께 호출한다.
  2. 응답 헤더의 `Access-Control-Allow-Origin`, `Access-Control-Allow-Headers`, `Access-Control-Allow-Methods`를 확인한다.
  3. 허용되지 않은 method로 정상 route를 호출한다.
- 기대 결과:
  - OPTIONS는 200으로 응답한다.
  - CORS headers에는 요청 origin, 요청 headers, `GET,POST,PUT,PATCH,OPTIONS`가 포함된다.
  - route는 존재하지만 method가 다르면 405를 반환한다.
- 관련 자동화 테스트: `tests/unit/phase2-ops-cors.spec.ts`, `tests/unit/phase2-ops-contracts.spec.ts`

### TC-N04: Organization profile save and reload

- ID: TC-N04
- 목적: 조직 기본 정보가 `phase2-ops` backend route를 통해 저장되고 checklist 진행 상태와 dashboard에 반영되는지 확인한다.
- 사전 조건: 대상 조직 row와 active pilot admin 계정이 있다.
- 테스트 단계:
  1. Dashboard에서 조직/사이트 설정 진입 링크를 연다.
  2. 조직명과 조직 type을 저장한다.
  3. `GET /organization-profile`로 다시 로드한다.
  4. Dashboard checklist를 새로고침한다.
- 기대 결과:
  - 저장한 조직명/type이 다시 조회된다.
  - `onboarding_progress`의 cursor가 다음 foundation 단계로 진행된다.
  - dashboard checklist의 조직 기본 정보 항목이 ready로 표시된다.
- 관련 자동화 테스트: `tests/unit/phase2-ops-api.spec.ts`, `tests/unit/dashboard.spec.ts`, `tests/unit/phase2-ops-checklist.spec.ts`

### TC-N05: Site foundation and single schedule-active site

- ID: TC-N05
- 목적: 사이트 metadata 저장 시 정확히 하나의 schedule-active site만 허용되고 `organization_settings.pilot_site_id`가 그 site를 참조하는지 확인한다.
- 사전 조건: 대상 조직에 site가 없거나 기존 schedule-active site가 하나 있다.
- 테스트 단계:
  1. `PUT /sites`로 site 2개를 보내되 하나만 `isScheduleActive=true`로 저장한다.
  2. `GET /sites`로 저장 결과와 `pilotSiteId`를 확인한다.
  3. UI에서 primary site 문구가 표시되는지 확인한다.
- 기대 결과:
  - 저장은 성공한다.
  - 응답에는 하나의 `isScheduleActive=true` site와 해당 `pilotSiteId`가 있다.
  - 기존 `site_requirements` staffing 데이터는 변경되지 않는다.
- 관련 자동화 테스트: `tests/unit/phase2-ops-api.spec.ts`, `tests/unit/dashboard.spec.ts`

### TC-N06: Shift constraints save after active site

- ID: TC-N06
- 목적: active pilot site가 있는 상태에서 최소 휴식시간 등 shift constraint가 저장되는지 확인한다.
- 사전 조건: `organization_settings.pilot_site_id`가 schedule-active site를 참조한다.
- 테스트 단계:
  1. `GET /shifts-constraints`로 현재 `minimumRestHours`와 `checklistCursor`를 확인한다.
  2. `PUT /shifts-constraints`로 `minimumRestHours=11`과 checklist cursor를 저장한다.
  3. 다시 조회한다.
- 기대 결과:
  - 저장 후 같은 값이 조회된다.
  - active pilot site가 없으면 저장은 400으로 차단된다.
- 관련 자동화 테스트: `tests/unit/phase2-ops-api.spec.ts`, `tests/unit/phase2-ops-repository.spec.ts`

### TC-N07: Step2 keeps `site_requirements` canonical

- ID: TC-N07
- 목적: site metadata 도입 후에도 schedule generation의 staffing source가 `site_requirements`로 유지되는지 확인한다.
- 사전 조건: Step2 화면에 접근 가능하고, `sites` 및 `organization_settings`가 준비되어 있다.
- 테스트 단계:
  1. Step2에서 primary site context를 확인한다.
  2. 요일/shift별 필요 인력을 변경하고 저장한다.
  3. DB에서 `site_requirements` row가 변경됐는지 확인한다.
  4. `sites`에는 staffing 숫자가 저장되지 않았는지 확인한다.
  5. Step4/solver input으로 이어지는 일정 생성 데이터가 변경된 `site_requirements`를 읽는지 확인한다.
- 기대 결과:
  - 화면은 site metadata를 보여주지만 staffing write/read는 계속 `site_requirements`를 사용한다.
  - `site_staffing_requirements` 같은 신규 staffing table은 사용하지 않는다.
- 관련 자동화 테스트: `tests/unit/step2-site-info.spec.ts`, `tests/unit/phase2-ops-checklist.spec.ts`

### TC-N08: Employee import validate then apply

- ID: TC-N08
- 목적: 직원 import 저장이 validate preview와 destructive apply로 분리되어 동작하는지 확인한다.
- 사전 조건: open month, valid shifts, 직원 import payload가 있다.
- 테스트 단계:
  1. Step3에서 직원 데이터를 로드하거나 업로드한다.
  2. 저장 버튼을 눌러 validate를 실행한다.
  3. validate 후 DB의 employees 및 schedule container가 아직 변경되지 않았는지 확인한다.
  4. 적용 버튼을 누르고 확인 dialog에서 계속 적용을 선택한다.
  5. apply 후 직원 수, 삭제된 schedule id, Step4 이동, preview/selected version reset을 확인한다.
- 기대 결과:
  - validate는 preview만 반환하고 destructive reset을 호출하지 않는다.
  - apply만 `replace_roster_and_reset_schedule_atomic` boundary를 호출한다.
  - current unfinalized month는 의도적으로 reset되고 Step4로 이동한다.
- 관련 자동화 테스트: `tests/unit/phase2-ops-repository.spec.ts`, `tests/unit/step3-employee-info.spec.ts`, `tests/e2e/schedule-workflow.spec.ts`

### TC-N09: Employee `rankCode` preservation

- ID: TC-N09
- 목적: DB에서 로드한 직원의 `rankCode`가 Step3 validate/apply와 manual employee path에서 유지되는지 확인한다.
- 사전 조건: 직원 row에 `rank_code='RN'`이 포함되어 있다.
- 테스트 단계:
  1. Step3을 열고 직원 목록을 로드한다.
  2. 저장을 눌러 validate payload를 확인한다.
  3. 적용 확인 후 apply payload를 확인한다.
  4. apply 이후 employees row의 `rank_code`가 유지되는지 확인한다.
- 기대 결과:
  - validate/apply payload 모두 `rankCode: 'RN'`을 포함한다.
  - rank가 없는 직원은 `rankCode: null`로 전달되고 default policy 대상으로 남는다.
- 관련 자동화 테스트: `tests/unit/step3-employee-info.spec.ts`, `tests/unit/excel.spec.ts`

### TC-N10: Off-request policy setup and server-side persistence

- ID: TC-N10
- 목적: default/rank별 monthly/annual Off 요청 정책이 저장되고 서버 측 정책 평가 결과가 요청 row에 설명 가능하게 남는지 확인한다.
- 사전 조건: active rank code `RN`, default monthly/annual policy, Step4 Off 요청 데이터가 있다.
- 테스트 단계:
  1. Off 요청 정책 화면에서 default monthly/annual policy와 RN override를 저장한다.
  2. `GET /off-request-policies`로 정책을 다시 로드한다.
  3. Step4에서 월간 한도를 초과하는 Off 요청을 저장 또는 recheck한다.
  4. `schedule_preferences.policy_check_status`와 `policy_rejection_reason`을 확인한다.
  5. Step4/Step5에서 거부된 요청 row와 사유가 표시되는지 확인한다.
- 기대 결과:
  - 정책 저장은 atomic replacement RPC로 처리된다.
  - 거부된 Off 요청은 삭제되지 않고 `월 한도 초과` 또는 `연간 한도 초과` 사유와 함께 남는다.
  - 정책 평가는 브라우저가 아니라 backend schedule path에서 수행된다.
- 관련 자동화 테스트: `tests/unit/off-request-policy-table.spec.ts`, `tests/unit/phase2-ops-repository.spec.ts`, `tests/unit/phase2-schedule-write-repository.spec.ts`, `tests/unit/step4-initial-data.spec.ts`

### TC-N11: Finalize writes ledger only through finalized boundary

- ID: TC-N11
- 목적: review_ready selected version finalization이 ledger write 시점을 finalization boundary 안으로 제한하는지 확인한다.
- 사전 조건: selected `review_ready` version, passed latest evaluation, 아직 finalized되지 않은 schedule이 있다.
- 테스트 단계:
  1. Step5에서 selected version을 finalize한다.
  2. `finalize_schedule_version_atomic` RPC가 호출됐는지 확인한다.
  3. finalized response의 `finalizedVersionId`, `finalizedAt`, `finalizedBy`를 확인한다.
  4. `fairness_ledger_monthly`에 finalized 결과 기반 row가 생겼거나, RPC 내부 write 결과가 반영됐는지 확인한다.
  5. repository/browser route에서 직접 `fairness_ledger_monthly`를 upsert하지 않았는지 확인한다.
- 기대 결과:
  - ledger write는 finalized version 기준으로만 발생한다.
  - public fairness-ledger write endpoint는 없다.
  - repository 단위에서는 직접 ledger upsert가 아니라 finalize RPC boundary만 호출한다.
- 관련 자동화 테스트: `tests/unit/phase2-schedule-write-repository.spec.ts`, `tests/unit/phase2-schedule-repository.spec.ts`

### TC-N12: Read-only rolling fairness summary and pilot checklist

- ID: TC-N12
- 목적: dashboard checklist와 Step5 fairness summary가 finalized ledger rows만 읽어 read-only context로 표시하는지 확인한다.
- 사전 조건: `fairness_ledger_monthly`에 `result_status='passed'` finalized row가 있고, draft/noise row도 별도로 있다.
- 테스트 단계:
  1. `GET /checklist`를 호출한다.
  2. 응답의 checklist items와 `fairnessSummary`를 확인한다.
  3. Dashboard에서 checklist card가 조직 설정, Step2, Step3, Off 요청 정책, Step5로 deep link되는지 확인한다.
  4. Step5에서 fairness summary가 표시되지만 수정 UI나 write action이 없는지 확인한다.
- 기대 결과:
  - checklist readiness는 실제 table state에서 계산된다.
  - `onboarding_progress` cursor는 위치 기억만 담당하고 readiness를 강제로 바꾸지 않는다.
  - fairness summary는 passed finalized ledger row만 집계한다.
- 관련 자동화 테스트: `tests/unit/phase2-ops-checklist.spec.ts`, `tests/unit/dashboard.spec.ts`, `tests/e2e/pilot-checklist.spec.ts`

## 4. 운영 edge case 테스트 케이스

### TC-E01: bootstrap succeeds but auth metadata lacks organization scope

- ID: TC-E01
- 위험 시나리오: bootstrap 후 profile은 생성됐지만 auth metadata의 `organization_id` 계열 키가 누락되어 로그인 후 조직 scope를 찾지 못한다.
- 왜 운영에서 문제가 되는지: pilot admin이 로그인은 되지만 dashboard와 schedule flow가 조직 데이터 없이 실패한다.
- 테스트 단계:
  1. 대상 auth user metadata를 비우거나 legacy key만 남긴다.
  2. bootstrap을 실행한다.
  3. 로그인 후 organization store와 dashboard checklist를 로드한다.
- 기대 결과:
  - bootstrap은 metadata를 보강한다.
  - dashboard는 수동 DB patch 없이 대상 organization scope로 로드된다.
- 회귀 방지 포인트: `tests/unit/phase2-ops-repository.spec.ts`의 metadata alignment/replay 케이스를 유지하고, auth metadata fallback을 user metadata로 넓히지 않는다.

### TC-E02: pilot admin tries bootstrap

- ID: TC-E02
- 위험 시나리오: 일반 pilot admin이 `bootstrap-admin`을 호출해 다른 사용자를 provision하려고 한다.
- 왜 운영에서 문제가 되는지: assisted bootstrap 경계가 self-service onboarding 또는 권한 상승 통로가 될 수 있다.
- 테스트 단계:
  1. `global_role=user`, `account_status=active` pilot admin token으로 `POST /bootstrap-admin`을 호출한다.
  2. 같은 token으로 `GET /checklist`를 호출한다.
- 기대 결과:
  - bootstrap은 403으로 차단된다.
  - non-bootstrap ops route는 정상 동작한다.
- 회귀 방지 포인트: bootstrap auth와 non-bootstrap ops auth를 분리한다. `tests/unit/phase2-ops-auth.spec.ts`

### TC-E03: CORS OPTIONS omitted or missing auth headers

- ID: TC-E03
- 위험 시나리오: `phase2-ops`가 OPTIONS를 정상 처리하지 못해 실제 PUT/PATCH 호출 전에 브라우저가 차단한다.
- 왜 운영에서 문제가 되는지: 조직 설정, site 저장, 정책 저장이 브라우저에서만 실패하고 backend 로그에는 업무 요청이 도달하지 않는다.
- 테스트 단계:
  1. Origin과 `authorization,apikey,content-type` preflight header를 포함해 OPTIONS를 호출한다.
  2. `Access-Control-Allow-Methods`에 PUT/PATCH/OPTIONS가 있는지 확인한다.
- 기대 결과:
  - OPTIONS는 인증 없이 200으로 CORS headers를 반환한다.
- 회귀 방지 포인트: `phase2-ops` route dispatch보다 OPTIONS 처리가 먼저 실행되어야 한다. `tests/unit/phase2-ops-cors.spec.ts`

### TC-E04: organization access mismatch

- ID: TC-E04
- 위험 시나리오: profile의 `organization_id`와 요청 payload/query의 `organizationId`가 다르다.
- 왜 운영에서 문제가 되는지: 한 파일럿 병동의 설정이나 직원 roster가 다른 조직에 저장될 수 있다.
- 테스트 단계:
  1. org A pilot admin token으로 org B의 `GET /sites` 또는 `PUT /off-request-policies`를 호출한다.
  2. DB write가 발생했는지 확인한다.
- 기대 결과:
  - 403 또는 조직 접근 거부 오류가 반환된다.
  - org B row에는 변경이 없다.
- 회귀 방지 포인트: 모든 `phase2-ops` repository method에서 `assertOrganizationAccess`를 유지한다. `tests/unit/phase2-ops-repository.spec.ts`

### TC-E05: zero or multiple schedule-active sites

- ID: TC-E05
- 위험 시나리오: site 저장 payload가 schedule-active site를 0개 또는 2개 이상 포함한다.
- 왜 운영에서 문제가 되는지: checklist는 준비 완료로 보이지만 어떤 site가 파일럿 운영 대상인지 불명확해진다.
- 테스트 단계:
  1. `PUT /sites`에 `isScheduleActive=true`가 없는 payload를 보낸다.
  2. `PUT /sites`에 `isScheduleActive=true`가 2개인 payload를 보낸다.
  3. DB의 `sites`와 `organization_settings`를 확인한다.
- 기대 결과:
  - 두 요청 모두 400으로 실패한다.
  - 기존 active site와 `pilot_site_id`는 유지된다.
- 회귀 방지 포인트: API validation과 DB partial unique index를 둘 다 유지한다. `tests/unit/phase2-ops-api.spec.ts`

### TC-E06: active pilot site code change after settings exist

- ID: TC-E06
- 위험 시나리오: 이미 `organization_settings.pilot_site_id`가 있는 상태에서 다른 code의 site를 schedule-active로 바꾸려고 한다.
- 왜 운영에서 문제가 되는지: Step2 staffing은 organization-scoped `site_requirements`를 쓰는데 UI가 다른 site metadata를 운영 대상으로 오해할 수 있다.
- 테스트 단계:
  1. 기존 active site와 settings를 만든다.
  2. 다른 site code를 active로 바꿔 `PUT /sites`를 호출한다.
  3. 기존 settings와 active site를 확인한다.
- 기대 결과:
  - Phase2A에서는 400으로 차단된다.
  - 기존 pilot site reference는 유지된다.
- 회귀 방지 포인트: multi-site staffing engine을 도입하지 않는다. `tests/unit/phase2-ops-repository.spec.ts`

### TC-E07: foundation save forks staffing source

- ID: TC-E07
- 위험 시나리오: site foundation 저장 후 Step2가 `sites`나 신규 staffing table을 staffing source로 사용한다.
- 왜 운영에서 문제가 되는지: schedule generation과 운영자가 보는 staffing 기준이 달라져 실제 근무표 생성이 틀어진다.
- 테스트 단계:
  1. `sites` metadata를 저장한다.
  2. Step2에서 요일별 필요 인력을 저장한다.
  3. schedule evaluation 또는 solver payload의 staffing count가 `site_requirements`에서 나온 값인지 확인한다.
- 기대 결과:
  - `site_requirements`가 유일한 staffing source로 유지된다.
  - `sites`는 metadata와 schedule-active pointer 역할만 한다.
- 회귀 방지 포인트: `src/api/employee.ts`, `src/api/shift.ts`, `Step2SiteInfo.vue`에서 `site_requirements` write/read 경로를 유지한다. `tests/unit/step2-site-info.spec.ts`

### TC-E08: validate passes but finalized month apply is attempted

- ID: TC-E08
- 위험 시나리오: Step3 validate preview 이후 다른 사용자가 같은 month를 finalize했고, 사용자가 뒤늦게 apply를 누른다.
- 왜 운영에서 문제가 되는지: 확정된 실제 근무표의 직원 roster와 schedule history가 파괴될 수 있다.
- 테스트 단계:
  1. open month에서 Step3 validate를 성공시킨다.
  2. 같은 schedule을 finalized 상태로 바꾼다.
  3. Step3에서 apply를 실행한다.
- 기대 결과:
  - apply는 `already_finalized`로 실패하거나 UI에서 차단된다.
  - `replace_roster_and_reset_schedule_atomic`는 finalized month를 변경하지 않는다.
- 회귀 방지 포인트: validate 결과를 apply 권한으로 간주하지 말고 apply 직전 server-side finalized guard를 유지한다. `tests/unit/phase2-ops-repository.spec.ts`, `tests/unit/step3-employee-info.spec.ts`, `tests/e2e/schedule-workflow.spec.ts`

### TC-E09: duplicate employee IDs or unknown shift codes

- ID: TC-E09
- 위험 시나리오: import 파일에 중복 직원 ID 또는 존재하지 않는 shift code가 있다.
- 왜 운영에서 문제가 되는지: roster apply 이후 schedule generation input이 깨지고 간호사 배정 가능 shift가 잘못 계산된다.
- 테스트 단계:
  1. 중복 `employeeId`를 포함한 import payload로 validate를 호출한다.
  2. unknown shift code를 포함한 payload로 validate를 호출한다.
  3. 같은 payload로 apply를 시도한다.
- 기대 결과:
  - validate response에는 `duplicateEmployeeIds` 또는 `missingShiftCodes`가 채워지고 `isValid=false`다.
  - apply는 400으로 실패하고 DB write가 없다.
- 회귀 방지 포인트: validate와 apply가 같은 validation helper를 공유해야 한다. `tests/unit/phase2-ops-repository.spec.ts`

### TC-E10: inactive rank code used in policy rule

- ID: TC-E10
- 위험 시나리오: inactive `organization_rank_codes.code`를 참조하는 active off-request policy rule이 저장된다.
- 왜 운영에서 문제가 되는지: UI에서는 비활성 직급으로 보이는데 backend 정책은 계속 적용되어 운영자가 정책 결과를 설명하기 어렵다.
- 테스트 단계:
  1. `rankCodes`에 `RN`을 `isActive=false`로 포함한다.
  2. `policyRules`에 `rankCode='RN'`, `isActive=true`인 monthly 또는 annual rule을 넣어 저장한다.
  3. DB write 여부를 확인한다.
- 기대 결과:
  - 저장은 400으로 실패한다.
  - rank code와 policy rules 모두 기존 상태를 유지한다.
- 회귀 방지 포인트: repository에서 unknown rank와 inactive rank를 모두 사전 차단한다. `tests/unit/phase2-ops-repository.spec.ts`

### TC-E11: overlapping active policy rules

- ID: TC-E11
- 위험 시나리오: 같은 organization, 같은 period, 같은 rank/default에 active policy가 2개 저장된다.
- 왜 운영에서 문제가 되는지: 어떤 limit가 적용되는지 불명확해져 Off 요청 거부 결과를 설명할 수 없다.
- 테스트 단계:
  1. default monthly active rule 2개를 넣어 `PUT /off-request-policies`를 호출한다.
  2. `RN` monthly active rule 2개를 넣어 다시 호출한다.
- 기대 결과:
  - 두 요청 모두 400으로 실패한다.
  - 기존 정책 상태는 그대로 유지된다.
- 회귀 방지 포인트: repository overlap validation과 DB unique/atomic replacement 정책을 같이 유지한다. `tests/unit/phase2-ops-repository.spec.ts`

### TC-E12: policy replacement partially writes rank codes

- ID: TC-E12
- 위험 시나리오: 정책 저장 중 rank code는 갱신됐지만 policy rule 저장은 실패해 반쪽 상태가 남는다.
- 왜 운영에서 문제가 되는지: 다음 recheck부터 어떤 정책이 적용되는지 예측할 수 없고 rollback이 어렵다.
- 테스트 단계:
  1. 기존 rank/default policy를 준비한다.
  2. RPC 내부 실패를 유도할 수 있는 잘못된 payload 또는 테스트 double로 `replace_off_request_policy_setup_atomic` 실패를 만든다.
  3. 저장 후 rank codes와 policy rules를 다시 조회한다.
- 기대 결과:
  - 전체 저장은 실패한다.
  - 기존 rank codes와 policy rules가 원자적으로 유지된다.
- 회귀 방지 포인트: delete/insert를 브라우저 또는 repository에서 순차 실행하지 말고 `replace_off_request_policy_setup_atomic` RPC를 사용한다. `tests/unit/phase2-ops-repository.spec.ts`

### TC-E13: default-only policy save includes blank rank-code drafts

- ID: TC-E13
- 위험 시나리오: default policy만 저장하려는데 UI의 빈 rank-code draft가 함께 전송된다.
- 왜 운영에서 문제가 되는지: 빈 code row가 생기거나 backend validation이 불필요하게 실패해 파일럿 admin이 default policy를 저장하지 못한다.
- 테스트 단계:
  1. OffRequestPolicyTable에서 rank code를 추가하지 않은 상태로 default monthly policy만 둔다.
  2. 정책 저장을 누른다.
  3. emitted payload 또는 network payload를 확인한다.
- 기대 결과:
  - `rankCodes`는 빈 배열이다.
  - default policy rule만 전송된다.
- 회귀 방지 포인트: UI save payload에서 빈 rank-code draft를 filter한다. `tests/unit/off-request-policy-table.spec.ts`

### TC-E14: non-Off request codes count toward policy limit

- ID: TC-E14
- 위험 시나리오: `request_code`가 `H`, `E`, `L` 등인 row가 Off 요청 한도에 포함된다.
- 왜 운영에서 문제가 되는지: 실제 Off 요청이 아닌 항목 때문에 간호사의 Off 요청이 부당하게 거부된다.
- 테스트 단계:
  1. 같은 직원에게 `request_code='O'` row와 `request_code='H'` noise row를 만든다.
  2. monthly/annual limit이 임계값에 걸리도록 policy를 설정한다.
  3. recheck를 실행한다.
  4. `schedule_preferences.policy_check_status`와 rejection reason을 확인한다.
- 기대 결과:
  - 정책 카운트는 `request_code === 'O'`만 포함한다.
  - non-Off row는 policy fields가 null이거나 count에 영향을 주지 않는다.
- 회귀 방지 포인트: annual historical count와 current preference evaluation 모두 `.eq('request_code', 'O')` 조건을 유지한다. `tests/unit/phase2-schedule-write-repository.spec.ts`, `tests/unit/phase2-schedule-repository.spec.ts`

### TC-E15: draft/review-in-progress/compare-only ledger contamination

- ID: TC-E15
- 위험 시나리오: draft, review-in-progress, compare-only version이 rolling fairness ledger에 기록된다.
- 왜 운영에서 문제가 되는지: 확정되지 않은 후보안이 누적 공정성 이력에 섞여 다음 달 운영 판단과 fairness summary를 오염시킨다.
- 테스트 단계:
  1. draft version finalize를 시도한다.
  2. review_pending version finalize를 시도한다.
  3. review_ready이지만 selected version이 아닌 compare-only version finalize를 시도한다.
  4. 각 시도 후 `fairness_ledger_monthly` row 수와 finalize RPC 호출 여부를 확인한다.
- 기대 결과:
  - draft/review_pending은 `not_review_ready`로 차단된다.
  - compare-only는 `not_selected_version`으로 차단된다.
  - finalize RPC와 ledger write는 발생하지 않는다.
- 회귀 방지 포인트: `assertVersionFinalizableForLedger`의 selected/review_ready/finalized guard를 유지한다. `tests/unit/phase2-schedule-write-repository.spec.ts`

### TC-E16: finalize retry duplicate ledger write

- ID: TC-E16
- 위험 시나리오: 네트워크 재시도 또는 사용자의 중복 클릭으로 같은 finalized version에 대해 ledger row가 중복 생성된다.
- 왜 운영에서 문제가 되는지: rolling fairness summary가 같은 month를 2번 계산해 fairness 수치가 왜곡된다.
- 테스트 단계:
  1. selected review_ready version을 finalize한다.
  2. 같은 version으로 finalize를 다시 호출한다.
  3. ledger unique key 또는 RPC 결과를 확인한다.
- 기대 결과:
  - 두 호출 모두 idempotent하게 처리되거나 두 번째 호출이 중복 write 없이 수렴한다.
  - `fairness_ledger_monthly`는 같은 finalized version/month에 대해 중복 row를 만들지 않는다.
- 회귀 방지 포인트: ledger write는 finalize RPC 내부의 uniqueness/idempotency에 묶어두고 public write route를 추가하지 않는다. `tests/unit/phase2-schedule-write-repository.spec.ts`

### TC-E17: checklist ready while required table state is missing

- ID: TC-E17
- 위험 시나리오: `onboarding_progress.current_step_key`만 schedule_review로 이동했는데 실제 site, employee, policy, schedule 데이터가 비어 있다.
- 왜 운영에서 문제가 되는지: pilot admin이 준비되지 않은 상태에서 go-live로 진입해 첫 운영 근무표 생성이 실패한다.
- 테스트 단계:
  1. `onboarding_progress.current_step_key='schedule_review'`로 설정한다.
  2. `sites`, `site_requirements`, `employees`, default monthly/annual policy 중 하나 이상을 비운다.
  3. `GET /checklist`를 호출한다.
- 기대 결과:
  - checklist item은 실제 누락 데이터 기준으로 blocked다.
  - cursor는 표시될 수 있지만 readiness를 강제로 ready로 만들지 않는다.
- 회귀 방지 포인트: checklist는 `buildChecklistResponse`의 table snapshot reducer를 authoritative source로 사용한다. `tests/unit/phase2-ops-checklist.spec.ts`

### TC-E18: fairness summary includes draft/noise ledger rows

- ID: TC-E18
- 위험 시나리오: read-only fairness aggregate가 `result_status='passed'` finalized row가 아닌 draft/noise row까지 집계한다.
- 왜 운영에서 문제가 되는지: dashboard/Step5의 누적 공정성 설명이 확정 운영 이력과 달라진다.
- 테스트 단계:
  1. `fairness_ledger_monthly`에 `result_status='passed'` finalized row와 `result_status='draft'` noise row를 함께 준비한다.
  2. `GET /checklist`를 호출한다.
  3. 3/6/12개월 summary의 window end month와 finalized count를 확인한다.
- 기대 결과:
  - summary는 passed row만 집계한다.
  - draft/noise row의 proof summary 값은 aggregate에 반영되지 않는다.
- 회귀 방지 포인트: `loadFairnessLedgerMonthlyRows`에서 `result_status='passed'` filter를 유지한다. `tests/unit/phase2-ops-checklist.spec.ts`

## 5. 추천 자동화 우선순위

P0: 반드시 자동화해야 하는 테스트

- TC-E08: validate 이후 finalized month apply 차단
- TC-E15: draft/review_pending/compare-only ledger contamination 방지
- TC-E16: finalize retry duplicate ledger write 방지
- TC-E07: `site_requirements` canonical staffing source 보존
- TC-E14: `request_code === 'O'`만 Off 정책 count에 포함
- TC-E10, TC-E11, TC-E12: inactive/unknown/overlap policy와 atomic replacement 실패 방지
- TC-E02, TC-N02: bootstrap auth와 non-bootstrap ops auth 분리

P1: 가능하면 자동화할 테스트

- TC-N04, TC-N05, TC-N06: organization/site/shift foundation backend routes
- TC-N08, TC-N09: Step3 validate/apply 분리와 `rankCode` 보존
- TC-N10: 서버 측 policy persistence와 Step4/Step5 rejection reason 표시
- TC-N12, TC-E17, TC-E18: checklist reducer와 read-only fairness summary
- TC-E03: CORS/OPTIONS preflight 회귀
- TC-E13: default-only policy blank rank-code draft filter

Manual: 수동 QA로 충분한 테스트

- TC-N01: 실제 operator-assisted bootstrap handoff와 Auth metadata 확인
- TC-N03: 배포 환경별 CORS preflight smoke test
- TC-N07: Step2 화면의 primary site context와 staffing 저장 UX 확인
- TC-N11: 운영 DB에서 finalize 후 ledger/RPC side effect 확인
- TC-N12: Dashboard checklist deep link와 Step5 read-only summary의 실제 화면 copy 확인
