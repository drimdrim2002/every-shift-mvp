import * as XLSX from 'xlsx';
import type { Employee } from '@/types/employee';
import type { ConstraintMap, GridColumn } from '@/types/schedule';

export const OFF_REQUEST_SHEET_NAME = 'Off요청';
export const OFF_REQUEST_TEMPLATE_HEADERS = ['직원ID', '이름', 'Off 요청 일자', 'Off 유형'] as const;
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

type RequiredHeader = (typeof OFF_REQUEST_TEMPLATE_HEADERS)[number];
type HeaderMap = Record<RequiredHeader, number>;

function createError(
  code: OffRequestExcelErrorCode,
  message: string,
  options: { rowNumber?: number | null; field?: string | null } = {}
): OffRequestExcelValidationError {
  return {
    code,
    rowNumber: options.rowNumber ?? null,
    field: options.field ?? null,
    message,
  };
}

function normalizeCell(value: unknown): string {
  return String(value ?? '').trim();
}

function getCellValue(sheet: XLSX.WorkSheet, rowIndex: number, columnIndex: number): unknown {
  const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
  return sheet[address]?.v ?? '';
}

function buildHeaderMap(sheet: XLSX.WorkSheet): {
  headerMap: Partial<HeaderMap>;
  errors: OffRequestExcelValidationError[];
} {
  const headerMap: Partial<HeaderMap> = {};
  const errors: OffRequestExcelValidationError[] = [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });
  const headerRow = rows[0] ?? [];
  const normalizedHeaders = headerRow.map((value) => normalizeCell(value));

  OFF_REQUEST_TEMPLATE_HEADERS.forEach((requiredHeader) => {
    const index = normalizedHeaders.indexOf(requiredHeader);
    if (index === -1) {
      errors.push(createError(
        'missing_required_header',
        `필수 헤더 "${requiredHeader}"가 없습니다.`,
        { field: requiredHeader }
      ));
      return;
    }

    headerMap[requiredHeader] = index;
  });

  return { headerMap, errors };
}

function getSheetRowCount(sheet: XLSX.WorkSheet): number {
  const ref = sheet['!ref'];
  if (!ref) return 0;
  const range = XLSX.utils.decode_range(ref);
  return range.e.r + 1;
}

function normalizeExcelDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed || !parsed.y || !parsed.m || !parsed.d) return null;
    return [
      String(parsed.y).padStart(4, '0'),
      String(parsed.m).padStart(2, '0'),
      String(parsed.d).padStart(2, '0'),
    ].join('-');
  }

  const normalized = normalizeCell(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const date = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== normalized) return null;

  return normalized;
}

function isEmptyRequestRow(sheet: XLSX.WorkSheet, rowIndex: number, headerMap: HeaderMap): boolean {
  return OFF_REQUEST_TEMPLATE_HEADERS.every((header) => {
    return normalizeCell(getCellValue(sheet, rowIndex, headerMap[header])).length === 0;
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result instanceof ArrayBuffer) {
        resolve(event.target.result);
        return;
      }

      reject(new Error('파일 읽기 실패'));
    };
    reader.onerror = () => reject(new Error('파일 읽기 중 오류가 발생했습니다.'));
    reader.readAsArrayBuffer(file);
  });
}

function emptyResult(errors: OffRequestExcelValidationError[]): OffRequestExcelParseResult {
  return {
    ok: false,
    constraints: {},
    errors,
    requestCount: 0,
    employeeCount: 0,
  };
}

