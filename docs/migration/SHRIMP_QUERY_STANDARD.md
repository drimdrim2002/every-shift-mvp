# Shrimp 상태 조회 표준 (Query & Report Standard)

## 문서 정보
- **버전**: 1.0
- **작성일**: 2026-02-28
- **목적**: 진행 상태를 추적하는 표준 명령/보고 방식 정의
- **대상**: Shrimp Task Manager 사용자 (.shrimp-data/tasks.json)

---

## 📋 목차

1. [기본 조회 명령](#기본-조회-명령)
2. [Phase별 조회 기준](#phase별-조회-기준)
3. [주간 리포트 템플릿](#주간-리포트-템플릿)
4. [내보내기 방식](#내보내기-방식)

---

## 1. 기본 조회 명령

### 1.1 전체 태스크 목록 조회

```bash
# 모든 태스크 목록 (ID, 이름, 상태)
jq -r '.tasks[] | "\(.id[:8])... | \(.name) | \(.status)"' .shrimp-data/tasks.json
```

### 1.2 상태별 태스크 개수 집계

```bash
# 상태별 카운트
jq '.tasks | group_by(.status) | map({status: .[0].status, count: length}) | sort_by(.status)' .shrimp-data/tasks.json
```

**출력 예시**:
```json
[
  {"status": "completed", "count": 28},
  {"status": "in_progress", "count": 1},
  {"status": "pending", "count": 123}
]
```

### 1.3 Phase별 진행률 계산

```bash
# Phase별 완료율
jq -r '.tasks | group_by(.phase) | map({
  phase: .[0].phase,
  completed: map(select(.status == "completed")) | length,
  total: length,
  progress: (.completed / .total * 100 | floor)
}) | .[] | "\(.phase): \(.completed)/\(.total) (\(.progress)%)"' .shrimp-data/tasks.json
```

**출력 예시**:
```
P0: 5/29 (17%)
P1: 0/10 (0%)
P2: 0/17 (0%)
```

---

## 2. Phase별 조회 기준

### 2.1 이름 Prefix 기준

태스크 이름은 `P{N}-{X}.{Y}` 형식을 따르며, Phase 필드와 동일한 Prefix를 사용합니다.

| Phase | Prefix | 예시 |
|-------|--------|------|
| P0 | `P0-` | `P0-1.1`, `P0-2.3`, `P0-3.2` |
| P1 | `P1-` | `P1-1.1`, `P1-2.3` |
| P2 | `P2-` | `P2-1.1`, `P2-2.5` |

### 2.2 Phase별 태스크 조회

```bash
# 특정 Phase 태스크만 조회 (예: P0)
jq -r '.tasks[] | select(.phase == "P0") | "\(.id[:8])... | \(.name) | \(.status)"' .shrimp-data/tasks.json

# 또는 이름 prefix로 조회
jq -r '.tasks[] | select(.name | startswith("P0-")) | "\(.name) | \(.status)"' .shrimp-data/tasks.json
```

### 2.3 Phase별 상태 분리

```bash
# Phase별 상태 분리 테이블
jq -r '.tasks | group_by(.phase) | .[] | {
  phase: .[0].phase,
  completed: map(select(.status == "completed")) | length,
  in_progress: map(select(.status == "in_progress")) | length,
  pending: map(select(.status == "pending")) | length,
  total: length
} | "\(.phase) | \(.completed)/\(.in_progress)/\(.pending)/\(.total)"' .shrimp-data/tasks.json
```

**출력 형식**: `Phase | Completed/In Progress/Pending/Total`

---

## 3. 주간 리포트 템플릿

### 3.1 주간 진행 상황 리포트

```markdown
# Shrimp 주간 진행 상황 리포트

**기간**: YYYY-MM-DD ~ YYYY-MM-DD (Week N)
**작성자**: @username
**기준 시각**: YYYY-MM-DD HH:mm

---

## 1. 전체 진행률

| 항목 | 값 |
|------|-----|
| 전체 태스크 | 152 |
| 완료 | XX (XX%) |
| 진행 중 | XX |
| 대기 | XX |

## 2. Phase별 진행 현황

| Phase | 완료율 | C/IP/P/T | 주요 성과 |
|-------|--------|----------|----------|
| P0 | XX% | X/X/X/X | - |
| P1 | XX% | X/X/X/X | - |
| ... | ... | ... | ... |

## 3.本周 완료 태스크

- [P0-X.Y] 태스크 이름 - 담당자
- [P1-X.Y] 태스크 이름 - 담당자

## 4. 진행 중 태스크

- [P0-X.Y] 태스크 이름 - 담당자 (예상 완료: YYYY-MM-DD)
- [P1-X.Y] 태스크 이름 - 담당자 (예상 완료: YYYY-MM-DD)

## 5. 차주 계획

| 태스크 | 담당자 | 우선순위 |
|--------|--------|----------|
| [P0-X.Y] 태스크 이름 | @username | P0/P1/P2 |
| [P1-X.Y] 태스크 이름 | @username | P0/P1/P2 |

## 6. 리스크/이슈

| ID | Phase | 유형 | 설명 | 대응 계획 |
|----|-------|------|------|----------|
| BB-XXX | P0 | Blocker | 설명 | 대응안 |
| RS-XXX | P1 | Risk | 설명 | 완화안 |

---

## 첨부: jq 명령 실행 결과

```bash
# Phase별 상태 집계
jq -r '...' .shrimp-data/tasks.json
```
```

### 3.2 주간 리포트 생성 스크립트

```bash
#!/bin/bash
# weekly-report.sh - 주간 리포트 생성 스크립트

DATA_DIR=".shrimp-data"
TASKS_FILE="$DATA_DIR/tasks.json"
REPORT_DATE=$(date -u +"%Y-%m-%d")
WEEK_NUM=$(date +%V)

echo "# Shrimp 주간 진행 상황 리포트"
echo ""
echo "**기간**: $(date -d '7 days ago' +%Y-%m-%d) ~ $REPORT_DATE (Week $WEEK_NUM)"
echo "**작성자**: @username"
echo "**기준 시각**: $(date -u +"%Y-%m-%d %H:%M")"
echo ""
echo "---"
echo ""
echo "## 1. 전체 진행률"
echo ""

TOTAL=$(jq '.tasks | length' $TASKS_FILE)
COMPLETED=$(jq '[.tasks[] | select(.status == "completed")] | length' $TASKS_FILE)
IN_PROGRESS=$(jq '[.tasks[] | select(.status == "in_progress")] | length' $TASKS_FILE)
PENDING=$(jq '[.tasks[] | select(.status == "pending")] | length' $TASKS_FILE)
PROGRESS=$((COMPLETED * 100 / TOTAL))

echo "| 항목 | 값 |"
echo "|------|-----|"
echo "| 전체 태스크 | $TOTAL |"
echo "| 완료 | $COMPLETED ($PROGRESS%) |"
echo "| 진행 중 | $IN_PROGRESS |"
echo "| 대기 | $PENDING |"
```

---

## 4. 내보내기 방식

### 4.1 수동 복사 (간단 내보내기)

```bash
# 터미널 출력을 클립보드에 복사 (WSL/Linux)
jq -r '.tasks[] | "\(.id) | \(.name) | \(.status)"' .shrimp-data/tasks.json | clip.exe  # Windows

# macOS
jq -r '.tasks[] | "\(.id) | \(.name) | \(.status)"' .shrimp-data/tasks.json | pbcopy

# Linux (xclip)
jq -r '.tasks[] | "\(.id) | \(.name) | \(.status)"' .shrimp-data/tasks.json | xclip -sel clip
```

### 4.2 파일로 내보내기

```bash
# CSV 형식 내보내기
jq -r '.tasks[] | [
  .id, .name, .status, .phase, .estimatedMinutes
] | @csv' .shrimp-data/tasks.json > tasks-export-$(date +%Y%m%d).csv

# Markdown 테이블 형식 내보내기
jq -r '.tasks[] | "| \(.id[:8])... | \(.name) | \(.status) | \(.phase) |"' \
  .shrimp-data/tasks.json > tasks-export-$(date +%Y%m%d).md
```

### 4.3 스크립트 자동화

```bash
#!/bin/bash
# export-tasks.sh - 태스크 내보내기 스크립트

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR=".shrimp-data/exports"
mkdir -p $OUTPUT_DIR

# JSON 복사
cp .shrimp-data/tasks.json "$OUTPUT_DIR/tasks-$TIMESTAMP.json"

# CSV 내보내기
jq -r '.tasks[] | [.id, .name, .status, .phase, .estimatedMinutes] | @csv' \
  .shrimp-data/tasks.json > "$OUTPUT_DIR/tasks-$TIMESTAMP.csv"

# Markdown 요약
jq -r '.tasks | group_by(.phase) | .[] | {
  phase: .[0].phase,
  completed: map(select(.status == "completed")) | length,
  total: length
} | "| \(.phase) | \(.completed)/\(.total) |"' \
  .shrimp-data/tasks.json > "$OUTPUT_DIR/summary-$TIMESTAMP.md"

echo "Exported to $OUTPUT_DIR:"
ls -lh "$OUTPUT_DIR" | tail -3
```

### 4.4 REMAINING_TASKS_MERGED 동기화

`docs/migration/REMAINING_TASKS_MERGED.md`는 `.shrimp-data/tasks.json` 기반 자동 생성 문서입니다.

```bash
# 1) 문서 재생성
pnpm shrimp:remaining:generate

# 2) 동기화 검사(불일치 시 실패)
pnpm shrimp:remaining:check

# 3) 전체 태스크 품질 + 문서 동기화 게이트
./scripts/task-quality-check.sh
```

운영 규칙:
- `tasks.json` 변경 후에는 반드시 `pnpm shrimp:remaining:generate`를 실행한다.
- PR 전에는 `./scripts/task-quality-check.sh` 통과를 필수로 한다.

---

## 5. 자주 사용하는 쿼리 (Quick Reference)

| 목적 | 명령 |
|------|------|
| 전체 태스크 수 | `jq '.tasks | length' .shrimp-data/tasks.json` |
| 완료된 태스크 | `jq '[.tasks[] \| select(.status == "completed")] | length'` |
| 특정 Phase 태스크 | `jq '.tasks[] \| select(.phase == "P0")'` |
| 이름으로 검색 | `jq '.tasks[] \| select(.name \| contains("대시보드"))'` |
| 의존성 체크 | `jq '.tasks[] \| select(.dependencies[].taskId == "xxx")'` |
| 미완료 태스크 | `jq '.tasks[] \| select(.status != "completed") \| .name'` |

---

## 6. MCP를 통한 Shrimp 쿼리

### 6.1 MCP 사용 시

Shrimp Task Manager MCP 서버가 설치된 경우, Claude Code에서 직접 쿼리 가능:

```
# MCP 통해 태스크 조회
/list-tasks --phase P0 --status completed

# 의존성 그래프 확인
/show-dependencies --task-id 10000000-0000-4000-8000-000000000042
```

### 6.2 MCP 설치 확인

```bash
# MCP 서버 목록 확인
claude mcp list | grep shrimp

# 설치되지 않은 경우 설치
claude mcp add shrimp-task-manager -- npx -y mcp-shrimp-task-manager
```

---

## 7. 문서 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2026-03-02 | 1.1 | `REMAINING_TASKS_MERGED.md` 자동 생성/동기화 명령 및 운영 규칙 추가 |
| 2026-02-28 | 1.0 | 초기 버전 - 기본 조회 명령, Phase별 조회, 주간 리포트 템플릿 정의 |
