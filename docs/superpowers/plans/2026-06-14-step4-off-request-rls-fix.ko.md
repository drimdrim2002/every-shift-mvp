# Step4 Off 요청 저장 403 RLS 오류 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step3 로스터 재저장 후 Step4 Off `요청 반영` 시 `schedule_preferences` INSERT가 403(42501)으로 실패하지 않도록, stale `employee_id` 캐시를 제거하고 persist 직전 방어층을 둔다.

**Architecture:** root cause는 RLS·JWT가 아니라 `replace_roster_and_reset_schedule_atomic` 이후 Pinia `orgStore.employees`가 갱신되지 않아 Step4가 삭제된 UUID로 INSERT하는 것이다. DB·RLS·마이그레이션은 건드리지 않고, Step3 저장 직후 `loadOrganization` 강제(P0-A), Step4 진입 시 reload 조건 확장(P0-B), persist 직전 orgStore 기준 sanitize·불일치 reload(P1)로 클라이언트 캐시만 동기화한다.

**Tech Stack:** Vue 3.5 Composition API, TypeScript 5.8, Pinia (`useOrganizationStore`), Vitest, 기존 Ops API (`applyEmployeeImport`, `replaceOrganizationRoster`), 기존 `saveScheduleVersionPreferences` direct client INSERT 유지.

**Formal spec (SSOT):** [docs/plans/2026-06-14-step4-off-request-rls-fix.ko.md](../../plans/2026-06-14-step4-off-request-rls-fix.ko.md) (root cause·리스크·수동 QA)

**Related feature:** [Step4 프리셉터 짝 Off 요청 동기화](./2026-06-14-step4-preceptor-off-request-sync.ko.md) — `preceptor_id`는 DB reload 후에도 유지되므로 회귀 테스트만 실행.

**Scope guard (변경 금지):** RLS 정책, DB 마이그레이션, `replace_roster_and_reset_schedule_atomic` 시그니처/동작, Edge Function preference API 이전(P2).

---

## 핵심 결정 (plan 반영)

| 항목                          | 결정                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Root cause                    | Step3 roster apply 후 `orgStore.employees` stale UUID → RLS `WITH CHECK` employees JOIN 실패                |
| P0-A                          | `performWizardEmployeeSave` / `performSetupEmployeeSave` 성공 직후 `await orgStore.loadOrganization(orgId)` |
| P0-B reload 조건              | `forceRefresh \|\| !orgStore.current \|\| employees.length === 0 \|\| !scheduleId`                          |
| P1 sanitize SSOT              | `orgStore.employees` ID 집합 우선, fallback `grid.employees`                                                |
| P1 persist guard              | grid·orgStore ID 집합 불일치 시 `loadOrganization` 1회 + grid 재할당 후 재검증                              |
| loadOrganization 실패 (Step3) | `showError` + `return false` (성공 토스트 금지)                                                             |
| API 경로                      | `saveSchedulePreferencesByScope` 변경 없음                                                                  |

---

## 파일 구조

### Modify

| File                                                | Responsibility                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| `src/views/schedule/Step3EmployeeInfo.vue:424-495`  | roster 저장 성공 후 `orgStore.loadOrganization` 호출 및 실패 처리 |
| `src/views/schedule/Step4InitialData.vue:1095-1153` | `sanitizeSnapshotToCurrentEmployees` — orgStore ID 기준           |
| `src/views/schedule/Step4InitialData.vue:2338-2368` | `loadStep4InitialData` — 확장 reload 조건                         |
| `src/views/schedule/Step4InitialData.vue:2573-2608` | `persistStep4PreferenceMaps` — persist 직전 불일치 guard          |
| `tests/unit/step3-employee-info.spec.ts`            | wizard/setup save 시 `loadOrganization` assertion                 |
| `tests/unit/step4-initial-data.spec.ts`             | stale cache·scheduleId undefined·persist payload 시나리오         |

