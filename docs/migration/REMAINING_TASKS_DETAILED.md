# 남은 태스크 상세 목록 (Detailed Remaining Tasks)

현재 `.shrimp-data/tasks.json`에 정의된 총 126개의 평면화된 세부 태스크 상세 목록입니다.

## P0 Phase (예상 시간: 16시간 30분)

### P0-1.1 운영 규칙/DoD 문서 초안 작성
- **설명(Description)**: REFINED_PRD 서비스 전환을 위한 운영 원칙(Definition of Done, 브랜치 전략, 태스크 상태 규칙, 리뷰/테스트 기준)을 문서화한다.
- **구현 가이드(Guide)**: 1) DoD(코드/테스트/문서/보안) 항목 정의. 2) 브랜치/PR/리뷰 규칙 정의. 3) 태스크 상태 전이 규칙(pending/in_progress/completed) 정의.
- **검증 기준(Verification)**: 문서에 DoD와 브랜치/PR 규칙이 포함되어 있고, 팀이 그대로 따라할 수 있다.
- **선행 조건(Dependencies)**: 없음
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/REFINED_PRD.md`, `docs/migration/REFINED_PRD_SERVICE_TRANSITION.md`

### P0-1.2 품질 게이트(릴리스 전 체크) 기준 확정
- **설명(Description)**: Private Beta 릴리스를 위한 품질 게이트(필수 실행 명령/통과 기준/실패 시 대응)를 확정한다.
- **구현 가이드(Guide)**: 1) 필수 명령(pnpm lint/test:unit/build)과 실행 순서 정의. 2) E2E 포함 조건(권한/가입/온보딩 변경 시 등) 정의. 3) 실패 시 triage/rollback 규칙 정의.
- **검증 기준(Verification)**: 게이트 체크리스트가 문서화되어 있고, 각 항목의 실행 명령과 통과 기준이 명확하다.
- **선행 조건(Dependencies)**: P0-1.1
- **예상 소요 시간**: 120분
- **관련 파일**: `package.json`, `scripts/quality-gate.sh`

### P0-1.3 Shrimp 태스크 작성 규칙(템플릿) 확정
- **설명(Description)**: Shrimp Task Manager에서 사용할 태스크 템플릿(필수 필드, relatedFiles 표준, 의존성 표기, 예상 시간 기준)을 확정한다.
- **구현 가이드(Guide)**: 1) 태스크 필수 항목(description/implementationGuide/verificationCriteria) 템플릿 정의. 2) 1~3시간 단위 기준(estimatedMinutes) 정의. 3) 이름 규칙(Px-y.z + 태그) 정의.
- **검증 기준(Verification)**: 템플릿이 합의되어 있고, 새 태스크를 추가할 때 일관된 형태로 작성할 수 있다.
- **선행 조건(Dependencies)**: P0-1.2
- **예상 소요 시간**: 90분
- **관련 파일**: `.shrimp-data/tasks.json`, `.shrimp-data/tasks.metadata.json`

### P0-2.1 PRD→Phase 매핑 점검(누락/중복) 정리
- **설명(Description)**: REFINED_PRD의 요구사항을 P0~P10 Phase에 매핑하고, 누락/중복 범위를 체크하여 백로그에 반영한다.
- **구현 가이드(Guide)**: 1) PRD 섹션(권한/가입/온보딩/관리/알림/대시보드)을 Phase로 매핑. 2) 누락 요구를 하위 태스크로 추가. 3) 중복/범위 충돌은 notes로 정리.
- **검증 기준(Verification)**: PRD 주요 섹션이 모두 Phase에 연결되어 있고, 누락된 공통 기능이 없다.
- **선행 조건(Dependencies)**: P0-1.3
- **예상 소요 시간**: 60분
- **관련 파일**: `docs/REFINED_PRD.md`, `.shrimp-data/tasks.json`

### P0-2.2 에픽별 하위 태스크 분해(1~3h) + 의존성 그래프 작성
- **설명(Description)**: P0~P10 에픽을 실행 가능한 1~3시간 단위 하위 태스크로 쪼개고, 태스크 간 의존성(critical path)을 명확히 연결한다.
- **구현 가이드(Guide)**: 1) 각 에픽을 설계/구현/검증 단계로 분해. 2) 선행 조건은 dependencies로 연결. 3) 실행 순서가 모호하면 notes에 결정사항 기록.
- **검증 기준(Verification)**: 모든 에픽에 1~3시간 단위 하위 태스크가 존재하고, 의존성 그래프가 끊기지 않는다.
- **선행 조건(Dependencies)**: P0-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `.shrimp-data/tasks.json`

### P0-2.3 태스크 품질 표준화(검증기준/relatedFiles/추정치) 정리
- **설명(Description)**: 백로그 태스크의 verificationCriteria, relatedFiles, estimatedMinutes를 표준화하여 실행/검증 가능 상태로 만든다.
- **구현 가이드(Guide)**: 1) 각 태스크에 체크리스트형 검증기준 추가. 2) 수정/생성 파일을 relatedFiles에 명시. 3) 1~3시간 범위 벗어나는 태스크는 재분해.
- **검증 기준(Verification)**: 대부분의 태스크가 '실행 방법 + 검증 방법'을 포함하고, 추정치가 일관되다.
- **선행 조건(Dependencies)**: P0-2.2
- **예상 소요 시간**: 90분
- **관련 파일**: `.shrimp-data/tasks.json`

### P0-3.1 Phase KPI/릴리스 준비도(Ready) 정의
- **설명(Description)**: 각 Phase의 완료 정의(산출물/테스트/보안)와 Private Beta 릴리스 준비도 지표를 정의한다.
- **구현 가이드(Guide)**: 1) Phase별 산출물 목록 정의. 2) 필수 테스트/보안 체크 항목 정의. 3) Ready/Not Ready 판정 기준 정의.
- **검증 기준(Verification)**: 각 Phase에 대해 '완료' 판정이 가능한 지표/체크리스트가 문서화되어 있다.
- **선행 조건(Dependencies)**: P0-2.3
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/migration/REFINED_PRD_SERVICE_TRANSITION.md`

### P0-3.2 마이그레이션 대시보드(문서) 구조 설계
- **설명(Description)**: Phase별 진행률/블로커/리스크/릴리스 체크를 한 페이지에서 추적할 수 있는 문서 대시보드 구조를 설계한다.
- **구현 가이드(Guide)**: 1) Phase 테이블(상태/완료조건/담당) 레이아웃 정의. 2) Risk/Blocker 등록 포맷 정의. 3) 릴리스 체크리스트 섹션 정의.
- **검증 기준(Verification)**: 문서 대시보드 목차/섹션이 정의되어 있고, 팀이 동일 포맷으로 업데이트할 수 있다.
- **선행 조건(Dependencies)**: P0-3.1
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/README.md`

### P0-3.3 Shrimp 상태 조회 표준(쿼리/리포트) 정의
- **설명(Description)**: Shrimp list/query를 사용해 진행상태를 추적하는 표준 명령/보고 방식(수동 또는 스크립트)을 정의한다.
- **구현 가이드(Guide)**: 1) Phase별 조회 기준(이름 prefix/phase 필드) 정의. 2) weekly 리포트 템플릿 정의. 3) 필요 시 간단한 export 방식(수동 복사) 정의.
- **검증 기준(Verification)**: 누구나 동일 명령/포맷으로 현재 상태를 보고할 수 있다.
- **선행 조건(Dependencies)**: P0-3.2
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/setup/MCP_INSTALLATION.md`

---

## P1 Phase (예상 시간: 23시간 0분)

### P1-1.1 멀티테넌트/RBAC 데이터 모델 확정(ERD 수준)
- **설명(Description)**: profiles, organization_memberships, signup_requests, approval_logs, organization_settings, sites/skills/ranks 등 서비스 전환에 필요한 테이블/관계/키를 확정한다.
- **구현 가이드(Guide)**: 1) 테이블 목록/필드/PK/FK 확정. 2) 멀티테넌트 기준 컬럼(organization_id) 적용 범위 정의. 3) 인덱스/유니크 키 초안 작성.
- **검증 기준(Verification)**: PRD 기능을 지원하는 최소 테이블/관계가 정의되어 있고, 테넌트 격리 기준이 명확하다.
- **선행 조건(Dependencies)**: P0-1.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/REFINED_PRD.md`, `docs/prd/02-database-migration.md`

### P1-1.2 마이그레이션 007 설계/DDL 초안 작성
- **설명(Description)**: 서비스 전환용 마이그레이션 파일(007_service_transition_rbac_multitenant.sql)의 DDL 초안을 작성하고 적용 순서를 확정한다.
- **구현 가이드(Guide)**: 1) 기존 테이블 확장(비파괴)과 신규 테이블 생성 순서 정의. 2) 인덱스/제약조건 추가. 3) 마이그레이션 주석/롤백 노트 초안 작성.
- **검증 기준(Verification)**: 007 마이그레이션 초안이 존재하고, PRD의 공통 기능 테이블이 포함된다.
- **선행 조건(Dependencies)**: P1-1.1
- **예상 소요 시간**: 180분
- **관련 파일**: `migrations/007_service_transition_rbac_multitenant.sql`

### P1-1.3 Seed/Backfill 기준 정의(기존 MVP 호환)
- **설명(Description)**: 기존 MVP seed.sql 및 운영 데이터가 새 스키마로 자연스럽게 확장되도록 seed/backfill 원칙을 정의한다.
- **구현 가이드(Guide)**: 1) 기본 조직/시프트/직원 seed 유지 원칙 정의. 2) memberships/profiles 기본 생성 규칙 정의. 3) 백필이 필요한 컬럼/테이블 목록화.
- **검증 기준(Verification)**: 기존 MVP 데이터가 서비스 스키마로 확장되는 경로가 문서화되어 있다.
- **선행 조건(Dependencies)**: P1-1.2
- **예상 소요 시간**: 120분
- **관련 파일**: `supabase/seed.sql`

### P1-1.4 Harden 007 migration for legacy site_requirements multitenant scope
- **설명(Description)**: Refine migrations/007_service_transition_rbac_multitenant.sql so it remains idempotent, preserves existing data, and resolves uniqueness-scope conflicts between legacy site_requirements and multitenant expansion fields.
- **구현 가이드(Guide)**: 1) Keep existing ADD COLUMN IF NOT EXISTS strategy for core tables. 2) In site_requirements block: add service columns first, then drop old unique constraint site_requirements_organization_id_shift_id_day_of_week_key using IF EXISTS, then create new UNIQUE index scoped by organization/site/shift/day/skill/rank with COALESCE for nullable columns. 3) Clarify table roles by documenting site_staffing_requirements as service-native and site_requirements as legacy compatibility table.
- **검증 기준(Verification)**: 기존 데이터 row count가 유지되고, site_requirements_organization_id_shift_id_day_of_week_key 제약이 제거되며, organization/site/shift/day/skill/rank 스코프의 UNIQUE 인덱스가 생성되고, 마이그레이션 재실행 시 중복 객체 오류가 발생하지 않는다.
- **선행 조건(Dependencies)**: 없음
- **예상 소요 시간**: 미정
- **관련 파일**: `migrations/007_service_transition_rbac_multitenant.sql`

### P1-2.1 RBAC 판별 로직/헬퍼 함수 설계(정책 기준)
- **설명(Description)**: super/admin/user 역할과 membership 상태(pending/approved 등)를 기반으로 접근 제어를 판별하는 DB 헬퍼/정책 기준을 설계한다.
- **구현 가이드(Guide)**: 1) 역할 판별 기준(우선순위/복수 조직 소속 시) 정의. 2) approved membership만 접근 허용 원칙 정의. 3) 헬퍼 함수/뷰 형태(SQL) 초안 작성.
- **검증 기준(Verification)**: 역할/상태별 접근 허용 규칙이 문서화되어 있고, SQL 구현 형태가 결정되어 있다.
- **선행 조건(Dependencies)**: P1-1.3, P1-1.4, P1-2.3, P7-3.4
- **예상 소요 시간**: 180분
- **관련 파일**: `migrations/008_rls_progressive_rollout.sql`

### P1-2.2 테이블별 RLS 매트릭스 작성 + 적용 순서 결정
- **설명(Description)**: 핵심 테이블(organizations, employees, schedules 등)에 대해 테넌트 격리 RLS 정책 매트릭스를 작성하고 적용 순서를 결정한다.
- **구현 가이드(Guide)**: 1) 테이블별 SELECT/INSERT/UPDATE/DELETE 허용자 정의. 2) super/admin/user 차이를 표로 정리. 3) 적용 순서(테이블 생성→RLS enable→정책) 결정.
- **검증 기준(Verification)**: RLS 정책 표가 존재하고, 모든 핵심 테이블이 누락 없이 포함된다.
- **선행 조건(Dependencies)**: P1-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/prd/02-database-migration.md`

