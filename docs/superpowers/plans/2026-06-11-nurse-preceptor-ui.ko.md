# 간호사 프리셉터 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step3(setup·월별)에서 직원별 프리셉터를 테이블·모달·엑셀로 지정·저장·reload할 수 있게 하고, Step5 compliance 패널에 「프리셉터 동일 시프트」 항목이 표시되게 한다.

**Architecture:** UX·검증 규칙은 [UI 설계 문서](../../plans/2026-06-11-nurse-preceptor-ui.ko.md)와 [API 문서](../../plans/2026-06-11-nurse-preceptor-api.ko.md)를 따른다. 공유 검증은 `src/utils/preceptorValidation.ts`(이미 구현됨)에 두고, UI 컴포넌트는 `preceptorEmployeeId`(직번)만 다룬다. Step3 load 시 DB `preceptor_id`(UUID)→직번 역매핑, save 시 `buildEmployeePayload()`에 `preceptorEmployeeId`를 포함한다.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript 5.8, Vite 6, Tailwind CSS, Naive UI(`NDataTable`, `NSelect`, `NModal`), Vitest, Vue Test Utils, `xlsx`.

**선행 조건:** [API 슬라이스](../../plans/2026-06-11-nurse-preceptor-api.ko.md) 완료 — `EmployeeInput.preceptorEmployeeId`, RPC payload, compliance evaluator, `preceptorValidation.ts` 단위 테스트.

---

## 구현 상태 (2026-06-13 기준)

| 슬라이스           | 상태      | 비고                                                                          |
| ------------------ | --------- | ----------------------------------------------------------------------------- |
| U1 validation util | ✅ 완료   | `src/utils/preceptorValidation.ts`, `tests/unit/preceptor-validation.spec.ts` |
| U2 EmployeeTable   | ❌ 미구현 | 프리셉터 컬럼·모달 `NSelect` 없음                                             |
| U3 Step3 load/save | ❌ 미구현 | `cloneEmployees` / `serializeEmployees` / load / payload에 필드 없음          |
| U4 Excel 4열       | ❌ 미구현 | 3열 파싱·템플릿만 존재                                                        |
| U5 Compliance copy | ✅ 완료   | `scheduleCompliance.ts`, `schedule-compliance-panel.spec.ts`                  |

---

## 결정 사항

- UI 식별자는 **직번**(`preceptorEmployeeId`). DB FK·솔버는 UUID — Step3 load에서만 변환.
- 프리셉터 컬럼 표시: 미지정 `—` (`text-gray-500`), 지정 `{이름} ({직번})` — 직번만 `font-mono` (`DESIGN.md`).
- 모달: Naive UI `NSelect`, `clearable`, placeholder `프리셉터 선택 (선택)`.
- 후보 옵션: `buildPreceptorCandidateOptions()` — 활성 상단, `(없음)` 첫 항목, 비활성 separator 아래.
- 모달 확인: `validatePreceptorAssignment()` 실패 시 `showError(message)` — `window.$message` 직접 호출 금지.
- 엑셀: 4번째 컬럼 `프리셉터직번`, 빈 셀 → `null`. 파싱 후 **전체 로스터** 기준 프리셉터 규칙 검증.
- setup·월별 Step3 UX **동일**. 저장 API만 기존 분기 유지.
- Compliance 패널 UI 코드 변경 **불필요** — evaluator·label 이미 연결됨. 회귀 테스트만 확인.

## 파일 구조

- **Already done:** `src/utils/preceptorValidation.ts`
  - `validatePreceptorAssignment`, `buildPreceptorCandidateOptions`, `hasOverlappingWorkShifts`
- **Modify:** `src/utils/preceptorValidation.ts`
  - 엑셀 행 단위 오류 코드·메시지 헬퍼 추가 (`validatePreceptorExcelRows`)
- **Modify:** `src/components/schedule/EmployeeTable.vue`
  - 테이블 프리셉터 컬럼, 모달 `NSelect`, 확인 시 검증
- **Modify:** `src/views/schedule/Step3EmployeeInfo.vue`
  - load UUID→직번, `cloneEmployees` / `serializeEmployees` / `buildEmployeePayload` 확장
- **Modify:** `src/components/schedule/EmployeeExcelUpload.vue`
  - 4열 템플릿·파싱·검증·형식 안내 collapse
