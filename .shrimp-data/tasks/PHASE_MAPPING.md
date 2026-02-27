# Phase Mapping - Complete Task ID Reference

Comprehensive mapping of all 87 tasks to their respective development phases.

## Quick Reference Table

| Phase | File | Tasks | Size | Primary Focus |
|-------|------|-------|------|---------------|
| 0 | phase-0-infrastructure.json | 10 | ~8KB | Setup & Config |
| 1 | phase-1-database.json | 7 | ~6KB | Database Layer |
| 2 | phase-2-foundation.json | 12 | ~10KB | Types & Utils |
| 3 | phase-3-authentication.json | 4 | ~3KB | Auth System |
| 4 | phase-4-step1-2.json | 6 | ~5KB | First Two Steps |
| 5 | phase-5-step3-grid.json | 18 | ~14KB | Core Grid (80%) |
| 6 | phase-6-step4-results.json | 8 | ~7KB | Results & Export |
| 7 | phase-7-integration.json | 12 | ~10KB | Integration Tests |
| 8 | phase-8-polish.json | 10 | ~8KB | Polish & Docs |

## Detailed Phase Mappings

### Phase 0: Infrastructure Setup
**File:** `phase-0-infrastructure.json`
**Count:** 10 tasks
**Focus:** Project initialization, package installation, tooling setup

**Task List:**
1. `b3449519-413b-40ec-9cea-c8adc211e52e` - Vite 프로젝트 생성 및 TypeScript 설정 확인
2. `a9fde6bf-3e9d-426a-ad89-3f07d29186b7` - UI 및 스타일링 패키지 설치 (Naive UI, Tailwind CSS)
3. `57b08cdd-f193-4475-85e3-148f0af29c8c` - Tailwind CSS 커스텀 색상 설정 (시프트 색상)
4. `cc672606-607c-4315-8edb-8ba2d5ab0dbb` - 그리드 및 상태 관리 패키지 설치 (TanStack Table, Pinia, Vue Router)
5. `cbab63dd-291c-49ba-af19-878efd0b063a` - 백엔드 연동 패키지 설치 (Supabase JS Client)
6. `b4729e4b-52b4-4536-a781-6f83387b603b` - 유틸리티 패키지 설치 (Day.js, VueUse, XLSX)
7. `e6ade1e6-1f68-4bf5-9175-a97bae945462` - 프로젝트 폴더 구조 생성
8. `34398a7c-beda-4667-b06b-acb5fb9dc9f5` - ESLint 및 Prettier 설정
9. `5bdb124f-fdd7-4d5a-8ee5-b44b2661c8c1` - Naive UI Global Config 설정 (main.ts)
10. `0725e1c4-f74d-4f5f-b1ab-9eb18b4410ec` - favicon 및 title 설정

---

### Phase 1: Database Layer
**File:** `phase-1-database.json`
**Count:** 7 tasks
**Focus:** Supabase configuration, schema, RLS, seed data

**Task List:**
1. `0c2615ea-94e8-4674-8ba0-eb8297e1a89a` - Supabase 프로젝트 생성 및 접속 정보 확보
2. `ad6edb9e-3bf9-4f70-9882-0b9c451678f8` - 환경 변수 설정 (.env.local 및 .env.example)
3. `ef7a9c3d-2b84-4f1a-9e5d-6c7f8a9b0c1d` - Supabase UUID Extension 활성화
4. `c44240eb-9148-4a0b-8787-b9560b29af7f` - Supabase 데이터베이스 스키마 마이그레이션 (6개 테이블)
5. `1938165e-4b57-43b8-8612-f3cf6d457712` - Supabase RLS 정책 설정 (schedules 테이블)
6. `48f3a743-a0ff-4fb3-8970-2877edcbc56e` - Supabase Seed 데이터 로드 (조직, 시프트, 직원, 사이트 요구사항)
7. `86cd143d-005a-4596-8247-f65afd33407b` - Supabase 데이터베이스 마이그레이션 검증

---

### Phase 2: Foundation Layer
**File:** `phase-2-foundation.json`
**Count:** 12 tasks
**Focus:** Core types, utilities, API clients, base components