### 변경 없음 (참고만)

| File                                                        | Note                                             |
| ----------------------------------------------------------- | ------------------------------------------------ |
| `src/api/schedule.ts`                                       | `saveSchedulePreferencesByScope` — P2 ADR 후보만 |
| `migrations/20260611_100000_employee_preceptor_pairing.sql` | UUID 재발급은 의도된 설계                        |

---

## 사전 조건 (구현자 체크)

- [ ] `src/views/schedule/Step3EmployeeInfo.vue`에 `orgStore`가 이미 import·인스턴스화됨 (`useOrganizationStore`, line 186·205)
- [ ] `orgStore.loadOrganization` 반환형: `{ success: true }` 또는 `{ success: false, error: string }` (`src/stores/organization.ts:190-193`)
- [ ] Step3 wizard save는 `scheduleStore.setBasicInfo({ scheduleId: undefined })`로 roster reset 경계를 표시함 (`Step3EmployeeInfo.vue:443-447`)
- [ ] `tests/unit/step3-employee-info.spec.ts`의 `organizationStoreMock`에 **`loadOrganization` mock이 아직 없음** — Task 1 Step 1에서 추가 필요

---

### Task 1: Step3 wizard save — `loadOrganization` 호출

**Files:**

- Modify: `tests/unit/step3-employee-info.spec.ts`
- Modify: `src/views/schedule/Step3EmployeeInfo.vue:424-468`

- [ ] **Step 1: 테스트 mock·실패 테스트 추가**

`organizationStoreMock`에 `loadOrganization: vi.fn()` 추가 (hoisted mock 또는 reactive mock 확장).

```typescript
// tests/unit/step3-employee-info.spec.ts — organizationStoreMock 확장
const organizationStoreMock = reactive({
  shifts: [
    /* 기존 */
  ],
  loadOrganization: vi.fn().mockResolvedValue({ success: true }),
});

it('reloads organization employees after wizard roster apply succeeds', async () => {
  const wrapper = createWrapper();
  await flushPromises();

  await wrapper.find('[data-test="employee-table-add"]').trigger('click');
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '저장')!
    .trigger('click');
  await flushPromises();

  const { onPositiveClick } = dialogMock.warning.mock.calls[0]![0] as {
    onPositiveClick?: () => Promise<void>;
  };
  await onPositiveClick?.();
  await flushPromises();

  expect(applyEmployeeImportMock).toHaveBeenCalledTimes(1);
  expect(organizationStoreMock.loadOrganization).toHaveBeenCalledTimes(1);
  expect(organizationStoreMock.loadOrganization).toHaveBeenCalledWith('org-1');
  expect(showSuccessMock).toHaveBeenCalledWith('직원 정보가 저장되었습니다.');
});

it('does not show success when loadOrganization fails after wizard roster apply', async () => {
  organizationStoreMock.loadOrganization.mockResolvedValueOnce({
    success: false,
    error: '직원 조회 실패',
  });

  // ... 동일 save 플로우 ...
  expect(showSuccessMock).not.toHaveBeenCalled();
  expect(showErrorMock).toHaveBeenCalledWith(expect.stringContaining('직원 조회 실패'));
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `pnpm exec vitest run tests/unit/step3-employee-info.spec.ts -t "reloads organization employees after wizard roster apply"`

Expected: FAIL — `loadOrganization` not called / mock undefined

- [ ] **Step 3: 최소 구현**

`performWizardEmployeeSave`에서 `applyEmployeeImport` 성공 후, `scheduleStore` 갱신 **직전**에 reload 삽입:

```typescript
// src/views/schedule/Step3EmployeeInfo.vue — performWizardEmployeeSave 내부
const applyResult = await applyEmployeeImport({
  /* ... */
});

if (applyResult.deletedScheduleId) {
  console.log('[Step3] Applied roster and removed schedule:', applyResult.deletedScheduleId);
}

