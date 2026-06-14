# Step4 프리셉터 짝 같은 행 표시 — 요구사항·구현 계획

> **상태:** ✅ 구현 완료  
> **작성일:** 2026-06-14  
> **인터뷰 기반:** deep-interview  
> **관련 문서:**
>
> - [Step4 프리셉터 짝 Off 동기화](./2026-06-14-step4-preceptor-off-request-sync.ko.md) (데이터 동기화 — ✅ 구현됨)
> - [프리셉터 UI](./2026-06-11-nurse-preceptor-ui.ko.md)
> - Formal spec: [step4-preceptor-off-request-sync-design.md](../superpowers/specs/2026-06-14-step4-preceptor-off-request-sync-design.md)

---

## 요약

Step4 Off 요청 화면에서 **프리셉터–프리셉티 1:1 짝**을 사용자가 **한눈에 인지**할 수 있도록, 짝 관계가 있는 근무자를 **시각적으로 묶어 표시**한다.

**핵심 전제:** 짝은 **같은 날 같은 시프트**(Off 포함)로 근무해야 한다. Off **날짜 자동 동기화**는 기존 `preceptorOffSync`로 이미 처리되며, 본 계획은 **표시·선택 UX**에 집중한다.

---

## deep-interview — 확정된 사항

| 축            | 결정                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| **목표**      | Off 입력 시 프리셉터 짝 관계를 시각적으로 드러내, 짝 불일치·누락을 예방하고 입력 맥락을 유지                 |
| **범위**      | `Step4InitialData.vue` 및 직접 연관 컴포넌트 (`ScheduleGrid`, `Step4RequestComposer`, `EmployeeRequestList`) |
| **제외**      | Step3 프리셉터 지정 UX, `OffRequestPolicySetup`, Step5 compliance 규칙, DB roster 순서 변경, 솔버 로직       |
| **제약**      | 30명×36일 그리드 구조 유지, `employee_id` 기준 roster SSOT 유지, 기존 Off 동기화·정책 검증 회귀 없음         |
| **완료 기준** | 짝이 있는 경우 사용자가 그리드·드로어에서 짝 관계를 명확히 인지하고, 한쪽 선택·셀 클릭 시 짝 맥락이 유지됨   |

### 코드베이스에서 자동 해소한 모호성

| #   | 모호했던 지점              | 해소                                                                                                             |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | 짝 데이터 소스             | `grid.employees[].preceptor_id`(UUID) + 역조회. `resolvePreceptorPair()` 재사용                                  |
| 2   | Off 날짜 일치는 별도 기능? | **이미 구현됨** (`preceptorOffSync.ts`, 드로어 `preceptorPairHints`, reconcile alert). 본 기능은 **표시 레이어** |
| 3   | 그리드 행 순서 현황        | `employee_id` 오름차순 — 짝이 멀리 떨어질 수 있음                                                                |
| 4   | 요청 목록 범위             | `currentEmployeeRequests`는 **선택된 근무자** 기준. 짝이 선택에 없으면 목록에 안 보임                            |
| 5   | 셀 클릭 시 선택            | `handleGridCellSelect`는 **클릭한 1명만** `selectedEmployeeIds`에 넣음 — 짝 자동 포함 없음                       |
| 6   | 직원 수·행 수              | 1:1 짝이어도 **인원 수는 그대로**. “같은 row”는 **시각적 그룹** 또는 **병합 표시** 중 하나를 선택해야 함         |

---

## deep-interview — 미확정 (사용자 결정 필요)

### Q1. “같은 row”의 UI 의미 — ✅ 확정

**결정:** **옵션 A** — 그리드에서 짝을 **인접한 두 행**으로 배치 + 짝 시각 표시(🔗, 배경, 연결선).

- 30×36 구조 유지, 셀 클릭·Off 셀은 근무자별로 독립
- DB·`orgStore` 순서는 변경하지 않고 Step4 **표시 순서만** 재배치

### Q2. 근무자 선택 시 짝 자동 포함 여부 — ✅ 확정

**결정:** **A1** — 한쪽 선택·그리드 셀 클릭 시 짝도 `selectedEmployeeIds`에 자동 추가.

---

## 권장 설계 (옵션 A + A1 가정)

### 1. 표시용 직원 순서 (`displayEmployees`)

Step4에서만 사용하는 **표시 순서** computed를 추가한다. DB·`orgStore` 순서는 변경하지 않는다.

