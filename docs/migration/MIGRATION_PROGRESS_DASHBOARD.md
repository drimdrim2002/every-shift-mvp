# REFINED_PRD Migration Progress Dashboard

## Document Information
- **Version**: 2.0
- **Last Updated**: 2026-02-28
- **Purpose**: Phase별 진행률/블로커/리스크/릴리스 체크를 한 페이지에서 추적
- **Source of Truth**: `.shrimp-data/tasks.json`
- **Related**: Phase KPI/Ready 기준은 `REFINED_PRD_SERVICE_TRANSITION.md` 참조

---

## 📊 KPI 정의

| 지표 | 정의 | 계산식 |
|------|------|--------|
| **Completed (C)** | 완료된 태스크 수 | `status="completed"` |
| **In Progress (IP)** | 진행 중인 태스크 수 | `status="in_progress"` |
| **Pending (P)** | 대기 중인 태스크 수 | `status="pending"` |
| **Total (T)** | 전체 태스크 수 | 모든 상태 합계 |
| **Completion %** | 완료율 | `C / T * 100` |
| **Release Readiness** | 릴리스 준비도 | `Not Ready`, `In Preparation`, `Ready for Gate`, `Beta Candidate` |

---

## 🎯 Phase 상태 대시보드

### Phase 테이블 (상태/완료조건/담당)

| Phase | 이름 | KPI (C/IP/P/T) | 완료율 | 상태 | 주요 블로커 | 리스크 | 담당 | 릴리스 준비도 |
|:-----:|------|---------------:|-------:|------|------------|--------|------|--------------|
| **P0** | Governance & Tooling | 5/1/23/29 | 17.2% | 🟡 진행중 | P0-3.2 대시보드 구조 설계 | Low | @brown | In Preparation |
| **P1** | Multitenancy Foundation | 0/0/10/10 | 0.0% | ⚪ 미시작 | P0 기준 문서 확정 | Medium | TBD | Not Ready |
| **P2** | Registration & Approval | 0/0/17/17 | 0.0% | ⚪ 미시작 | P1 RLS 완료 | High | TBD | Not Ready |
| **P3** | Authentication & Onboarding | 0/0/10/10 | 0.0% | ⚪ 미시작 | P2 승인 워크플로우 | Medium | TBD | Not Ready |
| **P4** | Account Management | 0/0/11/11 | 0.0% | ⚪ 미시작 | P2 완료 | Medium | TBD | Not Ready |
| **P5** | Org/Employee/Site Mgmt | 0/0/16/16 | 0.0% | ⚪ 미시작 | P1 데이터 모델 | Medium | TBD | Not Ready |
| **P6** | Schedule Editing & Excel | 0/0/11/11 | 0.0% | ⚪ 미시작 | P1 RLS + P5 데이터 | Medium | TBD | Not Ready |
| **P7** | Solver Integration | 0/0/11/11 | 0.0% | ⚪ 미시작 | P5/P6 안정화 | High | TBD | Not Ready |
| **P8** | Notifications | 0/0/13/13 | 0.0% | ⚪ 미시작 | P7 계약/API | High | TBD | Not Ready |
| **P9** | Dashboard & Analytics | 0/0/12/12 | 0.0% | ⚪ 미시작 | P8 파이프라인 | Medium | TBD | Not Ready |
| **P10** | Security & Release | 0/0/12/12 | 0.0% | ⚪ 미시작 | P8/P9 검증 | High | TBD | Not Ready |

> **상태 아이콘**: 🟢 완료 | 🟡 진행중 | 🔴 차단됨 | ⚪ 미시작

---

## ⚠️ Risk/Blocker 등록 포맷

### Blocker 등록 템플릿

```markdown
### [BB-XXXX] P{N}: {블로커 제목}

- **Phase**: P{N}
- **등록일**: YYYY-MM-DD
- **담당자**: @username
- **영향 태스크**: P{N}-{X}.{Y}
- **설명**: 블로커 상세 설명
- **해결 계획**: 해결 방법 및 예상 일정
- **상태**: Active / Resolved / Waived
```

### Risk 등록 템플릿

```markdown
### [RS-XXXX] P{N}: {리스크 제목}

- **Phase**: P{N}
- **등록일**: YYYY-MM-DD
- **리스크 레벨**: Critical / High / Medium / Low
- **카테고리**: Technical / Schedule / Resource / Dependency
- **확률**: 높음 / 중간 / 낮음
- **영향**: 영향도 설명
- **완화 조치**: Mitigation plan
- **상태**: Open / Mitigated / Accepted / Closed
```

### 현재 활성 Blocker/Risk

