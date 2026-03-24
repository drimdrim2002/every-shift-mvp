import { supabase } from './supabase';
import type { Shift } from '@/types/shift';

// Supabase 응답 타입 (snake_case)
interface ShiftRow {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  color_code: string;
  start_time: string | null;
  end_time: string | null;
  created_at?: string;
}

// 시간 형식 변환 (hh:mm:ss → hh:mm)
function formatTime(time: string | null): string | null {
  if (!time) return null;
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
}

// snake_case → camelCase 변환
function toShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    organizationId: row.organization_id,
    code: row.code,
    name: row.name,
    colorCode: row.color_code,
    startTime: formatTime(row.start_time),
    endTime: formatTime(row.end_time),
    createdAt: row.created_at,
  };
}

function normalizeShiftCode(code: string): string {
  return code.trim().toUpperCase();
}

function validateShiftData(
  shiftData: Partial<Omit<Shift, 'id' | 'organizationId' | 'createdAt'>>,
  options: { requireCode: boolean }
): void {
  const code = shiftData.code !== undefined ? normalizeShiftCode(shiftData.code) : null;
  const name = shiftData.name?.trim();

  if (options.requireCode && !code) {
    throw new Error('시프트 코드를 입력해주세요.');
  }

  if (code && !/^[A-Z0-9]{1,2}$/.test(code)) {
    throw new Error('시프트 코드는 대문자 영숫자 1~2자여야 합니다.');
  }

  if (shiftData.name !== undefined) {
    if (!name) {
      throw new Error('시프트 이름을 입력해주세요.');
    }

    if (name.length > 50) {
      throw new Error('시프트 이름은 50자 이하여야 합니다.');
    }
  }

  if (shiftData.colorCode !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(shiftData.colorCode)) {
    throw new Error('색상은 #RRGGBB 형식이어야 합니다.');
  }

  const hasStart = shiftData.startTime !== undefined;
  const hasEnd = shiftData.endTime !== undefined;
  if (!hasStart && !hasEnd) {
    return;
  }

  const startTime = shiftData.startTime ?? null;
  const endTime = shiftData.endTime ?? null;
  if ((startTime === null) !== (endTime === null)) {
    throw new Error('시작 시간과 종료 시간은 모두 입력하거나 모두 비워주세요.');
  }

  if (code === 'O' && (startTime !== null || endTime !== null)) {
    throw new Error('휴무(O) 시프트는 시간을 비워두어야 합니다.');
  }

  if (code !== null && code !== 'O' && (startTime === null || endTime === null)) {
    throw new Error('근무 시프트는 시작 시간과 종료 시간을 모두 입력해야 합니다.');
  }

  if (startTime !== null && endTime !== null && startTime === endTime) {
    throw new Error('시작 시간과 종료 시간은 같을 수 없습니다.');
  }
}

async function loadShiftReferenceLabels(shiftId: string): Promise<string[]> {
  const referenceChecks = [
    { table: 'site_requirements', label: '사이트 요구인원' },
    { table: 'site_staffing_requirements', label: '사이트 요일별 요구인원' },
    { table: 'schedule_assignments', label: '스케줄 배정' },
  ] as const;

  const results = await Promise.all(
    referenceChecks.map(async ({ table, label }) => {
      const { count, error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('shift_id', shiftId);

      if (error) {
        console.error(`[loadShiftReferenceLabels] ${table} error:`, error);
        throw new Error(`시프트 참조 상태 확인 실패: ${error.message}`);
      }

      return (count ?? 0) > 0 ? label : null;
    })
  );

  return results.filter((label): label is string => label !== null);
}

/**
 * 조직의 모든 시프트 조회
 * @param orgId - 조직 ID
 * @returns 시프트 목록 (코드 순 정렬)
 */
export async function loadShifts(orgId: string): Promise<Shift[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('organization_id', orgId)
    .order('code');

  if (error) {
    console.error('[loadShifts] Supabase error:', error);
    throw new Error(`시프트 조회 실패: ${error.message}`);
  }

  return (data as ShiftRow[]).map(toShift);
}

/**
 * 새 시프트 생성
 * @param orgId - 조직 ID
 * @param shiftData - 시프트 데이터 (id 제외)
 * @returns 생성된 시프트
 */
export async function createShift(
  orgId: string,
  shiftData: Omit<Shift, 'id' | 'organizationId' | 'createdAt'>
): Promise<Shift> {
  validateShiftData(shiftData, { requireCode: true });

  const row = {
    organization_id: orgId,
    code: normalizeShiftCode(shiftData.code), // 코드는 대문자로 저장
    name: shiftData.name.trim(),
    color_code: shiftData.colorCode,
    start_time: shiftData.startTime,
    end_time: shiftData.endTime,
  };

  const { data, error } = await supabase
    .from('shifts')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[createShift] Supabase error:', error);
    // 중복 코드 에러 처리
    if (error.code === '23505') {
      throw new Error(`이미 존재하는 시프트 코드입니다: ${shiftData.code}`);
    }
    throw new Error(`시프트 생성 실패: ${error.message}`);
  }

  return toShift(data as ShiftRow);
}

