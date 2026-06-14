# Step4 프리셉터 짝 Off 요청 동기화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step4 Off **쓰기** 시점에 Step3 프리셉터–프리셉티 1:1 짝의 같은 날짜 Off를 자동 동기화하고, 불일치 데이터는 합집합(add-only)으로 보정하며, 정책 한도는 짝 포함 원자적 사전 검증으로 차단한다.

**Architecture:** 순수 로직은 `src/utils/preceptorOffSync.ts`(짝 조회·delta 확장·보정·검증 위임)와 `src/utils/offRequestPolicyCheck.ts`(서버 `refreshOffRequestPolicyResults` 카운팅 정합)에 둔다. 오케스트레이션·가드·UI는 `Step4InitialData.vue`가 유지하며, 인메모리 경로는 `commitPreferenceMaps` 직전, DB persist 경로는 `buildDraftAppliedPreferenceMaps` / `persistStep4PreferenceMaps` 직전에 훅을 건다. 그리드 직접 Off 토글은 재도입하지 않는다.

**Tech Stack:** Vue 3.5 Composition API, TypeScript 5.8, Naive UI, Pinia, Vitest, 기존 Ops API `getOffRequestPolicies`.

**Formal spec (SSOT):** [docs/superpowers/specs/2026-06-14-step4-preceptor-off-request-sync-design.md](../specs/2026-06-14-step4-preceptor-off-request-sync-design.md)

**MVP scope guard:** `OffRequestPolicySetup.vue`, Step3 프리셉터 UX 변경 없음.

---

## 핵심 결정 (plan 반영)

| 항목                 | 결정                                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 동기화 대상          | Off 코드 `O`만. **메모는 복사하지 않음**                                                                                         |
| 쓰기 레이어          | **인메모리** `commitPreferenceMaps` 직전 vs **DB persist** `buildDraftAppliedPreferenceMaps` / `persistStep4PreferenceMaps` 직전 |
| 불일치 보정          | **합집합(add-only)** — 삭제로 맞추지 않음                                                                                        |
| 정책 검증            | 짝 포함 **원자적 사전 검증** — 부분 반영 금지                                                                                    |
| 정책 fetch 실패      | **엄격(B)** — `offPolicyLoadError` 가드, Off 쓰기 전체 차단 + 재시도 UI                                                          |
| 차단 가드            | `step4MutationBlockedReason`, `pageLevelBlockedReason`, `offPolicyLoadError` (예외 없음)                                         |
| 오케스트레이션 owner | `src/views/schedule/Step4InitialData.vue`                                                                                        |
| 짝 SSOT              | `grid.employees[].preceptorId` (DB `preceptor_id` UUID)                                                                          |

---

## 파일 구조

### Create

| File                                          | Responsibility                                                                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/preceptorOffSync.ts`               | `resolvePreceptorPair`, `expandOffDeltaWithPair`, `reconcilePreceptorOffPairs`, `validatePairedOffChanges`, 알림 payload 헬퍼 |
| `src/utils/offRequestPolicyCheck.ts`          | 서버 `supabase/functions/phase2-schedule/repository.ts` `refreshOffRequestPolicyResults`와 동일 카운팅                        |
| `tests/unit/preceptor-off-sync.spec.ts`       | 짝 조회·delta·보정·검증 위임 단위 테스트                                                                                      |
| `tests/unit/off-request-policy-check.spec.ts` | 서버 fixture 정합 테스트                                                                                                      |

### Modify

| File                                                             | Responsibility                                                                                      |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/views/schedule/Step4InitialData.vue`                        | 정책 rules fetch, `offPolicyLoadError` 가드, apply/delete/excel/draft/restore 훅, 배너·alert·토스트 |
| `src/components/schedule/request-entry/Step4RequestComposer.vue` | 짝 연결 표시 (1명·다중 선택)                                                                        |
| `tests/unit/step4-initial-data.spec.ts`                          | 통합 시나리오 (spec §13 체크리스트)                                                                 |

### 참고만 (최소 수정)

| File                                                          | Note                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/components/schedule/Step4OffRequestExcelUploadModal.vue` | 파싱 로직 변경 불필요 — 부모 `handleApplyOffRequestExcelUpload`에서 보정 |
| `src/utils/offRequestExcel.ts`                                | export만 사용                                                            |
| `supabase/functions/phase2-schedule/repository.ts`            | 카운팅 정합성 **기준** — 구현 복사 대상, 수정 최소                       |

---

## 쓰기 경로 훅 매트릭스

| 경로                         | 레이어     | 훅 위치 (`Step4InitialData.vue`)                                                                             |
| ---------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| 드로어 `요청 반영`           | DB persist | `buildDraftAppliedPreferenceMaps()` 내부 — 짝 delta 확장 후 `validatePairedOffChanges` → `applyDraftRequest` |
| `변경사항 저장`              | DB persist | `handleSaveAppliedChanges` — 이미 동기화된 `constraints` persist (별도 짝 로직 불필요)                       |
| 요청 목록 `삭제`             | 인메모리   | `handleDeleteRequest` — 짝 날짜·메모 삭제 후 `constraints` 갱신                                              |
| Excel `적용`                 | 인메모리   | `handleApplyOffRequestExcelUpload` — `reconcilePreceptorOffPairs` 후 `commitPreferenceMaps`                  |
| localStorage draft 불러오기  | 인메모리   | `handleLoadPendingLocalDraft` — 보정 후 `commitPreferenceMaps`                                               |
| `restoreData` 서버/로컬 복원 | 인메모리   | `replacePreferenceMapsFromSnapshot` 호출 직후 공통 `reconcileAndCommitPreferences()` 헬퍼                    |
| Off 전체 초기화              | —          | 짝 로직 불필요 (spec §4)                                                                                     |

**공통 가드 (모든 Off 쓰기 진입점 최상단):**

```typescript
function assertOffWritesAllowed(): string | null {
  if (offPolicyLoadError.value) return offPolicyLoadError.value;
  if (step4MutationBlockedReason.value) return step4MutationBlockedReason.value;
  if (pageLevelBlockedReason.value) return pageLevelBlockedReason.value;
  return null;
}
```

---

## 데이터 계약

```typescript
// src/utils/preceptorOffSync.ts
import type { ConstraintMap } from '@/types/schedule';
import type { Employee } from '@/types/employee';
import type { OffRequestPolicyRule } from '@/types/ops';