### P1-2.3 RLS 검증 시나리오/테스트 설계(테넌트 침범 방지)
- **설명(Description)**: 타조직 데이터 접근 차단, role escalation, IDOR 등을 포함한 RLS 검증 시나리오와 테스트 전략을 설계한다.
- **구현 가이드(Guide)**: 1) 공격/오용 시나리오 목록화. 2) 최소 e2e 또는 통합테스트 접근 결정. 3) 각 시나리오의 기대 결과(403/빈 결과) 정의.
- **검증 기준(Verification)**: 테넌트 격리/권한 상승 방지에 대한 테스트 케이스 목록이 확정되어 있다.
- **선행 조건(Dependencies)**: P1-2.2
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P1-3.1 백필 대상/매핑 정의 + 검증 쿼리 목록화
- **설명(Description)**: 새 스키마 도입 후 기존 MVP 데이터(조직/직원/스케줄)를 백필할 대상과 매핑 규칙을 정의하고 검증 쿼리를 준비한다.
- **구현 가이드(Guide)**: 1) 백필 필요 컬럼/테이블 목록화. 2) org/code/timezone 등 기본값 정책 정의. 3) 백필 후 검증 쿼리(카운트/무결성) 목록 작성.
- **검증 기준(Verification)**: 백필 매핑과 검증 쿼리가 문서로 정리되어 있다.
- **선행 조건(Dependencies)**: P1-1.3, P1-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/prd/02-database-migration.md`

### P1-3.2 백필 SQL/절차 초안 작성(멱등/재실행 가능)
- **설명(Description)**: 백필을 위한 SQL/절차를 작성하고, 재실행 시 안전(멱등성)하게 동작하도록 전략을 확정한다.
- **구현 가이드(Guide)**: 1) upsert/insert-ignore 전략 결정. 2) membership/profiles 기본 생성 규칙 적용. 3) 실패 시 롤백/재시도 절차 문서화.
- **검증 기준(Verification)**: 백필 절차가 단계별로 정의되어 있고, 재실행 시 중복/오염 위험이 낮다.
- **선행 조건(Dependencies)**: P1-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `migrations/008_backfill_service_fields.sql`

### P1-3.3 백필 후 검증(무결성/샘플 플로우) 체크리스트
- **설명(Description)**: 백필 적용 후 데이터 무결성(참조, 카운트)과 핵심 샘플 플로우(로그인/조직 조회 등) 검증 체크리스트를 확정한다.
- **구현 가이드(Guide)**: 1) 레코드 수/참조 무결성 체크 항목 작성. 2) 샘플 계정/조직으로 조회/편집 플로우 정의. 3) 이슈 발생 시 복구 절차 연결.
- **검증 기준(Verification)**: 검증 체크리스트가 존재하고, 백필 성공/실패를 객관적으로 판단할 수 있다.
- **선행 조건(Dependencies)**: P1-3.2
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/final-verification-report.md`

---

## P2 Phase (예상 시간: 34시간 30분)

### P2-1.1 회원가입 UX/필드/상태(승인대기/반려) 스펙 확정
- **설명(Description)**: admin/user 가입 UX를 확정하고 필수/선택 필드, 성공/실패/승인대기 상태 UI를 정의한다. 기존 로그인 화면과 라우팅 구조를 기준으로 /signup 진입 및 제출 후 상태 안내 흐름을 확정한다.
- **구현 가이드(Guide)**: 1) 공통 필드(name,email,password,requestedRole,organizationId)와 role별 선택 필드(workType,shiftType,requestedSiteName,requestedSkillSummary,requestedRankCode,requestedCredit)를 정의한다. 2) 성공 시 pending 안내 메시지/상태 카드 UX를 정의한다. 3) Login 페이지에서 signup 진입 CTA를 정의한다.
- **검증 기준(Verification)**: 회원가입 화면의 입력 필드/상태별 UX(성공/실패/승인대기)가 명확히 문서화되고, 구현 대상 경로와 라우팅 흐름이 확정된다.
- **선행 조건(Dependencies)**: P1-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`, `src/views/auth/Login.vue`, `src/views/auth/Signup.vue`, `src/router/index.ts`

### P2-1.2 DB 규칙: signup_requests 생성 및 membership 생성 타이밍 정의
- **설명(Description)**: 가입 제출 시 signup_requests 생성 규칙과 승인 시 membership 반영 타이밍을 상태 전이 관점으로 확정한다.
- **구현 가이드(Guide)**: 1) signup_requests.status 전이(pending->approved/rejected/withdrawn)와 중복 신청 정책을 정의한다. 2) approved 시 organization_memberships 생성/갱신 규칙(role,status,approved_by,approved_at)을 정의한다. 3) requester_user_id 및 organization_id 참조 무결성 조건을 명시한다.
- **검증 기준(Verification)**: 가입 제출 전후 DB 기대 상태와 승인 이후 membership 반영 타이밍이 문서화되어 상태 전이가 모호하지 않다.
- **선행 조건(Dependencies)**: P2-1.1
- **예상 소요 시간**: 120분
- **관련 파일**: `migrations/007_service_transition_rbac_multitenant.sql`, `docs/API_SPEC.md`

### P2-1.3 가입 제출 API 설계(Edge Function/RPC) + 입력 검증
- **설명(Description)**: Signup 제출 서버 경계를 명확히 하고 production edge-function 우선 정책 및 dev-only fallback 정책을 포함한 API 계약을 정의한다.
- **구현 가이드(Guide)**: 1) 요청/응답 DTO를 정의한다. 2) 클라이언트 API 래퍼 `src/api/signup.ts`에서 `supabase.functions.invoke('signup-submit')`를 기본 경로로 설계한다. 3) function 미구현 시 dev 환경에서만 제한적 fallback 경로를 허용한다. 4) 에러 코드를 UI 친화 메시지로 매핑한다.
- **검증 기준(Verification)**: 가입 제출 API의 요청/응답/에러 계약이 확정되고, production/dev 경계 정책이 명시된다.
- **선행 조건(Dependencies)**: P2-1.2
- **예상 소요 시간**: 180분
- **관련 파일**: `supabase/functions/signup-submit/index.ts`, `src/api/signup.ts`, `src/api/supabase.ts`, `docs/API_SPEC.md`

### P2-1.4 UI: 회원가입 페이지 구현(제출/검증/결과)
- **설명(Description)**: 회원가입 페이지를 구현하고, store/API를 통해 가입 요청을 전송한 뒤 승인대기 안내까지 연결한다.
- **구현 가이드(Guide)**: 1) `src/views/auth/Signup.vue`에 Naive UI 기반 폼과 검증 규칙을 구현한다. 2) `src/stores/auth.ts`에 `signup` action을 추가해 `src/api/signup.ts`를 호출한다. 3) `src/router/index.ts`에 `/signup` 공개 라우트를 추가하고 Login에서 이동 링크를 제공한다. 4) 성공/실패/로딩 상태를 UI에 반영한다.
- **검증 기준(Verification)**: 가입 제출 시 요청이 전송되고, 성공/실패/로딩 상태가 화면에 올바르게 표시되며 성공 시 승인대기 안내가 노출된다.
- **선행 조건(Dependencies)**: P2-1.3
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/auth/Signup.vue`, `src/stores/auth.ts`, `src/router/index.ts`, `src/views/auth/Login.vue`, `src/utils/message.ts`

### P2-1.5 가입 제출 스모크 테스트 시나리오 정의
- **설명(Description)**: 가입 제출 플로우의 최소 검증 시나리오를 문서화해 기능 회귀를 방지한다.
- **구현 가이드(Guide)**: 1) Happy path: 폼 입력->제출->signup_requests 생성->승인대기 메시지 표시 시나리오 정의. 2) Fail path: 필수값 누락/이메일 형식 오류/중복 신청/함수 실패 케이스 정의. 3) 기대 결과(상태 코드, 메시지, DB 상태)를 명시한다.
- **검증 기준(Verification)**: 가입 기능의 happy/fail 최소 시나리오가 문서화되고, 각 시나리오별 기대 결과(UI/DB/에러)가 명확히 정의된다.
- **선행 조건(Dependencies)**: P2-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/test-validation-guide.md`, `src/views/auth/Signup.vue`, `src/api/signup.ts`

### P2-2.1 승인 상태 모델링: membership/status 기반 접근 제어 설계
- **설명(Description)**: 로그인 후 현재 사용자의 승인 상태(approved/pending/rejected)를 식별하고, 앱 접근 정책을 설계한다.
- **구현 가이드(Guide)**: 1) 승인 상태별 허용 라우트 정의. 2) membership 조회 방법(테이블/뷰) 결정. 3) 상태 전이 시 UX(재로그인/새로고침) 정의.
- **검증 기준(Verification)**: 승인 상태별 접근 정책이 명확하고, 스토어/라우터 변경 범위가 결정되어 있다.
- **선행 조건(Dependencies)**: P2-1.5
- **예상 소요 시간**: 120분
- **관련 파일**: `src/stores/auth.ts`, `src/stores/rbac.ts`

### P2-2.2 Route guard 설계: 미승인 사용자 차단 + 전용 라우팅
- **설명(Description)**: 승인되지 않은 사용자가 서비스 화면에 접근하지 못하도록 라우터 가드 규칙과 전용 페이지 경로를 설계한다.
- **구현 가이드(Guide)**: 1) 승인 전용 라우트(/access/pending 등) 결정. 2) requiresAuth 이후 승인 체크 순서 결정. 3) 예외 라우트(login/signup) 정의.
- **검증 기준(Verification)**: 승인되지 않은 계정은 보호된 라우트에 접근 시 전용 화면으로 리다이렉트된다.
- **선행 조건(Dependencies)**: P2-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/router/index.ts`, `src/router/guards.ts`

