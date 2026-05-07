# Step4 Off 요청 Excel 업로드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Step4InitialData.vue`에서 현재 월 Off 요청을 Excel 업로드로 검증한 뒤, 사용자가 확인하고 `적용`할 때 Step4 화면의 Off 요청 데이터를 업로드 결과로 전부 대체한다.

**Architecture:** Excel 생성/파싱/검증은 신규 `src/utils/offRequestExcel.ts`에 격리한다. Modal UI는 신규 `Step4OffRequestExcelUploadModal.vue`가 담당하고, Step4는 검증된 `ConstraintMap`만 받아 기존 `commitPreferenceMaps(nextConstraints, {})` 흐름으로 화면과 Pinia store를 동기화한다. DB 저장과 재검증은 기존 `변경사항 저장`, `다음 단계`, 재풀이 흐름에 맡기며 업로드 적용 자체에서는 API를 호출하지 않는다.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vite, Tailwind CSS, Naive UI, `xlsx`, Vitest, Vue Test Utils.

---

## Summary

- 대상은 Step4의 현재 월 Off 요청뿐이다.
- 근무 배정, Step3 직원 정보, 사이트 요구사항, 전월 데이터 업로드 로직은 변경하지 않는다.
- Excel 적용은 즉시 DB 저장이 아니라 화면 반영이다.
- 업로드 템플릿은 현재 직원 목록을 미리 포함한다.
- 사용자는 `Off 요청 일자`와 `Off 유형`만 입력한다.
- 적용 시 기존 Off 요청과 Off 메모는 모두 삭제되고 업로드 결과로 대체된다. 템플릿에 메모 컬럼이 없기 때문이다.

## Scope Guardrails

- `src/utils/excel.ts`의 전월 데이터 템플릿/파싱은 건드리지 않는다.
- `EmployeeExcelUpload.vue`의 Step3 직원 업로드 UX와 API는 건드리지 않는다.
- Off 유형은 현재 `O`만 허용한다. `ConstraintCode`가 확장되기 전까지 다른 코드를 허용하지 않는다.
- 업로드 파일은 `.xlsx`, `.xls`, 5MB 이하만 허용한다.
- 현재 화면의 `grid.employees.value`와 `grid.dates.value`가 검증 기준이다.
- 날짜 검증은 `isLastMonth !== true`인 현재 월 날짜만 허용한다. Step4의 30x36 구조 때문에 전월 5일이 dates에 포함될 수 있어도 Off 요청 업로드에서는 제외한다.

## File Structure

- Create: `src/utils/offRequestExcel.ts`
  - Off 요청 Excel 템플릿 생성, 파일 검증, workbook 파싱, row validation, `ConstraintMap` 변환을 담당한다.
  - DOM, Vue, Naive UI, Pinia에 의존하지 않는다.
- Create: `src/components/schedule/Step4OffRequestExcelUploadModal.vue`
  - 템플릿 다운로드, drag-and-drop 업로드, 검증 결과 미리보기, 오류 표시, 적용 emit을 담당한다.
  - 검증 성공 결과만 `apply`로 부모에게 전달한다.
- Modify: `src/views/schedule/Step4InitialData.vue`
  - 캘린더 카드 헤더에 Excel 업로드 버튼과 Modal 연결을 추가한다.
  - 적용 시 기존 Step4 in-memory preference map을 업로드 결과로 교체한다.
- Test: `tests/unit/off-request-excel.spec.ts`
  - 유틸의 템플릿, 파싱, 검증 규칙을 테스트한다.
- Modify: `tests/unit/step4-initial-data.spec.ts`
  - Step4 통합 동작, draft block, API 미호출을 테스트한다.

## Data Contract

`src/utils/offRequestExcel.ts`는 아래 타입을 export한다.

