import dayjs from 'dayjs';
import type {
  ParsedExcelData,
  ExcelValidationResult,
  ExcelError,
  ExcelWarning,
  SiteRequirementRow,
} from '@/types/excel';
import { DAY_NAMES } from '@/types/excel';

/**
 * 엑셀 데이터를 검증
 * @param data - 파싱된 엑셀 데이터
 * @param shiftCodes - Step1에서 설정한 시프트 코드 배열 (예: ['D', 'E', 'N', 'O'])
 * @param month - 계획월 (YYYY-MM 형식)
 */
export function validateExcelData(
  data: ParsedExcelData,
  shiftCodes: string[],
  month: string
): ExcelValidationResult {
  const errors: ExcelError[] = [];
  const warnings: ExcelWarning[] = [];

  // 1. 직원 정보 검증
  errors.push(...validateEmployeeData(data.employees, shiftCodes));

  // 2. 요일별 필요 인력 검증 (세로형 21행)
  const siteReqResult = validateSiteRequirements(
    data.siteRequirements,
    data.employees.length,
    shiftCodes
  );
  errors.push(...siteReqResult.errors);
  warnings.push(...siteReqResult.warnings);

  // 3. 전월 데이터 검증
  const scheduleResult = validatePreviousMonthData(
    data.previousMonthData,
    month,
    data.employees,
    shiftCodes
  );
  errors.push(...scheduleResult.errors);
  warnings.push(...scheduleResult.warnings);

  // 4. 교차 시트 일관성 검증
  errors.push(...validateCrossSheetConsistency(data, shiftCodes));

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 직원 정보 검증
 */
function validateEmployeeData(
  employees: ParsedExcelData['employees'],
  shiftCodes: string[]
): ExcelError[] {
  const errors: ExcelError[] = [];

  // 직원 수: 1-100명
  if (employees.length === 0) {
    errors.push({
      type: 'REQUIRED_FIELD',
      sheet: '직원정보',
      message: '최소 1명의 직원이 필요합니다.',
    });
    return errors;
  }

  if (employees.length > 100) {
    errors.push({
      type: 'BUSINESS_RULE',
      sheet: '직원정보',
      message: `직원 수는 100명 이하여야 합니다. 현재: ${employees.length}명`,
    });
  }

  const employeeIds = new Set<string>();
  const shiftCodeSet = new Set(shiftCodes.map((c) => c.toUpperCase()));

  employees.forEach((employee, index) => {
    const row = index + 2; // 헤더 제외

    // employeeId: 필수, 고유값
    if (!employee.employeeId || employee.employeeId.trim().length === 0) {
      errors.push({
        type: 'REQUIRED_FIELD',
        sheet: '직원정보',
        row,
        column: 'A',
        message: `${row}행: 직원ID는 필수입니다.`,
      });
    } else if (employeeIds.has(employee.employeeId)) {
      errors.push({
        type: 'BUSINESS_RULE',
        sheet: '직원정보',
        row,
        column: 'A',
        message: `${row}행: 중복된 직원ID입니다. (${employee.employeeId})`,
      });
    } else {
      employeeIds.add(employee.employeeId);
    }

    // name: 필수, 1-50자
    if (!employee.name || employee.name.trim().length === 0) {
      errors.push({
        type: 'REQUIRED_FIELD',
        sheet: '직원정보',
        row,
        column: 'B',
        message: `${row}행: 이름은 필수입니다.`,
      });
    } else if (employee.name.length > 50) {
      errors.push({
        type: 'BUSINESS_RULE',
        sheet: '직원정보',
        row,
        column: 'B',
        message: `${row}행: 이름은 50자 이하여야 합니다. 현재: ${employee.name.length}자`,
      });
    }

    // availableShifts: 배열, 최소 1개 시프트
    if (
      !Array.isArray(employee.availableShifts) ||
      employee.availableShifts.length === 0
    ) {
      errors.push({
        type: 'REQUIRED_FIELD',
        sheet: '직원정보',
        row,
        column: 'C',
        message: `${row}행: 가능한 시프트는 최소 1개 이상 입력해야 합니다. (예: ${shiftCodes.join(',')})`,
      });
    } else {
      // 시프트 코드 유효성 검증
      employee.availableShifts.forEach((shiftCode) => {
        if (!shiftCodeSet.has(shiftCode.toUpperCase())) {
          errors.push({
            type: 'BUSINESS_RULE',
            sheet: '직원정보',
            row,
            column: 'C',
            message: `${row}행: 잘못된 시프트 코드입니다 (${shiftCode}). 허용된 코드: ${shiftCodes.join(', ')}`,
          });
        }
      });
    }
  });

  return errors;
}

/**
 * 요일별 필요 인력 검증 - 세로형 구조 (21행: 7일 x 3시프트)
 */
function validateSiteRequirements(
  requirements: SiteRequirementRow[],
  totalEmployees: number,
  shiftCodes: string[]
): { errors: ExcelError[]; warnings: ExcelWarning[] } {
  const errors: ExcelError[] = [];
  const warnings: ExcelWarning[] = [];

  const shiftCodeSet = new Set(shiftCodes.map((c) => c.toUpperCase()));
  const expectedRowCount = 7 * shiftCodes.length; // 7일 x 시프트 수

  // 최소 행 수 확인 (7개 요일 x 시프트 수)
  if (requirements.length < expectedRowCount) {
    warnings.push({
      type: 'DATA_MISMATCH',
      message: `요일별인력 시트: 데이터 행 수가 예상보다 적습니다. 예상: ${expectedRowCount}행 (7일 x ${shiftCodes.length}시프트), 현재: ${requirements.length}행`,
    });
  }

  // 요일별, 시프트별 데이터 카운트
  const dayShiftMap = new Map<string, number>(); // "요일-시프트" -> requiredCount

  requirements.forEach((req, index) => {
    const row = index + 2;

    // dayOfWeek: 0-6
    if (req.dayOfWeek < 0 || req.dayOfWeek > 6) {
      errors.push({
        type: 'INVALID_FORMAT',
        sheet: '요일별인력',
        row,
        column: 'A',
        message: `${row}행: 요일은 0-6 사이여야 합니다. (0=일요일, 6=토요일)`,
      });
    }

    // dayName 검증
    if (!DAY_NAMES.includes(req.dayName as (typeof DAY_NAMES)[number])) {
      errors.push({
        type: 'INVALID_FORMAT',
        sheet: '요일별인력',
        row,
        column: 'A',
        message: `${row}행: 잘못된 요일명입니다 (${req.dayName}). 일요일~토요일 중 하나를 입력하세요.`,
      });
    }

    // shiftCode 검증
    if (!req.shiftCode) {
      errors.push({
        type: 'REQUIRED_FIELD',
        sheet: '요일별인력',
        row,
        column: 'B',
        message: `${row}행: 시프트유형은 필수입니다.`,
      });
    } else if (!shiftCodeSet.has(req.shiftCode.toUpperCase())) {
      errors.push({
        type: 'BUSINESS_RULE',
        sheet: '요일별인력',
        row,
        column: 'B',
        message: `${row}행: 잘못된 시프트 코드입니다 (${req.shiftCode}). 허용된 코드: ${shiftCodes.join(', ')}`,
      });
    }

    // requiredCount: 양수
    if (req.requiredCount < 0) {
      errors.push({
        type: 'BUSINESS_RULE',
        sheet: '요일별인력',
        row,
        column: 'C',
        message: `${row}행: 필요인력수는 0 이상이어야 합니다.`,
      });
    }

    // 중복 체크 (동일 요일-시프트 조합)
    const key = `${req.dayOfWeek}-${req.shiftCode.toUpperCase()}`;
    if (dayShiftMap.has(key)) {
      errors.push({
        type: 'BUSINESS_RULE',
        sheet: '요일별인력',
        row,
        message: `${row}행: 중복된 요일-시프트 조합입니다. (${req.dayName} - ${req.shiftCode})`,
      });
    } else {
      dayShiftMap.set(key, req.requiredCount);
    }
  });

  // 각 요일별 총합이 직원 수를 초과하는지 확인
  for (let day = 0; day < 7; day++) {
    let dayTotal = 0;
    shiftCodes.forEach((code) => {
      const key = `${day}-${code.toUpperCase()}`;
      dayTotal += dayShiftMap.get(key) || 0;
    });

    if (dayTotal > totalEmployees) {
      const dayName = DAY_NAMES[day];
      warnings.push({
        type: 'OUT_OF_RANGE',
        message: `${dayName}: 필요 인원 총합(${dayTotal}명)이 직원 수(${totalEmployees}명)보다 많습니다. 스케줄 생성이 어려울 수 있습니다.`,
      });
    }
  }

  return { errors, warnings };
}

/**
 * 전월 데이터 검증
 */
function validatePreviousMonthData(
  previousMonthData: ParsedExcelData['previousMonthData'],
  month: string,
  employees: ParsedExcelData['employees'],
  shiftCodes: string[]
): { errors: ExcelError[]; warnings: ExcelWarning[] } {
  const errors: ExcelError[] = [];
  const warnings: ExcelWarning[] = [];

  // 전월 마지막 5일 날짜 계산
  const targetDate = dayjs(month + '-01');
  const prevMonthEnd = targetDate.subtract(1, 'day');
  const expectedPrevDates: string[] = [];

  for (let i = 4; i >= 0; i--) {
    const date = prevMonthEnd.subtract(i, 'day').format('YYYY-MM-DD');
    expectedPrevDates.push(date);
  }

  const shiftCodeSet = new Set(shiftCodes.map((c) => c.toUpperCase()));

  // 전월 5일 데이터 필수 검증
  employees.forEach((employee) => {
    const empData = previousMonthData[employee.employeeId];

    if (!empData) {
      errors.push({
        type: 'REQUIRED_FIELD',
        sheet: '전월데이터',
        message: `직원 ${employee.name}(${employee.employeeId})의 전월 데이터가 없습니다.`,
      });
      return;
    }

    expectedPrevDates.forEach((date) => {
      const shift = empData[date];

      if (!shift) {
        errors.push({
          type: 'REQUIRED_FIELD',
          sheet: '전월데이터',
          message: `직원 ${employee.name}의 ${date} 시프트가 입력되지 않았습니다.`,
        });
      } else {
        // 시프트 코드가 설정된 시프트에 존재하는지 확인
        if (!shiftCodeSet.has(shift.toUpperCase())) {
          errors.push({
            type: 'BUSINESS_RULE',
            sheet: '전월데이터',
            message: `직원 ${employee.name}의 ${date} 시프트 코드(${shift})가 설정된 시프트(${shiftCodes.join(', ')})에 존재하지 않습니다.`,
          });
        }

        // 직원별 availableShifts 준수 확인
        const empAvailableUpper = employee.availableShifts.map((s) =>
          s.toUpperCase()
        );
        if (!empAvailableUpper.includes(shift.toUpperCase())) {
          warnings.push({
            type: 'INCONSISTENT',
            message: `직원 ${employee.name}의 ${date} 시프트(${shift})가 가능한 시프트(${employee.availableShifts.join(',')})에 포함되지 않습니다.`,
          });
        }
      }
    });
  });

  return { errors, warnings };
}

/**
 * 교차 시트 일관성 검증
 */
function validateCrossSheetConsistency(
  data: ParsedExcelData,
  shiftCodes: string[]
): ExcelError[] {
  const errors: ExcelError[] = [];

  const employeeIds = new Set(data.employees.map((e) => e.employeeId));
  const shiftCodeSet = new Set(shiftCodes.map((c) => c.toUpperCase()));

  // 1. 전월 데이터의 employeeId 검증
  Object.keys(data.previousMonthData).forEach((employeeId) => {
    if (!employeeIds.has(employeeId)) {
      errors.push({
        type: 'BUSINESS_RULE',
        sheet: '전월데이터',
        message: `직원정보에 없는 직원ID가 사용되었습니다: ${employeeId}`,
      });
    }
  });

  // 2. 전월 데이터의 시프트 코드 검증
  Object.values(data.previousMonthData).forEach((dateMap) => {
    Object.values(dateMap).forEach((shift) => {
      if (shift && !shiftCodeSet.has(shift.toUpperCase())) {
        errors.push({
          type: 'BUSINESS_RULE',
          sheet: '전월데이터',
          message: `설정된 시프트에 없는 코드가 사용되었습니다: ${shift}. 허용된 코드: ${shiftCodes.join(', ')}`,
        });
      }
    });
  });

  // 3. 요일별 인력의 시프트 코드 검증
  data.siteRequirements.forEach((req, index) => {
    const row = index + 2;
    if (req.shiftCode && !shiftCodeSet.has(req.shiftCode.toUpperCase())) {
      errors.push({
        type: 'BUSINESS_RULE',
        sheet: '요일별인력',
        row,
        message: `설정된 시프트에 없는 코드가 사용되었습니다: ${req.shiftCode}. 허용된 코드: ${shiftCodes.join(', ')}`,
      });
    }
  });

  return errors;
}