### P2-2.3 UI: 승인대기/반려 화면 스펙 및 컴포넌트 정의
- **설명(Description)**: 승인 대기/반려 상태의 사용자에게 보여줄 화면(메시지, 다음 행동, 문의/재신청)을 정의한다.
- **구현 가이드(Guide)**: 1) pending/rejected 상태별 콘텐츠 결정. 2) 재신청/로그아웃 버튼 등 CTA 정의. 3) 공지/알림 연계 여부 결정(P8 연계).
- **검증 기준(Verification)**: 상태별 화면 요구사항이 정의되어 있고, 구현할 컴포넌트 경로가 결정되어 있다.
- **선행 조건(Dependencies)**: P2-2.2
- **예상 소요 시간**: 120분
- **관련 파일**: `src/views/auth/AccessState.vue`

### P2-2.4 승인 상태별 라우팅 테스트 시나리오 정의
- **설명(Description)**: approved/pending/rejected 사용자 각각에 대해 라우팅/메뉴 접근이 올바른지 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 상태별 허용 라우트 목록화. 2) 기대 리다이렉트/메시지 정의. 3) 최소 E2E 1개 시나리오 포함 여부 결정.
- **검증 기준(Verification)**: 승인 상태별 테스트 케이스가 문서화되어 있다.
- **선행 조건(Dependencies)**: P2-2.3
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P2-3.1 승인/반려 워크플로우 정책 확정(권한/감사로그)
- **설명(Description)**: super/admin의 승인/반려 권한 범위, 결정 사유 기록, 감사 로그(approval_logs) 기록 정책을 확정한다.
- **구현 가이드(Guide)**: 1) 승인 주체(super vs admin)와 범위(전조직 vs 자기조직) 정의. 2) decision_note 필수 여부 결정. 3) 감사로그 최소 필드 정의.
- **검증 기준(Verification)**: 승인/반려 정책이 문서화되어 있고, 데이터 모델에 매핑된다.
- **선행 조건(Dependencies)**: P2-1.5
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P2-3.2 승인 결정 API 계약 정의(approve/reject/withdraw)
- **설명(Description)**: 승인/반려/철회 결정을 수행하는 서버 API(Edge Function 또는 RPC)의 요청/응답/오류 계약을 정의한다.
- **구현 가이드(Guide)**: 1) 입력(requestId, decision, note) 스키마 정의. 2) 멱등 처리(중복 승인/반려) 정책 정의. 3) 성공 시 memberships/로그 업데이트 규칙 정의.
- **검증 기준(Verification)**: 승인 결정 API 계약이 문서화되어 있고, 멱등/권한 체크가 포함된다.
- **선행 조건(Dependencies)**: P2-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `supabase/functions/approval-decision/index.ts`, `docs/API_SPEC.md`

### P2-3.3 UI: 승인 대기 목록/필터/상세 화면 스펙
- **설명(Description)**: 관리자(슈퍼/어드민)가 가입 신청을 조회/필터/상세 확인할 수 있는 UI 요구사항을 정의한다.
- **구현 가이드(Guide)**: 1) 목록 컬럼/필터(status, role, org) 정의. 2) 상세 패널/모달 구성 정의. 3) approve/reject CTA 위치/확인 다이얼로그 정의.
- **검증 기준(Verification)**: 승인 관리 UI의 화면 구성/필터/액션이 문서화되어 있다.
- **선행 조건(Dependencies)**: P2-3.2
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/management/AccountManagement.vue`

### P2-3.4 승인 결과 알림 이벤트 생성 정책 정의
- **설명(Description)**: 승인/반려 시 앱내/이메일 알림을 위한 이벤트(notification_events) 생성 시점과 페이로드를 정의한다(발송은 P8).
- **구현 가이드(Guide)**: 1) 이벤트 타입(signup_approved/signup_rejected) 정의. 2) 제목/메시지 템플릿 초안 작성. 3) 중복 방지/재발송 정책 초안 작성.
- **검증 기준(Verification)**: 승인 알림 이벤트 생성 규칙과 페이로드가 정의되어 있다.
- **선행 조건(Dependencies)**: P2-3.2
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/REFINED_PRD.md`

### P2-3.5 End-to-End 승인 플로우 테스트 시나리오 정의
- **설명(Description)**: 가입→승인→로그인 허용→권한별 메뉴 노출까지의 E2E 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 계정 생성/승인/로그인 단계를 단계별로 기술. 2) 기대 라우팅/메뉴/데이터 접근 정의. 3) 최소 실패 케이스 1개 포함.
- **검증 기준(Verification)**: 승인 플로우의 E2E 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P2-3.3, P2-3.4
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

---

## P3 Phase (예상 시간: 22시간 30분)

### P3-1.1 온보딩 상태 머신(3단계) + 저장 범위 확정
- **설명(Description)**: admin 최초 로그인 온보딩의 단계(조직정보 확인→직원 등록→스케줄 요청)와 저장 범위(조직/사용자)를 확정한다.
- **구현 가이드(Guide)**: 1) 단계 목록과 완료 조건 정의. 2) 조직 단위 완료 여부와 사용자별 진행 저장 여부 결정. 3) UI 이동 경로(메뉴 링크) 결정.
- **검증 기준(Verification)**: 온보딩 단계/완료 조건이 확정되어 있고, 저장 모델이 결정되어 있다.
- **선행 조건(Dependencies)**: P1-1.3, P1-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P3-1.2 온보딩 진행 API 계약 정의(get/update)
- **설명(Description)**: 온보딩 진행 정보를 조회/업데이트하는 API 계약(서버 경계, 보안, 요청/응답)을 정의한다.
- **구현 가이드(Guide)**: 1) progress payload(JSONB) 형태 정의. 2) admin만 업데이트 허용 정책 포함. 3) 초기값 생성 규칙 정의.
- **검증 기준(Verification)**: 온보딩 진행 API 계약이 문서화되어 있고, 권한/보안 기준이 포함된다.
- **선행 조건(Dependencies)**: P3-1.1
- **예상 소요 시간**: 180분
- **관련 파일**: `supabase/functions/onboarding-progress/index.ts`

### P3-1.3 프론트 스토어/캐시 전략 정의(온보딩)
- **설명(Description)**: 온보딩 진행 상태를 프론트에서 어떻게 로딩/캐시/동기화할지 전략을 정의한다(리프레시/다중탭 고려).
- **구현 가이드(Guide)**: 1) 로컬스토리지 사용 여부 결정. 2) 조직 전환/로그아웃 시 초기화 규칙 정의. 3) API 실패 시 fallback UX 정의.
- **검증 기준(Verification)**: 온보딩 상태의 로딩/저장/초기화 규칙이 명확히 정의되어 있다.
- **선행 조건(Dependencies)**: P3-1.2
- **예상 소요 시간**: 90분
- **관련 파일**: `src/stores/onboarding.ts`

### P3-2.1 온보딩 위저드 UI 플로우/콘텐츠 확정
- **설명(Description)**: 온보딩 위저드 화면 구성(단계별 설명, CTA, 하이라이트 대상 메뉴)을 확정한다.
- **구현 가이드(Guide)**: 1) 단계별 텍스트/도움말 작성. 2) 버튼/이동 경로 정의. 3) 완료 시 대시보드 이동 규칙 정의.
- **검증 기준(Verification)**: 온보딩 UI가 단계별로 어떤 행동을 유도하는지 문서화되어 있다.
- **선행 조건(Dependencies)**: P3-1.3
- **예상 소요 시간**: 120분
- **관련 파일**: `src/views/Onboarding.vue`

### P3-2.2 온보딩 페이지 구현 계획(컴포넌트/라우트/스토어)
- **설명(Description)**: 온보딩 페이지를 추가하기 위한 구현 계획(라우트, 스토어 연동, 진행 저장)을 수립한다.
- **구현 가이드(Guide)**: 1) 라우트/메뉴 접근 제약 정의(admin only). 2) 단계 완료 처리(스토어 update) 정의. 3) 완료 시 onboarding_completed 플래그 저장 경로 결정.
- **검증 기준(Verification)**: 온보딩 구현 범위(라우트/스토어/API)가 명확히 정의되어 있다.
- **선행 조건(Dependencies)**: P3-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/router/index.ts`, `src/views/Onboarding.vue`

### P3-2.3 메뉴 하이라이트/딥링크 UX 설계(직원관리/엑셀 업로드)
- **설명(Description)**: 온보딩 단계에서 특정 메뉴로 유도하는 하이라이트/딥링크 UX를 설계한다.
- **구현 가이드(Guide)**: 1) 하이라이트 방식(클래스/스크롤/툴팁) 결정. 2) 메뉴 경로(직원관리/스케줄요청) 연결. 3) 접근 불가 시 안내 메시지 정의.
- **검증 기준(Verification)**: 온보딩 단계에서 사용자가 다음 행동을 쉽게 찾을 수 있는 UX가 정의되어 있다.
- **선행 조건(Dependencies)**: P3-2.2
- **예상 소요 시간**: 120분
- **관련 파일**: `src/components/layout/Sidebar.vue`

### P3-2.4 온보딩 E2E 테스트 시나리오 정의
- **설명(Description)**: admin 최초 로그인→온보딩 강제→완료→대시보드 이동까지의 E2E 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 최초 로그인 조건 정의. 2) 단계별 완료 액션과 기대 라우팅 정의. 3) 완료 후 재접속 시 온보딩 미노출 확인.
- **검증 기준(Verification)**: 온보딩의 성공/실패/재접속 케이스가 테스트 시나리오로 문서화되어 있다.
- **선행 조건(Dependencies)**: P3-2.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P3-3.1 온보딩 강제 가드 규칙 정의(예외 포함)
- **설명(Description)**: 온보딩 미완료 admin을 /onboarding으로 강제하는 규칙과 예외(로그인/가입/승인대기)를 정의한다.
- **구현 가이드(Guide)**: 1) 대상 role(admin)과 조건(onboarding_required) 정의. 2) 예외 라우트 정의. 3) 조직 전환 시 규칙 정의.
- **검증 기준(Verification)**: 온보딩 강제 규칙이 명확히 정의되어 있고, 예외 케이스가 포함된다.
- **선행 조건(Dependencies)**: P3-2.4
- **예상 소요 시간**: 60분
- **관련 파일**: `src/router/guards.ts`

### P3-3.2 온보딩 가드 구현 계획(라우터 beforeEach 흐름)
- **설명(Description)**: 현재 인증/Step 가드 구조에 온보딩 가드를 어떻게 삽입할지 구현 계획을 수립한다.
- **구현 가이드(Guide)**: 1) 인증 체크 이후 승인/온보딩 체크 순서 결정. 2) stepProgressGuard와 충돌 여부 점검. 3) 사용자 메시지/리다이렉트 정의.
- **검증 기준(Verification)**: 온보딩 가드가 기존 가드들과 충돌 없이 동작하도록 설계되어 있다.
- **선행 조건(Dependencies)**: P3-3.1
- **예상 소요 시간**: 120분
- **관련 파일**: `src/router/index.ts`

### P3-3.3 온보딩 가드 테스트 시나리오 정의(우회 방지)
- **설명(Description)**: URL 직접 접근, 새로고침, 로그아웃 등에서 온보딩 가드가 우회되지 않는지 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 우회 시나리오(직접 링크/뒤로가기/탭) 목록화. 2) 기대 결과 정의. 3) 최소 자동화 범위(E2E/유닛) 결정.
- **검증 기준(Verification)**: 온보딩 가드 우회 방지 테스트 케이스가 문서화되어 있다.
- **선행 조건(Dependencies)**: P3-3.2
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/test-validation-guide.md`

