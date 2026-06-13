import type { EmployeeInput } from '@/types/employee';

export interface PreceptorSelectOption {
  label: string;
  value: string | null;
  disabled?: boolean;
}

export interface PreceptorValidationContext {
  employees: EmployeeInput[];
  targetIndex: number;
  preceptorEmployeeId: string | null;
}

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
    return { row, code: 'PRECEPTOR_SELF', message: `${row}행: 본인을 프리셉터로 지정할 수 없습니다.` };
  }
  if (message === '프리셉터와 가능 시프트가 겹치지 않습니다.') {
    return { row, code: 'PRECEPTOR_SHIFT_OVERLAP', message: `${row}행: 프리셉터와 가능 시프트가 겹치지 않습니다.` };
  }
  if (message === '선택한 프리셉터는 이미 다른 직원의 프리셉터입니다.') {
    return {
      row,
      code: 'PRECEPTOR_ALREADY_ASSIGNED',
      message: `${row}행: 프리셉터 '${preceptorEmployeeId}'는 이미 다른 직원에게 지정되어 있습니다.`,
    };
  }
  if (message === '프리셉터 관계는 연속(체인)으로 지정할 수 없습니다.') {
    return { row, code: 'PRECEPTOR_CHAIN', message: `${row}행: 프리셉터 관계는 연속(체인)으로 지정할 수 없습니다.` };
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

export function hasOverlappingWorkShifts(a: string[], b: string[]): boolean {
  const work = (shifts: string[]) => new Set(shifts.filter((code) => code !== 'O'));
  const setA = work(a);
  return b.some((code) => code !== 'O' && setA.has(code));
}

function findEmployeeByEmployeeId(
  employees: EmployeeInput[],
  employeeId: string
): EmployeeInput | undefined {
  return employees.find((employee) => employee.employeeId === employeeId);
}

function isPreceptorChainViolation(
  employees: EmployeeInput[],
  self: EmployeeInput,
  preceptor: EmployeeInput
): boolean {
  if (preceptor.preceptorEmployeeId === self.employeeId) {
    return true;
  }

  if (preceptor.preceptorEmployeeId) {
    return true;
  }

  return employees.some(
    (employee) =>
      employee.preceptorEmployeeId === self.employeeId
      && employee.employeeId === preceptor.employeeId
  );
}

export function validatePreceptorAssignment(ctx: PreceptorValidationContext): string | null {
  const { employees, targetIndex, preceptorEmployeeId } = ctx;

  if (!preceptorEmployeeId) {
    return null;
  }

  const self = employees[targetIndex];
  if (!self) {
    return null;
  }

  if (preceptorEmployeeId === self.employeeId) {
    return '본인을 프리셉터로 지정할 수 없습니다.';
  }

  const preceptor = findEmployeeByEmployeeId(employees, preceptorEmployeeId);
  if (!preceptor) {
    return null;
  }

  if (!hasOverlappingWorkShifts(self.availableShifts, preceptor.availableShifts)) {
    return '프리셉터와 가능 시프트가 겹치지 않습니다.';
  }

  const duplicateAssignee = employees.find(
    (employee, index) =>
      index !== targetIndex && employee.preceptorEmployeeId === preceptorEmployeeId
  );
  if (duplicateAssignee) {
    return '선택한 프리셉터는 이미 다른 직원의 프리셉터입니다.';
  }

  if (isPreceptorChainViolation(employees, self, preceptor)) {
    return '프리셉터 관계는 연속(체인)으로 지정할 수 없습니다.';
  }

  return null;
}

export function buildPreceptorCandidateOptions(
  employees: EmployeeInput[],
  targetIndex: number
): PreceptorSelectOption[] {
  const self = employees[targetIndex];
  if (!self) {
    return [{ label: '(없음)', value: null }];
  }

  const activeOptions: PreceptorSelectOption[] = [];
  const disabledOptions: PreceptorSelectOption[] = [];

  for (const [index, candidate] of employees.entries()) {
    if (index === targetIndex) {
      continue;
    }

    const option: PreceptorSelectOption = {
      label: `${candidate.name} (${candidate.employeeId})`,
      value: candidate.employeeId,
    };

    if (candidate.employeeId === self.employeeId) {
      disabledOptions.push({ ...option, disabled: true });
      continue;
    }

    if (!hasOverlappingWorkShifts(self.availableShifts, candidate.availableShifts)) {
      disabledOptions.push({ ...option, disabled: true, label: `${option.label} — 시프트 불일치` });
      continue;
    }

    const duplicateAssignee = employees.find(
      (employee, employeeIndex) =>
        employeeIndex !== targetIndex && employee.preceptorEmployeeId === candidate.employeeId
    );
    if (duplicateAssignee) {
      disabledOptions.push({ ...option, disabled: true, label: `${option.label} — 이미 지정됨` });
      continue;
    }

    if (isPreceptorChainViolation(employees, self, candidate)) {
      disabledOptions.push({ ...option, disabled: true, label: `${option.label} — 체인 불가` });
      continue;
    }

    activeOptions.push(option);
  }

  activeOptions.sort((left, right) =>
    String(left.label).localeCompare(String(right.label), 'ko')
  );
  disabledOptions.sort((left, right) =>
    String(left.label).localeCompare(String(right.label), 'ko')
  );

  const options: PreceptorSelectOption[] = [{ label: '(없음)', value: null }, ...activeOptions];

  if (disabledOptions.length > 0) {
    options.push(
      { label: '──────────', value: '__separator__', disabled: true },
      ...disabledOptions
    );
  }

  return options;
}
