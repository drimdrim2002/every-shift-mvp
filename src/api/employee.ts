import { supabase } from './supabase';
import type { EmployeeData, SiteRequirementRow } from '@/types/excel';

/**
 * 조직의 모든 직원 삭제
 * CASCADE로 schedule_assignments도 자동 삭제됨
 *
 * @param orgId - 조직 ID
 * @throws Supabase 에러 발생 시
 */
export async function deleteOrganizationEmployees(orgId: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('organization_id', orgId);

  if (error) {
    console.error('[deleteOrganizationEmployees] Supabase error:', error);
    throw new Error(`직원 삭제 실패: ${error.message}`);
  }
}

/**
 * 직원 일괄 생성
 *
 * @param orgId - 조직 ID
 * @param employees - 직원 정보 배열
 * @throws Supabase 에러 발생 시 (중복 employee_id 등)
 */
export async function createEmployeesBatch(orgId: string, employees: EmployeeData[]): Promise<void> {
  // EmployeeData를 Supabase 테이블 형식으로 변환
  const rows = employees.map((emp) => ({
    organization_id: orgId,
    employee_id: emp.employeeId,
    name: emp.name,
    available_shifts: emp.availableShifts, // JSONB 배열로 자동 저장됨
  }));

  const { error } = await supabase.from('employees').insert(rows);

  if (error) {
    console.error('[createEmployeesBatch] Supabase error:', error);
    // 중복 employee_id 에러 처리
    if (error.code === '23505') {
      throw new Error(`중복된 직원 ID가 있습니다: ${error.message}`);
    }
    throw new Error(`직원 생성 실패: ${error.message}`);
  }
}

/**
 * 조직의 사이트 요구사항 교체 (기존 삭제 후 새로 생성)
 * 세로형 데이터 구조 지원 (SiteRequirementRow[])
 *
 * @param orgId - 조직 ID
 * @param requirements - 세로형 요일별 필요 인력 배열 (21행: 7일 x 시프트 수)
 * @throws Supabase 에러 발생 시
 */
export async function replaceSiteRequirements(
  orgId: string,
  requirements: SiteRequirementRow[]
): Promise<void> {
  // 1. 기존 사이트 요구사항 삭제
  const { error: deleteError } = await supabase
    .from('site_requirements')
    .delete()
    .eq('organization_id', orgId);

  if (deleteError) {
    console.error('[replaceSiteRequirements] Delete error:', deleteError);
    throw new Error(`기존 요구사항 삭제 실패: ${deleteError.message}`);
  }

  // 2. 시프트 정보 조회 (코드 → ID 매핑)
  const { data: shiftsData, error: shiftsError } = await supabase
    .from('shifts')
    .select('id, code')
    .eq('organization_id', orgId);

  if (shiftsError || !shiftsData) {
    console.error('[replaceSiteRequirements] Shifts query error:', shiftsError);
    throw new Error(`시프트 정보 조회 실패: ${shiftsError?.message}`);
  }

  // 코드 → ID 매핑 (대문자로 정규화)
  const shiftMap = new Map<string, string>();
  shiftsData.forEach((shift) => {
    shiftMap.set(shift.code.toUpperCase(), shift.id);
  });

  // 3. SiteRequirementRow 배열을 정규화된 레코드로 변환
  const rows: Array<{
    organization_id: string;
    shift_id: string;
    day_of_week: number;
    required_count: number;
  }> = [];

  const missingShiftCodes: string[] = [];

  requirements.forEach((req) => {
    const shiftCode = req.shiftCode.toUpperCase();
    const shiftId = shiftMap.get(shiftCode);

    if (!shiftId) {
      // 누락된 시프트 코드 수집 (중복 제거)
      if (!missingShiftCodes.includes(shiftCode)) {
        missingShiftCodes.push(shiftCode);
      }
      return;
    }

    rows.push({
      organization_id: orgId,
      shift_id: shiftId,
      day_of_week: req.dayOfWeek,
      required_count: req.requiredCount,
    });
  });

  // 누락된 시프트 코드가 있으면 에러
  if (missingShiftCodes.length > 0) {
    throw new Error(
      `시프트 코드 '${missingShiftCodes.join(', ')}'를 찾을 수 없습니다. 조직에 해당 시프트가 등록되어 있는지 확인해주세요.`
    );
  }

  // 4. 일괄 삽입
  if (rows.length > 0) {
    const { error: insertError } = await supabase.from('site_requirements').insert(rows);

    if (insertError) {
      console.error('[replaceSiteRequirements] Insert error:', insertError);
      throw new Error(`요구사항 생성 실패: ${insertError.message}`);
    }
  }
}

/**
 * 조직의 사이트 요구사항 조회
 *
 * @param orgId - 조직 ID
 * @returns 세로형 요구사항 배열
 */
export async function loadSiteRequirements(orgId: string): Promise<SiteRequirementRow[]> {
  const DAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

  // site_requirements와 shifts 조인
  const { data, error } = await supabase
    .from('site_requirements')
    .select(
      `
      day_of_week,
      required_count,
      shifts!inner (
        code
      )
    `
    )
    .eq('organization_id', orgId);

  if (error) {
    console.error('[loadSiteRequirements] Supabase error:', error);
    throw new Error(`요구사항 조회 실패: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // 세로형 데이터로 변환
  return data.map((row) => ({
    dayOfWeek: row.day_of_week,
    dayName: DAY_NAMES[row.day_of_week],
    shiftCode: (row.shifts as { code: string }).code,
    requiredCount: row.required_count,
  }));
}
