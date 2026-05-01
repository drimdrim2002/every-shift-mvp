# 📚 EveryShift MVP 문서 저장소

이 디렉토리에는 EveryShift MVP 프로젝트의 모든 문서가 용도별로 정리되어 있습니다.

---

## 📁 문서 구조

```
docs/
├── README.md                    # 이 파일 (문서 안내)
├── database/                    # 현재 DB/ERD 문서
├── launch/                      # Public Beta 출시 문서
├── prd/                         # 제품 기획서 (Product Requirements Document)
├── setup/                       # 설정 및 설치 가이드
├── integration/                 # 통합 가이드
└── verification/                # 테스트 및 검증
```

---

## 🗄️ Database (현재 DB/ERD)

**경로**: `database/`

현재 Supabase schema 중 실제 런타임에서 사용하는 테이블과 관계를 설명합니다.

| 파일                    | 용도                                     |
| ----------------------- | ---------------------------------------- |
| `used-tables-erd.ko.md` | 현재 사용 테이블 기준 ERD 및 테이블 역할 |

---

## 🚀 0. Launch (공개 베타 출시 문서)

**경로**: `launch/`

공개 베타 출시를 위한 기준 문서입니다. 랜딩 페이지, 공개/앱 라우트 분리, 소셜 로그인, 배포, 출시 QA를 한 곳에서 관리합니다.

| 파일                                      | 용도                            |
| ----------------------------------------- | ------------------------------- |
| `README.md`                               | launch 문서 인덱스 및 읽는 순서 |
| `public-beta-launch-plan.md`              | 공개 베타 마스터 실행 계획      |
| `public-beta-information-architecture.md` | 공개/앱 정보 구조 및 메뉴 구조  |
| `public-beta-auth-and-deploy-spec.md`     | 인증 및 배포 스펙               |
| `public-beta-qa-checklist.md`             | 출시 전 QA 체크리스트           |

### 읽는 순서

1. `launch/public-beta-launch-plan.md`
2. `launch/public-beta-information-architecture.md`
3. `launch/public-beta-auth-and-deploy-spec.md`
4. `launch/public-beta-qa-checklist.md`

---

## 📋 1. PRD (제품 기획서)

**경로**: `prd/`

프로젝트 기획 문서들은 현재 `현행 기준 문서`와 `과거 참고 문서`로 나누어 관리합니다.

### 현재 기준 문서 (권장)

| 파일                       | 설명                                                                |
| -------------------------- | ------------------------------------------------------------------- |
| `PHASE2_PRD_KR.md`         | 현재 제품 기준 문서. 배포 필수 기능과 확장 기능을 분리한 Phase2 PRD |
| `02-database-migration.md` | 현재 DB 구조와 Supabase 설정 참고 문서                              |

### Phase1 참고 문서 (Legacy Reference)

| 파일                            | 설명                                  |
| ------------------------------- | ------------------------------------- |
| `PRD.md`                        | 원본 통합 Phase1 MVP 문서             |
| `01-overview-architecture.md`   | Phase1 MVP 개요 및 아키텍처           |
| `03-features-components-api.md` | Phase1 4단계 워크플로우 상세 기능/API |
| `04-development-guide.md`       | 초기 8주 MVP 개발 가이드              |

### 확장 아이디어 문서 (Superseded)

| 파일                | 설명                                                       |
| ------------------- | ---------------------------------------------------------- |
| `REFINED_PRD_KR.md` | 넓은 서비스 확장 요구사항을 모은 문서. 현재 기준 문서 아님 |
| `REFINED_PRD.md`    | 위 문서의 영문판. 현재 기준 문서 아님                      |

### 📖 읽는 순서 (권장)

1. **`PHASE2_PRD_KR.md`** - 현재 제품 방향과 배포 기준 이해
2. **`PRD.md`** 또는 **`01-overview-architecture.md`** - Phase1 구현 배경 이해
3. **`03-features-components-api.md`** - 현재 구현된 4단계 워크플로우 상세 확인
4. **`02-database-migration.md`** - DB 구조와 Supabase 설정 참고
5. **`04-development-guide.md`** - 초기 MVP 구현 방식 참고