---

## P4 Phase (예상 시간: 25시간 30분)

### P4-1.1 계정 관리 리스트/필터 요구사항 확정
- **설명(Description)**: super/admin 계정 관리 화면에서 필요한 목록 컬럼과 필터(상태/역할/조직)를 확정한다.
- **구현 가이드(Guide)**: 1) 목록 컬럼(이메일, 조직, 요청역할, 상태, 생성일) 정의. 2) 필터/정렬 요구 정의. 3) 접근 권한(super/admin) 범위 정의.
- **검증 기준(Verification)**: 계정 관리 리스트/필터 요구사항이 화면 기준으로 정의되어 있다.
- **선행 조건(Dependencies)**: P2-3.5
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P4-1.2 계정 관리 조회 쿼리/API 설계(테넌트 스코프)
- **설명(Description)**: signup_requests/organization_memberships 조회를 위한 쿼리/API 경계를 설계하고, 테넌트 스코프(super vs admin)를 반영한다.
- **구현 가이드(Guide)**: 1) super/admin의 조회 범위 규칙을 쿼리에 반영. 2) 페이지네이션/필터 파라미터 정의. 3) RLS에 의해 누락되는 데이터에 대한 UX 고려.
- **검증 기준(Verification)**: 조회 API 설계가 완료되고, 권한별 스코프가 명확하다.
- **선행 조건(Dependencies)**: P4-1.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/api/approval.ts`

### P4-1.3 UI: 계정 관리 리스트 화면 구현 계획
- **설명(Description)**: 계정 관리 리스트 화면(테이블, 필터 UI, 로딩/에러)을 구현하기 위한 상세 계획을 수립한다.
- **구현 가이드(Guide)**: 1) 테이블 컬럼/필터 컴포넌트 설계. 2) API 호출/디바운스/페이지네이션 처리 계획. 3) 상세 보기(모달/패널) 처리 계획.
- **검증 기준(Verification)**: 계정 관리 UI 구현 범위가 명확하고, 컴포넌트 구조가 결정되어 있다.
- **선행 조건(Dependencies)**: P4-1.2
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/management/AccountManagement.vue`

### P4-1.4 계정 관리 기본 테스트 시나리오 정의
- **설명(Description)**: 계정 관리 리스트의 권한별 접근, 필터 동작, 기본 조회 성공/실패 케이스를 테스트 시나리오로 정의한다.
- **구현 가이드(Guide)**: 1) super/admin/user 접근 가능 여부 정의. 2) 필터 조건별 기대 결과 정의. 3) 최소 자동화(E2E) 범위 정의.
- **검증 기준(Verification)**: 계정 관리 기능의 기본 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P4-1.3
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P4-2.1 계정 액션 정책(approve/reject/withdraw) + 확인 UX 확정
- **설명(Description)**: 계정 관리 화면에서 제공할 approve/reject/withdraw 액션과 확인 다이얼로그/사유 입력 UX를 확정한다.
- **구현 가이드(Guide)**: 1) 액션별 confirmation 문구/사유 입력 필수 여부 정의. 2) 성공/실패 토스트/알림 UX 정의. 3) 되돌리기(undo) 가능 여부 결정.
- **검증 기준(Verification)**: 계정 액션 UX가 확정되어 있고, 구현 시 필요한 입력/검증이 명확하다.
- **선행 조건(Dependencies)**: P4-1.4
- **예상 소요 시간**: 90분
- **관련 파일**: `src/views/management/AccountManagement.vue`

### P4-2.2 승인 결정 API 연동 계획(재사용/에러 처리)
- **설명(Description)**: P2-3에서 정의한 승인 결정 API를 계정 관리 화면에서 재사용하는 연동 계획을 수립한다.
- **구현 가이드(Guide)**: 1) 액션별 API 호출/파라미터 매핑 정의. 2) 실패 유형(RLS/중복)별 메시지 정의. 3) optimistic update 여부 결정.
- **검증 기준(Verification)**: 계정 액션과 승인 결정 API의 연결 방식이 명확히 정의되어 있다.
- **선행 조건(Dependencies)**: P4-2.1
- **예상 소요 시간**: 120분
- **관련 파일**: `src/api/approval.ts`

### P4-2.3 감사로그/알림 이벤트 연동 확인 항목 정의
- **설명(Description)**: 승인/반려 시 approval_logs 기록과 notification_events 생성이 누락되지 않도록 검증 항목을 정의한다.
- **구현 가이드(Guide)**: 1) 승인 후 기대 DB 변경(membership/status) 정의. 2) approval_logs 생성 확인 항목 추가. 3) 알림 이벤트 생성 확인 항목 추가.
- **검증 기준(Verification)**: 승인 액션의 부수효과(로그/알림) 검증 체크리스트가 존재한다.
- **선행 조건(Dependencies)**: P4-2.2
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P4-2.4 계정 액션 E2E 테스트 시나리오 정의
- **설명(Description)**: 승인/반려/철회 액션이 UI에서 정상 동작하는지 E2E 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 승인 성공 케이스 정의. 2) 반려 케이스(사유 포함) 정의. 3) 권한 없음/중복 처리 실패 케이스 정의.
- **검증 기준(Verification)**: 계정 액션 E2E 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P4-2.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P4-3.1 계정 모듈 RBAC 매트릭스(화면/액션/데이터) 작성
- **설명(Description)**: Account module의 RBAC 매트릭스를 작성하여, 역할별로 어떤 화면/액션/데이터가 허용되는지 명확히 한다.
- **구현 가이드(Guide)**: 1) super/admin/user 권한 표 작성. 2) 테넌트 범위(전체 vs 자기조직) 표기. 3) 예외/특이 케이스를 notes로 기록.
- **검증 기준(Verification)**: 계정 모듈 RBAC 매트릭스가 문서화되어 있다.
- **선행 조건(Dependencies)**: P4-2.4
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/migration/REFINED_PRD_SERVICE_TRANSITION.md`

### P4-3.2 RBAC 테스트 전략 정의(유닛/E2E 분리)
- **설명(Description)**: RBAC 매트릭스를 검증하기 위한 유닛 테스트/라우터 가드 테스트/E2E 테스트 범위를 정의한다.
- **구현 가이드(Guide)**: 1) store/guard 로직은 유닛 테스트로 검증. 2) 주요 플로우는 E2E 1~2개로 검증. 3) 데이터 격리는 RLS 검증 케이스로 연결.
- **검증 기준(Verification)**: RBAC 테스트가 어떤 레벨에서 어떻게 검증되는지 합의되어 있다.
- **선행 조건(Dependencies)**: P4-3.1
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P4-3.3 RBAC E2E 케이스 최소 세트 정의(super/admin/user)
- **설명(Description)**: 역할별 접근 차단/허용을 검증하는 최소 E2E 케이스 세트를 정의한다.
- **구현 가이드(Guide)**: 1) super: 전체 조직 조회 가능 케이스. 2) admin: 자기조직만 조회 케이스. 3) user: 계정관리 접근 차단 케이스.
- **검증 기준(Verification)**: RBAC 최소 E2E 케이스가 정의되어 있다.
- **선행 조건(Dependencies)**: P4-3.2
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

---

## P5 Phase (예상 시간: 39시간 0분)

### P5-1.1 조직 관리 범위/권한/필드 스펙 확정
- **설명(Description)**: 조직 정보 CRUD(슈퍼: 전체, 어드민: 자기조직) 범위와 필드(유형/근무패턴/제약)를 확정한다.
- **구현 가이드(Guide)**: 1) 조직 필드 목록 확정(code/timezone/work_pattern 등). 2) super 조직 선택 UX 결정. 3) admin 수정 가능 범위 결정.
- **검증 기준(Verification)**: 조직 관리 스펙(필드/권한/UX)이 확정되어 있다.
- **선행 조건(Dependencies)**: P1-1.3, P1-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P5-1.2 조직 관리 화면 IA/라우트 설계
- **설명(Description)**: 조직 관리 메뉴, 라우트, 화면 구성(조회/수정/탭)을 설계한다.
- **구현 가이드(Guide)**: 1) 라우트 경로(/management/org 등) 결정. 2) super 조직 선택 드롭다운 위치 결정. 3) settings(제약/패턴) 탭 구조 결정.
- **검증 기준(Verification)**: 조직 관리 화면 구조/라우트/메뉴가 결정되어 있다.
- **선행 조건(Dependencies)**: P5-1.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/management/OrganizationManagement.vue`, `src/components/layout/Sidebar.vue`

### P5-1.3 조직/설정 데이터 저장 API 경계 설계
- **설명(Description)**: organizations 및 organization_settings 저장/조회 방식을 설계한다(직접 테이블 접근 vs RPC/함수).
- **구현 가이드(Guide)**: 1) 조회/저장 API 시그니처 정의. 2) RLS에 의해 가능한 접근 방식 결정. 3) 에러 처리/권한 오류 UX 정의.
- **검증 기준(Verification)**: 조직 관리 저장 경계가 결정되어 있고, API 인터페이스가 정의되어 있다.
- **선행 조건(Dependencies)**: P5-1.2
- **예상 소요 시간**: 180분
- **관련 파일**: `src/api/organization.ts`

### P5-1.4 조직 관리 테스트 시나리오 정의(테넌트 격리 포함)
- **설명(Description)**: 조직 관리의 권한/테넌트 격리/필드 검증 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) super: 조직 전환 조회 케이스. 2) admin: 자기조직만 수정 케이스. 3) user: 접근 차단 케이스.
- **검증 기준(Verification)**: 조직 관리 기능 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P5-1.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P5-2.1 시프트/제약/스킬/직급 마스터 UX 설계
- **설명(Description)**: 조직 단위 마스터 데이터(시프트, 제약, 스킬, 직급/크레딧) 관리 UX를 설계한다.
- **구현 가이드(Guide)**: 1) 탭/섹션 구분(shift/constraint/skill/rank) 결정. 2) 활성/비활성 정책 결정. 3) 기본값(3교대, LV1~4) 제공 방식 결정.
- **검증 기준(Verification)**: 마스터 데이터 관리 UX가 결정되어 있다.
- **선행 조건(Dependencies)**: P5-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `src/views/management/OrganizationManagement.vue`