- **Verify only:** `src/components/schedule/review/ScheduleCompliancePanel.vue`
- **Create:** `tests/unit/employee-table.spec.ts`
- **Create:** `tests/unit/employee-excel-upload.spec.ts`
- **Modify:** `tests/unit/preceptor-validation.spec.ts` — 엑셀 배치 검증 케이스
- **Modify:** `tests/unit/step3-employee-info.spec.ts` — load/save/dirty 케이스

## 데이터 계약

```typescript
// UI 전 구간
interface EmployeeInput {
  employeeId: string;
  name: string;
  availableShifts: string[];
  rankCode?: string | null;
  preceptorEmployeeId?: string | null; // 직번
}

// Step3 load (employees 테이블)
// select: id, employee_id, name, available_shifts, rank_code, preceptor_id
preceptorEmployeeId: emp.preceptor_id
  ? idToEmployeeIdMap.get(emp.preceptor_id) ?? null
  : null;

// Save payload (setup + 월별 공통)
{
  employeeId, name, availableShifts, rankCode,
  preceptorEmployeeId: employee.preceptorEmployeeId ?? null,
}
```

엑셀 오류 코드 (§5.5 UI 설계 문서):

| code                         | message template                                                  |
| ---------------------------- | ----------------------------------------------------------------- |
| `PRECEPTOR_SELF`             | `{행}행: 본인을 프리셉터로 지정할 수 없습니다.`                   |
| `PRECEPTOR_NOT_FOUND`        | `{행}행: 프리셉터 직번 '{id}'를 찾을 수 없습니다.`                |
| `PRECEPTOR_SHIFT_OVERLAP`    | `{행}행: 프리셉터와 가능 시프트가 겹치지 않습니다.`               |
| `PRECEPTOR_ALREADY_ASSIGNED` | `{행}행: 프리셉터 '{id}'는 이미 다른 직원에게 지정되어 있습니다.` |
| `PRECEPTOR_CHAIN`            | `{행}행: 프리셉터 관계는 연속(체인)으로 지정할 수 없습니다.`      |

---

### Task 0: 선행 util 회귀 확인 (U1)

**Files:**

- Verify: `src/utils/preceptorValidation.ts`
- Verify: `tests/unit/preceptor-validation.spec.ts`

- [ ] **Step 1: 기존 테스트 실행**

Run: `pnpm exec vitest run tests/unit/preceptor-validation.spec.ts -v`

Expected: PASS (모든 케이스)

- [ ] **Step 2: 변경 없음 확인 후 다음 Task 진행**

---

### Task 1: 엑셀 배치 프리셉터 검증 util

**Files:**

- Modify: `src/utils/preceptorValidation.ts`
- Modify: `tests/unit/preceptor-validation.spec.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/unit/preceptor-validation.spec.ts`에 추가:

```typescript
import { validatePreceptorExcelRows } from '@/utils/preceptorValidation';

it('returns PRECEPTOR_NOT_FOUND for unknown preceptor employee id', () => {
  const employees: EmployeeInput[] = [
    { employeeId: 'P-1', name: '박선배', availableShifts: ['D', 'E'] },
    { employeeId: 'T-1', name: '김신규', availableShifts: ['D'], preceptorEmployeeId: 'MISSING' },
  ];

  expect(validatePreceptorExcelRows(employees)).toEqual([
    expect.objectContaining({
      row: 2,
      code: 'PRECEPTOR_NOT_FOUND',
      message: "2행: 프리셉터 직번 'MISSING'를 찾을 수 없습니다.",
    }),
  ]);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run tests/unit/preceptor-validation.spec.ts -t "PRECEPTOR_NOT_FOUND" -v`

Expected: FAIL — `validatePreceptorExcelRows` not exported

- [ ] **Step 3: 최소 구현**

`src/utils/preceptorValidation.ts`에 추가:

