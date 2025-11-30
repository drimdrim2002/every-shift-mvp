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
  const row = {
    organization_id: orgId,
    code: shiftData.code.toUpperCase(), // 코드는 대문자로 저장
    name: shiftData.name,
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
  const updateData: Record<string, unknown> = {};

  if (shiftData.code !== undefined) {
    updateData.code = shiftData.code.toUpperCase();
  }
  if (shiftData.name !== undefined) {
    updateData.name = shiftData.name;
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
 * 관련 site_requirements와 schedule_assignments를 먼저 삭제한 후 시프트 삭제
 * @param shiftId - 시프트 ID
 */
export async function deleteShift(shiftId: string): Promise<void> {
  // 1. 관련 site_requirements 먼저 삭제
  const { error: siteReqError } = await supabase
    .from('site_requirements')
    .delete()
    .eq('shift_id', shiftId);

  if (siteReqError) {
    console.error('[deleteShift] Site requirements delete error:', siteReqError);
    throw new Error(`관련 사이트 정보 삭제 실패: ${siteReqError.message}`);
  }

  // 2. 관련 schedule_assignments 삭제 (있을 경우)
  const { error: assignmentError } = await supabase
    .from('schedule_assignments')
    .delete()
    .eq('shift_id', shiftId);

  if (assignmentError) {
    console.error('[deleteShift] Schedule assignments delete error:', assignmentError);
    throw new Error(`관련 배정 정보 삭제 실패: ${assignmentError.message}`);
  }

  // 3. 시프트 삭제
  const { error } = await supabase.from('shifts').delete().eq('id', shiftId);

  if (error) {
    console.error('[deleteShift] Supabase error:', error);
    
    // 외래 키 제약 위반 에러 처리 (혹시 모를 경우)
    if (error.code === '23503') {
      throw new Error(
        '이 시프트는 현재 사용 중이어서 삭제할 수 없습니다. ' +
        '관련된 데이터를 먼저 제거해주세요.'
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
    code: shift.code.toUpperCase(),
    name: shift.name,
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