### P5-2.2 시프트 관리 요구사항 확정(시간/코드/표시)
- **설명(Description)**: 시프트를 자유롭게 등록(예: 3교대)하는 요구사항과 검증 규칙(중복 코드, 시간 범위)을 확정한다.
- **구현 가이드(Guide)**: 1) shift_code/시작-종료/색상 등 필드 정의. 2) 중복/겹침 검증 규칙 정의. 3) 기존 D/E/N/O 고정 로직 제거 범위 정의.
- **검증 기준(Verification)**: 시프트 마스터의 필드/검증 규칙이 확정되어 있다.
- **선행 조건(Dependencies)**: P5-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/components/schedule/ShiftManager.vue`

### P5-2.3 근무 제약 설정 요구사항 확정(연속N/주40/주52/휴무/휴식)
- **설명(Description)**: 근무 제약(최대 연속 N, 주 목표/최대, 휴무일, 시프트 변경 최소 휴식)을 저장/표시하는 요구사항을 확정한다.
- **구현 가이드(Guide)**: 1) 제약 필드 목록과 단위(분/시간) 결정. 2) shift_change_rest_rules JSON 스키마 결정. 3) UI 입력 폼/검증 규칙 정의.
- **검증 기준(Verification)**: 근무 제약 설정의 저장 모델과 UI 요구가 확정되어 있다.
- **선행 조건(Dependencies)**: P5-2.2
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/REFINED_PRD.md`

### P5-2.4 스킬/직급 마스터 요구사항 확정(코드/이름/크레딧)
- **설명(Description)**: 조직 스킬/직급 마스터(코드/이름/크레딧) 저장 규칙과 UI 요구사항을 확정한다.
- **구현 가이드(Guide)**: 1) code 유니크 정책 정의. 2) rank credit 기본값 정책 정의. 3) 비활성 처리 및 참조 무결성 정책 정의.
- **검증 기준(Verification)**: 스킬/직급 마스터의 저장 규칙과 UI 요구사항이 확정되어 있다.
- **선행 조건(Dependencies)**: P5-2.3
- **예상 소요 시간**: 180분
- **관련 파일**: `migrations/007_service_transition_rbac_multitenant.sql`

### P5-2.5 마스터 데이터 CRUD 테스트 시나리오 정의
- **설명(Description)**: 시프트/제약/스킬/직급 CRUD의 기본 동작과 스케줄 화면 반영에 대한 스모크 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) CRUD happy-path 정의. 2) 중복 code/참조중 삭제 실패 케이스 정의. 3) 스케줄 step에서 반영 확인 항목 정의.
- **검증 기준(Verification)**: 마스터 데이터 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P5-2.4
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P5-3.1 사이트/요일별 요구인원 도메인 스펙 확정
- **설명(Description)**: 사이트 목록, 요일별 필요 인력, skill/rank 옵션 필터를 포함한 요구인원 도메인 스펙을 확정한다.
- **구현 가이드(Guide)**: 1) site_code/site_name 필드 확정. 2) 요일(0~6) 기준과 shift 연결 규칙 확정. 3) skill/rank 선택적 요구의 저장 모델 확정.
- **검증 기준(Verification)**: 사이트/요구인원 스펙이 확정되어 있고, DB/UI 구현 범위가 결정되어 있다.
- **선행 조건(Dependencies)**: P5-2.5
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P5-3.2 사이트 CRUD 화면/UX 설계
- **설명(Description)**: 사이트 등록/수정/비활성/삭제 UI 흐름과 검증 규칙을 설계한다.
- **구현 가이드(Guide)**: 1) CRUD 액션과 모달/폼 구조 정의. 2) site_code 유니크/검증 규칙 정의. 3) 삭제 대신 비활성 정책 결정.
- **검증 기준(Verification)**: 사이트 CRUD UX와 검증 규칙이 정의되어 있다.
- **선행 조건(Dependencies)**: P5-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/management/SiteManagement.vue`

### P5-3.3 요일별 요구인원 편집 UI(테이블/그리드) 설계
- **설명(Description)**: 사이트별로 요일별 요구인원을 편집하는 UI(테이블/그리드) 요구사항을 설계한다.
- **구현 가이드(Guide)**: 1) 표시 단위(사이트/시프트/요일) 결정. 2) skill/rank 옵션 필터 UX 결정. 3) 저장 단위(일괄 저장/자동 저장) 결정.
- **검증 기준(Verification)**: 요구인원 편집 UI가 사용자가 이해할 수 있는 형태로 설계되어 있다.
- **선행 조건(Dependencies)**: P5-3.2
- **예상 소요 시간**: 180분
- **관련 파일**: `src/components/requirements/SiteStaffRequirementsEditor.vue`

### P5-3.4 DB 저장 모델/인덱스(요구인원) 확정 + 마이그레이션 계획
- **설명(Description)**: site_staff_requirements 저장 모델(유니크 키, 인덱스)을 확정하고 마이그레이션 반영 계획을 수립한다.
- **구현 가이드(Guide)**: 1) unique key 정의(site+shift+dow+skill?+rank?). 2) 쿼리 패턴 기반 인덱스 정의. 3) 기존 site_requirements와의 관계(대체/호환) 정의.
- **검증 기준(Verification)**: 요구인원 저장 모델과 인덱스가 확정되어 있다.
- **선행 조건(Dependencies)**: P5-3.3
- **예상 소요 시간**: 180분
- **관련 파일**: `migrations/007_service_transition_rbac_multitenant.sql`

### P5-3.5 월별 적용(7.2) 테스트 시나리오 정의(요일→월)
- **설명(Description)**: 요일별 요구인원을 계획 월에 적용하여 월별 요구인원 테이블을 생성/수정하는(7.2) 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 계획 월/요일 계산 규칙 정의. 2) 편집/저장 플로우 정의. 3) 엣지케이스(윤년/월 시작 요일) 포함.
- **검증 기준(Verification)**: 요일 요구인원→월 적용 기능의 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P5-3.4
- **예상 소요 시간**: 180분
- **관련 파일**: `src/composables/useSiteRequirements.ts`

---

## P6 Phase (예상 시간: 26시간 0분)

### P6-1.1 직원 관리 권한/스코프 정의
- **설명(Description)**: 직원 관리(조회/수정/삭제/업로드)의 권한 범위(super/admin/user)를 확정한다.
- **구현 가이드(Guide)**: 1) admin: CRUD/업로드 허용. 2) super: 교차 조직 조회/수정 허용 여부 결정. 3) user: 본인 정보만 허용 범위 정의.
- **검증 기준(Verification)**: 직원 관리 권한이 명확히 정의되어 있다.
- **선행 조건(Dependencies)**: P2-3.1, P2-3.5, P5-3.5
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/REFINED_PRD.md`

### P6-1.2 직원 목록/상세 화면 요구사항 확정(필터 포함)
- **설명(Description)**: 직원 목록(사이트/직급/스킬 필터)과 상세 편집 화면의 컬럼/필드/검증을 확정한다.
- **구현 가이드(Guide)**: 1) 컬럼(이름/ID/직급/스킬/사이트/근무가능 시프트) 확정. 2) 필터/검색 요구 확정. 3) 검증(필수/유니크) 정의.
- **검증 기준(Verification)**: 직원 관리 화면의 요구사항(필드/필터/검증)이 확정되어 있다.
- **선행 조건(Dependencies)**: P6-1.1
- **예상 소요 시간**: 120분
- **관련 파일**: `src/views/management/EmployeeManagement.vue`

### P6-1.3 직원 관리 구현 구조 설계(API/컴포넌트/상태)
- **설명(Description)**: 직원 관리 구현을 위한 API 래퍼, 컴포넌트 구조, 상태 관리(스토어) 범위를 설계한다.
- **구현 가이드(Guide)**: 1) 조회/저장 API 시그니처 정의. 2) 목록/상세 컴포넌트 분리 결정. 3) 대량 업로드와 CRUD의 연결 방식 결정.
- **검증 기준(Verification)**: 직원 관리 구현 구조가 결정되어 있고, 파일/컴포넌트 경로가 정의되어 있다.
- **선행 조건(Dependencies)**: P6-1.2
- **예상 소요 시간**: 90분
- **관련 파일**: `src/api/employee.ts`

### P6-2.1 직원 스키마 확장 설계(site/rank/skill/credit/user_id)
- **설명(Description)**: 직원 엔티티에 사이트/직급/스킬/크레딧/auth user 연결을 추가하는 스키마 확장을 설계한다.
- **구현 가이드(Guide)**: 1) site_id/skill_id/rank_id/credit/user_id 컬럼 정의. 2) nullable 정책/삭제 정책 정의. 3) 기존 그리드/엑셀 로직 영향 분석.
- **검증 기준(Verification)**: 직원 확장 스키마가 확정되어 있고, 프론트 타입/영향 범위가 정리되어 있다.
- **선행 조건(Dependencies)**: P6-1.3
- **예상 소요 시간**: 120분
- **관련 파일**: `migrations/007_service_transition_rbac_multitenant.sql`, `src/types/employee.ts`

### P6-2.2 직원 CRUD UX 확정(매핑 선택 포함)
- **설명(Description)**: 직원 생성/수정/삭제 UX(사이트/직급/스킬 선택)와 검증 규칙을 확정한다.
- **구현 가이드(Guide)**: 1) 폼 필드/초기값(직급 크레딧) 정의. 2) 매핑 선택 컴포넌트(셀렉트) 설계. 3) 삭제 정책(soft delete vs inactive) 결정.
- **검증 기준(Verification)**: 직원 CRUD UX와 매핑 선택 방식이 확정되어 있다.
- **선행 조건(Dependencies)**: P6-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/management/EmployeeManagement.vue`

### P6-2.3 직원 데이터 검증 규칙 정의(근무 가능 시프트/사이트 일관성)
- **설명(Description)**: 직원 데이터의 일관성 검증(근무 가능 시프트, 사이트 배정, 직급/크레딧)을 정의한다.
- **구현 가이드(Guide)**: 1) 필수 필드/유니크(ID) 규칙 정의. 2) shift/rank/site 참조 무결성 규칙 정의. 3) UI 에러 메시지 표준 정의.
- **검증 기준(Verification)**: 직원 데이터 검증 규칙과 에러 메시지 정책이 정의되어 있다.
- **선행 조건(Dependencies)**: P6-2.2
- **예상 소요 시간**: 120분
- **관련 파일**: `src/utils/validation.ts`

### P6-2.4 직원 CRUD 테스트 시나리오 정의(RLS 포함)
- **설명(Description)**: 직원 CRUD의 정상/실패 케이스와 테넌트 격리(RLS) 검증을 포함한 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) CRUD happy-path 정의. 2) 권한 없음/타조직 접근 실패 케이스 정의. 3) 검증 실패(필수/중복) 케이스 정의.
- **검증 기준(Verification)**: 직원 CRUD 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P6-2.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P6-3.1 직원 엑셀 템플릿(필드 매핑) 확정
- **설명(Description)**: 직원 엑셀 업로드 템플릿(컬럼, 필수/선택, 값 제약)을 확정하고 샘플 파일 기준을 정의한다.
- **구현 가이드(Guide)**: 1) 컬럼(이름/ID/직급/스킬/사이트/시프트) 확정. 2) 코드 매핑(직급코드/스킬코드) 규칙 정의. 3) 템플릿 다운로드 UX 결정.
- **검증 기준(Verification)**: 엑셀 템플릿이 어떤 필드를 담는지 확정되어 있고, 매핑 규칙이 명확하다.
- **선행 조건(Dependencies)**: P6-2.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/임직원_등록_73.xlsx`, `src/utils/excelTemplate.ts`