```typescript
export type PreceptorExcelErrorCode =
  | 'PRECEPTOR_SELF'
  | 'PRECEPTOR_NOT_FOUND'
  | 'PRECEPTOR_SHIFT_OVERLAP'
  | 'PRECEPTOR_ALREADY_ASSIGNED'
  | 'PRECEPTOR_CHAIN';

export interface PreceptorExcelError {
  row: number;
  code: PreceptorExcelErrorCode;
  message: string;
}

function mapValidationMessageToExcelError(
  row: number,
  preceptorEmployeeId: string,
  message: string | null
): PreceptorExcelError | null {
  if (!message) return null;

  if (message === '본인을 프리셉터로 지정할 수 없습니다.') {
    return {
      row,
      code: 'PRECEPTOR_SELF',
      message: `${row}행: 본인을 프리셉터로 지정할 수 없습니다.`,
    };
  }
  if (message === '프리셉터와 가능 시프트가 겹치지 않습니다.') {
    return {
      row,
      code: 'PRECEPTOR_SHIFT_OVERLAP',
      message: `${row}행: 프리셉터와 가능 시프트가 겹치지 않습니다.`,
    };
  }
  if (message === '선택한 프리셉터는 이미 다른 직원의 프리셉터입니다.') {
    return {
      row,
      code: 'PRECEPTOR_ALREADY_ASSIGNED',
      message: `${row}행: 프리셉터 '${preceptorEmployeeId}'는 이미 다른 직원에게 지정되어 있습니다.`,
    };
  }
  if (message === '프리셉터 관계는 연속(체인)으로 지정할 수 없습니다.') {
    return {
      row,
      code: 'PRECEPTOR_CHAIN',
      message: `${row}행: 프리셉터 관계는 연속(체인)으로 지정할 수 없습니다.`,
    };
  }

  return null;
}

export function validatePreceptorExcelRows(employees: EmployeeInput[]): PreceptorExcelError[] {
  const errors: PreceptorExcelError[] = [];

  employees.forEach((employee, index) => {
    const row = index + 2; // header + 1-indexed (엑셀 행 번호)
    const preceptorEmployeeId = employee.preceptorEmployeeId?.trim() || null;
    if (!preceptorEmployeeId) return;

    const preceptor = employees.find((candidate) => candidate.employeeId === preceptorEmployeeId);
    if (!preceptor) {
      errors.push({
        row,
        code: 'PRECEPTOR_NOT_FOUND',
        message: `${row}행: 프리셉터 직번 '${preceptorEmployeeId}'를 찾을 수 없습니다.`,
      });
      return;
    }

    const message = validatePreceptorAssignment({
      employees,
      targetIndex: index,
      preceptorEmployeeId,
    });

    const mapped = mapValidationMessageToExcelError(row, preceptorEmployeeId, message);
    if (mapped) errors.push(mapped);
  });

  return errors;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run tests/unit/preceptor-validation.spec.ts -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/preceptorValidation.ts tests/unit/preceptor-validation.spec.ts
git commit -m "feat: add excel row preceptor validation helper"
```

---

### Task 2: EmployeeTable — 프리셉터 컬럼 표시

**Files:**

- Create: `tests/unit/employee-table.spec.ts`
- Modify: `src/components/schedule/EmployeeTable.vue`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import EmployeeTable from '@/components/schedule/EmployeeTable.vue';

const shifts = [
  { id: '1', code: 'D', name: 'Day', colorCode: '#3B82F6', startTime: '09:00', endTime: '18:00' },
];

describe('EmployeeTable preceptor column', () => {
  it('renders assigned preceptor as name and employee id', () => {
    const wrapper = mount(EmployeeTable, {
      props: {
        shifts,
        employees: [
          { employeeId: 'P-1', name: '박선배', availableShifts: ['D'] },
          { employeeId: 'T-1', name: '김신규', availableShifts: ['D'], preceptorEmployeeId: 'P-1' },
        ],
      },
      global: {
        stubs: {
          NDataTable: {
            props: ['columns', 'data'],
            template: '<div data-test="table"><slot /></div>',
          },
          NButton: { template: '<button><slot /></button>' },
          NModal: { template: '<div />' },
          NForm: { template: '<form><slot /></form>' },
          NFormItem: { template: '<div><slot /></div>' },
          NInput: { template: '<input />' },
          NCheckboxGroup: { template: '<div><slot /></div>' },
          NCheckbox: { template: '<label><slot /></label>' },
          NSpace: { template: '<div><slot /></div>' },
          NPopconfirm: { template: '<div><slot /></div>' },
          NSelect: { template: '<select />' },
        },
      },
    });

    const columns = (
      wrapper.vm as { columns: Array<{ key: string; render: (row: unknown) => unknown }> }
    ).columns;
    const preceptorColumn = columns.find((column) => column.key === 'preceptorEmployeeId');
    expect(preceptorColumn).toBeTruthy();

    const html = String(
      preceptorColumn!.render({
        employeeId: 'T-1',
        name: '김신규',
        availableShifts: ['D'],
        preceptorEmployeeId: 'P-1',
      })
    );

    expect(html).toContain('박선배');
    expect(html).toContain('P-1');
  });
});
```

> Note: `columns`가 `computed`이므로 테스트에서는 `wrapper.vm` 접근 또는 `NDataTable` stub이 `columns` prop을 DOM에 노출하도록 조정한다. 구현 시 `data-test="preceptor-cell"`을 render 결과에 넣어 `wrapper.get('[data-test=preceptor-cell]')`로 검증해도 된다.

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run tests/unit/employee-table.spec.ts -v`