const loadResult = await orgStore.loadOrganization(orgId);
if (!loadResult.success) {
  showError(`직원 정보를 다시 불러오지 못했습니다: ${loadResult.error ?? 'Unknown error'}`);
  return false;
}

scheduleStore.setEmployees(cloneEmployees(employees.value));
// ... 기존 setBasicInfo / clear storage / showSuccess ...
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run tests/unit/step3-employee-info.spec.ts -t "reloads organization employees|does not show success when loadOrganization fails after wizard"`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step3EmployeeInfo.vue tests/unit/step3-employee-info.spec.ts
git commit -m "fix(step3): reload org employees after wizard roster apply"
```

---

### Task 2: Step3 setup save — 동일 `loadOrganization` 호출

**Files:**

- Modify: `tests/unit/step3-employee-info.spec.ts`
- Modify: `src/views/schedule/Step3EmployeeInfo.vue:471-495`

- [ ] **Step 1: setup 경로 테스트 추가**

```typescript
it('reloads organization employees after setup roster replace succeeds', async () => {
  routeQueryMock.context = 'setup';
  const wrapper = createWrapper();
  await flushPromises();

  await wrapper.find('[data-test="employee-table-add"]').trigger('click');
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '저장')!
    .trigger('click');
  await flushPromises();

  const { onPositiveClick } = dialogMock.warning.mock.calls[0]![0] as {
    onPositiveClick?: () => Promise<void>;
  };
  await onPositiveClick?.();
  await flushPromises();

  expect(replaceOrganizationRosterMock).toHaveBeenCalledTimes(1);
  expect(organizationStoreMock.loadOrganization).toHaveBeenCalledWith('org-1');
  expect(showSuccessMock).toHaveBeenCalledWith('직원 기본 정보가 저장되었습니다.');
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run tests/unit/step3-employee-info.spec.ts -t "reloads organization employees after setup"`

Expected: FAIL

- [ ] **Step 3: `performSetupEmployeeSave` 구현**

```typescript
await replaceOrganizationRoster({ organizationId: orgId, employees: buildEmployeePayload() });

const loadResult = await orgStore.loadOrganization(orgId);
if (!loadResult.success) {
  showError(`직원 정보를 다시 불러오지 못했습니다: ${loadResult.error ?? 'Unknown error'}`);
  return false;
}

scheduleStore.setEmployees(cloneEmployees(employees.value));
// ... 기존 로직 ...
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm exec vitest run tests/unit/step3-employee-info.spec.ts`

