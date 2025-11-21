import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as XLSX from 'xlsx';
import { exportToExcel } from '@/utils/excel';
import type { Employee } from '@/types/employee';
import type { GridColumn, AssignmentMap } from '@/types/schedule';

// Mock XLSX
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(),
    book_new: vi.fn(),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe('exportToExcel', () => {
  let mockEmployees: Employee[];
  let mockDates: GridColumn[];
  let mockAssignments: AssignmentMap;

  beforeEach(() => {
    // 테스트 데이터 설정
    mockEmployees = [
      {
        id: 'emp1',
        employeeId: 'E001',
        name: '김철수',
        organizationId: 'org1',
        availableShifts: ['D', 'E', 'N', 'O'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'emp2',
        employeeId: 'E002',
        name: '이영희',
        organizationId: 'org1',
        availableShifts: ['D', 'E', 'N', 'O'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    mockDates = [
      { date: '2025-01-01', day: 1, dayOfWeek: 3 },
      { date: '2025-01-02', day: 2, dayOfWeek: 4 },
      { date: '2025-01-03', day: 3, dayOfWeek: 5 },
    ];

    mockAssignments = {
      emp1: {
        '2025-01-01': 'D',
        '2025-01-02': 'E',
        '2025-01-03': 'N',
      },
      emp2: {
        '2025-01-01': 'E',
        '2025-01-02': 'N',
        '2025-01-03': 'O',
      },
    };

    // Mock 초기화
    vi.clearAllMocks();
    vi.mocked(XLSX.utils.book_new).mockReturnValue({} as XLSX.WorkBook);
    vi.mocked(XLSX.utils.json_to_sheet).mockReturnValue({} as XLSX.WorkSheet);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should generate Excel file with correct filename', () => {
    const filename = 'schedule_2025-01.xlsx';
    exportToExcel(mockEmployees, mockDates, mockAssignments, filename);

    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), filename);
  });

  it('should use default filename when not provided', () => {
    exportToExcel(mockEmployees, mockDates, mockAssignments);

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      'schedule.xlsx'
    );
  });

  it('should convert employee data to correct format', () => {
    exportToExcel(mockEmployees, mockDates, mockAssignments);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        직번: 'E001',
        이름: '김철수',
        '1일': 'D',
        '2일': 'E',
        '3일': 'N',
      },
      {
        직번: 'E002',
        이름: '이영희',
        '1일': 'E',
        '2일': 'N',
        '3일': 'O',
      },
    ]);
  });

  it('should handle empty shifts correctly', () => {
    const sparseAssignments: AssignmentMap = {
      emp1: {
        '2025-01-01': 'D',
        // 2025-01-02 없음
        '2025-01-03': 'N',
      },
      emp2: {
        // 모든 날짜 없음
      },
    };

    exportToExcel(mockEmployees, mockDates, sparseAssignments);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        직번: 'E001',
        이름: '김철수',
        '1일': 'D',
        '2일': '',
        '3일': 'N',
      },
      {
        직번: 'E002',
        이름: '이영희',
        '1일': '',
        '2일': '',
        '3일': '',
      },
    ]);
  });

  it('should handle empty employees list', () => {
    exportToExcel([], mockDates, mockAssignments);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([]);
  });

  it('should handle empty dates list', () => {
    exportToExcel(mockEmployees, [], mockAssignments);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        직번: 'E001',
        이름: '김철수',
      },
      {
        직번: 'E002',
        이름: '이영희',
      },
    ]);
  });

  it('should create workbook and append sheet', () => {
    const mockWorkbook = {} as XLSX.WorkBook;
    const mockWorksheet = {} as XLSX.WorkSheet;
    vi.mocked(XLSX.utils.book_new).mockReturnValue(mockWorkbook);
    vi.mocked(XLSX.utils.json_to_sheet).mockReturnValue(mockWorksheet);

    exportToExcel(mockEmployees, mockDates, mockAssignments);

    expect(XLSX.utils.book_new).toHaveBeenCalled();
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      mockWorkbook,
      mockWorksheet,
      '근무표'
    );
  });

  it('should handle all shift types correctly', () => {
    const allShiftsAssignments: AssignmentMap = {
      emp1: {
        '2025-01-01': 'D',
        '2025-01-02': 'E',
        '2025-01-03': 'N',
      },
      emp2: {
        '2025-01-01': 'O',
        '2025-01-02': 'H',
        '2025-01-03': '',
      },
    };

    const extendedDates: GridColumn[] = [
      { date: '2025-01-01', day: 1, dayOfWeek: 3 },
      { date: '2025-01-02', day: 2, dayOfWeek: 4 },
      { date: '2025-01-03', day: 3, dayOfWeek: 5 },
    ];

    exportToExcel(mockEmployees, extendedDates, allShiftsAssignments);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        직번: 'E001',
        이름: '김철수',
        '1일': 'D',
        '2일': 'E',
        '3일': 'N',
      },
      {
        직번: 'E002',
        이름: '이영희',
        '1일': 'O',
        '2일': 'H',
        '3일': '',
      },
    ]);
  });

  it('should handle large dataset (30 employees × 36 days)', () => {
    const largeEmployees: Employee[] = Array.from(
      { length: 30 },
      (_, i) => ({
        id: `emp${i + 1}`,
        employeeId: `E${String(i + 1).padStart(3, '0')}`,
        name: `직원${i + 1}`,
        organizationId: 'org1',
        availableShifts: ['D', 'E', 'N', 'O'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );

    const largeDates: GridColumn[] = Array.from({ length: 36 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, '0')}`,
      day: i + 1,
      dayOfWeek: (i % 7) + 1,
    }));

    const largeAssignments: AssignmentMap = {};
    largeEmployees.forEach((emp) => {
      largeAssignments[emp.id] = {};
      largeDates.forEach((date) => {
        largeAssignments[emp.id][date.date] = ['D', 'E', 'N', 'O'][
          Math.floor(Math.random() * 4)
        ];
      });
    });

    exportToExcel(largeEmployees, largeDates, largeAssignments);

    const callArgs = vi.mocked(XLSX.utils.json_to_sheet).mock
      .calls[0][0] as Record<string, string>[];
    expect(callArgs).toHaveLength(30);
    expect(Object.keys(callArgs[0])).toHaveLength(38); // 직번 + 이름 + 36일
  });
});