Expected: FAIL — no `preceptorEmployeeId` column

- [ ] **Step 3: 컬럼 render 구현**

`EmployeeTable.vue` `columns` computed에 **가능 시프트**와 **작업** 사이에 추가:

```typescript
{
  title: '프리셉터',
  key: 'preceptorEmployeeId',
  width: 180,
  render(row) {
    if (!row.preceptorEmployeeId) {
      return h('span', { class: 'text-gray-500' }, '—');
    }

    const preceptor = props.employees.find(
      (employee) => employee.employeeId === row.preceptorEmployeeId
    );
    const label = preceptor?.name ?? '(미지정)';
    const employeeId = row.preceptorEmployeeId;

    return h('span', { 'data-test': 'preceptor-cell' }, [
      `${label} (`,
      h('span', { class: 'font-mono' }, employeeId),
      ')',
    ]);
  },
},
```

- [ ] **Step 4: 테스트 통과**

Run: `pnpm exec vitest run tests/unit/employee-table.spec.ts -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/EmployeeTable.vue tests/unit/employee-table.spec.ts
git commit -m "feat: show preceptor column in employee table"
```

---

### Task 3: EmployeeTable — 모달 NSelect + 확인 검증

**Files:**

- Modify: `src/components/schedule/EmployeeTable.vue`
- Modify: `tests/unit/employee-table.spec.ts`

- [ ] **Step 1: formData·imports 확장**

```typescript
import { NSelect } from 'naive-ui';
import {
  buildPreceptorCandidateOptions,
  validatePreceptorAssignment,
} from '@/utils/preceptorValidation';
import { showError } from '@/utils/message';

const formData = ref<EmployeeInput>({
  employeeId: '',
  name: '',
  availableShifts: [],
  preceptorEmployeeId: null,
});
```

- [ ] **Step 2: computed options**

```typescript
const preceptorOptions = computed(() =>
  buildPreceptorCandidateOptions(props.employees, editingIndex.value)
);
```

- [ ] **Step 3: template에 form item 추가** (가능 시프트 아래)

```vue
<n-form-item label="프리셉터" path="preceptorEmployeeId">
  <n-select
    v-model:value="formData.preceptorEmployeeId"
    :options="preceptorOptions"
    clearable
    placeholder="프리셉터 선택 (선택)"
  />
</n-form-item>
```

- [ ] **Step 4: handleAdd / handleEdit / handleConfirm 갱신**

`handleAdd` / `handleEdit`에 `preceptorEmployeeId: employee.preceptorEmployeeId ?? null` 포함.

`handleConfirm`에서 `employeeData` 조립 전:

```typescript
const preceptorEmployeeId =
  formData.value.preceptorEmployeeId === '__separator__'
    ? null
    : (formData.value.preceptorEmployeeId ?? null);

const validationMessage = validatePreceptorAssignment({
  employees: props.employees,
  targetIndex: isEditing.value ? editingIndex.value : props.employees.length,
  preceptorEmployeeId,
});
if (validationMessage) {
  showError(validationMessage);
  return;
}

const employeeData: EmployeeInput = {
  // ...existing fields
  preceptorEmployeeId,
};
```

- [ ] **Step 5: 단위 테스트 — validate 호출**

`employee-table.spec.ts`에 `validatePreceptorAssignment` mock으로 self-assignment 차단 케이스 추가.

- [ ] **Step 6: 테스트·lint**

Run: `pnpm exec vitest run tests/unit/employee-table.spec.ts -v`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/schedule/EmployeeTable.vue tests/unit/employee-table.spec.ts
git commit -m "feat: add preceptor select to employee edit modal"
```

---

### Task 4: Step3EmployeeInfo — load / save / dirty

**Files:**

- Modify: `src/views/schedule/Step3EmployeeInfo.vue`
- Modify: `tests/unit/step3-employee-info.spec.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/unit/step3-employee-info.spec.ts`:

```typescript
it('maps preceptor_id UUID to preceptorEmployeeId on load', async () => {
  supabaseFromMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'uuid-p',
              employee_id: 'P-1',
              name: '박선배',
              available_shifts: ['D'],
              rank_code: null,
              preceptor_id: null,
            },
            {
              id: 'uuid-t',
              employee_id: 'T-1',
              name: '김신규',
              available_shifts: ['D'],
              rank_code: null,
              preceptor_id: 'uuid-p',
            },
          ],
          error: null,
        }),
      }),
    }),
  });

  // mount Step3EmployeeInfo (setup entry), flushPromises

  expect(/* employees[1].preceptorEmployeeId */).toBe('P-1');
});
```

유사하게 `buildEmployeePayload`에 `preceptorEmployeeId` 포함·dirty detection 케이스 추가.

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run tests/unit/step3-employee-info.spec.ts -t preceptor -v`