**정렬 규칙:**

1. `preceptor_id`가 있는 프리셉티(preceptee)를 기준으로 **프리셉터 행 바로 다음**에 프리셉티 배치 (또는 반대 — 팀 컨벤션: **프리셉터 위, 프리셉티 아래**).
2. 짝이 없는 직원은 기존 `employee_id` 순서 유지.
3. 한 프리셉터에 프리셉티 1명(1:1)만 가정. 비정상(역조회 2명+)은 기존 `preceptorOffSync`와 동일하게 **짝 묶음 스킵** + `console.warn`.
4. 짝이 서로 다른 `employee_id` 순서에 있어도 **한 덩어리로 이동**해 인접하게 만든다.

**유틸 위치 (신규):** `src/utils/preceptorPairDisplayOrder.ts`

```typescript
export interface PreceptorPairGroup {
  preceptorId: string;
  precepteeId: string;
}

export function orderEmployeesForPreceptorPairs<
  T extends { id: string; employeeId: string; preceptorId?: string | null },
>(employees: T[]): T[];

export function getPreceptorPairMeta(
  employees: T[]
): Map<string, { peerId: string; role: 'preceptor' | 'preceptee'; groupKey: string }>;
```

### 2. ScheduleGrid 시각 표시

`ScheduleGrid.vue`에 선택적 props 추가:

| Prop                                                                | 용도                         |
| ------------------------------------------------------------------- | ---------------------------- |
| `pairMetaByEmployeeId?: Map` 또는 `Record<string, PairDisplayMeta>` | 짝 역할·peerId               |
| (선택) `pairGroupKeys`                                              | 동일 groupKey 행에 동일 배경 |

**시각 요소 (DESIGN.md 준수):**

- 이름 셀: 프리셉터 `프리셉터` / 프리셉티 `프리셉티` 작은 배지 (또는 🔗 아이콘 + peer 이름 1줄)
- 인접 짝 행: `border-l-2 border-sky-300` + `bg-sky-50/40` (짝 그룹 공통)
- `data-test`: `preceptor-pair-row`, `preceptor-pair-role-preceptor`, `preceptor-pair-role-preceptee`

**범위:** Step4 `mode="planning"`에서만 활성화. Step3·Step5는 기존 순서 유지.

### 3. 선택·셀 클릭 시 짝 자동 포함 (A1)

| 진입점                       | 변경                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| `handleSelectEmployee`       | 선택 ID마다 `resolvePreceptorPair` → peerId를 set에 추가 (중복 제거) |
| `handleGridCellSelect`       | `nextEmployeeIds = [payload.employeeId, peerId?]`                    |
| `hydrateDraftFromRequestRow` | 편집 대상 1명 유지 (편집 UX 단순화) — 짝은 목록·그리드 하이라이트만  |

짝 자동 추가 시 `preceptorPairHints`는 기존 문구 유지 (중복 안내 최소화).

### 4. 요청 목록 (보조, 옵션 A에서도 권장)

`EmployeeRequestList` / `buildCurrentEmployeeRequests` 확장:

- 선택된 짝 **양쪽**의 Off가 **날짜·메모·상태가 동일**하면 **1개 행**으로 병합 표시
  - 제목: `김신규 ↔ 박선배`
  - 날짜: 공통 Off 날짜
  - 메모: 불일치 시 `메모는 개별 관리` 안내 (동기화 정책상 짝 메모는 복사 안 함)
- 한쪽만 선택됐거나 날짜가 어긋난 경우(보정 전): 기존처럼 개별 행 + reconcile alert가 이미 처리

### 5. Excel·export

- Excel 다운로드/업로드: **기존 `employee_id` 순서** 유지 (표시 순서는 Step4 전용).
- `orderEmployeesForPreceptorPairs`는 **UI 전용**임을 주석·테스트로 고정.

---

## 아키텍처

```text
Step4InitialData.vue
  ├── displayEmployees = orderEmployeesForPreceptorPairs(grid.employees)
  ├── pairDisplayMeta = getPreceptorPairMeta(displayEmployees)
  ├── ScheduleGrid(:employees="displayEmployees", :pair-display-meta="pairDisplayMeta")
  ├── handleSelectEmployee / handleGridCellSelect → auto-include peer
  └── (선택) merged request rows in currentEmployeeRequests

src/utils/preceptorPairDisplayOrder.ts   ← 신규, 순수 함수
src/components/schedule/ScheduleGrid.vue ← pair badge / row styling props
```

