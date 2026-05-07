import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import type { Employee } from '@/types/employee';
import type { GridColumn } from '@/types/schedule';
import {
  buildOffRequestTemplateWorkbook,
  OFF_REQUEST_MAX_FILE_SIZE_BYTES,
  OFF_REQUEST_SHEET_NAME,
  OFF_REQUEST_TEMPLATE_HEADERS,
  parseOffRequestExcelFile,
} from '@/utils/offRequestExcel';

const employees: Employee[] = [
  {
    id: 'emp-1',
    organizationId: 'org-1',
    employeeId: 'E001',
    name: 'Kim',
    availableShifts: ['D', 'E', 'N', 'O'],
  },
  {
    id: 'emp-2',
    organizationId: 'org-1',
    employeeId: 'E002',
    name: 'Lee',
    availableShifts: ['D', 'E', 'N', 'O'],
  },
];

const dates: GridColumn[] = [
  { date: '2025-11-27', day: 27, dayOfWeek: 4, dayName: '목', isLastMonth: true },
  { date: '2025-12-01', day: 1, dayOfWeek: 1, dayName: '월', isLastMonth: false },
  { date: '2025-12-02', day: 2, dayOfWeek: 2, dayName: '화', isLastMonth: false },
];

function createWorkbookFile(rows: unknown[][], filename = 'off.xlsx'): File {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, OFF_REQUEST_SHEET_NAME);
  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new File([data], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('offRequestExcel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a workbook with the required Off request headers and current employees', () => {
    const workbook = buildOffRequestTemplateWorkbook(employees, '2025-12');
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[OFF_REQUEST_SHEET_NAME]!, {
      header: 1,
      defval: '',
    });

    expect(workbook.SheetNames).toEqual([OFF_REQUEST_SHEET_NAME, '안내']);
    expect(rows).toEqual([
      [...OFF_REQUEST_TEMPLATE_HEADERS],
      ['E001', 'Kim', '', ''],
      ['E002', 'Lee', '', ''],
    ]);
  });

  it('builds a workbook with existing Off requests while keeping the upload template format', () => {
    const workbook = buildOffRequestTemplateWorkbook(employees, '2025-12', {
      dates,
      constraints: {
        'emp-1': {
          '2025-12-02': 'O',
          '2025-12-01': 'O',
          '2025-11-27': 'O',
        },
        'emp-2': {},
      },
    });
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[OFF_REQUEST_SHEET_NAME]!, {
      header: 1,
      defval: '',
    });

    expect(rows).toEqual([
      [...OFF_REQUEST_TEMPLATE_HEADERS],
      ['E001', 'Kim', '2025-12-01', 'O'],
      ['E001', 'Kim', '2025-12-02', 'O'],
      ['E002', 'Lee', '', ''],
    ]);
  });

  it('parses a valid workbook into ConstraintMap keyed by employee UUID', async () => {
    const result = await parseOffRequestExcelFile(
      createWorkbookFile([
        [...OFF_REQUEST_TEMPLATE_HEADERS],
        ['E001', 'Kim', '2025-12-01', 'O'],
        ['E002', 'Lee', '2025-12-02', 'o'],
      ]),
      employees,
      dates
    );

    expect(result).toEqual({
      ok: true,
      constraints: {
        'emp-1': { '2025-12-01': 'O' },
        'emp-2': { '2025-12-02': 'O' },
      },
      errors: [],
      requestCount: 2,
      employeeCount: 2,
    });
  });

  it('normalizes YYYY-MM-DD strings and Excel date serials', async () => {
    const result = await parseOffRequestExcelFile(
      createWorkbookFile([
        [...OFF_REQUEST_TEMPLATE_HEADERS],
        ['E001', 'Kim', '2025-12-01', 'O'],
        ['E002', 'Lee', 45993, 'O'],
      ]),
      employees,
      dates
    );

    expect(result.ok).toBe(true);
    expect(result.constraints).toEqual({
      'emp-1': { '2025-12-01': 'O' },
      'emp-2': { '2025-12-02': 'O' },
    });
  });

  it('returns errors for missing required headers', async () => {
    const result = await parseOffRequestExcelFile(
      createWorkbookFile([['직원ID', '이름', 'Off 요청 일자']]),
      employees,
      dates
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      code: 'missing_required_header',
      field: 'Off 유형',
    }));
  });

  it('returns errors for unknown employee IDs', async () => {
    const result = await parseOffRequestExcelFile(
      createWorkbookFile([
        [...OFF_REQUEST_TEMPLATE_HEADERS],
        ['E999', 'Park', '2025-12-01', 'O'],
      ]),
      employees,
      dates
    );

    expect(result.ok).toBe(false);
    expect(result.constraints).toEqual({});
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'unknown_employee' }));
  });

  it('returns errors for employee ID/name mismatch', async () => {
    const result = await parseOffRequestExcelFile(
      createWorkbookFile([
        [...OFF_REQUEST_TEMPLATE_HEADERS],
        ['E001', 'Lee', '2025-12-01', 'O'],
      ]),
      employees,
      dates
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'employee_name_mismatch' }));
  });

  it('returns errors for dates outside current month date columns', async () => {
    const result = await parseOffRequestExcelFile(
      createWorkbookFile([
        [...OFF_REQUEST_TEMPLATE_HEADERS],
        ['E001', 'Kim', '2025-11-27', 'O'],
        ['E002', 'Lee', '2026-01-01', 'O'],
      ]),
      employees,
      dates
    );

    expect(result.ok).toBe(false);
    expect(result.errors.filter((error) => error.code === 'out_of_range_date')).toHaveLength(2);
  });

  it('returns errors for invalid Off type values', async () => {
    const result = await parseOffRequestExcelFile(
      createWorkbookFile([
        [...OFF_REQUEST_TEMPLATE_HEADERS],
        ['E001', 'Kim', '2025-12-01', 'D'],
      ]),
      employees,
      dates
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'invalid_off_type' }));
  });

  it('returns errors for duplicate employee/date requests', async () => {
    const result = await parseOffRequestExcelFile(
      createWorkbookFile([
        [...OFF_REQUEST_TEMPLATE_HEADERS],
        ['E001', 'Kim', '2025-12-01', 'O'],
        ['E001', 'Kim', '2025-12-01', 'O'],
      ]),
      employees,
      dates
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'duplicate_request' }));
  });

  it('rejects non Excel files and files over 5MB', async () => {
    const invalidType = await parseOffRequestExcelFile(
      new File(['x'], 'off.csv', { type: 'text/csv' }),
      employees,
      dates
    );
    const oversizedFile = new File(['x'], 'off.xlsx');
    Object.defineProperty(oversizedFile, 'size', { value: OFF_REQUEST_MAX_FILE_SIZE_BYTES + 1 });

    const oversized = await parseOffRequestExcelFile(oversizedFile, employees, dates);

    expect(invalidType.errors).toContainEqual(expect.objectContaining({ code: 'invalid_file_type' }));
    expect(oversized.errors).toContainEqual(expect.objectContaining({ code: 'file_too_large' }));
  });
});