Expected: FAIL

- [ ] **Step 3: load 구현**

```typescript
const idToEmployeeIdMap = new Map(
  data.map((emp: { id: string; employee_id: string }) => [emp.id, emp.employee_id])
);

employees.value = data.map(
  (emp: {
    employee_id: string;
    name: string;
    available_shifts: string[];
    rank_code?: string | null;
    preceptor_id?: string | null;
  }) => {
    const preceptorEmployeeId = emp.preceptor_id
      ? (idToEmployeeIdMap.get(emp.preceptor_id) ?? null)
      : null;

    if (emp.preceptor_id && !preceptorEmployeeId) {
      console.warn('[Step3] Preceptor UUID not found in roster:', emp.preceptor_id);
    }

    return {
      employeeId: emp.employee_id,
      name: emp.name,
      availableShifts: emp.available_shifts,
      rankCode: emp.rank_code ?? null,
      preceptorEmployeeId,
    };
  }
);
```

`select('*')`는 이미 `preceptor_id` 포함.

- [ ] **Step 4: clone / serialize / payload**

```typescript
function cloneEmployees(list: EmployeeInput[]): EmployeeInput[] {
  return list.map((employee) => ({
    employeeId: employee.employeeId,
    name: employee.name,
    availableShifts: [...employee.availableShifts],
    rankCode: employee.rankCode ?? null,
    preceptorEmployeeId: employee.preceptorEmployeeId ?? null,
  }));
}

// serializeEmployees map에 preceptorEmployeeId 추가 (sort key에도 포함 가능)

function buildEmployeePayload() {
  return employees.value.map((employee) => ({
    employeeId: employee.employeeId,
    name: employee.name,
    availableShifts: employee.availableShifts,
    rankCode: employee.rankCode ?? null,
    preceptorEmployeeId: employee.preceptorEmployeeId ?? null,
  }));
}
```

- [ ] **Step 5: 테스트 통과**

Run: `pnpm exec vitest run tests/unit/step3-employee-info.spec.ts -v`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/views/schedule/Step3EmployeeInfo.vue tests/unit/step3-employee-info.spec.ts
git commit -m "feat: persist preceptorEmployeeId in step3 load and save"
```

---

### Task 5: EmployeeExcelUpload — 4열 템플릿·파싱·검증

**Files:**

- Create: `tests/unit/employee-excel-upload.spec.ts`
- Modify: `src/components/schedule/EmployeeExcelUpload.vue`

- [ ] **Step 1: 파싱 헬퍼 분리 (테스트 가능)**

`EmployeeExcelUpload.vue` 또는 `src/utils/employeeExcelParser.ts`에 순수 함수 추출:

```typescript
export function parseEmployeeExcelRows(
  rows: Array<Record<string, string>>,
  validShiftCodes: string[]
): { employees: EmployeeInput[]; errors: string[] };
```

4번째 필드 `preceptorEmployeeId` — 빈 값 → `null`, trim.

- [ ] **Step 2: 실패 테스트**

```typescript
it('parses preceptorEmployeeId from fourth column', () => {
  const { employees } = parseEmployeeExcelRows(
    [{ employeeId: 'T-1', name: '김신규', availableShifts: 'D', preceptorEmployeeId: 'P-1' }],
    ['D']
  );
  expect(employees[0]?.preceptorEmployeeId).toBe('P-1');
});
```

- [ ] **Step 3: `sheet_to_json` header 확장**

```typescript
header: ['employeeId', 'name', 'availableShifts', 'preceptorEmployeeId'],
```

파싱 루프에서:

```typescript
const preceptorRaw = row.preceptorEmployeeId ? String(row.preceptorEmployeeId).trim() : '';
const preceptorEmployeeId = preceptorRaw.length > 0 ? preceptorRaw : null;
```

전체 행 파싱 후:

```typescript
import { validatePreceptorExcelRows } from '@/utils/preceptorValidation';