| ID | Phase | 유형 | 제목 | 레벨 | 등록일 | 담당 | 상태 |
|----|-------|------|------|------|--------|------|------|
| BB-001 | P0 | Blocker | 대시보드 구조 설계 미완료 | Medium | 2026-02-28 | @brown | Active |
| RS-001 | P1 | Risk | RLS 정책 누락 가능성 | High | 2026-02-27 | TBD | Open |
| RS-002 | P7 | Risk | Solver API 계약 지연 | High | 2026-02-27 | TBD | Open |

---

## ✅ 릴리스 체크리스트

### Phase 완료 기준 (Source: REFINED_PRD_SERVICE_TRANSITION.md)

각 Phase는 다음 기준을 **모두** 충족해야 `Ready` 상태로 전환:

#### 1. 기능 완전성 (Functional Completeness)
- [ ] Phase 내 모든 태스크 `status: "completed"`
- [ ] 모든 산출물(Deliverable)이 리뷰됨
- [ ] 의존성 체인에 블로커 없음

#### 2. 품질 게이트 (Quality Gates)
- [ ] `pnpm lint:check` 통과 (에러 0개)
- [ ] `pnpm test:unit` 관련 코드 통과
- [ ] `pnpm build` 성공
- [ ] E2E 시나리오 (필요시) 통과

#### 3. 보안 검증 (Security Verification)
- [ ] 보안 체크포인트 통과
- [ ] RLS/RBAC 영향 검토 (스키마 변경 시)
- [ ] Edge function 서비스 롤 사용 (해당 시)
- [ ] 커밋 코드에 debug 문 없음

#### 4. 문서화 (Documentation)
- [ ] PR 설명에 태스크 연계 및 증거 요약
- [ ] 롤백 노트 작성 (리스크 변경 시)
- [ ] 관련 마이그레이션 문서 업데이트

### Private Beta 릴리스 체크리스트

| Phase 카테고리 | 요구 사항 | 상태 | 검증일 |
|----------------|-----------|------|--------|
| **Foundation** | P0, P1 ✅ COMPLETE | ⏳ | - |
| **Auth Flow** | P2, P3, P4 ✅ COMPLETE | ⏳ | - |
| **Core Data** | P5 ✅ COMPLETE | ⏳ | - |
| **Scheduling** | P6, P7 ✅ COMPLETE | ⏳ | - |
| **User Value** | P8, P9 ✅ COMPLETE | ⏳ | - |
| **Safety** | P10 ✅ COMPLETE | ⏳ | - |

---

## 🔗 Phase 의존성 그래프

```
P0 (Governance)
  └─ P1 (Multitenancy)
       ├─ P2 (Signup) ──────┐
       ├─ P3 (Auth)          ├─ P4 (Account)
       ├─ P5 (Master Data) ──┤
       └─ P6 (Excel) ────────┘
            └─ P7 (Solver)
                 └─ P8 (Notifications)
                      ├─ P9 (Dashboard)
                      └─ P10 (Security)
```

### 크리티컬 패스 (34 tasks)

```
P0 → P1 → P5 → P7 → P8
```

---

## 🔄 운영 캐던스 (Operational Review Cadence)

| 주기 | 작업 | 담당 | 산출물 |
|------|------|------|--------|
| **일일** | KPI 갱신 (tasks.json → Dashboard) | Auto/Manual | 최신 진행률 |
| **주간** | Blocker/Risk 검토 및 재분류 | Phase Lead | Blocker/Risk 업데이트 |
| **게이트** | Phase 완료 기준 검증 | All | Ready/Not Ready 판정 |
| **월간** | 릴리스 준비도 전체 검토 | PM/Lead | Private Beta Go/No-Go |

---

## 📝 KPI 갱신 명령어

```bash
# Phase별 태스크 상태 집계
jq -r '.tasks | group_by(.phase) | map({
  phase: .[0].phase,
  completed: map(select(.status == "completed")) | length,
  in_progress: map(select(.status == "in_progress")) | length,
  pending: map(select(.status == "pending")) | length,
  total: length
}) | .[] | "\(.phase): \(.completed)/\(.in_progress)/\(.pending)/\(.total)"' \
  .shrimp-data/tasks.json

# 완료율 계산
jq -r '.tasks | group_by(.phase) | map({
  phase: .[0].phase,
  completion: (.completed / .total * 100 | floor)
}) | .[] | "\(.phase): \(.completion)%"' \
  .shrimp-data/tasks.json

# 의존성 그래프 무결성 체크
./scripts/task-quality-check.sh
```

---

## 📌 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2026-02-28 | 2.0 | Phase 테이블 구조화, Risk/Blocker 포맷 추가, 릴리스 체크리스트 추가 |
| 2026-02-27 | 1.0 | 초기 대시보드 기본 구조 생성 |