/**
 * 시프트 수정
 * @param shiftId - 시프트 ID
 * @param shiftData - 수정할 데이터
 */
export async function updateShift(
  shiftId: string,
  shiftData: Partial<Omit<Shift, 'id' | 'organizationId' | 'createdAt'>>
): Promise<void> {
  validateShiftData(shiftData, { requireCode: false });

  const updateData: Record<string, unknown> = {};

  if (shiftData.code !== undefined) {
    updateData.code = normalizeShiftCode(shiftData.code);
  }
  if (shiftData.name !== undefined) {
    updateData.name = shiftData.name.trim();
  }
  if (shiftData.colorCode !== undefined) {
    updateData.color_code = shiftData.colorCode;
  }
  if (shiftData.startTime !== undefined) {
    updateData.start_time = shiftData.startTime;
  }
  if (shiftData.endTime !== undefined) {
    updateData.end_time = shiftData.endTime;
  }

  const { error } = await supabase
    .from('shifts')
    .update(updateData)
    .eq('id', shiftId);

  if (error) {
    console.error('[updateShift] Supabase error:', error);
    if (error.code === '23505') {
      throw new Error(`이미 존재하는 시프트 코드입니다`);
    }
    throw new Error(`시프트 수정 실패: ${error.message}`);
  }
}

/**
 * 시프트 삭제
 * 참조 데이터가 있으면 삭제를 차단한 후 시프트 삭제
 * @param shiftId - 시프트 ID
 */
export async function deleteShift(shiftId: string): Promise<void> {
  const referenceLabels = await loadShiftReferenceLabels(shiftId);
  if (referenceLabels.length > 0) {
    throw new Error(
      `이 시프트는 현재 ${referenceLabels.join(', ')}에서 사용 중이어서 삭제할 수 없습니다.`
    );
  }

  const { error } = await supabase.from('shifts').delete().eq('id', shiftId);

  if (error) {
    console.error('[deleteShift] Supabase error:', error);

    if (error.code === '23503') {
      throw new Error(
        '이 시프트는 현재 참조 중이어서 삭제할 수 없습니다. 관련 요구인원 또는 배정 데이터를 먼저 정리해주세요.'
      );
    }

    throw new Error(`시프트 삭제 실패: ${error.message}`);
  }
}

/**
 * 조직의 모든 시프트를 새 시프트 목록으로 교체
 * @param orgId - 조직 ID
 * @param shifts - 새 시프트 목록
 */
export async function replaceAllShifts(
  orgId: string,
  shifts: Omit<Shift, 'id' | 'organizationId' | 'createdAt'>[]
): Promise<Shift[]> {
  shifts.forEach((shift) => validateShiftData(shift, { requireCode: true }));

  // 1. 기존 시프트 삭제
  const { error: deleteError } = await supabase
    .from('shifts')
    .delete()
    .eq('organization_id', orgId);

  if (deleteError) {
    console.error('[replaceAllShifts] Delete error:', deleteError);
    throw new Error(`기존 시프트 삭제 실패: ${deleteError.message}`);
  }

  // 2. 새 시프트 일괄 생성
  const rows = shifts.map((shift) => ({
    organization_id: orgId,
    code: normalizeShiftCode(shift.code),
    name: shift.name.trim(),
    color_code: shift.colorCode,
    start_time: shift.startTime,
    end_time: shift.endTime,
  }));

  const { data, error: insertError } = await supabase
    .from('shifts')
    .insert(rows)
    .select();

  if (insertError) {
    console.error('[replaceAllShifts] Insert error:', insertError);
    if (insertError.code === '23505') {
      throw new Error(`중복된 시프트 코드가 있습니다`);
    }
    throw new Error(`시프트 생성 실패: ${insertError.message}`);
  }

  return (data as ShiftRow[]).map(toShift);
}