const preceptorErrors = validatePreceptorExcelRows(employees);
if (preceptorErrors.length > 0) {
  reject(new Error(preceptorErrors.map((error) => error.message).join('\n')));
  return;
}
```

- [ ] **Step 4: 템플릿·collapse 4열**

`downloadTemplate()` sampleData:

```typescript
['직원ID', '이름', '가능시프트', '프리셉터직번'],
['EMP001', '홍길동', shiftCodesStr, ''],
['EMP002', '김철수', shiftCodesStr, 'EMP001'],
```

collapse 테이블에 4번째 열 추가 (UI 설계 §5.2).

- [ ] **Step 5: 테스트 통과**

Run: `pnpm exec vitest run tests/unit/employee-excel-upload.spec.ts -v`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/schedule/EmployeeExcelUpload.vue tests/unit/employee-excel-upload.spec.ts
git commit -m "feat: support preceptor column in employee excel import"
```

---

### Task 6: Compliance 패널 회귀 확인 (U5)

**Files:**

- Verify: `tests/unit/schedule-compliance-panel.spec.ts`
- Verify: `src/utils/scheduleCompliance.ts`

- [ ] **Step 1: 기존 테스트 실행**

Run: `pnpm exec vitest run tests/unit/schedule-compliance-panel.spec.ts tests/unit/schedule-compliance.spec.ts -v`

Expected: PASS — `preceptor_pairing` / `프리셉터 동일 시프트` 포함

- [ ] **Step 2: UI 컴포넌트 변경 없음 확인**

`ScheduleCompliancePanel.vue`는 `result.summaries`의 label을 그대로 표시. 코드 변경 불필요 시 skip.

---

### Task 7: 최종 검증

- [ ] **Step 1: 관련 단위 테스트 전체**

Run: `pnpm exec vitest run tests/unit/preceptor-validation.spec.ts tests/unit/employee-table.spec.ts tests/unit/employee-excel-upload.spec.ts tests/unit/step3-employee-info.spec.ts tests/unit/schedule-compliance-panel.spec.ts -v`

Expected: PASS

- [ ] **Step 2: lint + build**

Run: `pnpm lint:check`

Expected: PASS

Run: `pnpm run build`

Expected: PASS

- [ ] **Step 3: 수동 스모크 (선택)**

1. setup Step3: 프리셉터 지정 → 저장 → 새로고침 → 값 유지
2. 엑셀 4열 업로드 → 체인 오류 메시지 확인
3. Step5 생성 후 compliance 「프리셉터 동일 시프트」 행 확인

---

## 완료 기준

- [ ] setup·월별 Step3에서 프리셉터 지정·저장·reload 일치
- [ ] 엑셀 4열 업로드·한국어 오류 메시지 (§5.5 코드)
- [ ] Step5 compliance에 「프리셉터 동일 시프트」 표시 (회귀 테스트 통과)
- [ ] `pnpm lint:check` · `pnpm run build` 통과

## 제외 범위

- 프리셉터 자동 추천 UI
- 기간별 pairing 변경 UI
- 모바일 레이아웃
- `ScheduleCompliancePanel` 전용 copy 하드코딩 (evaluator label 사용)
- 서버 `validateEmployeeImport` 연동 (`validationPreview`는 현재 `null` — MVP 유지)

## 열린 리스크

- `NSelect` separator option(`__separator__`)이 model에 들어가지 않도록 confirm guard 필요.
- 엑셀 헤더 alias(§5.3)는 템플릿 고정 4열로 먼저 출시하고, 자유 헤더 매핑은 후속 가능.
- 직원 삭제 시 다른 직원의 `preceptorEmployeeId`가 dangling 될 수 있음 — 저장 전 테이블 편집에서 사용자가 수정. 자동 정리는 MVP 제외.

## 참고

- UX 와이어·copy: [docs/plans/2026-06-11-nurse-preceptor-ui.ko.md](../../plans/2026-06-11-nurse-preceptor-ui.ko.md)
- 타입·RPC·compliance: [docs/plans/2026-06-11-nurse-preceptor-api.ko.md](../../plans/2026-06-11-nurse-preceptor-api.ko.md)
- 디자인: `DESIGN.md` — mono accent, muted empty state