export type PreceptorRole = 'preceptee' | 'preceptor';

export interface PreceptorPairRef {
  peerId: string;
  role: PreceptorRole;
}

export interface OffEdit {
  employeeId: string;
  date: string;
  action: 'add' | 'remove';
}

export interface PairCorrectionSummary {
  preceptorName: string;
  precepteeName: string;
  correctedCount: number;
}

export interface PairSkipSummary {
  employeeName: string;
  role: PreceptorRole;
  skippedCount: number;
}

export function resolvePreceptorPair(
  employees: Employee[],
  employeeId: string
): PreceptorPairRef | null;

export function expandOffDeltaWithPair(employees: Employee[], edits: OffEdit[]): OffEdit[];

export function reconcilePreceptorOffPairs(input: {
  constraints: ConstraintMap;
  employees: Employee[];
  policyRules: OffRequestPolicyRule[];
  scheduleMonth: string; // YYYY-MM
  historicalAnnualCountByEmployeeId?: Map<string, number>;
}): {
  nextConstraints: ConstraintMap;
  corrections: PairCorrectionSummary[];
  skipped: PairSkipSummary[];
};

export function validatePairedOffChanges(input: {
  constraints: ConstraintMap;
  edits: OffEdit[];
  employees: Employee[];
  policyRules: OffRequestPolicyRule[];
  scheduleMonth: string;
  historicalAnnualCountByEmployeeId?: Map<string, number>;
}):
  | { ok: true }
  | {
      ok: false;
      blockedEmployeeId: string;
      blockedEmployeeName: string;
      role: PreceptorRole | 'requester';
      reason: string;
    };
```

```typescript
// src/utils/offRequestPolicyCheck.ts
export interface OffPreferenceRow {
  employeeId: string;
  date: string;
}

export function evaluateOffRequestPolicy(input: {
  scheduleMonth: string;
  employees: Array<{ id: string; rankCode?: string | null }>;
  policyRules: OffRequestPolicyRule[];
  preferences: OffPreferenceRow[];
  historicalAnnualCountByEmployeeId?: Map<string, number>;
}): Map<string, Map<string, 'accepted' | 'rejected'>>;

export function wouldExceedOffPolicyLimit(input: {
  scheduleMonth: string;
  employees: Array<{ id: string; rankCode?: string | null }>;
  policyRules: OffRequestPolicyRule[];
  existingPreferences: OffPreferenceRow[];
  proposedAdds: OffPreferenceRow[];
  historicalAnnualCountByEmployeeId?: Map<string, number>;
}): { blocked: false } | { blocked: true; employeeId: string; reason: 'monthly' | 'annual' };
```

---

## Acceptance criteria 매핑 (spec §12)

| #   | Criterion                          | Covered by Task     |
| --- | ---------------------------------- | ------------------- |
| 1   | 모든 Off 쓰기 경로 동기화          | Task 6–8            |
| 2   | 배너·드로어·토스트·`n-alert`       | Task 9              |
| 3   | add-only 보정 + 스킵 보고          | Task 4, 8           |
| 4   | 정책 한도 원자 차단 + 사전 검증    | Task 2, 3, 5, 6     |
| 5   | 메모 비동기화                      | Task 3, 6, 7        |
| 6   | 정책 fetch 실패 시 전체 차단       | Task 5              |
| 7   | Step3/OffRequestPolicySetup 무변경 | 전 Task scope guard |

---

### Task 1: `resolvePreceptorPair` — 짝 조회

**Files:**

- Create: `src/utils/preceptorOffSync.ts`
- Create: `tests/unit/preceptor-off-sync.spec.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/preceptor-off-sync.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { resolvePreceptorPair } from '@/utils/preceptorOffSync';
import type { Employee } from '@/types/employee';

const employees: Employee[] = [
  {
    id: 'uuid-preceptor',
    organizationId: 'org-1',
    employeeId: '40501',
    name: '박선배',
    availableShifts: ['D', 'E'],
    preceptorId: null,
  },
  {
    id: 'uuid-preceptee',
    organizationId: 'org-1',
    employeeId: '40601',
    name: '김신규',
    availableShifts: ['D'],
    preceptorId: 'uuid-preceptor',
  },
];