export function buildOffRequestTemplateWorkbook(
  employees: Employee[],
  month: string
): XLSX.WorkBook {
  const rows = [
    [...OFF_REQUEST_TEMPLATE_HEADERS],
    ...employees.map((employee) => [
      employee.employeeId,
      employee.name,
      '',
      '',
    ]),
  ];
  const requestSheet = XLSX.utils.aoa_to_sheet(rows);
  requestSheet['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 10 }];

  const guideSheet = XLSX.utils.aoa_to_sheet([
    ['Off 요청 입력 안내'],
    [''],
    [`대상 월: ${month}`],
    ['날짜는 YYYY-MM-DD 형식으로 입력해 주세요.'],
    ['현재 월 날짜만 허용됩니다.'],
    ['Off 유형은 O만 허용됩니다.'],
    ['같은 직원의 여러 Off 요청은 여러 행으로 입력해 주세요.'],
    ['직원ID와 이름은 템플릿 값을 유지해 주세요.'],
  ]);
  guideSheet['!cols'] = [{ wch: 60 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, requestSheet, OFF_REQUEST_SHEET_NAME);
  XLSX.utils.book_append_sheet(workbook, guideSheet, '안내');
  return workbook;
}

export function downloadOffRequestTemplate(
  employees: Employee[],
  month: string
): void {
  const workbook = buildOffRequestTemplateWorkbook(employees, month);
  XLSX.writeFile(workbook, `everyshift_off_requests_${month}.xlsx`);
}

export async function parseOffRequestExcelFile(
  file: File,
  employees: Employee[],
  dates: GridColumn[]
): Promise<OffRequestExcelParseResult> {
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
    return emptyResult([
      createError('invalid_file_type', '엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.'),
    ]);
  }

  if (file.size > OFF_REQUEST_MAX_FILE_SIZE_BYTES) {
    return emptyResult([
      createError('file_too_large', '5MB 이하의 엑셀 파일만 업로드할 수 있습니다.'),
    ]);
  }

  const arrayBuffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
  const sheet = workbook.Sheets[OFF_REQUEST_SHEET_NAME];
  if (!sheet) {
    return emptyResult([
      createError('missing_sheet', `"${OFF_REQUEST_SHEET_NAME}" 시트를 찾을 수 없습니다.`),
    ]);
  }

  if (getSheetRowCount(sheet) === 0) {
    return emptyResult([
      createError('empty_sheet', 'Off 요청 시트가 비어 있습니다.'),
    ]);
  }

  const { headerMap, errors } = buildHeaderMap(sheet);
  if (errors.length > 0) {
    return emptyResult(errors);
  }

  const requiredHeaderMap = headerMap as HeaderMap;
  const employeeByEmployeeId = new Map(employees.map((employee) => [employee.employeeId, employee]));
  const allowedDates = new Set(dates.filter((date) => !date.isLastMonth).map((date) => date.date));
  const constraints: ConstraintMap = {};
  const requestKeys = new Set<string>();
  const requestedEmployeeIds = new Set<string>();
  let requestCount = 0;

  for (let rowIndex = 1; rowIndex < getSheetRowCount(sheet); rowIndex += 1) {
    const rowNumber = rowIndex + 1;
    if (isEmptyRequestRow(sheet, rowIndex, requiredHeaderMap)) continue;

    const employeeId = normalizeCell(getCellValue(sheet, rowIndex, requiredHeaderMap['직원ID']));
    const employeeName = normalizeCell(getCellValue(sheet, rowIndex, requiredHeaderMap['이름']));
    const rawDate = getCellValue(sheet, rowIndex, requiredHeaderMap['Off 요청 일자']);
    const offType = normalizeCell(getCellValue(sheet, rowIndex, requiredHeaderMap['Off 유형'])).toUpperCase();
    let employee: Employee | undefined;
    let normalizedDate: string | null = null;

    if (!employeeId) {
      errors.push(createError(
        'missing_employee_id',
        `${rowNumber}행의 직원ID를 입력해 주세요.`,
        { rowNumber, field: '직원ID' }
      ));
    } else {
      employee = employeeByEmployeeId.get(employeeId);
      if (!employee) {
        errors.push(createError(
          'unknown_employee',
          `${rowNumber}행의 직원ID가 현재 직원 목록에 없습니다.`,
          { rowNumber, field: '직원ID' }
        ));
      } else if (employee.name.trim() !== employeeName) {
        errors.push(createError(
          'employee_name_mismatch',
          `${rowNumber}행의 직원 이름이 현재 직원 목록과 다릅니다.`,
          { rowNumber, field: '이름' }
        ));
      }
    }

    if (normalizeCell(rawDate).length === 0) {
      errors.push(createError(
        'missing_date',
        `${rowNumber}행의 Off 요청 일자를 입력해 주세요.`,
        { rowNumber, field: 'Off 요청 일자' }
      ));
    } else {
      normalizedDate = normalizeExcelDate(rawDate);
      if (!normalizedDate) {
        errors.push(createError(
          'invalid_date',
          `${rowNumber}행의 날짜는 YYYY-MM-DD 형식으로 입력해 주세요.`,
          { rowNumber, field: 'Off 요청 일자' }
        ));
      } else if (!allowedDates.has(normalizedDate)) {
        errors.push(createError(
          'out_of_range_date',
          `${rowNumber}행의 날짜는 현재 월 날짜만 입력할 수 있습니다.`,
          { rowNumber, field: 'Off 요청 일자' }
        ));
      }
    }

    if (!offType) {
      errors.push(createError(
        'missing_off_type',
        `${rowNumber}행의 Off 유형을 입력해 주세요.`,
        { rowNumber, field: 'Off 유형' }
      ));
    } else if (offType !== 'O') {
      errors.push(createError(
        'invalid_off_type',
        `${rowNumber}행의 Off 유형은 O만 입력할 수 있습니다.`,
        { rowNumber, field: 'Off 유형' }
      ));
    }

    if (!employee || !normalizedDate || offType !== 'O' || !allowedDates.has(normalizedDate)) {
      continue;
    }

    const duplicateKey = `${employee.id}:${normalizedDate}`;
    if (requestKeys.has(duplicateKey)) {
      errors.push(createError(
        'duplicate_request',
        `${rowNumber}행은 같은 직원과 날짜의 중복 요청입니다.`,
        { rowNumber, field: 'Off 요청 일자' }
      ));
      continue;
    }

    requestKeys.add(duplicateKey);
    requestedEmployeeIds.add(employee.id);
    if (!constraints[employee.id]) {
      constraints[employee.id] = {};
    }
    constraints[employee.id]![normalizedDate] = 'O';
    requestCount += 1;
  }

  if (errors.length > 0) {
    return {
      ok: false,
      constraints: {},
      errors,
      requestCount,
      employeeCount: requestedEmployeeIds.size,
    };
  }

  return {
    ok: true,
    constraints,
    errors: [],
    requestCount,
    employeeCount: requestedEmployeeIds.size,
  };
}
