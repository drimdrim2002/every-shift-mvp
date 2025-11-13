# EveryShift MVP PRD - 문서 구조

이 디렉토리에는 EveryShift MVP 프로젝트의 상세 기획 및 개발 가이드 문서들이 있습니다.

## 📚 문서 목록

### 1. 프로젝트 개요 및 기술 아키텍처
**파일**: `01-overview-architecture.md`  
**크기**: ~8.5KB (271줄)  
**내용**:
- 프로젝트 개요 (문제 정의, MVP 목표, 제약사항)
- 기술 스택 (Frontend, Backend, AI Solver)
- Vben Admin 활용 전략
- 프로젝트 구조
- 데이터 플로우

### 2. 데이터베이스 설계 및 마이그레이션
**파일**: `02-database-migration.md`  
**크기**: ~19KB (682줄)  
**내용**:
- ERD 및 6개 테이블 설계
- 테이블 상세 스키마 (organizations, employees, shifts, schedules, schedule_assignments, site_requirements)
- Seed 데이터 (조직 1개, 직원 30명, 시프트 4개)
- Supabase 프로젝트 설정 가이드
- 마이그레이션 실행 방법
- 트러블슈팅

### 3. 기능 명세, 컴포넌트 설계, API 설계
**파일**: `03-features-components-api.md`  
**크기**: ~46KB (1,652줄) ⭐ **가장 중요**  
**내용**:
- **Step 1**: 기본 정보 설정 (계획 월 선택, 조직 정보 확인)
- **Step 2**: 사이트 정보 설정 (일별 필요 인력)
- **Step 3**: 근무표 초기 정보 입력 (30×36 그리드 ⭐ 핵심)
- **Step 4**: 결과 확인 (AI Solver 연동, 수동 수정, 엑셀 다운로드)
- 컴포넌트 설계 (ScheduleGrid, ShiftSelector, StepIndicator)
- API 설계 (Supabase 클라이언트, Schedule API, AI Solver Mock)

### 4. 개발 가이드
**파일**: `04-development-guide.md`  
**크기**: ~17KB (742줄)  
**내용**:
- **Week 1**: 개발 환경 설정 (Vite, Tailwind, Supabase)
- **Week 2**: 기본 구조 및 인증 (레이아웃, 라우팅, 로그인)
- **Week 3**: Step 1-2 구현
- **Week 4-5**: Step 3 그리드 구현 (TanStack Table, ShiftSelector, 통계, 검증)
- **Week 6-7**: Step 4 및 AI 연동 (Mock Solver, Polling, 엑셀 다운로드)
- **Week 8**: 마무리 및 개선
- 부록 (TanStack Table 개념, 트러블슈팅)

---

## 🚀 빠른 시작

### 개발 순서 (권장)

1. **먼저 읽기**: `01-overview-architecture.md` - 전체 그림 이해
2. **DB 설정**: `02-database-migration.md` - Supabase 프로젝트 생성 및 마이그레이션
3. **기능 이해**: `03-features-components-api.md` - Step 3 (그리드) 중점 파악
4. **단계별 구현**: `04-development-guide.md` - Week 1부터 순차 진행

### 핵심 포인트

- **가장 중요한 부분**: Step 3의 30×36 그리드 UI (`03-features-components-api.md` 참조)
- **기술 스택**: Vue 3 + TypeScript + TanStack Table + Supabase
- **개발 기간**: 8주
- **MVP 범위**: 7장(근무표 생성) 4단계만 구현

---

## 📖 문서 사용 가이드

### AI 코딩 도구 활용 시

이 문서들은 Claude Code, Cursor 등 AI 코딩 도구와 함께 사용하도록 설계되었습니다:

**효과적인 프롬프트 예시**:
- ✅ "03-features-components-api.md의 Step 3 그리드를 TanStack Table로 구현해줘"
- ✅ "ScheduleGrid.vue 컴포넌트를 5.1 섹션 참고해서 작성해줘"
- ✅ "02-database-migration.md의 마이그레이션 SQL을 Supabase에서 실행하는 방법 알려줘"

**비효율적인 프롬프트 예시**:
- ❌ "근무표 시스템 만들어줘" (너무 광범위)
- ❌ "그리드 컴포넌트 만들어줘" (구체적 요구사항 부족)

### 섹션별 참조 방법

특정 기능 구현 시 다음과 같이 교차 참조하세요:

| 구현 내용 | 참조 문서 | 섹션 |
|----------|---------|-----|
| 프로젝트 초기화 | 04-development-guide.md | Week 1 |
| DB 스키마 | 02-database-migration.md | 1.2 테이블 상세 스키마 |
| Step 1 구현 | 03-features-components-api.md | 4.1 Step 1 |
| 그리드 구현 | 03-features-components-api.md | 4.3 Step 3, 5.1 ScheduleGrid |
| API 연동 | 03-features-components-api.md | 6.2 Schedule API |

---

## ⚠️ 주의사항

1. **MVP 범위 준수**: Out-of-Scope 기능 구현 금지 (01-overview-architecture.md 섹션 1.2 참조)
2. **Seed 데이터 사용**: 조직/직원 CRUD 구현하지 말 것
3. **Mock AI Solver**: 실제 Google Cloud Run 연동하지 말 것
4. **그리드 단순화**: 가상 스크롤, 키보드 단축키 등 고급 기능 제외

---

## 📝 변경 이력

- **2025-11-12**: 초기 문서 작성 및 PRD 분할
  - 원본 PRD.md (2,931줄)을 4개 파일로 분할
  - 각 문서에 헤더 및 목차 추가

---

**문서 버전**: MVP 1.0  
**최종 수정**: 2025-11-12  
**작성자**: 브라운 + Claude  
**라이선스**: MIT