Expected: 전체 PASS (기존 테스트 회귀 없음)

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step3EmployeeInfo.vue tests/unit/step3-employee-info.spec.ts
git commit -m "fix(step3): reload org employees after setup roster replace"
```

---

### Task 3: Step4 진입 — stale cache 시 `loadOrganization` 강제

**Files:**

- Modify: `tests/unit/step4-initial-data.spec.ts`
- Modify: `src/views/schedule/Step4InitialData.vue:2338-2354`

- [ ] **Step 1: stale cache 시나리오 테스트 추가**

`beforeEach`에 `organizationStoreMock.loadOrganization` 기본 mock 추가:

```typescript
organizationStoreMock.loadOrganization = vi.fn(async () => {
  organizationStoreMock.employees = [
    {
      id: 'new-uuid-1',
      organizationId: 'org-1',
      employeeId: 'E001',
      name: 'Kim',
      availableShifts: ['D'],
    },
  ];
  return { success: true };
});
```

테스트:

```typescript
it('reloads organization when scheduleId is undefined and orgStore has stale non-empty employees', async () => {
  organizationStoreMock.employees = [
    {
      id: 'old-uuid-1',
      organizationId: 'org-1',
      employeeId: 'E001',
      name: 'Kim',
      availableShifts: ['D'],
    },
  ];
  scheduleStoreMock.basicInfo.scheduleId = undefined;

  createWrapper();
  await flushPromises();

  expect(organizationStoreMock.loadOrganization).toHaveBeenCalledWith('org-1');
  expect(gridMock.employees.value[0]?.id).toBe('new-uuid-1');
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts -t "reloads organization when scheduleId is undefined"`

Expected: FAIL — `loadOrganization` not called

- [ ] **Step 3: reload 조건 헬퍼 + `loadStep4InitialData` 수정**

```typescript
function shouldReloadOrganizationEmployees(forceRefresh: boolean): boolean {
  if (forceRefresh) return true;
  if (!orgStore.current || orgStore.employees.length === 0) return true;
  if (!scheduleStore.basicInfo?.scheduleId) return true;
  return false;
}

async function loadStep4InitialData(forceRefresh = false) {
  // ...
  if (shouldReloadOrganizationEmployees(forceRefresh)) {
    const loadResult = await orgStore.loadOrganization(scheduleStore.basicInfo.organizationId);
    if (!loadResult.success) {
      baselineErrorMessage.value = `직원 정보를 불러오지 못했습니다: ${loadResult.error ?? 'Unknown error'}`;
      showError(baselineErrorMessage.value);
      return;
    }
  }

  grid.employees.value = orgStore.employees;
  // ...
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts -t "reloads organization when scheduleId is undefined"`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue tests/unit/step4-initial-data.spec.ts
git commit -m "fix(step4): reload org employees on roster-reset boundary"
```

---

### Task 4: Step4 — 불필요 reload 회귀 테스트

**Files:**

- Test: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: skip reload 시나리오 테스트 추가**

```typescript
it('does not reload organization when scheduleId exists and forceRefresh is false', async () => {
  scheduleStoreMock.basicInfo.scheduleId = 'schedule-1';
  organizationStoreMock.employees = [
    /* fresh emp-1, emp-2 */
  ];

  createWrapper();
  await flushPromises();

  expect(organizationStoreMock.loadOrganization).not.toHaveBeenCalled();
});

it('always reloads when forceRefresh is true via handleRetryBaseline', async () => {
  scheduleStoreMock.basicInfo.scheduleId = 'schedule-1';
  const wrapper = createWrapper();
  await flushPromises();
  organizationStoreMock.loadOrganization.mockClear();

  await wrapper.vm.handleRetryBaseline?.(); // 또는 data-test retry 버튼 trigger
  await flushPromises();

  expect(organizationStoreMock.loadOrganization).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: 실행 — 통과 확인**

Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts -t "does not reload organization|always reloads when forceRefresh"`

Expected: PASS (구현 변경 없음 — Task 3이 이미 올바르면 즉시 통과)

- [ ] **Step 3: Commit (테스트만 추가된 경우)**

```bash
git add tests/unit/step4-initial-data.spec.ts
git commit -m "test(step4): guard unnecessary org reload on normal entry"
```

---

### Task 5: `sanitizeSnapshotToCurrentEmployees` — orgStore ID 우선

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue:1105`
- Test: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: stale localStorage draft 테스트 추가**

grid는 fresh, constraints payload에 stale key 포함 시 persist mock 인자 검증:

```typescript
it('drops stale employee keys from persist payload using orgStore employee ids', async () => {
  organizationStoreMock.employees = [
    {
      id: 'new-uuid-1',
      organizationId: 'org-1',
      employeeId: 'E001',
      name: 'Kim',
      availableShifts: ['D'],
    },
  ];
  gridMock.employees.value = organizationStoreMock.employees;
  scheduleStoreMock.basicInfo.scheduleId = undefined;

  const wrapper = createWrapper();
  await flushPromises();

  // localStorage draft에 old-uuid-1 Off 시뮬레이션 (기존 helper 패턴 따름)
  // 요청 반영 또는 persist 트리거 후:
  expect(saveScheduleVersionPreferencesMock).toHaveBeenCalled();
  const payload = saveScheduleVersionPreferencesMock.mock.calls.at(-1);
  const constraints = payload?.[2]?.constraints ?? payload?.[1]; // 실제 시그니처에 맞게 조정
  expect(constraints).not.toHaveProperty('old-uuid-1');
  expect(showInfoMock).toHaveBeenCalledWith(expect.stringContaining('임시 데이터는 제외'));
});
```

> **Note:** `saveScheduleVersionPreferences` 인자 위치는 `Step4InitialData.vue:2607` 및 기존 spec의 호출 패턴을 그대로 따른다.

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts -t "drops stale employee keys"`

Expected: FAIL

- [ ] **Step 3: sanitize 기준 변경**

```typescript
function getAuthoritativeEmployeeIds(): Set<string> {
  const orgIds = orgStore.employees.map((employee) => employee.id);
  if (orgIds.length > 0) {
    return new Set(orgIds);
  }
  return new Set(grid.employees.value.map((employee) => employee.id));
}

function sanitizeSnapshotToCurrentEmployees(snapshot: {
  /* ... */
}) {
  const currentEmployeeIds = getAuthoritativeEmployeeIds();
  // ... 나머지 동일, grid.employees 루프는 authoritative 목록 기준으로 유지 ...
}
```

`sanitize` 내 `for (const employee of grid.employees.value)` 루프는 `orgStore.employees`가 비어 있지 않으면 orgStore 기준으로 빈 맵 초기화하도록 조정.

- [ ] **Step 4: 통과 확인**

Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts -t "drops stale employee keys"`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue tests/unit/step4-initial-data.spec.ts
git commit -m "fix(step4): sanitize off requests against orgStore employee ids"
```

---

### Task 6: `persistStep4PreferenceMaps` — persist 직전 불일치 guard

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue:2573-2595`

- [ ] **Step 1: grid·orgStore 불일치 테스트 추가**

```typescript
it('reloads organization before persist when grid and orgStore employee ids diverge', async () => {
  organizationStoreMock.employees = [
    {
      id: 'new-uuid-1',
      organizationId: 'org-1',
      employeeId: 'E001',
      name: 'Kim',
      availableShifts: ['D'],
    },
  ];
  gridMock.employees.value = [
    {
      id: 'old-uuid-1',
      organizationId: 'org-1',
      employeeId: 'E001',
      name: 'Kim',
      availableShifts: ['D'],
    },
  ];
  scheduleStoreMock.basicInfo.scheduleId = 'schedule-1';

  // persist 트리거 (요청 반영 또는 저장 버튼)
  // ...

  expect(organizationStoreMock.loadOrganization).toHaveBeenCalled();
  expect(gridMock.employees.value[0]?.id).toBe('new-uuid-1');
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts -t "reloads organization before persist"`

Expected: FAIL

- [ ] **Step 3: persist guard 구현**

```typescript
function gridEmployeeIdsMismatchOrgStore(): boolean {
  if (orgStore.employees.length === 0) return false;
  const orgIds = new Set(orgStore.employees.map((employee) => employee.id));
  const gridIds = new Set(grid.employees.value.map((employee) => employee.id));
  if (orgIds.size !== gridIds.size) return true;
  for (const id of orgIds) {
    if (!gridIds.has(id)) return true;
  }
  return false;
}

async function persistStep4PreferenceMaps(/* ... */) {
  if (!scheduleStore.basicInfo) return;
  // ... empty grid check ...

  if (orgStore.employees.length === 0 || gridEmployeeIdsMismatchOrgStore()) {
    const loadResult = await orgStore.loadOrganization(scheduleStore.basicInfo.organizationId);
    if (!loadResult.success) {
      showError(`직원 정보를 불러오지 못했습니다: ${loadResult.error ?? 'Unknown error'}`);
      return;
    }
    grid.employees.value = orgStore.employees;
  }

  const sanitized = sanitizeSnapshotToCurrentEmployees({
    constraints: nextConstraints,
    notes: nextNotes,
  });
  // ... 기존 로직 ...
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts -t "reloads organization before persist"`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue tests/unit/step4-initial-data.spec.ts
git commit -m "fix(step4): reload org employees before preference persist when cache diverges"
```

---

### Task 7: 최종 검증 및 수동 QA

**Files:** (변경 없음)

- [ ] **Step 1: 단위 테스트 전체**

```bash
pnpm exec vitest run tests/unit/step3-employee-info.spec.ts
pnpm exec vitest run tests/unit/step4-initial-data.spec.ts
```

Expected: 모든 tests PASS

- [ ] **Step 2: 프리셉터 sync 회귀 (관련 plan shipped 시)**

```bash
pnpm exec vitest run tests/unit/preceptor-off-sync.spec.ts
```

Expected: PASS

- [ ] **Step 3: lint + build**

```bash
pnpm lint:check
pnpm run build
```

Expected: exit 0

- [ ] **Step 4: 수동 QA** (원본 spec §5.3)

| #   | 단계                                                    | 기대 결과                           |
| --- | ------------------------------------------------------- | ----------------------------------- |
| 1   | Step3 직원 수정 후 저장 (`applyEmployeeImport`)         | 저장 성공 토스트                    |
| 2   | Step4 → Off 1건 `요청 반영`                             | `POST schedule_preferences` **201** |
| 3   | DevTools `orgStore.employees[].id` ↔ DB `employees.id` | UUID 일치                           |
| 4   | Step3 저장 없이 Step4 재진입                            | 불필요 reload 없음                  |
| 5   | 프리셉터 짝 Off 동기화 회귀                             | preceptor sync 시나리오 통과        |

- [ ] **Step 5: 완료 기준 체크** (원본 spec §8)

1. Step3 roster apply 후 `orgStore.employees`가 DB 최신 UUID 반영
2. 로스터 재저장 후 Step4 `grid.employees`가 stale UUID 미사용
3. Off `요청 반영` → `POST schedule_preferences` **201**
4. lint + build 통과
5. RLS·마이그레이션 변경 없음

---

## 리스크·회귀 (구현 시 주의)

| 영역                              | 완화                                        |
| --------------------------------- | ------------------------------------------- |
| 프리셉터 `preceptor_id`           | DB에 이미 반영 → reload만으로 짝 유지       |
| localStorage draft stale UUID     | P1 sanitize + 기존 `showInfo` 토스트        |
| edit-off flow (`scheduleId` 존재) | Task 4 skip reload 테스트로 방어            |
| Step3 `loadOrganization` 실패     | DB 저장은 완료됨 — Step4 P0-B·P1이 2차 방어 |

---

## 부록: 제외된 원인 (구현 불필요)

| 후보                         | 결론                                  |
| ---------------------------- | ------------------------------------- |
| admin RLS / JWT / RBAC drift | 동일 사용자 로스터 재저장 전 POST 201 |
| Edge Function 이전 (P2)      | 별도 ADR, 이번 scope 밖               |

---

## 원본 plan 대비 보강 요약

| writing-plans 항목                    | 원본 `docs/plans/...` | 본 plan                                    |
| ------------------------------------- | --------------------- | ------------------------------------------ |
| Goal / Architecture / Tech Stack 헤더 | 부분적                | ✅ 완전                                    |
| 파일 구조 표                          | §4 작업 목록          | ✅ Create/Modify 표                        |
| TDD bite-sized tasks                  | §4·§5 체크리스트만    | ✅ Task 1–7, fail→pass→commit              |
| 완전 코드 스니펫                      | 의사코드 수준         | ✅ 삽입 위치·함수 본문                     |
| 정확한 테스트 명령                    | §6 일괄만             | ✅ task별 `vitest -t`                      |
| 테스트 mock 갭                        | 미언급                | ✅ step3 `loadOrganization` mock 추가 명시 |
| 실행 handoff                          | 없음                  | ✅ 아래                                    |