### P6-3.2 엑셀 파서/검증/미리보기 UX 설계
- **설명(Description)**: 업로드된 엑셀을 파싱하고 오류를 표시하며, 커밋 전 미리보기를 제공하는 UX/구현 계획을 수립한다.
- **구현 가이드(Guide)**: 1) 파싱 단계(헤더 검증/행 검증) 정의. 2) 오류 표시(행/컬럼) UX 정의. 3) 미리보기 테이블/수정 허용 여부 결정.
- **검증 기준(Verification)**: 엑셀 업로드의 파싱/검증/미리보기 플로우가 정의되어 있다.
- **선행 조건(Dependencies)**: P6-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/components/schedule/EmployeeExcelUpload.vue`

### P6-3.3 커밋(배치 upsert) 및 실패 리포트 정책 정의
- **설명(Description)**: 엑셀 업로드 결과를 DB에 배치 upsert로 반영하고, 실패 행 리포트를 제공하는 정책을 정의한다.
- **구현 가이드(Guide)**: 1) upsert 기준키(id or employee_code) 정의. 2) 부분 실패 시 처리(전체 롤백 vs 부분 반영) 결정. 3) 실패 리포트 형식(CSV/JSON) 결정.
- **검증 기준(Verification)**: 배치 커밋 정책과 실패 리포트 정책이 확정되어 있다.
- **선행 조건(Dependencies)**: P6-3.2
- **예상 소요 시간**: 180분
- **관련 파일**: `src/api/employee.ts`

### P6-3.4 엑셀 업로드 테스트 시나리오 정의(오류/중복/권한)
- **설명(Description)**: 엑셀 업로드의 오류(형식/값), 중복, 권한(RLS) 실패를 포함한 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 잘못된 헤더/값 케이스 정의. 2) 중복 ID 케이스 정의. 3) 권한 없음/타조직 업로드 차단 케이스 정의.
- **검증 기준(Verification)**: 엑셀 업로드 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P6-3.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

---

## P7 Phase (예상 시간: 27시간 30분)

### P7-1.1 Step1 조직 마스터 데이터 연결 계획(시프트/제약)
- **설명(Description)**: Step1(기본 정보)에서 조직 마스터 데이터(시프트/제약/조직정보)를 조회/수정할 수 있도록 연결 계획을 수립한다.
- **구현 가이드(Guide)**: 1) Step1에서 보여줄 조직 정보/시프트/제약 범위 정의. 2) 수정 가능한 항목 결정. 3) 저장 시점/UX 결정.
- **검증 기준(Verification)**: Step1이 조직 마스터 데이터를 기반으로 동작하도록 변경 범위가 정리되어 있다.
- **선행 조건(Dependencies)**: P5-3.5
- **예상 소요 시간**: 120분
- **관련 파일**: `src/views/schedule/Step1BasicInfo.vue`

### P7-1.2 Step2 요일 요구→월 요구 계산/편집/저장 플로우 설계
- **설명(Description)**: Step2에서 사이트별 요일 요구인원을 계획 월에 적용해 월별 요구인원으로 계산/편집/저장하는 플로우를 설계한다.
- **구현 가이드(Guide)**: 1) 계산 규칙(요일 매핑) 정의. 2) 화면 표시 형태(일자 컬럼) 결정. 3) 저장 모델(스냅샷 vs 계산값) 결정.
- **검증 기준(Verification)**: Step2의 월별 요구인원 계산/편집/저장 플로우가 정의되어 있다.
- **선행 조건(Dependencies)**: P7-1.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/schedule/Step2SiteInfo.vue`

### P7-1.3 구 스키마(site_requirements)와 신 스키마 호환 전략 정의
- **설명(Description)**: 기존 site_requirements와 신규 site_staff_requirements 간의 호환/마이그레이션 전략(대체 시점, 데이터 변환)을 정의한다.
- **구현 가이드(Guide)**: 1) 읽기 우선순위(신→구 fallback) 결정. 2) 데이터 변환/백필 방식 결정. 3) 최종 제거(구 스키마 사용처 제거) 기준 정의.
- **검증 기준(Verification)**: 호환 전략이 문서화되어 있고, 단계적 전환 경로가 명확하다.
- **선행 조건(Dependencies)**: P7-1.2
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/prd/02-database-migration.md`

### P7-1.4 스케줄 플로우 회귀 방지 체크리스트(그리드/엑셀/solver)
- **설명(Description)**: Step1/2 변경이 Step3~5(직원/초기데이터/solver/결과)에 영향을 주지 않도록 회귀 방지 체크리스트를 만든다.
- **구현 가이드(Guide)**: 1) Step1~5 핵심 기능 체크 항목 작성. 2) 엑셀 업로드/다운로드 체크 포함. 3) solver 요청/응답 연계 체크 포함.
- **검증 기준(Verification)**: 회귀 방지 체크리스트가 문서화되어 있다.
- **선행 조건(Dependencies)**: P7-1.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P7-2.1 Solver 계약(API) 문서화 + 버전 정책 확정
- **설명(Description)**: solver 요청/응답/상태 폴링의 계약을 문서화하고, 변경이 필요한 경우 버전 정책을 확정한다.
- **구현 가이드(Guide)**: 1) 현재 요청/응답 JSON 스키마 추출. 2) 호환 유지 원칙 정의. 3) 브레이킹 변경 시 버전 필드/엔드포인트 정책 정의.
- **검증 기준(Verification)**: solver 계약이 문서화되어 있고, 변경 정책이 확정되어 있다.
- **선행 조건(Dependencies)**: P7-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/API_SPEC.md`, `src/api/solver.ts`

### P7-2.2 Mapper/Validator 고정 전략 정의 + 테스트 케이스 목록화
- **설명(Description)**: solverMapper/planningPayloadValidator의 호환성을 유지하기 위한 고정 전략과 테스트 케이스를 정의한다.
- **구현 가이드(Guide)**: 1) 고정해야 할 필드/변환 규칙 정의. 2) 대표 케이스 입력/기대 출력 목록 작성. 3) 테스트 작성 위치(유닛) 결정.
- **검증 기준(Verification)**: solver 매핑/검증의 테스트 케이스 목록이 존재한다.
- **선행 조건(Dependencies)**: P7-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/utils/solverMapper.ts`, `src/utils/planningPayloadValidator.ts`

### P7-2.3 에러/타임아웃/재시도 UX 정책 정의
- **설명(Description)**: solver 호출 실패, 타임아웃, 상태 폴링 실패 시 사용자에게 보여줄 UX(메시지/재시도/중단)를 정의한다.
- **구현 가이드(Guide)**: 1) 실패 유형별 메시지 정의. 2) 재시도 버튼/자동 재시도 정책 결정. 3) 실패 시 데이터 보존/복구 정책 정의.
- **검증 기준(Verification)**: solver 실패 시 UX가 정의되어 있고, 재시도 정책이 명확하다.
- **선행 조건(Dependencies)**: P7-2.2
- **예상 소요 시간**: 120분
- **관련 파일**: `src/composables/useAISolver.ts`

### P7-3.1 스케줄 워크플로우 회귀 E2E 시나리오 정의(Step1→5)
- **설명(Description)**: 서비스 전환 작업 이후에도 Step1~5 핵심 플로우가 동작하는지 검증할 E2E 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) Step1 입력→Step2 저장→Step3 직원→Step4 초기→Step5 결과 확인 시나리오 기술. 2) 주요 검증 포인트 정의. 3) 최소 자동화 범위 결정.
- **검증 기준(Verification)**: 회귀 E2E 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P7-2.3
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P7-3.2 Playwright 회귀 테스트 구현 범위/전략 결정
- **설명(Description)**: Playwright를 사용해 어떤 시나리오를 자동화할지(스모크 1~2개) 범위를 결정한다.
- **구현 가이드(Guide)**: 1) 자동화할 최소 시나리오 선택. 2) 테스트 데이터 준비 전략 결정. 3) CI 포함 여부 결정.
- **검증 기준(Verification)**: 회귀 테스트 자동화 범위가 합의되어 있다.
- **선행 조건(Dependencies)**: P7-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `package.json`

### P7-3.3 유닛 테스트 보강 대상 선정(스토어/유틸/매퍼)
- **설명(Description)**: 회귀 위험이 큰 유닛(요구인원 계산, 엑셀 파서/검증, solver 매퍼)을 선정하고 테스트 보강 계획을 수립한다.
- **구현 가이드(Guide)**: 1) 테스트 우선순위 유틸 목록화. 2) 대표 입력/기대값 정의. 3) 테스트 파일 위치/실행 방식 결정.
- **검증 기준(Verification)**: 유닛 테스트 보강 계획과 대상 목록이 존재한다.
- **선행 조건(Dependencies)**: P7-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/utils/excelParser.ts`

### P7-3.4 회귀 테스트를 품질 게이트에 포함하는 기준 확정
- **설명(Description)**: 어떤 변경에서 E2E/회귀 테스트를 필수로 돌릴지 품질 게이트 기준을 확정한다.
- **구현 가이드(Guide)**: 1) 권한/RLS/가입/온보딩/스케줄 변경 시 회귀 필수 규칙 정의. 2) 실행 시간/빈도 균형 결정. 3) 문서에 기준 반영.
- **검증 기준(Verification)**: 회귀 테스트 실행 기준이 문서화되어 있다.
- **선행 조건(Dependencies)**: P7-3.2
- **예상 소요 시간**: 90분
- **관련 파일**: `scripts/quality-gate.sh`

---

## P8 Phase (예상 시간: 31시간 30분)

