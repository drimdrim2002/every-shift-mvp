import type { PlanningPayload } from '@/types/schedule';

/**
 * Planning Payload 검증 함수
 * @param payload - 검증할 Planning Payload
 * @returns 검증 결과 { valid: boolean, errors: string[] }
 */
export function validatePlanningPayload(payload: PlanningPayload): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 조직 정보 검증
  // 1. 조직 정보 검증
  if (!payload.organization) {
    errors.push('조직 정보가 없습니다');
  } else {
    if (!payload.organization.id) errors.push('조직 ID가 없습니다');
    if (!payload.organization.name) errors.push('조직 이름이 없습니다');
    if (!payload.organization.type) errors.push('조직 유형이 없습니다');
    if (!payload.organization.lastHistoricalDate) errors.push('lastHistoricalDate가 없습니다');
    if (!payload.organization.firstDraftDate) errors.push('firstDraftDate가 없습니다');
    if (typeof payload.organization.publishLength !== 'number') errors.push('publishLength가 숫자가 아닙니다');
    if (typeof payload.organization.draftLength !== 'number') errors.push('draftLength가 숫자가 아닙니다');
  }

  // 2. 시프트 정보 검증 (organization 내부로 이동)
  const shifts = payload.organization?.shifts;
  if (!shifts || shifts.length === 0) {
    errors.push('시프트 정보가 없습니다');
  } else {
    const requiredShifts = ['D', 'E', 'N', 'O'];
    const existingCodes = shifts.map(s => s.code);
    const missingShifts = requiredShifts.filter(code => !existingCodes.includes(code));

    if (missingShifts.length > 0) {
      warnings.push(`필수 시프트가 누락되었습니다: ${missingShifts.join(', ')}`);
    }

    shifts.forEach((shift, index) => {
      if (!shift.code) errors.push(`시프트 ${index + 1}의 코드가 없습니다`);
      if (!shift.name) errors.push(`시프트 ${index + 1}의 이름이 없습니다`);
      if (!shift.start_time) errors.push(`시프트 ${index + 1}의 시작 시간이 없습니다`);
      if (!shift.end_time) errors.push(`시프트 ${index + 1}의 종료 시간이 없습니다`);
    });
  }

  // 3. 직원 정보 검증
  if (!payload.employees || payload.employees.length === 0) {
    errors.push('직원 정보가 없습니다');
  } else {
    payload.employees.forEach((emp, index) => {
      if (!emp.employee_id) errors.push(`직원 ${index + 1}의 ID가 없습니다`);
      if (!emp.name) errors.push(`직원 ${index + 1}의 이름이 없습니다`);
      if (!emp.available_shifts || emp.available_shifts.length === 0) {
        warnings.push(`직원 ${emp.name || index + 1}의 가능한 시프트가 없습니다`);
      }
    });
  }

  // 4. 배정 정보 검증
  if (!payload.assignments) {
    warnings.push('배정 정보가 없습니다 (빈 스케줄일 수 있음)');
  } else if (payload.assignments.length === 0) {
    warnings.push('배정 데이터가 비어있습니다');
  } else {
    const employeeIds = new Set(payload.employees.map(e => e.employee_id));

    payload.assignments.forEach((assignment, index) => {
      if (!assignment.employee_id) {
        errors.push(`배정 ${index + 1}의 직원 ID가 없습니다`);
      } else if (!employeeIds.has(assignment.employee_id)) {
        errors.push(`배정 ${index + 1}의 직원 ID가 직원 목록에 없습니다: ${assignment.employee_id}`);
      }

      if (!assignment.shift_id) errors.push(`배정 ${index + 1}의 시프트 ID가 없습니다`);
      if (!assignment.date) errors.push(`배정 ${index + 1}의 날짜가 없습니다`);
      if (typeof assignment.is_locked !== 'boolean') {
        errors.push(`배정 ${index + 1}의 is_locked이 boolean이 아닙니다`);
      }
    });
  }

  // 5. 요구사항 검증
  if (!payload.requirements || Object.keys(payload.requirements).length === 0) {
    errors.push('요구사항 정보가 없습니다');
  } else {
    Object.entries(payload.requirements).forEach(([date, req]) => {
      if (typeof req.D !== 'number') errors.push(`${date}의 D 시프트 요구사항이 숫자가 아닙니다`);
      if (typeof req.E !== 'number') errors.push(`${date}의 E 시프트 요구사항이 숫자가 아닙니다`);
      if (typeof req.N !== 'number') errors.push(`${date}의 N 시프트 요구사항이 숫자가 아닙니다`);
      if (typeof req.O !== 'number') errors.push(`${date}의 O 시프트 요구사항이 숫자가 아닙니다`);
      if (typeof req.total !== 'number') errors.push(`${date}의 total이 숫자가 아닙니다`);

      const calculatedTotal = req.D + req.E + req.N + req.O;
      if (req.total !== calculatedTotal) {
        warnings.push(`${date}의 total(${req.total})이 계산값(${calculatedTotal})과 다릅니다`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Planning Payload 요약 정보 생성
 */
export function summarizePlanningPayload(payload: PlanningPayload): string {
  const lines: string[] = [];

  lines.push('=== Planning Payload 요약 ===');
  lines.push(`조직: ${payload.organization?.name || 'N/A'} (${payload.organization?.type || 'N/A'})`);
  lines.push(`  - 기간: ${payload.organization?.firstDraftDate} (${payload.organization?.draftLength}일)`);
  lines.push(`  - 전월: ${payload.organization?.lastHistoricalDate} (${payload.organization?.publishLength}일)`);
  lines.push(`시프트: ${payload.organization?.shifts?.length || 0}개`);
  lines.push(`직원: ${payload.employees?.length || 0}명`);
  lines.push(`배정: ${payload.assignments?.length || 0}개`);
  lines.push(`요구사항: ${Object.keys(payload.requirements || {}).length}일`);

  if (payload.assignments && payload.assignments.length > 0) {
    const lockedCount = payload.assignments.filter(a => a.is_locked).length;
    lines.push(`  - 잠금 배정: ${lockedCount}개`);
  }

  return lines.join('\n');
}