describe('resolvePreceptorPair', () => {
  it('returns preceptor peer for preceptee', () => {
    expect(resolvePreceptorPair(employees, 'uuid-preceptee')).toEqual({
      peerId: 'uuid-preceptor',
      role: 'preceptee',
    });
  });

  it('returns preceptee peer for preceptor via reverse lookup', () => {
    expect(resolvePreceptorPair(employees, 'uuid-preceptor')).toEqual({
      peerId: 'uuid-preceptee',
      role: 'preceptor',
    });
  });

  it('returns null when no pair', () => {
    const solo: Employee[] = [
      {
        id: 'uuid-solo',
        organizationId: 'org-1',
        employeeId: '40701',
        name: '이단독',
        availableShifts: ['D'],
        preceptorId: null,
      },
    ];
    expect(resolvePreceptorPair(solo, 'uuid-solo')).toBeNull();
  });

  it('returns null and does not throw when reverse lookup matches more than one preceptee', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const abnormal: Employee[] = [
      {
        id: 'p1',
        organizationId: 'org-1',
        employeeId: '1',
        name: 'P',
        availableShifts: ['D'],
        preceptorId: null,
      },
      {
        id: 't1',
        organizationId: 'org-1',
        employeeId: '2',
        name: 'T1',
        availableShifts: ['D'],
        preceptorId: 'p1',
      },
      {
        id: 't2',
        organizationId: 'org-1',
        employeeId: '3',
        name: 'T2',
        availableShifts: ['D'],
        preceptorId: 'p1',
      },
    ];
    expect(resolvePreceptorPair(abnormal, 'p1')).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/preceptor-off-sync.spec.ts -t "resolvePreceptorPair" -v`

Expected: FAIL — `Cannot find module '@/utils/preceptorOffSync'`

- [ ] **Step 3: Write minimal implementation**

`src/utils/preceptorOffSync.ts`:

```typescript
import type { Employee } from '@/types/employee';

export type PreceptorRole = 'preceptee' | 'preceptor';

export interface PreceptorPairRef {
  peerId: string;
  role: PreceptorRole;
}

export function resolvePreceptorPair(
  employees: Employee[],
  employeeId: string
): PreceptorPairRef | null {
  const self = employees.find((employee) => employee.id === employeeId);
  if (!self) return null;

  if (self.preceptorId) {
    const preceptorExists = employees.some((employee) => employee.id === self.preceptorId);
    if (!preceptorExists) return null;
    return { peerId: self.preceptorId, role: 'preceptee' };
  }

  const preceptees = employees.filter((employee) => employee.preceptorId === employeeId);
  if (preceptees.length === 0) return null;
  if (preceptees.length > 1) {
    console.warn('[preceptorOffSync] Multiple preceptees for preceptor; skipping pair sync', {
      preceptorId: employeeId,
      precepteeIds: preceptees.map((employee) => employee.id),
    });
    return null;
  }

  return { peerId: preceptees[0]!.id, role: 'preceptor' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/preceptor-off-sync.spec.ts -t "resolvePreceptorPair" -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/preceptorOffSync.ts tests/unit/preceptor-off-sync.spec.ts
git commit -m "feat(step4): add preceptor pair lookup for off sync"
```

---

### Task 2: `offRequestPolicyCheck` — 서버 카운팅 정합

**Files:**

- Create: `src/utils/offRequestPolicyCheck.ts`
- Create: `tests/unit/off-request-policy-check.spec.ts`
- Reference: `supabase/functions/phase2-schedule/repository.ts` (`refreshOffRequestPolicyResults`, `resolveApplicableOffRequestPolicyRule`, `getPolicyRejectionReason`)
- Reference: `tests/unit/phase2-schedule-repository.spec.ts` (annual/monthly reject fixtures ~L1373, ~L1546)

- [ ] **Step 1: Write the failing test**

`tests/unit/off-request-policy-check.spec.ts` — 서버 fixture와 동일 입력:

```typescript
import { describe, expect, it } from 'vitest';
import { wouldExceedOffPolicyLimit } from '@/utils/offRequestPolicyCheck';
import type { OffRequestPolicyRule } from '@/types/ops';

const policyRules: OffRequestPolicyRule[] = [
  { rankCode: null, periodType: 'monthly', limitCount: 99, isActive: true },
  { rankCode: null, periodType: 'annual', limitCount: 2, isActive: true },
];

const employees = [{ id: 'employee-1', rankCode: null }];

describe('offRequestPolicyCheck', () => {
  it('rejects third off in same year when annual limit is 2', () => {
    const result = wouldExceedOffPolicyLimit({
      scheduleMonth: '2026-04',
      employees,
      policyRules,
      existingPreferences: [
        { employeeId: 'employee-1', date: '2026-04-01' },
        { employeeId: 'employee-1', date: '2026-04-02' },
      ],
      proposedAdds: [{ employeeId: 'employee-1', date: '2026-04-03' }],
      historicalAnnualCountByEmployeeId: new Map(),
    });

    expect(result).toEqual({
      blocked: true,
      employeeId: 'employee-1',
      reason: 'annual',
    });
  });

  it('skips validation when no active policy rules', () => {
    const result = wouldExceedOffPolicyLimit({
      scheduleMonth: '2026-04',
      employees,
      policyRules: [],
      existingPreferences: [],
      proposedAdds: [{ employeeId: 'employee-1', date: '2026-04-01' }],
    });

    expect(result).toEqual({ blocked: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/off-request-policy-check.spec.ts -v`

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

`src/utils/offRequestPolicyCheck.ts` — `repository.ts` L1178–1223 루프를 순수 함수로 추출:

- preferences = `existingPreferences` + `proposedAdds` (date asc, employeeId asc 정렬)
- `monthlyCountByPeriod` key: `${employeeId}:${scheduleMonth}`
- `annualCountByEmployeeId`는 `historicalAnnualCountByEmployeeId`로 시드
- `resolveApplicableOffRequestPolicyRule` 동일 rank 매칭 (`rankCode` null = default)
- `proposedAdds`만 검사: 각 add 시점의 누적 카운트가 한도 초과면 `{ blocked: true, employeeId, reason }`
- 규칙 없으면 `{ blocked: false }`

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/off-request-policy-check.spec.ts -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/offRequestPolicyCheck.ts tests/unit/off-request-policy-check.spec.ts
git commit -m "feat(step4): add client off request policy pre-check aligned with server"
```

---

### Task 3: `expandOffDeltaWithPair` + `validatePairedOffChanges`

**Files:**

- Modify: `src/utils/preceptorOffSync.ts`
- Modify: `tests/unit/preceptor-off-sync.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { expandOffDeltaWithPair, validatePairedOffChanges } from '@/utils/preceptorOffSync';

it('expands preceptee add to include preceptor on same date', () => {
  const edits = expandOffDeltaWithPair(employees, [
    { employeeId: 'uuid-preceptee', date: '2026-05-15', action: 'add' },
  ]);

  expect(edits).toEqual(
    expect.arrayContaining([
      { employeeId: 'uuid-preceptee', date: '2026-05-15', action: 'add' },
      { employeeId: 'uuid-preceptor', date: '2026-05-15', action: 'add' },
    ])
  );
  expect(edits).toHaveLength(2);
});

it('dedupes when batch already includes both sides of a pair', () => {
  const edits = expandOffDeltaWithPair(employees, [
    { employeeId: 'uuid-preceptee', date: '2026-05-15', action: 'add' },
    { employeeId: 'uuid-preceptor', date: '2026-05-15', action: 'add' },
  ]);
  expect(edits).toHaveLength(2);
});

it('blocks entire paired operation when peer would exceed annual limit', () => {
  const constraints = {
    'uuid-preceptor': { '2026-05-01': 'O', '2026-05-02': 'O' },
  } as const;

  const result = validatePairedOffChanges({
    constraints,
    edits: [{ employeeId: 'uuid-preceptee', date: '2026-05-03', action: 'add' }],
    employees,
    policyRules,
    scheduleMonth: '2026-05',
  });

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.blockedEmployeeName).toBe('박선배');
    expect(result.role).toBe('preceptor');
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/preceptor-off-sync.spec.ts -t "expandOffDeltaWithPair|validatePairedOffChanges" -v`

Expected: FAIL — functions not exported

- [ ] **Step 3: Write minimal implementation**

`expandOffDeltaWithPair`:

- `employeeId+date+action` Set으로 dedupe
- 각 edit에 대해 `resolvePreceptorPair` → peer에 동일 `date`/`action` 추가
- `remove`도 양방향 전파

`validatePairedOffChanges`:

- `expandOffDeltaWithPair`로 전체 delta 계산
- `action === 'add'`만 `wouldExceedOffPolicyLimit`에 전달
- 기존 constraints에서 `O` 날짜를 `existingPreferences`로 변환
- 차단 시 **누구 한도인지** `employees` 이름·role로 반환
- `policyRules.length === 0`이면 `{ ok: true }`

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/preceptor-off-sync.spec.ts -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/preceptorOffSync.ts tests/unit/preceptor-off-sync.spec.ts
git commit -m "feat(step4): expand off deltas with preceptor pair and validate atomically"
```

---

### Task 4: `reconcilePreceptorOffPairs` — 합집합(add-only) 보정

**Files:**

- Modify: `src/utils/preceptorOffSync.ts`
- Modify: `tests/unit/preceptor-off-sync.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { reconcilePreceptorOffPairs } from '@/utils/preceptorOffSync';

it('adds missing dates only for A={1,2} B={2,3} union', () => {
  const constraints = {
    'uuid-preceptee': { '2026-05-01': 'O', '2026-05-02': 'O' },
    'uuid-preceptor': { '2026-05-02': 'O', '2026-05-03': 'O' },
  };

  const { nextConstraints, corrections } = reconcilePreceptorOffPairs({
    constraints,
    employees,
    policyRules: [],
    scheduleMonth: '2026-05',
  });

  expect(nextConstraints['uuid-preceptee']?.['2026-05-03']).toBe('O');
  expect(nextConstraints['uuid-preceptor']?.['2026-05-01']).toBe('O');
  expect(corrections).toHaveLength(1);
  expect(corrections[0]?.correctedCount).toBe(2);
});

it('does not delete extra off dates on either side', () => {
  const constraints = {
    'uuid-preceptee': { '2026-05-01': 'O' },
    'uuid-preceptor': {},
  };

  const { nextConstraints } = reconcilePreceptorOffPairs({
    constraints,
    employees,
    policyRules: [],
    scheduleMonth: '2026-05',
  });

  expect(nextConstraints['uuid-preceptee']?.['2026-05-01']).toBe('O');
  expect(nextConstraints['uuid-preceptor']?.['2026-05-01']).toBe('O');
});

it('skips correction date when peer policy limit exceeded and reports skip count', () => {
  const constraints = {
    'uuid-preceptee': { '2026-05-01': 'O', '2026-05-02': 'O' },
    'uuid-preceptor': {},
  };

  const { nextConstraints, skipped } = reconcilePreceptorOffPairs({
    constraints,
    employees,
    policyRules,
    scheduleMonth: '2026-05',
  });

  // annual limit 2 already on preceptor side after first add — second date skipped
  expect(nextConstraints['uuid-preceptor']?.['2026-05-01']).toBe('O');
  expect(skipped.some((item) => item.skippedCount > 0)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/preceptor-off-sync.spec.ts -t "reconcilePreceptorOffPairs" -v`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

- 모든 짝에 대해 양쪽 Off 날짜 집합 union 계산
- 빠진 날짜만 `add` 후보 — **삭제 없음**
- 날짜별 `wouldExceedOffPolicyLimit` — 실패 시 해당 날짜만 skip, 나머지 진행
- 보정 Off에는 **메모 추가하지 않음**
- `corrections` / `skipped` 요약 반환

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/preceptor-off-sync.spec.ts -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/preceptorOffSync.ts tests/unit/preceptor-off-sync.spec.ts
git commit -m "feat(step4): reconcile preceptor off pairs with add-only union"
```

---

### Task 5: Step4 정책 rules fetch + `offPolicyLoadError` 가드 + 재시도 UI

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue:560-780` (state/computed guards)
- Modify: `src/views/schedule/Step4InitialData.vue:12-31` (retry UI 패턴 참고 — baseline alert 복제)
- Modify: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/step4-initial-data.spec.ts`에 추가:

```typescript
vi.mock('@/api/ops', () => ({
  getOffRequestPolicies: getOffRequestPoliciesMock,
}));

it('blocks applyDraftRequest when off policy rules fail to load', async () => {
  getOffRequestPoliciesMock.mockRejectedValueOnce(new Error('network'));
  const wrapper = await mountStep4();
  await flushPromises();

  expect(wrapper.text()).toContain('Off 정책을 불러오지 못해 요청을 반영할 수 없습니다.');

  await wrapper.find('[data-test="apply-request"]').trigger('click');
  expect(saveScheduleVersionPreferencesMock).not.toHaveBeenCalled();
  expect(showErrorMock).toHaveBeenCalled();
});

it('retries off policy load and unblocks writes after success', async () => {
  getOffRequestPoliciesMock
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce({ organizationId: 'org-1', rankCodes: [], policyRules: [] });

  const wrapper = await mountStep4();
  await flushPromises();
  await wrapper.find('[data-test="off-policy-retry"]').trigger('click');
  await flushPromises();

  expect(getOffRequestPoliciesMock).toHaveBeenCalledTimes(2);
  expect(wrapper.find('[data-test="off-policy-error-alert"]').exists()).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/step4-initial-data.spec.ts -t "off policy" -v`

Expected: FAIL — mocks/elements missing

- [ ] **Step 3: Write minimal implementation**

`Step4InitialData.vue` `<script setup>`:

```typescript
import { getOffRequestPolicies } from '@/api/ops';
import type { OffRequestPolicyRule } from '@/types/ops';

const offRequestPolicyRules = ref<OffRequestPolicyRule[]>([]);
const offPolicyLoadError = ref<string | null>(null);
const isOffPolicyLoading = ref(false);

const OFF_POLICY_LOAD_ERROR_MESSAGE = 'Off 정책을 불러오지 못해 요청을 반영할 수 없습니다.';

async function loadOffRequestPolicyRules(force = false): Promise<void> {
  const organizationId = scheduleStore.basicInfo?.organizationId ?? orgStore.current?.id;
  if (!organizationId) {
    offRequestPolicyRules.value = [];
    offPolicyLoadError.value = null;
    return;
  }

  isOffPolicyLoading.value = true;
  if (force) offPolicyLoadError.value = null;

  try {
    const response = await getOffRequestPolicies(organizationId);
    offRequestPolicyRules.value = response.policyRules.filter((rule) => rule.isActive);
    offPolicyLoadError.value = null;
  } catch (error) {
    offPolicyLoadError.value = OFF_POLICY_LOAD_ERROR_MESSAGE;
    showError(OFF_POLICY_LOAD_ERROR_MESSAGE);
  } finally {
    isOffPolicyLoading.value = false;
  }
}

async function handleRetryOffPolicyLoad(): Promise<void> {
  await loadOffRequestPolicyRules(true);
}
```

- `onMounted` / `restoreData` 시작 시 `await loadOffRequestPolicyRules()` 호출
- `saveAppliedChangesDisabledReason`, `applyDisabledReason` 확장: `offPolicyLoadError` 시 차단 메시지 반환
- `assertOffWritesAllowed()` 헬퍼 추가 — Task 6에서 재사용
- Template: baseline alert 패턴 복제

```vue
<n-alert v-if="offPolicyLoadError" type="error" class="mb-4" data-test="off-policy-error-alert">
  <template #header>Off 정책 로드 실패</template>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <p class="text-sm">{{ offPolicyLoadError }}</p>
    <n-button
      size="small"
      data-test="off-policy-retry"
      :loading="isOffPolicyLoading"
      @click="handleRetryOffPolicyLoad"
    >
      다시 시도
    </n-button>
  </div>
</n-alert>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/step4-initial-data.spec.ts -t "off policy" -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue tests/unit/step4-initial-data.spec.ts
git commit -m "feat(step4): block off writes when policy rules fail to load"
```

---

### Task 6: `buildDraftAppliedPreferenceMaps` / `applyDraftRequest` — persist 경로 훅

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue:1081-1122` (`buildDraftAppliedPreferenceMaps`)
- Modify: `src/views/schedule/Step4InitialData.vue:1399-1444` (`applyDraftRequest`)
- Modify: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
it('adds preceptor off on same date when preceptee applies off (note stays preceptee-only)', async () => {
  const wrapper = await mountStep4WithPreceptorPair();
  await selectEmployeeAndDates(wrapper, 'uuid-preceptee', ['2026-05-15']);
  await wrapper.find('[data-test="step4-request-note"] input, textarea').setValue('개인 사유');

  await wrapper.find('[data-test="apply-request"]').trigger('click');
  await flushPromises();

  const [, , constraints, notes] = saveScheduleVersionPreferencesMock.mock.calls.at(-1) ?? [];
  expect(constraints['uuid-preceptor']?.['2026-05-15']).toBe('O');
  expect(notes['uuid-preceptor']?.['2026-05-15']).toBeUndefined();
  expect(notes['uuid-preceptee']?.['2026-05-15']).toBe('개인 사유');
  expect(showSuccessMock).toHaveBeenCalledWith(expect.stringContaining('프리셉터'));
});

it('does not persist when paired pre-block hits policy limit', async () => {
  // preceptor already at annual limit in constraints fixture
  const wrapper = await mountStep4WithPreceptorPairAtLimit();
  await selectEmployeeAndDates(wrapper, 'uuid-preceptee', ['2026-05-20']);
  await wrapper.find('[data-test="apply-request"]').trigger('click');
  await flushPromises();

  expect(saveScheduleVersionPreferencesMock).not.toHaveBeenCalled();
  expect(showErrorMock).toHaveBeenCalledWith(expect.stringContaining('박선배'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/step4-initial-data.spec.ts -t "preceptor off" -v`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`buildDraftAppliedPreferenceMaps` 변경:

1. 기존 editing + draft 로직으로 `baseMaps` 생성
2. editing 모드: `editingRow.dates` vs `draftSelectedDates` diff → `OffEdit[]` (`remove`/`add`)
3. 신규 모드: 선택 근무자 × 날짜 → `add` edits
4. `expandOffDeltaWithPair(grid.employees.value, edits)` 적용
5. maps에 반영 — peer add 시 `O`만, note 없음; remove 시 note도 `removeConstraintNoteFromMap`
6. **메모는 요청자(selectedEmployeeIds)에만** 기존 로직 유지

`applyDraftRequest` 변경:

```typescript
async function applyDraftRequest(): Promise<void> {
  const blocked = assertOffWritesAllowed();
  if (blocked) {
    setRequestApplyStatus(blocked, 'error');
    showInfo(blocked);
    return;
  }
  // ...existing guards...

  const draftMaps = buildDraftAppliedPreferenceMaps();
  const validation = validatePairedOffChanges({
    constraints: constraints.value,
    edits: /* derive from draft delta */,
    employees: grid.employees.value,
    policyRules: offRequestPolicyRules.value,
    scheduleMonth: scheduleStore.basicInfo?.month ?? '',
  });

  if (!validation.ok) {
    const message = `${validation.blockedEmployeeName}(${validation.role === 'preceptor' ? '프리셉터' : '프리셉티'})의 Off 한도 초과로 함께 반영할 수 없습니다.`;
    setRequestApplyStatus(message, 'error');
    showError(message);
    return;
  }

  // persist draftMaps ...
  // pair toast BEFORE existing success toast
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/step4-initial-data.spec.ts -t "preceptor off" -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue tests/unit/step4-initial-data.spec.ts
git commit -m "feat(step4): sync preceptor off on draft apply with atomic policy gate"
```

---

### Task 7: `handleDeleteRequest` — 인메모리 삭제 훅

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue:1446-1467`
- Modify: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
it('deletes preceptor off when preceptee off row is deleted in memory', async () => {
  const wrapper = await mountStep4WithPairedOffInMemory();
  const deleteKey = 'uuid-preceptee::2026-05-15::';

  await wrapper.find(`[data-test="delete-request-${deleteKey}"]`).trigger('click');

  const vm = wrapper.vm as { constraints: Record<string, Record<string, string>> };
  expect(vm.constraints['uuid-preceptee']?.['2026-05-15']).not.toBe('O');
  expect(vm.constraints['uuid-preceptor']?.['2026-05-15']).not.toBe('O');
  expect(showSuccessMock).toHaveBeenCalledWith(expect.stringContaining('삭제'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/step4-initial-data.spec.ts -t "deletes preceptor off" -v`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```typescript
function handleDeleteRequest(requestKey: string): void {
  const blocked = assertOffWritesAllowed();
  if (blocked) {
    showInfo(blocked);
    return;
  }
  // ...existing guardDraftTransition...

  const requestRow = findCurrentEmployeeRequest(requestKey);
  if (!requestRow) return;

  const pair = resolvePreceptorPair(grid.employees.value, requestRow.employeeId);
  const datesToDelete = requestRow.dates;

  datesToDelete.forEach((date) => {
    // delete requestRow.employeeId + note
    if (pair) {
      // delete pair.peerId + note on same date
    }
  });

  constraints.value = { ...constraints.value };
  constraintNotes.value = { ...constraintNotes.value };

  if (pair) {
    showSuccess(
      `${formatDateChip(datesToDelete[0]!)} Off 삭제 — ${peerDisplayName}의 같은 날짜 Off도 삭제되었습니다.`
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/step4-initial-data.spec.ts -t "deletes preceptor off" -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue tests/unit/step4-initial-data.spec.ts
git commit -m "feat(step4): sync preceptor off deletion in memory"
```

---

### Task 8: Excel / draft / `restoreData` 보정 훅

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue:1124-1139` (`replacePreferenceMapsFromSnapshot`)
- Modify: `src/views/schedule/Step4InitialData.vue:1764-1781` (`handleLoadPendingLocalDraft`)
- Modify: `src/views/schedule/Step4InitialData.vue:1854-1871` (`handleApplyOffRequestExcelUpload`)
- Modify: `src/views/schedule/Step4InitialData.vue:2044-2150` (`restoreData`)
- Modify: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
it('reconciles one-sided excel off before commitPreferenceMaps', async () => {
  const wrapper = await mountStep4WithPreceptorPair();
  await applyExcelUpload(wrapper, { 'uuid-preceptee': { '2026-05-10': 'O' } });

  const vm = wrapper.vm as { constraints: Record<string, Record<string, string>> };
  expect(vm.constraints['uuid-preceptor']?.['2026-05-10']).toBe('O');
  expect(showSuccessMock).toHaveBeenCalledWith(expect.stringContaining('자동 맞춤'));
});

it('reconciles draft load mismatch', async () => {
  // pendingLocalDraftSnapshot with one-sided off → handleLoadPendingLocalDraft
});

it('shows n-alert when 3+ pair corrections occur', async () => {
  // fixture with 3 pairs mismatched → expect n-alert summary
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/step4-initial-data.spec.ts -t "reconciles" -v`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

공통 헬퍼:

```typescript
function reconcileAndNotifyPreferenceMaps(
  nextConstraints: ConstraintMap,
  nextNotes: CommentMap
): void {
  const blocked = assertOffWritesAllowed();
  if (blocked) {
    showInfo(blocked);
    return;
  }

  const { nextConstraints: reconciled, corrections, skipped } = reconcilePreceptorOffPairs({
    constraints: nextConstraints,
    employees: grid.employees.value,
    policyRules: offRequestPolicyRules.value,
    scheduleMonth: scheduleStore.basicInfo?.month ?? '',
  });

  commitPreferenceMaps(reconciled, nextNotes);
  notifyPreceptorReconcileResults(corrections, skipped);
}

function notifyPreceptorReconcileResults(
  corrections: PairCorrectionSummary[],
  skipped: PairSkipSummary[]
): void {
  const pairCount = corrections.length;
  if (pairCount === 0 && skipped.length === 0) return;

  corrections.forEach((item) => {
    showSuccess(
      `프리셉터 짝 Off ${item.correctedCount}건이 자동 맞춤되었습니다 (${item.preceptorName} ↔ ${item.precepteeName}).`
    );
  });

  skipped.forEach((item) => {
    showInfo(
      `${item.skippedCount}건은 ${item.employeeName}(${item.role === 'preceptor' ? '프리셉터' : '프리셉티'}) Off 한도 초과로 맞추지 못했습니다.`
    );
  });

  if (pairCount >= 3) {
    preceptorReconcileAlertSummary.value = /* one-line summary for n-alert */;
  }
}
```

적용 위치:

- `handleApplyOffRequestExcelUpload`: `commitPreferenceMaps` → `reconcileAndNotifyPreferenceMaps(nextConstraints, {})`
- `handleLoadPendingLocalDraft`: 동일
- `restoreData` / `replacePreferenceMapsFromSnapshot` 직후: sanitized maps에 보정 (notes 유지)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/step4-initial-data.spec.ts -t "reconciles" -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue tests/unit/step4-initial-data.spec.ts
git commit -m "feat(step4): reconcile preceptor off on excel draft and restore paths"
```

---

### Task 9: 배너·드로어·토스트·`n-alert` UX

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue:124-149` (Off guide expanded — 3번째 소절)
- Modify: `src/components/schedule/request-entry/Step4RequestComposer.vue`
- Modify: `tests/unit/step4-initial-data.spec.ts`
- Reference: `DESIGN.md` (문구 톤·길이)

- [ ] **Step 1: Write the failing tests**

```typescript
it('shows preceptor pair banner only inside expanded off guide', async () => {
  const wrapper = await mountStep4WithPreceptorPair();
  expect(wrapper.text()).not.toContain('프리셉터 짝 Off 연동');

  await wrapper.find('[data-test="off-guide-toggle"]').trigger('click');
  expect(wrapper.text()).toContain('🔗 프리셉터 짝 Off 연동');
  expect(wrapper.text()).toContain('같은 날짜 Off가 함께 반영');
});

it('shows single-employee pair hint in request composer', async () => {
  const wrapper = await mountStep4WithPreceptorPair();
  await openRequestDrawer(wrapper);
  expect(wrapper.text()).toContain('연결된 프리셉터: 박선배 (40501)');
});

it('shows multi-select pair summary with overflow copy', async () => {
  const wrapper = await mountStep4WithThreePairs();
  await selectEmployees(wrapper, ['e1', 'e2', 'e3', 'e4', 'e5']);
  expect(wrapper.text()).toContain('프리셉터 짝 연동 대상:');
  expect(wrapper.text()).toContain('외');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/step4-initial-data.spec.ts -t "preceptor pair banner|pair hint" -v`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

**배너** (`Step4InitialData.vue` L136-148 아래):

```vue
<div class="rounded-xl bg-white/70 px-4 py-3">
  <p class="mb-2 font-medium text-slate-700">🔗 프리셉터 짝 Off 연동</p>
  <p class="leading-relaxed">
    프리셉터 짝으로 지정된 근무자는 같은 날짜 Off가 함께 반영됩니다.
  </p>
</div>
```

**드로어** (`Step4RequestComposer.vue`):

- Props 추가: `preceptorPairHints: Array<{ label: string }>` (부모 computed)
- 근무자 검색 아래 `v-if="preceptorPairHints.length"` 안내 박스
- 부모 `Step4InitialData.vue`에서 선택 근무자 기준 hints 계산:
  - 1명 + 짝 있음: `연결된 프리셉터: {name} ({employeeId}) — Off는 같은 날짜로 자동 반영` (역할에 따라 프리셉티 variant)
  - 2명+: 최대 2쌍 `A ↔ B`, 초과 `외 N쌍`

**토스트 순서:** 짝 토스트 → 기존 `요청이 저장되었습니다` (Task 6에서 구현)

**3쌍 이상 보정 `n-alert`:** Task 8 `preceptorReconcileAlertSummary` 바인딩

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/step4-initial-data.spec.ts -t "preceptor pair banner|pair hint" -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue src/components/schedule/request-entry/Step4RequestComposer.vue tests/unit/step4-initial-data.spec.ts
git commit -m "feat(step4): add preceptor pair off sync banner and drawer hints"
```

---

### Task 10: 통합 테스트 + 검증 (spec §13 전체)

**Files:**

- Modify: `tests/unit/step4-initial-data.spec.ts`
- Modify: `tests/unit/preceptor-off-sync.spec.ts`
- Modify: `tests/unit/off-request-policy-check.spec.ts`

- [ ] **Step 1: spec §13 체크리스트 테스트 매핑 확인**

| §13 Item                                                | Test location                                           |
| ------------------------------------------------------- | ------------------------------------------------------- |
| Preceptee add → preceptor + toast (note preceptee-only) | `step4-initial-data.spec.ts` Task 6                     |
| Preceptor delete → preceptee removed + toast            | `step4-initial-data.spec.ts` Task 7                     |
| Editing date diff propagates                            | `step4-initial-data.spec.ts` — editing 모드 추가 케이스 |
| Multi-employee batch dedupes                            | `preceptor-off-sync.spec.ts` Task 3                     |
| Excel one-sided → union + alert                         | `step4-initial-data.spec.ts` Task 8                     |
| A={1,2} B={2,3} adds only                               | `preceptor-off-sync.spec.ts` Task 4                     |
| Draft load mismatch                                     | `step4-initial-data.spec.ts` Task 8                     |
| Reconcile skip on peer limit                            | `preceptor-off-sync.spec.ts` Task 4                     |
| Pre-block pair limit → neither mutated                  | `step4-initial-data.spec.ts` Task 6                     |
| No pair → no regression                                 | `step4-initial-data.spec.ts` — solo employee apply      |
| Drawer pair label                                       | `step4-initial-data.spec.ts` Task 9                     |
| Reverse lookup >1 → skip                                | `preceptor-off-sync.spec.ts` Task 1                     |
| Policy check matches server fixture                     | `off-request-policy-check.spec.ts` Task 2               |
| Policy fetch failure blocks all writes                  | `step4-initial-data.spec.ts` Task 5                     |

누락 케이스 추가 후 전체 실행.

- [ ] **Step 2: Run full unit suite for touched files**

Run:

```bash
pnpm vitest run tests/unit/preceptor-off-sync.spec.ts tests/unit/off-request-policy-check.spec.ts tests/unit/step4-initial-data.spec.ts -v
```

Expected: PASS

- [ ] **Step 3: Lint + build (AGENTS.md workflow checks)**

Run:

```bash
pnpm lint:check
pnpm run build
```

Expected: both exit 0

- [ ] **Step 4: Manual smoke (optional)**

1. Step3에서 프리셉터 짝 지정 → Step4 진입
2. 프리셉티 Off 추가 → 프리셉터 동일 날짜 반영 + 토스트
3. 정책 Ops에서 한도 낮춘 뒤 짝 차단 토스트 확인
4. Excel 한쪽만 Off 업로드 → 보정 알림

- [ ] **Step 5: Commit**

```bash
git add tests/unit/preceptor-off-sync.spec.ts tests/unit/off-request-policy-check.spec.ts tests/unit/step4-initial-data.spec.ts
git commit -m "test(step4): cover preceptor off sync acceptance checklist"
```

---

## 구현 시 주의사항

1. **`ConstraintMap` 스키마 변경 금지** — 쓰기 시점에만 짝 날짜 동기화.
2. **그리드 직접 Off 토글 재도입 금지** — Drawer/요청 목록/Excel 경로만.
3. **사전 차단은 `policyRejectionSummaries`에 넣지 않음** — 토스트만.
4. **역조회 2명 이상** — sync skip + `console.warn`, UI는 짝 없음과 동일.
5. **전월 5일 포함** — `grid.dates` 전체 범위(36일)에 동기화 적용.
6. **`handleOpenOffRequestExcelUploadModal`** — `offPolicyLoadError` 가드 추가 (spec §4 block guards).
7. **Step5 회귀** — 구현 후 기존 `preceptor_pairing` compliance 테스트 실행만 (규칙 추가 없음).

---

## 완료 기준

- [ ] spec §12 Acceptance criteria 7항목 충족
- [ ] spec §13 Test checklist 14항목 테스트로 커버
- [ ] `pnpm lint:check` PASS
- [ ] `pnpm run build` PASS
- [ ] `OffRequestPolicySetup.vue`, Step3 프리셉터 UX 무변경