---

## ⚙️ 2. Setup (설정 가이드)

**경로**: `setup/`

시스템 설정 및 설치 관련 가이드입니다.

| 파일                           | 용도                                     |
| ------------------------------ | ---------------------------------------- |
| `setup-file-storage-system.md` | 파일 스토리지 시스템 Supabase 설정       |
| `setup-menu-system.md`         | 메뉴 시스템 Supabase 설정                |
| `setup-table-data-system.md`   | 테이블 데이터 시스템 Supabase 설정       |
| `MCP_INSTALLATION.md`          | MCP (Model Context Protocol) 설치 가이드 |

### 사용 시점

- **프로젝트 초기 설정 시**: Supabase 관련 setup-\* 파일들
- **Claude Code 개발 환경 구성 시**: MCP_INSTALLATION.md

---

## 🔗 3. Integration (통합 가이드)

**경로**: `integration/`

프론트엔드 및 백엔드 통합 관련 가이드입니다.

| 파일                            | 용도                            |
| ------------------------------- | ------------------------------- |
| `frontend-integration-guide.md` | 프론트엔드 Supabase 연동 가이드 |

### 사용 시점

- Vue 3 컴포넌트에서 Supabase 클라이언트 사용 시
- 인증, 데이터 CRUD 통합 작업 시

---

## ✅ 4. Verification (테스트 및 검증)

**경로**: `verification/`

테스트, 검증, 완료 보고서 등이 포함됩니다.

| 파일                           | 용도                        |
| ------------------------------ | --------------------------- |
| `test-validation-guide.md`     | Supabase 연동 테스트 가이드 |
| `final-verification-report.md` | 프로젝트 최종 검증 보고서   |

### 사용 시점

- **개발 중**: test-validation-guide.md로 기능 검증
- **프로젝트 완료 시**: final-verification-report.md로 전체 상태 확인

---

## 🚀 빠른 시작 가이드

### 신규 개발자를 위한 추천 읽기 순서

```mermaid
graph TD
    A[📖 prd/01-overview-architecture.md] --> B[💾 prd/02-database-migration.md]
    B --> C[⚙️ setup/setup-table-data-system.md]
    C --> D[📱 prd/03-features-components-api.md]
    D --> E[🔧 prd/04-development-guide.md]
    E --> F[🔗 integration/frontend-integration-guide.md]
    F --> G[✅ verification/test-validation-guide.md]
```

### 1단계: 프로젝트 이해 (1-2시간)

```bash
# PRD 문서 읽기
cat docs/prd/01-overview-architecture.md
cat docs/prd/02-database-migration.md
```

### 2단계: 환경 설정 (2-3시간)

```bash
# Supabase 설정
# docs/prd/02-database-migration.md 참고

# MCP 설치 (Claude Code 사용 시)
cat docs/setup/MCP_INSTALLATION.md
```

### 3단계: 기능 구현 (Week 1-8)

```bash
# 개발 가이드 참고
cat docs/prd/04-development-guide.md
# 기능 명세 참고
cat docs/prd/03-features-components-api.md
```

### 4단계: 통합 및 테스트

```bash
# 프론트엔드 통합
cat docs/integration/frontend-integration-guide.md
# 테스트
cat docs/verification/test-validation-guide.md
```

---

## 🎯 주요 문서 빠른 링크

### 핵심 기획 문서

- [Public Beta Launch](launch/public-beta-launch-plan.md) - 공개 베타 출시 기준 문서
- [Phase2 PRD](prd/PHASE2_PRD_KR.md) - 현재 기준 문서. 배포 필수 기능과 확장 기능 분리
- [프로젝트 개요](prd/01-overview-architecture.md) - Phase1 MVP 개요 및 기술 스택
- [데이터베이스 설계](prd/02-database-migration.md) - ERD, 스키마, 마이그레이션
- [기능 명세서](prd/03-features-components-api.md) - Phase1 Step 1-4 상세, 그리드 구현 ⭐
- [개발 가이드](prd/04-development-guide.md) - 초기 MVP 구현 참고

