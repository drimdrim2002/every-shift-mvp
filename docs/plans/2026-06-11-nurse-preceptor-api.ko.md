# 간호사 프리셉터 — API / TypeScript 설계

> **상태:** 구현 완료  
> **작성일:** 2026-06-11  
> **순서:** 2/3 — [DB](./2026-06-11-nurse-preceptor-db.ko.md) → API → [UI](./2026-06-11-nurse-preceptor-ui.ko.md)  
> **상위 문서:** [개요](./2026-06-11-nurse-preceptor-design.ko.md)  
> **선행:** [DB migration·RPC](./2026-06-11-nurse-preceptor-db.ko.md) 완료 또는 병행

---

## 1. 범위

본 문서는 **TypeScript 타입**, **API 매핑**, **솔버 payload**, **compliance evaluator** 변경을 다룬다.

| 포함                                           | 제외                                                            |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `src/types/*` 확장                             | SQL migration → [DB](./2026-06-11-nurse-preceptor-db.ko.md)     |
| `src/api/schedule.ts` (`getPlanningEmployees`) | Step3 화면·와이어 → [UI](./2026-06-11-nurse-preceptor-ui.ko.md) |
| `solverMapper`, `scheduleInputSnapshot`        |                                                                 |
| Ops contracts / repository payload             |                                                                 |
| `scheduleCompliance` + rule code               |                                                                 |
| 목 솔버 pairing 알고리즘 계약                  |                                                                 |

### 1.1 확정 요구사항 (API 관점)

| 항목      | 결정                                                         |
| --------- | ------------------------------------------------------------ |
| 제약      | 하드 — 같은 날 같은 시프트                                   |
| 솔버 입력 | `SolverRequest.employees[].preceptor_id` (UUID, preceptee만) |
| 스냅샷    | `ScheduleInputSnapshotEmployee.preceptorId` — hash에 포함    |
| 미충족    | 생성 완료, compliance `preceptor_pairing` 위반 (mandatory)   |

### 1.2 식별자 규칙

| 계층                     | 필드                           | 형식              |
| ------------------------ | ------------------------------ | ----------------- |
| UI / `EmployeeInput`     | `preceptorEmployeeId`          | 직번              |
| DB / FK / 솔버 / 배정    | `preceptor_id` / `preceptorId` | UUID              |
| `getPlanningEmployees()` | `employee_id`                  | UUID (기존 패턴)  |
| RPC payload              | `preceptor_employee_id`        | 직번 (snake_case) |

---

## 2. 타입 변경

### 2.1 `src/types/employee.ts`

```typescript
export interface Employee {
  id: string;
  organizationId: string;
  employeeId: string;
  name: string;
  availableShifts: string[];
  rankCode?: string | null;
  preceptorId?: string | null; // NEW — UUID (DB load)
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeInput {
  employeeId: string;
  name: string;
  availableShifts: string[];
  rankCode?: string | null;
  preceptorEmployeeId?: string | null; // NEW — 직번 (UI/엑셀)
}
```

### 2.2 `src/types/ops.ts`

```typescript
export interface EmployeeImportEmployeePreview {
  employeeId: string;
  name: string;
  availableShifts: string[];
  rankCode?: string | null;
  preceptorEmployeeId?: string | null; // NEW
}
```

### 2.3 `supabase/functions/phase2-ops/contracts.ts`

```typescript
export interface EmployeeImportEmployeePayload {
  employeeId: string;
  name: string;
  availableShifts: string[];
  rankCode?: string | null;
  preceptorEmployeeId?: string | null; // NEW
}
```

RPC snake_case 매핑: `preceptorEmployeeId` → `preceptor_employee_id`.

### 2.4 `src/types/schedule.ts`

```typescript
export interface PlanningEmployee {
  employee_id: string;
  name: string;
  available_shifts: string[];
  preceptor_id?: string | null; // NEW — UUID
}

export interface SolverRequestEmployee {
  employee_id: string;
  name: string;
  available_shifts: string[];
  skill_set: string[];
  preceptor_id?: string | null; // NEW — preceptee only
}

export interface ScheduleInputSnapshotEmployee {
  employeeId: string;
  availableShifts: string[];
  skillSet: string[];
  preceptorId?: string | null; // NEW
}
```

### 2.5 `src/types/scheduleCompliance.ts`