### P8-1.1 알림 이벤트/채널/설정 요구사항 정리
- **설명(Description)**: 알림 채널(앱내/이메일), 이벤트 종류(승인/solver완료/공지), 사용자 설정 요구를 PRD 기준으로 정리한다.
- **구현 가이드(Guide)**: 1) 이벤트 타입 목록화. 2) 채널별 기본값(앱내 on, 이메일 off 등) 결정. 3) 설정 UI 위치(내 정보) 결정.
- **검증 기준(Verification)**: 알림 요구사항이 이벤트/채널/설정 관점으로 정리되어 있다.
- **선행 조건(Dependencies)**: P1-1.3, P1-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P8-1.2 알림 DB 스키마/마이그레이션 설계(notification_* 테이블)
- **설명(Description)**: notification_events, notification_preferences, notification_deliveries 등 알림 도메인 테이블의 스키마를 설계하고 마이그레이션 반영 계획을 수립한다.
- **구현 가이드(Guide)**: 1) events/preference/delivery 필드 정의. 2) 멱등키/재시도 고려 필드 포함. 3) 인덱스/조회 패턴 정의.
- **검증 기준(Verification)**: 알림 도메인 스키마가 확정되어 있고, 마이그레이션 반영 방안이 결정되어 있다.
- **선행 조건(Dependencies)**: P8-1.1
- **예상 소요 시간**: 180분
- **관련 파일**: `migrations/007_service_transition_rbac_multitenant.sql`

### P8-1.3 알림 API 계약 정의(조회/읽음/설정)
- **설명(Description)**: 알림 조회, 읽음 처리, 설정 변경을 위한 API 계약과 보안(RLS/테넌트)을 정의한다.
- **구현 가이드(Guide)**: 1) 목록 조회 필터/페이지네이션 정의. 2) 읽음 처리(단건/일괄) 계약 정의. 3) 설정 저장(이벤트별) 계약 정의.
- **검증 기준(Verification)**: 알림 API 계약이 문서화되어 있고, 테넌트/권한 기준이 포함된다.
- **선행 조건(Dependencies)**: P8-1.2
- **예상 소요 시간**: 180분
- **관련 파일**: `src/api/notification.ts`

### P8-1.4 알림 도메인 테스트 시나리오 정의(권한/격리/읽음)
- **설명(Description)**: 알림 도메인의 권한/테넌트 격리/읽음 처리 검증을 위한 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 본인 알림만 조회되는지 케이스 정의. 2) 타조직 알림 접근 차단 케이스 정의. 3) 읽음 처리 후 UI 반영 케이스 정의.
- **검증 기준(Verification)**: 알림 도메인 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P8-1.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P8-2.1 헤더 🔔 알림 UX 설계(뱃지/드롭다운/링크)
- **설명(Description)**: 상단 헤더에 알림 아이콘(뱃지)과 드롭다운/전체 페이지 링크 UX를 설계한다.
- **구현 가이드(Guide)**: 1) 미읽음 카운트 표시 규칙 정의. 2) 드롭다운에 표시할 항목 수/요약 정의. 3) 전체 알림 페이지 라우트 결정.
- **검증 기준(Verification)**: 알림 아이콘/뱃지 UX가 설계되어 있고, 구현 범위가 정리되어 있다.
- **선행 조건(Dependencies)**: P8-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `src/components/layout/Header.vue`

### P8-2.2 알림 센터 페이지 IA/필터/읽음 UX 설계
- **설명(Description)**: 알림 센터 페이지의 정보 구조, 필터(이벤트 타입), 읽음 처리 UX를 설계한다.
- **구현 가이드(Guide)**: 1) 리스트/상세 표시 방식 결정. 2) 필터/정렬/페이지네이션 UX 정의. 3) 읽음 처리(단건/일괄) UX 정의.
- **검증 기준(Verification)**: 알림 센터 화면 구성이 확정되어 있다.
- **선행 조건(Dependencies)**: P8-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/Notifications.vue`

### P8-2.3 알림 설정 UI 설계(이벤트별 앱내/이메일)
- **설명(Description)**: 사용자 알림 설정(이벤트별 앱내/이메일 수신)을 어디에, 어떤 UI로 제공할지 설계한다.
- **구현 가이드(Guide)**: 1) 설정 위치(내 정보 vs 알림센터) 결정. 2) 이벤트 타입별 토글 UI 정의. 3) 기본값/마이그레이션 정책 정의.
- **검증 기준(Verification)**: 알림 설정 UI가 정의되어 있고, 저장 모델과 연결된다.
- **선행 조건(Dependencies)**: P8-2.2
- **예상 소요 시간**: 120분
- **관련 파일**: `src/views/Profile.vue`

### P8-2.4 알림센터 E2E 시나리오 정의(승인 알림)
- **설명(Description)**: 가입 승인 알림이 생성되고 알림센터/헤더에서 확인되는 E2E 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 승인 이벤트 생성 조건 정의. 2) 헤더 뱃지/목록 노출 기대 결과 정의. 3) 읽음 처리 후 뱃지 감소 기대 결과 정의.
- **검증 기준(Verification)**: 알림센터 E2E 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P8-2.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P8-3.1 Resend 이메일 발송 정책/템플릿 요구사항 확정
- **설명(Description)**: 이메일 알림(승인/반려/공지/solver 완료)의 발송 정책과 템플릿 요구사항을 확정한다.
- **구현 가이드(Guide)**: 1) 이벤트별 이메일 제목/본문 요구 정의. 2) 발송 조건(즉시/예약) 정의. 3) 사용자가 이메일 수신을 껐을 때 처리 정의.
- **검증 기준(Verification)**: 이메일 발송 정책과 템플릿 요구사항이 확정되어 있다.
- **선행 조건(Dependencies)**: P8-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P8-3.2 notify-dispatch 설계(큐/재시도/멱등)
- **설명(Description)**: Resend 발송을 수행하는 notify-dispatch 서버 구성(Edge Function), 큐잉/재시도/멱등성 설계를 확정한다.
- **구현 가이드(Guide)**: 1) deliveries 테이블 기반 큐 처리 방식 정의. 2) 멱등키/중복 방지 규칙 정의. 3) 실패 재시도/백오프 규칙 정의.
- **검증 기준(Verification)**: notify-dispatch 아키텍처와 멱등/재시도 정책이 확정되어 있다.
- **선행 조건(Dependencies)**: P8-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `supabase/functions/notify-dispatch/index.ts`

### P8-3.3 이메일 환경변수/시크릿/로컬 개발 전략 확정
- **설명(Description)**: Resend API 키/발신자 주소 등 환경변수 관리와 로컬 개발(스텁/드라이런) 전략을 확정한다.
- **구현 가이드(Guide)**: 1) 필요한 env 목록 정의. 2) prod/staging/locaI 값 관리 정책 정의. 3) 로컬에서 실제 발송 방지 가드 정의.
- **검증 기준(Verification)**: 이메일 시크릿/환경 설정 정책이 정리되어 있다.
- **선행 조건(Dependencies)**: P8-3.2
- **예상 소요 시간**: 90분
- **관련 파일**: `.env.example`

### P8-3.4 이메일 발송 테스트 시나리오 정의(실패/중복/설정)
- **설명(Description)**: 이메일 발송의 실패 재시도, 중복 방지, 사용자 설정(off) 반영을 포함한 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 성공 발송 케이스 정의. 2) 실패/재시도/최종 실패 케이스 정의. 3) 중복 이벤트 시 1회만 발송 케이스 정의.
- **검증 기준(Verification)**: 이메일 발송 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P8-3.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

---

## P9 Phase (예상 시간: 30시간 0분)

### P9-1.1 대시보드 지표(공정성) 정의 + 필터 스펙 확정
- **설명(Description)**: 관리자/직원 대시보드에서 제공할 지표(야간/주말 등)와 필터(기간/사이트/직급) 스펙을 확정한다.
- **구현 가이드(Guide)**: 1) 공정성 지표 목록/정의 확정. 2) 필터 항목/기본값 결정. 3) 권한별(관리자 vs 직원) 표시 차이 결정.
- **검증 기준(Verification)**: 대시보드 지표/필터 요구사항이 확정되어 있다.
- **선행 조건(Dependencies)**: P1-1.3, P1-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P9-1.2 대시보드 데이터 모델/타입/스토어 설계
- **설명(Description)**: 대시보드 조회 결과를 표현할 타입과 상태 관리(스토어) 구조를 설계한다.
- **구현 가이드(Guide)**: 1) 지표별 응답 타입 정의. 2) 필터 상태/캐시 전략 정의. 3) 로딩/에러 상태 표준 정의.
- **검증 기준(Verification)**: 대시보드 타입/스토어 설계가 완료되어 있다.
- **선행 조건(Dependencies)**: P9-1.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/types/dashboard.ts`, `src/stores/dashboard.ts`

### P9-1.3 대시보드 집계 쿼리/API 경계 결정(RPC/함수/직접)
- **설명(Description)**: 대시보드 집계를 어디에서 계산할지(DB RPC/Edge Function/클라이언트) 경계를 결정하고 API 계약을 정의한다.
- **구현 가이드(Guide)**: 1) 집계 성능/보안 고려로 경계 결정. 2) API 파라미터(기간/필터) 정의. 3) RLS와 충돌 없는 구현 방식 선택.
- **검증 기준(Verification)**: 대시보드 집계 경계와 API 계약이 확정되어 있다.
- **선행 조건(Dependencies)**: P9-1.2
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/API_SPEC.md`

### P9-1.4 대시보드 지표 테스트 시나리오 정의(샘플 데이터 기반)
- **설명(Description)**: 샘플 스케줄 데이터를 기반으로 지표가 올바르게 계산되는지 검증하는 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 야간/주말 정의 기준 확정. 2) 샘플 입력/기대 결과 작성. 3) 테스트 자동화 범위(유닛/통합) 결정.
- **검증 기준(Verification)**: 대시보드 지표 검증 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P9-1.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P9-2.1 관리자 대시보드 페이지 IA/차트 구성 확정
- **설명(Description)**: 관리자 대시보드(공정성 지표)를 어떤 차트/표로 구성할지 IA를 확정한다.
- **구현 가이드(Guide)**: 1) 지표별 시각화 방식(막대그래프 등) 결정. 2) 필터 UI 배치 결정. 3) 빈 상태/로딩 상태 UX 정의.
- **검증 기준(Verification)**: 관리자 대시보드 화면 구성이 확정되어 있다.
- **선행 조건(Dependencies)**: P9-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `src/views/dashboard/AdminDashboard.vue`

### P9-2.2 직원(개인) 대시보드 페이지 IA/캘린더 요구 확정
- **설명(Description)**: 직원 대시보드(개인 일정 캘린더 + 통계) 화면 구성과 요구사항을 확정한다.
- **구현 가이드(Guide)**: 1) 캘린더 표시 단위(월/주) 결정. 2) 통계 항목(야간/주말 등) 확정. 3) 권한/데이터 범위(본인만) 확인.
- **검증 기준(Verification)**: 직원 대시보드 요구사항이 확정되어 있다.
- **선행 조건(Dependencies)**: P9-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/dashboard/MyDashboard.vue`

### P9-2.3 대시보드 필터 UI/상태 저장 정책 정의
- **설명(Description)**: 필터 변경 시 스토어 상태 저장, URL 쿼리 동기화 여부, 기본값/복원 정책을 정의한다.
- **구현 가이드(Guide)**: 1) 필터 기본값 결정. 2) URL sync 여부 결정. 3) 새로고침/재방문 시 복원 규칙 정의.
- **검증 기준(Verification)**: 필터 상태 저장/복원 정책이 확정되어 있다.
- **선행 조건(Dependencies)**: P9-2.2
- **예상 소요 시간**: 120분
- **관련 파일**: `src/stores/dashboard.ts`