### 설정 가이드

- [Supabase 테이블 설정](setup/setup-table-data-system.md)
- [MCP 설치](setup/MCP_INSTALLATION.md)

### 통합 및 테스트

- [프론트엔드 연동](integration/frontend-integration-guide.md)
- [테스트 가이드](verification/test-validation-guide.md)

---

## 📌 문서 사용 팁

### AI 코딩 도구와 함께 사용하기

이 문서들은 Claude Code, Cursor 등 AI 도구와 최적화되어 있습니다:

**✅ 효과적인 프롬프트**:

```
"docs/prd/03-features-components-api.md의 Step 3 그리드를
TanStack Table로 구현해줘"
```

**❌ 비효율적인 프롬프트**:

```
"근무표 시스템 만들어줘"  # 너무 광범위
```

### 문서 간 교차 참조

| 구현 작업       | 참조 문서                                         |
| --------------- | ------------------------------------------------- |
| 프로젝트 초기화 | `prd/04-development-guide.md` Week 1              |
| DB 스키마 작성  | `prd/02-database-migration.md` 섹션 1.2           |
| 그리드 컴포넌트 | `prd/03-features-components-api.md` 섹션 4.3, 5.1 |
| Supabase 연동   | `integration/frontend-integration-guide.md`       |
| 테스트 작성     | `verification/test-validation-guide.md`           |

---

## ⚠️ 중요 참고사항

### 현재 문서 사용 기준

- 현재 제품 방향, 배포 범위, 우선순위 판단은 `prd/PHASE2_PRD_KR.md`를 기준으로 합니다.
- `PRD.md`, `01-overview-architecture.md`, `03-features-components-api.md`, `04-development-guide.md`는 Phase1 구현 참고 문서입니다.
- `REFINED_PRD_KR.md`, `REFINED_PRD.md`는 확장 아이디어 참고 문서이며 현재 기준 문서는 아닙니다.
- 과거 Phase1 문서의 `Out-of-Scope`는 현재 전체 제품 범위를 제한하는 규칙이 아니라, 당시 MVP 경계입니다.

### 기술 제약사항

- **현재 구현 기준**: Phase1 워크플로우가 중심이며, Phase2A는 배포 신뢰성 레이어를 보완하는 단계
- **Mock AI Solver**: 개발 환경에서는 Mock 또는 개발용 연동 구성을 우선 사용
- **Seed 데이터**: 일부 문서는 Seed 기반 MVP를 전제로 작성되어 있으므로 현재 문서 기준과 구분해 읽어야 함

---

## 📝 문서 변경 이력

### 2025-11-13

- ✅ 문서 구조 재구성 (용도별 폴더 분류)
- ✅ PRD, Setup, Integration, Verification 폴더 생성
- ✅ README.md 업데이트 (새 구조 반영)

### 2025-11-12

- ✅ 원본 PRD.md 4개 파일로 분할
- ✅ 각 문서에 헤더 및 목차 추가

---

## 🤝 기여 가이드

새로운 문서 추가 시 다음 규칙을 따라주세요:

1. **적절한 폴더에 배치**:
   - 기획: `prd/`
   - 설정: `setup/`
   - 통합: `integration/`
   - 검증: `verification/`

2. **파일명 규칙**:
   - 소문자, 하이픈 사용: `my-new-guide.md`
   - 숫자 접두사 (순서 중요 시): `05-new-section.md`

3. **문서 헤더 포함**:

   ```markdown
   # 제목

   ## 문서 정보

   - **버전**: X.X
   - **작성일**: YYYY-MM-DD
   - **목적**: 문서 목적
   ```

4. **README.md 업데이트**: 새 문서 추가 시 이 파일도 업데이트

---

## 📧 문의

- **프로젝트**: EveryShift MVP
- **버전**: 1.0
- **최종 수정**: 2025-11-13
- **작성자**: 브라운 + Claude
- **라이선스**: MIT

---

**Happy Coding! 🚀**