```typescript
export type ScheduleComplianceRuleCode =
  | 'nod_pattern'
  | 'triple_night'
  | 'rest_after_two_nights'
  | 'monthly_night_limit'
  | 'preceptor_pairing'; // NEW

export interface EvaluateScheduleComplianceInput {
  month: string;
  employees: Array<{
    id: string;
    name: string;
    preceptorId?: string | null; // NEW
  }>;
  assignments: AssignmentMap;
  offRequests: ConstraintMap;
  shifts: Shift[];
}
```

---

## 3. 데이터 흐름 · 매핑

```text
Step3 EmployeeInput.preceptorEmployeeId (직번)
  → Ops RPC preceptor_employee_id
  → DB employees.preceptor_id (UUID)          [DB 문서]

Step3 load: employees.preceptor_id (UUID)
  → idToEmployeeIdMap 역조회
  → EmployeeInput.preceptorEmployeeId (직번)  [UI 문서]

getPlanningEmployees(orgId)
  → SELECT id, name, available_shifts, preceptor_id
  → PlanningEmployee

mapToSolverRequest() / solverMapper.ts
  → SolverRequestEmployee.preceptor_id

normalizeScheduleSolverInput() / scheduleInputSnapshot.ts
  → ScheduleInputSnapshotEmployee.preceptorId
  → solverInputHash에 포함

evaluateScheduleCompliance()
  → employees[].preceptorId + assignments
  → violations (ruleCode: preceptor_pairing)
```

---

## 4. API / 유틸 파일 변경

### 4.1 `src/api/schedule.ts` — `getPlanningEmployees`

```typescript
export async function getPlanningEmployees(organizationId: string): Promise<PlanningEmployee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, available_shifts, preceptor_id') // preceptor_id 추가
    .eq('organization_id', organizationId)
    .order('name');

  return (data ?? []).map((emp) => ({
    employee_id: emp.id,
    name: emp.name,
    available_shifts: emp.available_shifts || ['D', 'E', 'N', 'O'],
    preceptor_id: emp.preceptor_id ?? null,
  }));
}
```

### 4.2 `src/utils/solverMapper.ts`

`SolverRequestEmployee` 생성 시:

```typescript
preceptor_id: e.preceptor_id ?? null,
```

### 4.3 `src/utils/scheduleInputSnapshot.ts`

`normalizeScheduleSolverInput` employees 매핑:

```typescript
employees: solverRequest.employees.map((employee) => ({
  employeeId: employee.employee_id,
  availableShifts: [...employee.available_shifts].sort(compareByText),
  skillSet: [...employee.skill_set].sort(compareByText),
  preceptorId: employee.preceptor_id ?? null,
}));
```

### 4.4 `src/utils/preceptorValidation.ts` (신규)

UI·엑셀·공통 검증. DB RPC와 동일 규칙 (§6).

```typescript
export interface PreceptorValidationContext {
  employees: EmployeeInput[];
  targetIndex: number;
  preceptorEmployeeId: string | null;
}

export function validatePreceptorAssignment(ctx: PreceptorValidationContext): string | null;
export function hasOverlappingWorkShifts(a: string[], b: string[]): boolean;
export function buildPreceptorCandidateOptions(/* ... */): SelectOption[];
```

### 4.5 `supabase/functions/phase2-ops/repository.ts`

```typescript
p_employees: request.employees.map((employee) => ({
  employee_id: employee.employeeId,
  name: employee.name,
  available_shifts: employee.availableShifts,
  rank_code: employee.rankCode ?? null,
  preceptor_employee_id: employee.preceptorEmployeeId ?? null,  // NEW
})),
```

### 4.6 Transport — 변경 없음

- `src/api/solver.ts` — payload에 필드 포함만 (transport only)
- `src/composables/useScheduleSolverRequest.ts` — `getPlanningEmployees` 결과 그대로 전달

---

## 5. 예시 JSON

### 5.1 Ops RPC / Step3 저장

```json
{
  "organizationId": "org-uuid",
  "employees": [
    {
      "employeeId": "40627",
      "name": "김신규",
      "availableShifts": ["D", "E", "O"],
      "rankCode": "RN",
      "preceptorEmployeeId": "40501"
    }
  ]
}
```

### 5.2 SolverRequest