**Task List:**
1. `9b220011-43f5-4bf5-9f1c-1083deab00f8` - Supabase 클라이언트 생성 및 연결 테스트 (api/supabase.ts)
2. `acd2c70e-193a-4776-bf58-2e3ba7f1011a` - TypeScript 타입 정의: Schedule 관련 (types/schedule.ts)
3. `7ae710d4-353c-4868-9c98-f5b209dd6468` - TypeScript 타입 정의: Employee (types/employee.ts)
4. `06f80588-a7c5-44ca-883d-8548c0c62e0a` - TypeScript 타입 정의: Shift (types/shift.ts)
5. `8558cd41-39ef-4913-baba-a195cd42bd7b` - TypeScript 타입 정의: Organization (types/organization.ts)
6. `13da374f-1c07-4102-b10c-46f3ac58a447` - Utility 함수: 날짜 처리 (utils/date.ts)
7. `2b774c1e-9422-4fc9-aa73-a77faad93f62` - Utility 함수: 검증 로직 (utils/validation.ts)
8. `7a035827-f29c-4c19-881f-22b926ad3bc1` - Utility 함수: Excel 내보내기 (utils/excel.ts)
9. `f6820857-3c14-47d1-aef8-0117422bc458` - Layout: DefaultLayout 컴포넌트 (components/layout/DefaultLayout.vue)
10. `dd3d84d7-d57f-48c6-b505-4b1b7ecab140` - Layout: Header 컴포넌트 (components/layout/Header.vue)
11. `539ea1da-e550-4ea6-b425-ebee0ad2bd89` - Layout: Sidebar 컴포넌트 (components/layout/Sidebar.vue)
12. `b52cad79-2603-4489-a52e-c0c963526239` - Tailwind CSS 스타일 파일 생성 (assets/index.css)

---

### Phase 3: Authentication System
**File:** `phase-3-authentication.json`
**Count:** 4 tasks
**Focus:** Login, auth store, router guards

**Task List:**
1. `eef0919d-036e-417e-9d0b-714748b392da` - Auth Store: Pinia 스토어 생성 (stores/auth.ts)
2. `e5371342-e3f2-4d8e-b3ea-c340b981456e` - Router: Vue Router 설정 및 Guards (router/index.ts)
3. `cca8e5ae-0686-4e03-b2ee-5e18cbba0dfd` - Login 페이지 (views/auth/Login.vue)
4. `ab08ce06-628c-4add-84a3-82ecfa564fd8` - Organization Store: Pinia 스토어 생성 (stores/organization.ts)

---

### Phase 4: Step 1-2 Pages
**File:** `phase-4-step1-2.json`
**Count:** 6 tasks
**Focus:** Wizard steps 1 & 2 (basic info, site requirements)

**Task List:**
1. `2fea27dc-6a6a-4ffb-a713-65a3561d4e7a` - Schedule Store: Pinia 스토어 기본 구조 (stores/schedule.ts)
2. `343bb7c4-3925-49ee-91da-1c926056b3f3` - StepIndicator 컴포넌트 (components/schedule/StepIndicator.vue)
3. `815ca0d3-e230-4c3e-9905-98ad90e66d66` - Step 1: 기본 정보 페이지 (views/schedule/Step1BasicInfo.vue)
4. `43d82d62-c79b-448a-85e1-c955ae429469` - Step 2: useSiteRequirements Composable (composables/useSiteRequirements.ts)
5. `a9d0b427-ea0b-462a-9f08-f66ef061af94` - Step 2: 사이트 정보 페이지 - 그리드 구조 (views/schedule/Step2SiteInfo.vue)
6. `98db6fe2-558a-43cb-9cbd-80815b845d67` - ShiftSelector 컴포넌트 (components/schedule/ShiftSelector.vue)

---

### Phase 5: Step 3 Grid (CORE COMPONENT) 🔥
**File:** `phase-5-step3-grid.json`
**Count:** 18 tasks (21% of total work)
**Focus:** 30×36 TanStack Table grid - the heart of the application