**기존 `preceptorOffSync.ts`는 수정하지 않음** (관심사 분리).

---

## 구현 태스크

### Phase 1 — 순서·메타 유틸 (TDD)

- [ ] `tests/unit/preceptor-pair-display-order.spec.ts` 작성
  - 짝 2명 → 인접 배치
  - 짝 없는 직원 끼리 `employee_id` 순 유지
  - 프리셉터만 여러 프리셉티 없음(1:1) 가정
  - 비정상 역조회 2명 → 스킵, 원 순서 유지
- [ ] `src/utils/preceptorPairDisplayOrder.ts` 구현

### Phase 2 — ScheduleGrid 시각화

- [ ] `ScheduleGrid.vue`에 `pairDisplayMeta` prop + 이름 셀 배지/행 스타일
- [ ] Step4에서 `displayEmployees` + meta 전달
- [ ] `data-test` 셀렉터 추가

### Phase 3 — 선택 시 짝 자동 포함

- [ ] `handleSelectEmployee` / `handleGridCellSelect`에 peer 자동 추가
- [ ] `tests/unit/step4-initial-data.spec.ts` — 선택 1명 시 2명 선택, 셀 클릭 시 peer 포함

### Phase 4 — 요청 목록 병합 (선택, YAGNI 가능)

- [ ] `buildPairedRequestRows()` — 동일 날짜 집합 짝 병합
- [ ] `EmployeeRequestList.vue` — `pairedLabel` 표시
- [ ] 편집/삭제는 기존 `requestKey` (1인 기준) 유지 — 삭제 시 짝 동기화는 기존 `handleDeleteRequest`

### Phase 5 — 검증

- [ ] `pnpm exec vitest run tests/unit/preceptor-pair-display-order.spec.ts tests/unit/step4-initial-data.spec.ts`
- [ ] `pnpm lint:check`
- [ ] `pnpm run build`

---

## 테스트 체크리스트

- [ ] 짝 있는 2명 → `displayEmployees`에서 인접
- [ ] 짝 없는 직원 → `employee_id` 순서 회귀 없음
- [ ] Step4 그리드 — 프리셉터/프리셉티 배지 노출
- [ ] 근무자 1명 선택 → 짝 자동 선택 (A1)
- [ ] 그리드 셀 클릭 → 드로어에 짝 포함
- [ ] 기존 preceptor off sync 테스트 전부 통과 (회귀)
- [ ] Step3·Step5 그리드 순서 변경 없음

---

## 완료 기준

1. Step4 캘린더에서 프리셉터 짝이 **인접 행**으로 보이고 짝 관계가 시각적으로 구분된다. (옵션 A 기준)
2. (A1 선택 시) 한쪽 선택·셀 클릭 시 짝이 선택에 포함된다.
3. DB·orgStore 직원 순서는 변하지 않는다.
4. 기존 Off 동기화·정책 검증·삭제 동작에 회귀가 없다.
5. lint·build·관련 unit test 통과.

---

## 열린 질문

| #   | 항목                                | 상태                                                  |
| --- | ----------------------------------- | ----------------------------------------------------- |
| 1   | “같은 row” = A / B / C              | ✅ **A — 인접 행 배치**                               |
| 2   | 선택 시 짝 자동 포함 (A1 vs A2)     | ✅ **A1 — 짝 자동 포함**                              |
| 3   | 프리셉터·프리셉티 행 순서 (위/아래) | 🟡 구현 시 — 추천: **프리셉터 위, 프리셉티 아래**     |
| 4   | 요청 목록 병합 행 (Phase 4)         | 🟡 MVP에 포함 여부 — 추천: Phase 1–3 후 사용자 피드백 |
| 5   | 짝 행 배경색·배지 copy              | 🟡 `DESIGN.md` 톤에 맞춰 구현 시 확정                 |

---

## 변경 이력

| 날짜       | 내용                                        |
| ---------- | ------------------------------------------- |
| 2026-06-14 | deep-interview 기반 요구사항·구현 계획 초안 |
| 2026-06-14 | Q2 확정 — A1 (선택 시 짝 자동 포함)         |
| 2026-06-14 | Phase 1–3 구현 완료                         |