```ts
import type { Employee } from '@/types/employee';
import type { ConstraintMap, GridColumn } from '@/types/schedule';

export const OFF_REQUEST_SHEET_NAME = 'Off요청';
export const OFF_REQUEST_TEMPLATE_HEADERS = [
  '직원ID',
  '이름',
  'Off 요청 일자',
  'Off 유형',
] as const;
export const OFF_REQUEST_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export type OffRequestExcelErrorCode =
  | 'invalid_file_type'
  | 'file_too_large'
  | 'missing_sheet'
  | 'empty_sheet'
  | 'missing_required_header'
  | 'missing_employee_id'
  | 'unknown_employee'
  | 'employee_name_mismatch'
  | 'missing_date'
  | 'invalid_date'
  | 'out_of_range_date'
  | 'missing_off_type'
  | 'invalid_off_type'
  | 'duplicate_request';

export interface OffRequestExcelValidationError {
  code: OffRequestExcelErrorCode;
  rowNumber: number | null;
  field: string | null;
  message: string;
}

export interface OffRequestExcelParseResult {
  ok: boolean;
  constraints: ConstraintMap;
  errors: OffRequestExcelValidationError[];
  requestCount: number;
  employeeCount: number;
}

export function buildOffRequestTemplateWorkbook(
  employees: Employee[],
  month: string
): XLSX.WorkBook;

export function downloadOffRequestTemplate(employees: Employee[], month: string): void;

export async function parseOffRequestExcelFile(
  file: File,
  employees: Employee[],
  dates: GridColumn[]
): Promise<OffRequestExcelParseResult>;
```

Implementation notes:

- Use `XLSX.utils.aoa_to_sheet` and `XLSX.utils.book_append_sheet`.
- Use `XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false })` for rows unless date serial handling requires reading raw values from cells.
- Normalize every header with `String(value).trim()`.
- Map rows by header name, not by fixed index, after required headers are verified.
- Employee lookup key is `Employee.employeeId`, while output `ConstraintMap` key is `Employee.id`.
- Name comparison is strict after `.trim()`.
- Empty rows are skipped only when all four required fields are blank.
- Duplicate detection key is `${employee.id}:${normalizedDate}`.
- Return all validation errors at once. Do not throw for row-level validation failures.
- Throw only for unexpected programmer/runtime failures.

Date normalization:

- Accept string `YYYY-MM-DD`.
- Accept common Excel date serial numbers.
- Return canonical `YYYY-MM-DD`.
- Reject ambiguous display strings like `12/1`, `2025.12.01`, or Korean date text unless the implementation explicitly proves they normalize safely.
- Compare against `new Set(dates.filter((date) => !date.isLastMonth).map((date) => date.date))`.

Template workbook:

- Sheet `Off요청`
  - Header row: `직원ID`, `이름`, `Off 요청 일자`, `Off 유형`
  - One row per current employee.
  - `직원ID` = `employee.employeeId`
  - `이름` = `employee.name`
  - `Off 요청 일자`, `Off 유형` = empty string
- Sheet `안내`
  - Include concise Korean rules:
    - 날짜는 `YYYY-MM-DD`
    - 현재 월 날짜만 허용
    - Off 유형은 `O`만 허용
    - 같은 직원의 여러 Off 요청은 여러 행으로 입력
    - 직원ID와 이름은 템플릿 값을 유지
- Filename: `everyshift_off_requests_${month}.xlsx`

## UX Contract

- Add button in the calendar card header, near `사전 Off 요청 캘린더`.
- Button:
  - `data-test="step4-excel-upload-button"`
  - Text: `Excel 업로드`
  - Use a simple file upload SVG icon or an existing icon pattern if one is already present in the file.
  - Use green/emerald styling so it is distinct from the primary request drawer CTA.
- If `pageLevelBlockedReason` exists, clicking the button must not open the modal.
  - Show `showInfo(pageLevelBlockedReason.value ?? '미반영 요청이 있습니다.')`.
- Modal:
  - Props: `show`, `employees`, `dates`, `month`
  - Emits: `update:show`, `apply`
  - Uses `n-modal`, `n-upload`, `n-upload-dragger`, `n-alert`, `n-button`.
  - Does not call `window.$message`.
  - Uses `showSuccess`, `showError`, `showInfo` from `src/utils/message.ts`.
  - Shows validation summary:
    - Error: `오류 N건을 수정한 뒤 다시 업로드해 주세요.`
    - Success: `N명 / M건 Off 요청이 현재 입력값을 전부 대체합니다.`
  - `적용` button is disabled unless parse result is `ok === true` and `requestCount > 0`.
  - Empty valid file should be treated as valid preview but not applicable. Show `적용할 Off 요청이 없습니다.`