**Task List:**
1. `ecef5ddf-8b06-40aa-93b6-2cb6459b516d` - useScheduleGrid Composable - 데이터 관리 (composables/useScheduleGrid.ts)
2. `0cf02d47-06cb-4311-87eb-72a2a9dde547` - useScheduleGridStatistics Composable - 통계 계산 (composables/useScheduleGridStatistics.ts)
3. `45ec9e06-2657-4220-b74e-771846bb1efe` - ScheduleGrid 컴포넌트 - 기본 구조 및 Props (components/schedule/ScheduleGrid.vue)
4. `a3c0894c-9371-42b9-a74b-66fed98b06f4` - ScheduleGrid 컴포넌트 - 3-level 헤더 구현
5. `554e3f6a-f3ca-48b9-bf2a-078981c219b5` - ScheduleGrid 컴포넌트 - ShiftSelector 통합 및 이벤트 처리
6. `d366f4b1-0468-4a6a-8669-96658ae01e6c` - ScheduleGrid 컴포넌트 - 통계 행/열 렌더링
7. `51569871-de57-4fd6-9084-f4435e474ef8` - Step 3: 페이지 기본 구조 (views/schedule/Step3InitialData.vue)
8. `27f7dba4-d851-4f13-a47a-44c0729115bf` - Step 3: ScheduleGrid 통합 및 데이터 연동
9. `901fa56f-b908-4784-8486-660993f1ecdc` - Step 3: 전월 데이터 검증 로직
10. `1b7c4930-77fb-4604-89b5-519dab1c560b` - Step 3: LocalStorage 임시 저장 및 복원
11. `416df5b8-2373-4984-ae52-d0d92ebe139f` - Step 3: ScheduleGrid 셀 렌더링 및 시프트 배정 통합
12. `f9ce7472-2bd7-41bb-b8d8-1d004a8ea947` - Step 3: 실시간 통계 업데이트 통합
13. `fa3cea3d-c35e-4994-9e04-1ef8e36e61b0` - Step 3: 그리드 초기화 및 데이터 로딩 로직
14. `869ce64c-35c1-49eb-a340-39d6b1c524f4` - Step 3: AI Solver Polling UI 구현
15. `c85b26a3-1777-46dc-bc10-689ead894a01` - StatisticsSummary 컴포넌트 구현
16. `d51c33e6-b453-4137-9177-e240f49bd6ae` - LoadingModal 컴포넌트 (AI Solver용)
17. `c49d7612-e612-490a-925f-bfa565c5d329` - useScheduleGridInit Composable - 그리드 초기화 로직 분리
18. `4c0036b1-9fb7-413a-b472-61ae9629d1d9` - useScheduleGridPersistence Composable - LocalStorage 로직 분리

**⚠️ Critical Phase:** This phase represents 80% of the development effort. The 30×36 grid (1,080 cells) is the core MVP functionality.

---

### Phase 6: Step 4 Results & Export
**File:** `phase-6-step4-results.json`
**Count:** 8 tasks
**Focus:** AI-generated results, manual editing, Excel export

**Task List:**
1. `00b3779f-aa01-4e72-9fa6-592070829b50` - AI Solver Mock API (api/solver.ts)
2. `1acadf16-0806-4386-b005-ebf1804a01d6` - useAISolver Composable (composables/useAISolver.ts)
3. `4e11a307-d943-4f6a-881a-903d99c71007` - Schedule API (api/schedule.ts)
4. `945c0f8b-546f-4da7-9456-9595da70377d` - Step 4: 결과 페이지 기본 구조 (views/schedule/Step4Result.vue)
5. `2c4fa9a8-721e-4a49-a87e-cb65b12b2cf0` - Step 4: 결과 그리드 통합 및 데이터 로드
6. `d887d81f-3a81-4855-9f9d-f7a3452d22ee` - Step 4: Excel 다운로드 기능
7. `af35c607-9eef-49e6-8c2e-de6dd0b996ac` - Step 4: AI 결과 로드 및 그리드 표시 상세 구현
8. `65ea57ca-d50b-4ae6-a962-7f51f3d5facf` - Step 4: 수동 편집 및 저장 기능

---

### Phase 7: Integration & Testing
**File:** `phase-7-integration.json`
**Count:** 12 tasks
**Focus:** App setup, step connections, validation, E2E tests

