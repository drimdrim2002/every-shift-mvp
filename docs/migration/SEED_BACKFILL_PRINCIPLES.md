# Seed & Backfill Principles (Migration 007)

## 1. 기존 MVP 데이터 유지 원칙 (비파괴 유지)

기존 MVP 환경에서 사용되던 레코드(`organizations`, `shifts`, `employees`, `site_requirements`)는 신규 스키마에서 도입된 참조 컬럼(`user_id`, `site_id`, `skill_id`, `rank_id`)이 모두 **NULL을 허용**하기 때문에 삭제나 강제 업데이트 없이 **자연스럽게 호환 유지**됩니다.

- **Organizations (조직)**: UUID `'00000000-0000-0000-0000-000000000001'` (세브란스병원)은 기본 테넌트로 유지되어 기존 MVP 데이터의 기준점 역할을 수행합니다.
- **Shifts (교대 타입)**: `D`, `E`, `N`, `O` 코드는 기존 그대로 유지됩니다.
- **Employees (직원)**: 30명의 기본 간호사 데이터는 `user_id`가 매핑되기 전까지 '미매핑(unclaimed)' 상태로 유지되며 스케줄 생성에는 정상적으로 참여합니다.
- **Site Requirements (필요 인원)**: 레거시 요일별 기본 인원 제약은 그대로 유지되며, `site_id` 필드가 도입되었으나 기본적으로 NULL로 처리되어 전역 제약처럼 작동합니다.

## 2. Memberships / Profiles 기본 생성 규칙

신규 스키마의 RBAC(Role-Based Access Control) 및 멀티테넌시 구조를 초기 환경에서 원활하게 테스트하려면 최소 1명 이상의 기본 관리자(Admin) 계정이 필요합니다.

1. **Auth 계정 생성**: 로컬 개발 환경용 Seed에는 기본 관리자 계정(예: `admin@everyshift.com`)이 `auth.users`에 준비되어야 합니다 (Supabase Auth 특성상 대시보드 또는 CLI/API를 통해 생성 권장).
2. **Profile 등록**: 생성된 관리자의 `UUID`를 바탕으로 `profiles` 테이블에 `global_role = 'super'` (또는 `'admin'`) 권한을 부여하는 초기 레코드를 삽입합니다.
3. **Membership 매핑**: 관리자가 기존 MVP 조직(세브란스병원)을 관리할 수 있도록 `organization_memberships`에 `role = 'admin'`, `status = 'approved'`로 매핑 레코드를 생성합니다.

## 3. 백필(Backfill) 필요 대상 모록

MVP 데이터를 신규 서비스 구조에 맞게 승격시키기 위해 순차적으로 백필이 필요한 속성 및 설정 항목입니다. 해당 작업은 후속 스크립트 실행(P1-3) 또는 사용자 화면 조작을 통해 발생합니다.

- **`organization_settings`**: 초기 온보딩 플로우 또는 마이그레이션 스크립트를 통해 MVP 조직('000000...01')에 대한 기본 스케줄링 규칙(`max_consecutive_night_shifts`, `minimum_rest_hours`) 레코드 백필.
- **`sites`, `ranks`, `skills`**: 새로운 서비스 기능을 온전히 사용하기 위해 조직 내 기본 사이트(예: "본원"), 기본 직급("일반간호사"), 기본 스킬 등록 백필.
- **`employees.user_id`**: 추후 실제 간호사가 앱에 가입하고 승인될 때, 기존의 30명 직원 레코드와 신규 가입한 `auth.users` 계정을 매핑하는 백필.
- **`site_staffing_requirements`**: 기존 `site_requirements`에서 제공하던 레거시 제약을 신규 스키마 구조인 `site_staffing_requirements`로 마이그레이션 및 기본값(rank/skill/site) 포함 백필.
- **`schedule_assignments.site_id`**: 다중 사이트 관리가 본격적으로 도입되는 시점에, 기존 스케줄 데이터를 특정 사이트로 일괄 할당(백필).