## Implementation Tasks

### Task 1: Off Request Excel Utility

**Files:**

- Create: `src/utils/offRequestExcel.ts`
- Test: `tests/unit/off-request-excel.spec.ts`

- [ ] **Step 1: Write failing utility tests**

Cover these cases:

```ts
describe('offRequestExcel', () => {
  it('builds a workbook with the required Off request headers and current employees');
  it('parses a valid workbook into ConstraintMap keyed by employee UUID');
  it('normalizes YYYY-MM-DD strings and Excel date serials');
  it('returns errors for missing required headers');
  it('returns errors for unknown employee IDs');
  it('returns errors for employee ID/name mismatch');
  it('returns errors for dates outside current month date columns');
  it('returns errors for invalid Off type values');
  it('returns errors for duplicate employee/date requests');
  it('rejects non Excel files and files over 5MB');
});
```

- [ ] **Step 2: Run utility test and verify failure**

Run:

```bash
pnpm test:unit tests/unit/off-request-excel.spec.ts
```

Expected: fails because `src/utils/offRequestExcel.ts` does not exist yet.

- [ ] **Step 3: Implement workbook builder and download function**

Implementation requirements:

- Export constants and types from the Data Contract.
- Build workbook without browser-only APIs.
- Put browser download only in `downloadOffRequestTemplate`.
- Use `XLSX.writeFile` only in `downloadOffRequestTemplate`.

- [ ] **Step 4: Implement file validation and parser**

Implementation requirements:

- Validate extension from `file.name.toLowerCase()`.
- Validate size from `file.size`.
- Read file with a local `readFileAsArrayBuffer(file)` helper.
- Prefer sheet `Off요청`; if missing, return `missing_sheet`.
- Build a required-header map from the first row.
- Accumulate row errors and keep parsing remaining rows.
- Return `{ ok: errors.length === 0, constraints, errors, requestCount, employeeCount }`.
- When any error exists, return an empty `constraints` map to prevent accidental partial application.

- [ ] **Step 5: Run utility test and verify pass**

Run:

```bash
pnpm test:unit tests/unit/off-request-excel.spec.ts
```

Expected: all tests pass.

- [ ] **Step 6: Commit utility slice**

```bash
git add src/utils/offRequestExcel.ts tests/unit/off-request-excel.spec.ts
git commit -m "feat: add off request excel parser"
```

### Task 2: Upload Modal UI

**Files:**

- Create: `src/components/schedule/Step4OffRequestExcelUploadModal.vue`
- Test: `tests/unit/step4-off-request-excel-upload-modal.spec.ts` if the Step4 integration test becomes too broad. Otherwise keep modal coverage in `tests/unit/step4-initial-data.spec.ts`.

- [ ] **Step 1: Write failing modal behavior tests**

Minimum coverage:

- Template download button calls `downloadOffRequestTemplate(employees, month)`.
- Upload calls `parseOffRequestExcelFile(file, employees, dates)`.
- Validation errors are rendered and `적용` is disabled.
- Successful parse renders summary and emits `apply` with `ConstraintMap`.
- Closing emits `update:show`, false.

- [ ] **Step 2: Run modal test and verify failure**

Run either:

```bash
pnpm test:unit tests/unit/step4-off-request-excel-upload-modal.spec.ts
```

or, if covered in Step4 spec:

```bash
pnpm test:unit tests/unit/step4-initial-data.spec.ts
```

Expected: fails because modal component does not exist or behavior is not wired.

- [ ] **Step 3: Implement modal component**

Component contract:

```ts
import type { Employee } from '@/types/employee';
import type { ConstraintMap, GridColumn } from '@/types/schedule';

interface Props {
  show: boolean;
  employees: Employee[];
  dates: GridColumn[];
  month: string;
}

interface Emits {
  (event: 'update:show', value: boolean): void;
  (event: 'apply', constraints: ConstraintMap): void;
}
```