**Task List:**
1. `8f3056c8-375e-4ca3-8330-5dc40a5d9ed4` - Step 3에서 Step 4로 연결 (근무표 생성 호출)
2. `42f3b4a9-a4ca-45d5-9bbc-47777a1abd44` - App.vue 루트 컴포넌트 생성
3. `c1cac503-c724-4dae-ac95-7b014172a905` - main.ts 앱 진입점 생성
4. `465736f0-3781-40e2-99ff-ac3be05b0214` - Step 1: 월 선택 및 조직 정보 통합
5. `2f033c77-b3b8-4907-957e-e5b9061fa837` - Step 2: Site Requirements 그리드 데이터 바인딩
6. `b1997dac-fe81-457f-ad80-dd32b2a14d8e` - Step 2: 데이터 저장 및 네비게이션
7. `4d33bb07-3036-46b1-9051-31faf7a3a581` - AI Solver 에러 핸들링 및 재시도
8. `7270b220-cc07-4802-bef3-5974f26e1800` - Router Guards: Step 진행 Validation
9. `68519a69-7785-4fff-91c8-3c490fdb1753` - E2E 통합 테스트 - Step 1→2→3→4 전체 플로우
10. `8306345b-acff-4242-bfd3-55a78be58ae5` - Mock AI Solver 검증
11. `7f84da9e-4c5a-40b1-9be4-6e2aa030bec8` - Excel 다운로드 검증
12. `bc00251e-be39-4f2b-a2cc-b51dc7a11945` - 환경 변수 템플릿 (.env.example) 생성

---

### Phase 8: Polish & Documentation
**File:** `phase-8-polish.json`
**Count:** 10 tasks
**Focus:** Optimization, bug fixes, comprehensive documentation

**Task List:**
1. `24cbc1e5-a25f-4aba-b632-4e55fb3eab77` - 그리드 성능 최적화 (v-memo, computed 캐싱)
2. `098baa43-dff9-41e3-8383-38761507e536` - 통계 계산 검증 및 버그 수정
3. `9721fba1-bb53-4cb4-b64d-d021df12bb9e` - UI 폴리싱 (여백, 색상, 폰트, 일관성)
4. `34a97052-284a-456e-9286-f0dd59bc1cd4` - README.md 작성
5. `926489c1-82ae-4e2f-a99e-0469ef1882d3` - 개발자 가이드 작성 (DEVELOPMENT.md)
6. `3185a249-b1b6-47d9-9a69-748d1ea393bb` - Seed 데이터 문서화 (SEED_DATA.md)
7. `4729632d-e238-4339-8315-22b77ecf8df6` - API 문서 작성 (API.md)
8. `ec5b2181-88a5-4fba-a6a5-3a578566f26a` - 데모 시나리오 작성 (DEMO.md)
9. `70a4032a-5c90-417b-b4a7-0a5ebfd250ef` - 테스트 데이터 준비 (다양한 케이스)
10. `6ee01e19-d024-4fb0-9d9b-6beee4a8fef5` - 스크린샷 캡처 및 README 업데이트

---

## Task Dependencies

### Critical Path (Must complete in order):
```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 7
```

### Parallel Development Possible:
- **Phase 4** (Step 1-2) can start after Phase 3
- **Phase 6** (Step 4) can start after Phase 2
- **Phase 8** (Polish) starts after Phase 7

### Dependency Graph:
```
Phase 0 (Infrastructure)
  ↓
Phase 1 (Database)
  ↓
Phase 2 (Foundation)
  ├─→ Phase 3 (Auth)
  │     ↓
  │   Phase 4 (Step 1-2)
  │
  ├─→ Phase 5 (Step 3 Grid) ← CRITICAL PATH
  │
  └─→ Phase 6 (Step 4)
       ↓
Phase 7 (Integration)
  ↓
Phase 8 (Polish)
```

## Token Efficiency Calculator

| Scenario | Single File | Phase Files | Savings |
|----------|-------------|-------------|---------|
| Work on Phase 0 | 75,000 tokens | 8,000 tokens | 89% |
| Work on Phase 1 | 75,000 tokens | 5,500 tokens | 93% |
| Work on Phase 3 | 75,000 tokens | 3,000 tokens | 96% |
| Work on Phase 5 | 75,000 tokens | 14,000 tokens | 81% |
| Sequential (all phases) | 675,000 tokens | 68,500 tokens | 90% |
| Full analysis (1x) | 75,000 tokens | 75,000 tokens | 0% |

**Average savings when working on individual phases: 70-90%**

---

**Generated:** 2025-01-13
**Source:** `.shrimp-data/tasks-original-backup.json`
**Total Tasks:** 87
**Total Phases:** 9