```json
{
  "employees": [
    {
      "employee_id": "a1b2c3d4-0000-0000-0000-000000000001",
      "name": "박선배",
      "available_shifts": ["D", "E", "N", "O"],
      "skill_set": ["ALL"],
      "preceptor_id": null
    },
    {
      "employee_id": "b2c3d4e5-0000-0000-0000-000000000002",
      "name": "김신규",
      "available_shifts": ["D", "E", "O"],
      "skill_set": ["ALL"],
      "preceptor_id": "a1b2c3d4-0000-0000-0000-000000000001"
    }
  ]
}
```

### 5.3 ScheduleInputSnapshot.solverInput.employees

```json
{
  "employeeId": "b2c3d4e5-0000-0000-0000-000000000002",
  "availableShifts": ["D", "E", "O"],
  "skillSet": ["ALL"],
  "preceptorId": "a1b2c3d4-0000-0000-0000-000000000001"
}
```

---

## 6. 검증 규칙 (TypeScript)

`preceptorValidation.ts` 및 Ops Edge Function 공통.

| #   | 조건             | 반환 메시지 (한국어)                                 |
| --- | ---------------- | ---------------------------------------------------- |
| 1   | 미입력 / null    | `null` (통과)                                        |
| 2   | 본인 지정        | `본인을 프리셉터로 지정할 수 없습니다.`              |
| 3   | 시프트 겹침 없음 | `프리셉터와 가능 시프트가 겹치지 않습니다.`          |
| 4   | 1:1 위반         | `선택한 프리셉터는 이미 다른 직원의 프리셉터입니다.` |
| 5   | 체인             | `프리셉터 관계는 연속(체인)으로 지정할 수 없습니다.` |

```typescript
function hasOverlappingWorkShifts(a: string[], b: string[]): boolean {
  const work = (shifts: string[]) => new Set(shifts.filter((c) => c !== 'O'));
  const setA = work(a);
  return b.some((c) => c !== 'O' && setA.has(c));
}
```

엑셀 행별 오류 코드·메시지는 [UI 문서](./2026-06-11-nurse-preceptor-ui.ko.md) §5 참조.

---

## 7. 솔버 계약

### 7.1 입력

- `SolverRequest.employees[].preceptor_id`: **프리셉티** 행만 UUID 설정.
- 프리셉터 본인 행: `null`.
- 스냅샷 `preceptorId` 동일 semantics → **hash 변경**.

### 7.2 하드 제약 semantics

**`preceptor_pairing`:**

> 프리셉티 T, 프리셉터 P (`T.preceptor_id = P`)에 대해 계획 월 모든 날짜 d에서  
> `assignment(T, d) === assignment(P, d)` (O 포함).

평가 범위: `firstDraftDate` ~ draft 끝 (당월만, NOD와 동일).

### 7.3 목 솔버 알고리즘 (MVP)

```text
1. pairs ← { precepteeId → preceptorId } where preceptor_id != null

2. For each date d in draft period:
   a. For each pair (T, P):
        candidateShifts ← intersection(available) minus locks
        If empty → fallback (e.g. both O), mark pairConflict
        Else → assign same shift to T and P
   b. Assign unpaired employees (existing mock logic)

3. hardScore -= 1000 per pairConflict day
4. Always return assignments (no throw)
```

Infeasible 예: T는 O locked, P는 D 필요 → fallback + compliance 위반.

---

## 8. Compliance

### 8.1 Mandatory

| 규칙                | mandatory | 확정 차단                         |
| ------------------- | --------- | --------------------------------- |
| `preceptor_pairing` | ✅        | ✅ (`canFinalizeLocally = false`) |

NOD 등과 동일 — `violations[]`, `check_required` 아님.

### 8.2 `src/utils/scheduleCompliance.ts`

**`RULE_ORDER`:** `'preceptor_pairing'`을 `'nod_pattern'` 다음에 추가.

**`RULE_LABELS`:**

```typescript
preceptor_pairing: '프리셉터 동일 시프트',
```

**평가 (pseudocode):**

```typescript
function evaluatePreceptorPairing(input): ScheduleComplianceViolation[] {
  for (const employee of input.employees) {
    if (!employee.preceptorId) continue;
    const preceptor = findEmployee(input.employees, employee.preceptorId);
    for (const date of datesInMonth(input.month)) {
      const tShift = getShiftCode(input.assignments, employee.id, date);
      const pShift = getShiftCode(input.assignments, preceptor.id, date);
      if (tShift !== pShift) {
        violations.push({
          id: `preceptor-${employee.id}-${date}`,
          ruleCode: 'preceptor_pairing',
          employeeId: employee.id,
          employeeName: employee.name,
          dates: [date],
          message: `${date}: ${employee.name}(${tShift}) ↔ ${preceptor.name}(${pShift}) 시프트 불일치`,
        });
      }
    }
  }
  return violations;
}
```