Naive UI upload requirements:

- Use `accept=".xlsx,.xls"`.
- Use `:max="1"`.
- Use `:custom-request="handleUpload"`.
- Call `onFinish()` on successful parse.
- Call `onError()` on parse failure or invalid result.
- Do not auto-apply after upload.

- [ ] **Step 4: Add user feedback**

- Template download success: `showSuccess('Off 요청 템플릿을 다운로드했습니다.')`
- Template download failure: `showError('템플릿 다운로드 중 오류가 발생했습니다.')`
- Upload parse error: `showError('Excel 파일을 확인해 주세요.')`
- Successful validation: `showSuccess('Excel 검증을 완료했습니다.')`
- Apply: emit only; parent owns final success copy.

- [ ] **Step 5: Run modal test and verify pass**

Run the selected modal test command again.

Expected: all modal behavior tests pass.

- [ ] **Step 6: Commit modal slice**

```bash
git add src/components/schedule/Step4OffRequestExcelUploadModal.vue tests/unit/step4-off-request-excel-upload-modal.spec.ts
git commit -m "feat: add step4 off request excel upload modal"
```

If no separate modal spec is created, omit that test file from `git add`.

### Task 3: Step4 Integration

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue`
- Modify: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: Write failing Step4 tests**

Add or update tests for:

- `data-test="step4-excel-upload-button"` is visible in the calendar header.
- Clicking the button opens `Step4OffRequestExcelUploadModal`.
- If an unapplied draft exists, clicking the button does not open the modal and calls `showInfo`.
- Modal `apply` replaces all existing Off requests and all existing notes.
- Modal `apply` resets:
  - `policyRejectionReasons`
  - `policyCheckStatuses`
  - selected cell/comment modal state
  - draft selected employees/dates/note/editing key
  - `dirtySinceLastApply`
  - `blockedTransitionReason`
- Modal `apply` calls `scheduleStore.setAssignments` and `scheduleStore.setComments`.
- Modal `apply` does not call:
  - `saveScheduleVersionPreferences`
  - `recheckPhase2ScheduleVersion`
  - `ensurePhase2Schedule`
  - `createPhase2ScheduleVersion`

- [ ] **Step 2: Stub modal in Step4 spec**

Use a test stub that exposes a deterministic apply button:

```ts
vi.mock('@/components/schedule/Step4OffRequestExcelUploadModal.vue', () => ({
  default: defineComponent({
    props: ['show', 'employees', 'dates', 'month'],
    emits: ['update:show', 'apply'],
    template: `
      <div v-if="show" data-test="off-request-excel-modal-stub">
        <button
          data-test="off-request-excel-modal-apply"
          @click="$emit('apply', { 'emp-2': { '2025-12-01': 'O' } })"
        >
          apply-upload
        </button>
      </div>
    `,
  }),
}));
```

- [ ] **Step 3: Run Step4 tests and verify failure**

Run:

```bash
pnpm test:unit tests/unit/step4-initial-data.spec.ts
```

Expected: fails because the button/modal integration is not implemented.

- [ ] **Step 4: Add Step4 modal state and handlers**

Add state near other modal state:

```ts
const isOffRequestExcelUploadModalOpen = ref(false);
```

Add handlers near other Step4 request handlers:

```ts
function handleOpenOffRequestExcelUploadModal(): void {
  if (pageLevelBlockedReason.value) {
    showInfo(pageLevelBlockedReason.value);
    return;
  }
  isOffRequestExcelUploadModalOpen.value = true;
}