### P9-2.4 대시보드 필터 E2E 시나리오 정의
- **설명(Description)**: 필터 변경에 따라 차트/표가 업데이트되는지 검증하는 E2E 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 기간/사이트 필터 케이스 정의. 2) 기대 결과(지표 변화) 정의. 3) 권한별 접근 차단 케이스 포함 여부 결정.
- **검증 기준(Verification)**: 대시보드 필터 E2E 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P9-2.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P9-3.1 리포트/Export 요구사항 확정(Excel/CSV, 컬럼)
- **설명(Description)**: 필터링된 대시보드 데이터를 기반으로 Excel/CSV로 내보낼 리포트 요구사항(포맷/컬럼)을 확정한다.
- **구현 가이드(Guide)**: 1) Export 대상 데이터/컬럼 확정. 2) 파일명/시트명 규칙 정의. 3) 개인정보/권한 필터링 규칙 정의.
- **검증 기준(Verification)**: 리포트 Export 요구사항이 확정되어 있다.
- **선행 조건(Dependencies)**: P9-2.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P9-3.2 Export API 설계(dashboard-export) + 권한/테넌트 검증
- **설명(Description)**: 리포트 내보내기 API(Edge Function 또는 서버 경계)를 설계하고 권한/테넌트 격리 검증 규칙을 포함한다.
- **구현 가이드(Guide)**: 1) 필터 파라미터 스키마 정의. 2) 권한/테넌트 검증 방안 포함. 3) 파일 생성 방식(서버 생성 vs 클라이언트) 결정.
- **검증 기준(Verification)**: Export API 계약과 보안 기준이 확정되어 있다.
- **선행 조건(Dependencies)**: P9-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `supabase/functions/dashboard-export/index.ts`, `docs/API_SPEC.md`

### P9-3.3 프론트 Export UI(다운로드/진행/에러) 설계
- **설명(Description)**: 사용자가 리포트를 다운로드할 수 있는 UI(진행 표시, 오류 처리)를 설계한다.
- **구현 가이드(Guide)**: 1) Export 버튼/필터 UI 정의. 2) 다운로드 진행/완료 메시지 정의. 3) 실패 시 재시도/오류 안내 정의.
- **검증 기준(Verification)**: Export UI 요구사항이 정의되어 있고, API와 연결된다.
- **선행 조건(Dependencies)**: P9-3.2
- **예상 소요 시간**: 120분
- **관련 파일**: `src/views/Reports.vue`

### P9-3.4 Export 테스트 시나리오 정의(CSV/Excel, 대용량)
- **설명(Description)**: Export 결과 파일의 내용/형식과 대용량(레코드 수) 처리에 대한 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) CSV/Excel 각각의 검증 포인트 정의. 2) 필터 적용 결과 검증. 3) 대용량 처리 시 타임아웃/분할 정책 케이스 정의.
- **검증 기준(Verification)**: Export 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P9-3.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

---

## P10 Phase (예상 시간: 29시간 0분)

### P10-1.1 보안 감사 체크리스트 작성(RLS/권한/로그)
- **설명(Description)**: 서비스 전환 범위에 대한 보안 감사 체크리스트(RLS, RBAC, 입력 검증, 로그 마스킹)를 작성한다.
- **구현 가이드(Guide)**: 1) RLS/권한 상승/IDOR 체크 항목 작성. 2) Edge Function 입력 검증/시크릿 관리 항목 작성. 3) 감사로그/알림 이벤트 검증 항목 포함.
- **검증 기준(Verification)**: 보안 체크리스트가 문서화되어 있고, 릴리스 게이트에 포함될 수 있다.
- **선행 조건(Dependencies)**: P1-2.3, P9-3.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/migration/REFINED_PRD_SERVICE_TRANSITION.md`

### P10-1.2 Edge Function 보안 정책 정리(service role/검증/로그)
- **설명(Description)**: Edge Function(가입/승인/알림/Export)의 보안 정책(서비스키 사용, 입력 검증, 로그 마스킹)을 정리한다.
- **구현 가이드(Guide)**: 1) service role이 필요한 작업 목록화. 2) 입력 검증(Zod 등) 기준 정의. 3) 로그에 민감정보 기록 금지 규칙 정의.
- **검증 기준(Verification)**: Edge Function 보안 정책이 문서화되어 있고, 구현 시 준수할 기준이 명확하다.
- **선행 조건(Dependencies)**: P10-1.1
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/API_DOCUMENTATION.md`

### P10-1.3 침투/오용 시나리오 테스트 계획(테넌트 침범/권한 상승)
- **설명(Description)**: 타조직 데이터 접근, 권한 상승, 잘못된 ID 접근(IDOR) 등 침투/오용 시나리오 테스트 계획을 수립한다.
- **구현 가이드(Guide)**: 1) 시나리오별 공격 벡터 정의. 2) 기대 결과(403/empty) 정의. 3) 자동화 여부/도구 결정.
- **검증 기준(Verification)**: 보안 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P10-1.2
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P10-1.4 보안 이슈 트리아지/리메디에이션 태스크 생성 규칙 정의
- **설명(Description)**: 발견된 보안 이슈를 어떻게 태스크로 분류/우선순위화/릴리스 차단으로 연결할지 규칙을 정의한다.
- **구현 가이드(Guide)**: 1) severity 기준 정의. 2) 릴리스 차단 조건 정의. 3) remediation 템플릿(재현/영향/해결/검증) 정의.
- **검증 기준(Verification)**: 보안 이슈가 일관된 방식으로 태스크화될 수 있는 규칙이 정의되어 있다.
- **선행 조건(Dependencies)**: P10-1.3
- **예상 소요 시간**: 120분
- **관련 파일**: `.shrimp-data/tasks.json`

### P10-2.1 성능 측정/기준선 수립 계획(목록/대시보드/리포트)
- **설명(Description)**: 핵심 화면(목록/그리드/대시보드/리포트)의 성능을 어떻게 측정하고 기준선을 잡을지 계획을 수립한다.
- **구현 가이드(Guide)**: 1) 측정 지표(TTFB, 렌더, 다운로드) 정의. 2) 목표 기준(예: p95) 초안 작성. 3) 측정 방법(수동/스크립트) 결정.
- **검증 기준(Verification)**: 성능 측정 계획과 기준선 정의가 존재한다.
- **선행 조건(Dependencies)**: P9-2.4
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/migration/REFINED_PRD_SERVICE_TRANSITION.md`

### P10-2.2 DB/쿼리 최적화 후보 목록화(인덱스/집계)
- **설명(Description)**: 대시보드/리포트/리스트 쿼리의 인덱스/집계 최적화 후보를 목록화하고 우선순위를 정한다.
- **구현 가이드(Guide)**: 1) 느린 쿼리 후보 식별 방법 정의. 2) 인덱스 후보/추가 비용 정리. 3) 집계 테이블/캐시 필요성 판단.
- **검증 기준(Verification)**: DB 최적화 후보와 우선순위가 정리되어 있다.
- **선행 조건(Dependencies)**: P10-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/prd/02-database-migration.md`

### P10-2.3 프론트 성능 최적화 후보 목록화(렌더/상태/차트)
- **설명(Description)**: 프론트에서 성능 저하가 예상되는 부분(대시보드 차트, 리스트 렌더, 상태 업데이트)을 목록화하고 개선 방향을 정한다.
- **구현 가이드(Guide)**: 1) 리렌더 원인 후보 목록화. 2) 메모이제이션/페이지네이션/가상스크롤 적용 기준 정의. 3) 차트 라이브러리 도입 여부 결정(필요 시).
- **검증 기준(Verification)**: 프론트 최적화 후보와 개선 전략이 정리되어 있다.
- **선행 조건(Dependencies)**: P10-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/Dashboard.vue`

### P10-2.4 성능 회귀 체크(스모크) 시나리오 정의
- **설명(Description)**: 성능 최적화 후 회귀가 발생하지 않도록 최소 스모크 측정 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 측정 대상 화면 선택. 2) 반복 실행/기록 방식 정의. 3) 실패 기준/롤백 기준 정의.
- **검증 기준(Verification)**: 성능 회귀를 감지할 최소 스모크 시나리오가 정의되어 있다.
- **선행 조건(Dependencies)**: P10-2.2, P10-2.3
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P10-3.1 릴리스 체크리스트 초안(배포 순서/게이트/스모크)
- **설명(Description)**: Private Beta 배포 순서(DB→함수→프론트), 품질 게이트, 스모크 테스트를 포함한 릴리스 체크리스트를 작성한다.
- **구현 가이드(Guide)**: 1) 배포 순서 체크리스트 작성. 2) 게이트 실행 항목 포함. 3) 스모크 테스트(가입→승인→온보딩→스케줄) 포함.
- **검증 기준(Verification)**: 릴리스 체크리스트가 문서화되어 있고, 실행 순서가 명확하다.
- **선행 조건(Dependencies)**: P10-1.4, P10-2.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/final-verification-report.md`

### P10-3.2 운영 런북 작성(장애 대응/알림/데이터 복구)
- **설명(Description)**: 운영 중 장애 대응, 알림 발송 문제, 데이터 복구/백업을 포함한 런북을 작성한다.
- **구현 가이드(Guide)**: 1) 장애 유형별 대응 플로우 작성. 2) 알림/이메일 장애시 확인 절차 작성. 3) 백업/복구 절차 및 권한 설정 포함.
- **검증 기준(Verification)**: 운영 런북이 작성되어 있고, 팀이 따라할 수 있다.
- **선행 조건(Dependencies)**: P10-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `README.md`

### P10-3.3 롤백 플랜 정의(DB/함수/프론트) + 리허설 시나리오
- **설명(Description)**: DB 마이그레이션, Edge Function, 프론트 배포 각각의 롤백 플랜과 리허설 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) DB 롤백 전략(역마이그레이션/스냅샷) 정의. 2) 함수/프론트 롤백(이전 버전) 정의. 3) 리허설 체크리스트 작성.
- **검증 기준(Verification)**: 롤백 절차가 문서화되어 있고, 리허설 시나리오가 존재한다.
- **선행 조건(Dependencies)**: P10-3.2
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/migration/REFINED_PRD_SERVICE_TRANSITION.md`

### P10-3.4 Private Beta Go/No-Go 리뷰 아젠다/자료 정의
- **설명(Description)**: 릴리스 직전 Go/No-Go 리뷰를 위한 아젠다와 준비 자료(게이트 결과, 보안/성능 요약)를 정의한다.
- **구현 가이드(Guide)**: 1) 필수 보고 항목(기능/보안/성능/운영) 정의. 2) 참석자/결정권자 정의. 3) 결정 결과 기록 템플릿 정의.
- **검증 기준(Verification)**: Go/No-Go 리뷰 진행에 필요한 아젠다/자료 목록이 확정되어 있다.
- **선행 조건(Dependencies)**: P10-3.3
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/verification/final-verification-report.md`

---


**총 예상 소요 시간:** 약 299시간