### 8.3 Step4/5 wiring

- `Step5Result.vue`: compliance input `employees`에 `preceptorId` 포함 (`getPlanningEmployees` 또는 grid meta).
- Step4: 생성 전 preview가 있다면 동일 evaluator 재사용.

UI 표시 copy는 [UI 문서](./2026-06-11-nurse-preceptor-ui.ko.md) §6.

---

## 9. 구현 슬라이스 (API만)

| Step | 작업                       | 파일                                                            |
| ---- | -------------------------- | --------------------------------------------------------------- |
| A1   | 타입 확장                  | `employee.ts`, `ops.ts`, `schedule.ts`, `scheduleCompliance.ts` |
| A2   | Ops contracts + repository | `phase2-ops/contracts.ts`, `repository.ts`                      |
| A3   | `getPlanningEmployees`     | `src/api/schedule.ts`                                           |
| A4   | `preceptorValidation.ts`   | 신규                                                            |
| A5   | solverMapper + snapshot    | `solverMapper.ts`, `scheduleInputSnapshot.ts`                   |
| A6   | compliance evaluator       | `scheduleCompliance.ts`                                         |
| A7   | Step5 (및 Step4) wiring    | `Step5Result.vue` 등                                            |
| A8   | 목 솔버 pairing            | Cloud Run mock / dev handler                                    |

**의존성:** [DB D1–D3](./2026-06-11-nurse-preceptor-db.ko.md) → A1–A3 → A5 → A6–A8. A4는 [UI](./2026-06-11-nurse-preceptor-ui.ko.md)와 공유.

---

## 10. 테스트 계획

| 파일                                         | 케이스                          |
| -------------------------------------------- | ------------------------------- |
| `tests/unit/preceptor-validation.spec.ts`    | 규칙 1–6, 겹침, 체인            |
| `tests/unit/solver-mapper.spec.ts`           | `preceptor_id` 매핑             |
| `tests/unit/schedule-input-snapshot.spec.ts` | hash에 preceptor 포함           |
| `tests/unit/schedule-compliance.spec.ts`     | C1–C4 (아래)                    |
| `tests/unit/phase2-ops-repository.spec.ts`   | `preceptor_employee_id` payload |

**Compliance 시나리오:**

| #   | Given             | Expected                         |
| --- | ----------------- | -------------------------------- |
| C1  | T→P, 모든 날 동일 | passed                           |
| C2  | T→P, 1일 불일치   | violation, mandatoryPassed=false |
| C3  | preceptor null    | skipped                          |
| C4  | T=O, P=D          | violation                        |

---

## 11. 참고 파일

| 경로                                                                             |
| -------------------------------------------------------------------------------- |
| `src/types/employee.ts`, `schedule.ts`, `scheduleCompliance.ts`, `ops.ts`        |
| `src/api/schedule.ts`, `src/api/solver.ts`                                       |
| `src/utils/solverMapper.ts`, `scheduleInputSnapshot.ts`, `scheduleCompliance.ts` |
| `src/composables/useScheduleSolverRequest.ts`                                    |
| `supabase/functions/phase2-ops/contracts.ts`, `repository.ts`                    |

---

## 12. 구현 체크리스트

- [x] A1 타입 확장 (`employee.ts`, `ops.ts`, `schedule.ts`, `scheduleCompliance.ts`)
- [x] A2 Ops contracts/repository payload (`preceptor_employee_id`)
- [x] A3 `getPlanningEmployees` — `preceptor_id` SELECT·매핑
- [x] A4 `preceptorValidation.ts` (규칙 1–5)
- [x] A5 `solverMapper` + `scheduleInputSnapshot` + snapshot rebuild
- [x] A6 `scheduleCompliance` — `preceptor_pairing` mandatory rule
- [x] A7 Step5 compliance wiring (`preceptorId` 전달)
- [x] A8 목 솔버 pairing (`mockSolverPairing.ts`)
- [x] §10 unit tests

**다음 단계:** [UI 설계](./2026-06-11-nurse-preceptor-ui.ko.md)