function handleApplyOffRequestExcelUpload(nextConstraints: ConstraintMap): void {
  pendingLocalDraftSnapshot.value = null;
  policyRejectionReasons.value = {};
  policyCheckStatuses.value = {};
  selectedCell.value = null;
  showCommentModal.value = false;
  blockedTransitionReason.value = null;
  resetDraftState();
  commitPreferenceMaps(nextConstraints, {});
  clearCurrentScopedTempPreferencesStorage();
  isOffRequestExcelUploadModalOpen.value = false;
  showSuccess('Excel Off 요청을 현재 화면에 반영했습니다. 저장하려면 변경사항 저장을 눌러 주세요.');
}
```

If existing helper names differ after implementation context changes, keep the same behavior and use the current local helper names.

- [ ] **Step 5: Add Step4 template integration**

Add the button in the calendar header area:

```vue
<n-button
  data-test="step4-excel-upload-button"
  size="small"
  secondary
  type="success"
  class="font-semibold"
  @click="handleOpenOffRequestExcelUploadModal"
>
  <template #icon>
    <!-- file upload icon -->
  </template>
  Excel 업로드
</n-button>
```

Add modal near the other Step4 modals:

```vue
<Step4OffRequestExcelUploadModal
  :show="isOffRequestExcelUploadModalOpen"
  :employees="grid.employees.value"
  :dates="grid.dates.value"
  :month="scheduleStore.basicInfo?.month ?? ''"
  @update:show="isOffRequestExcelUploadModalOpen = $event"
  @apply="handleApplyOffRequestExcelUpload"
/>
```

- [ ] **Step 6: Run Step4 tests and verify pass**

Run:

```bash
pnpm test:unit tests/unit/step4-initial-data.spec.ts
```

Expected: all Step4 tests pass.

- [ ] **Step 7: Commit Step4 integration slice**

```bash
git add src/views/schedule/Step4InitialData.vue tests/unit/step4-initial-data.spec.ts
git commit -m "feat: connect step4 off request excel upload"
```

### Task 4: Full Verification

**Files:**

- No source edits expected unless verification finds issues.

- [ ] **Step 1: Run focused unit tests**

```bash
pnpm test:unit tests/unit/off-request-excel.spec.ts tests/unit/step4-initial-data.spec.ts
```

Expected: pass.

If a separate modal spec exists, run:

```bash
pnpm test:unit tests/unit/off-request-excel.spec.ts tests/unit/step4-off-request-excel-upload-modal.spec.ts tests/unit/step4-initial-data.spec.ts
```

Expected: pass.

- [ ] **Step 2: Run lint**

```bash
pnpm lint:check
```

Expected: pass with no ESLint errors.

- [ ] **Step 3: Optional manual browser check**

Run:

```bash
pnpm dev
```

Manual checks:

- Open Step4.
- Click `Excel 업로드`.
- Download template.
- Upload a valid file.
- Confirm preview says the upload will replace current input.
- Click `적용`.
- Confirm calendar reflects uploaded Off requests.
- Confirm no DB save/recheck happens until existing save flow is used.

## Edge Cases

- Missing `Off요청` sheet: show a file-level error.
- Workbook with only `안내` sheet: show missing sheet error.
- Header typo such as `직원 Id`: show missing required header.
- Existing employee deleted after template download: show unknown employee error.
- Employee name changed after template download: show name mismatch error.
- Duplicate row for the same employee/date: show duplicate error.
- Valid file with zero Off rows: allow preview but disable apply.
- Existing notes before upload: clear them on apply.
- Existing policy rejection display before upload: clear it on apply.
- Hidden unapplied draft: block modal open using existing `pageLevelBlockedReason`.

## Acceptance Criteria

- User-facing text is Korean.
- Step4 upload does not mutate Step3 employees or last-month assignments.
- Upload parser returns all validation errors in one pass.
- Upload apply replaces current Step4 Off requests and notes in memory/store.
- Upload apply does not call persistence or solver recheck APIs.
- `pnpm test:unit ...` focused tests pass.
- `pnpm lint:check` passes.

## Assumptions

- Excel 적용은 화면 반영이며 즉시 DB 저장이 아니다.
- 업로드 템플릿은 현재 직원 목록을 포함한다.
- 현재 허용 Off 유형은 `O` 하나뿐이고, 확장 시 유틸의 허용 코드 목록과 `ConstraintCode` 타입을 함께 확장한다.
- 업로드가 적용되면 기존 Off 메모도 함께 삭제된다.
- 메모 업로드는 이번 범위에 포함하지 않는다.
