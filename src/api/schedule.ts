import { supabase } from './supabase';
import type { AssignmentMap, OffReasonMap } from '@/types/schedule';

interface ShiftReference {
  code: string;
}

interface AssignmentRow {
  employee_id: string;
  date: string;
  shifts: ShiftReference | null;
  off_reason: string | null;
}

// Supabase 조회 결과 타입 (shifts가 배열로 반환될 수 있음)
interface AssignmentQueryResult {
  employee_id: string;
  date: string;
  shifts: ShiftReference | ShiftReference[] | null;
}

// 근무표 생성 (기존 schedule 확인 후 재사용 또는 생성)
export async function createSchedule(orgId: string, month: string) {
  // 1. 기존 schedule 확인
  const { data: existing } = await supabase
    .from('schedules')
    .select('*')
    .eq('organization_id', orgId)
    .eq('month', month)
    .maybeSingle();

  // 2. 기존 schedule이 있으면 재사용 (status 리셋)
  if (existing) {
    const { data, error } = await supabase
      .from('schedules')
      .update({
        status: 'created',
        hard_score: null,
        soft_score: null,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 3. 없으면 새로 생성
  const { data, error } = await supabase
    .from('schedules')
    .insert({
      organization_id: orgId,
      month,
      status: 'created',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 근무표 상태 조회
export async function getScheduleStatus(scheduleId: string) {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', scheduleId)
    .single();

  if (error) throw error;
  return data;
}

// 근무표 배정 조회 (assignments와 offReasons 함께 반환)
export async function getScheduleAssignments(scheduleId: string): Promise<{
  assignments: AssignmentMap;
  offReasons: OffReasonMap;
}> {
  // Supabase 기본 limit은 1000개이므로, 여러 번 조회하여 모든 데이터 가져오기
  // 30명 × 36일 = 1080개 필요

  const allData: AssignmentRow[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  // 1000개씩 페이지네이션하여 모든 데이터 조회
  while (hasMore) {
    const { data, error } = await supabase
      .from('schedule_assignments')
      .select('employee_id, date, shifts(code), off_reason')
      .eq('schedule_id', scheduleId)
      .range(from, from + pageSize - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      // Supabase 조회 결과를 AssignmentRow로 변환
      const queryResults = data as AssignmentQueryResult[];
      const normalizedRows: AssignmentRow[] = queryResults.map((row) => ({
        employee_id: row.employee_id,
        date: row.date,
        shifts: Array.isArray(row.shifts) ? row.shifts[0] || null : row.shifts,
        off_reason: (row as any).off_reason || null,
      }));
      allData.push(...normalizedRows);
      from += pageSize;
      hasMore = data.length === pageSize; // 정확히 pageSize만큼 받았으면 더 있을 가능성
    } else {
      hasMore = false;
    }
  }

  // 디버깅: 조회된 데이터 확인
  console.log('[getScheduleAssignments] Total rows:', allData.length);
  console.log('[getScheduleAssignments] Unique employees:', new Set(allData.map((r) => r.employee_id)).size);

  // AssignmentMap과 OffReasonMap 형식으로 변환
  const assignments: AssignmentMap = {};
  const offReasons: OffReasonMap = {};
  
  allData.forEach((row) => {
    if (!assignments[row.employee_id]) {
      assignments[row.employee_id] = {};
      offReasons[row.employee_id] = {};
    }
    assignments[row.employee_id][row.date] = row.shifts?.code ?? '';
    
    // off_reason이 있으면 offReasons에 저장
    if (row.off_reason) {
      offReasons[row.employee_id][row.date] = row.off_reason;
    }
  });

  console.log('[getScheduleAssignments] Assignment keys count:', Object.keys(assignments).length);
  console.log('[getScheduleAssignments] OffReason keys count:', Object.keys(offReasons).length);

  return { assignments, offReasons };
}

// 배정 수정
export async function updateAssignment(
  scheduleId: string,
  employeeId: string,
  date: string,
  shiftId: string
) {
  // Upsert
  const { error } = await supabase
    .from('schedule_assignments')
    .upsert(
      {
        schedule_id: scheduleId,
        employee_id: employeeId,
        shift_id: shiftId,
        date,
      },
      {
        onConflict: 'schedule_id,employee_id,date',
      }
    );

  if (error) throw error;

  // 근무표 상태를 'changed'로 변경
  await supabase.from('schedules').update({ status: 'changed' }).eq('id', scheduleId);
}

// 근무표 완료 처리
export async function completeSchedule(scheduleId: string) {
  const { error } = await supabase.from('schedules').update({ status: 'complete' }).eq('id', scheduleId);

  if (error) throw error;
}

// 조직의 근무표 목록 조회
export async function getScheduleList(orgId: string) {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('organization_id', orgId)
    .order('month', { ascending: false });

  if (error) throw error;
  return data;
}

// 임시 저장 - 전체 assignments와 offReasons를 일괄 저장
export async function saveTempAssignments(
  orgId: string,
  month: string,
  assignments: AssignmentMap,
  shiftsMap: Record<string, string>, // shiftCode -> shiftId 매핑
  offReasons?: OffReasonMap // 선택적 파라미터
) {
  console.log('[saveTempAssignments] START - orgId:', orgId, 'month:', month);
  console.log('[saveTempAssignments] shiftsMap:', shiftsMap);
  console.log('[saveTempAssignments] assignments keys:', Object.keys(assignments).length);
  
  // 1. schedule 생성 또는 기존 것 가져오기
  const schedule = await createSchedule(orgId, month);
  console.log('[saveTempAssignments] Schedule ID:', schedule.id);
  console.log('[saveTempAssignments] Schedule status:', schedule.status);

  // 2. assignments를 배열로 변환 (off_reason, is_locked 포함)
  const rows: Array<{
    schedule_id: string;
    employee_id: string;
    shift_id: string;
    date: string;
    off_reason?: string;
    is_locked: boolean;
  }> = [];

  let skippedCount = 0;
  Object.entries(assignments).forEach(([employeeId, dateMap]) => {
    Object.entries(dateMap).forEach(([date, shiftCode]) => {
      if (shiftCode && shiftsMap[shiftCode]) {
        // off_reason이 있는지 확인
        const offReason = offReasons?.[employeeId]?.[date];
        // off_reason이 있으면 is_locked=true (AI가 변경 불가)
        const isLocked = !!offReason;
        
        rows.push({
          schedule_id: schedule.id,
          employee_id: employeeId,
          shift_id: shiftsMap[shiftCode],
          date,
          off_reason: offReason || undefined,
          is_locked: isLocked,
        });
      } else if (shiftCode) {
        skippedCount++;
        console.warn('[saveTempAssignments] Skipped - shiftCode:', shiftCode, 'not in shiftsMap');
      }
    });
  });

  console.log('[saveTempAssignments] Total rows to save:', rows.length);
  console.log('[saveTempAssignments] Skipped cells:', skippedCount);
  
  // 샘플 데이터 출력 (처음 3개)
  if (rows.length > 0) {
    console.log('[saveTempAssignments] Sample rows (first 3):', rows.slice(0, 3));
  }

  if (rows.length === 0) {
    console.warn('[saveTempAssignments] No assignments to save');
    return schedule;
  }

  // 3. 기존 assignments 삭제 후 재삽입 (임시 저장은 전체 교체)
  const { data: deleteData, error: deleteError } = await supabase
    .from('schedule_assignments')
    .delete()
    .eq('schedule_id', schedule.id)
    .select();

  if (deleteError) {
    console.error('[saveTempAssignments] Delete error:', deleteError);
    throw new Error(`기존 배정 삭제 실패: ${deleteError.message}`);
  }
  
  console.log('[saveTempAssignments] Deleted rows:', deleteData?.length || 0);

  // 4. 새 assignments 삽입
  const { data: insertData, error: insertError } = await supabase
    .from('schedule_assignments')
    .insert(rows)
    .select();

  if (insertError) {
    console.error('[saveTempAssignments] Insert error:', insertError);
    throw new Error(`배정 저장 실패: ${insertError.message}`);
  }

  console.log('[saveTempAssignments] Insert result - rows inserted:', insertData?.length || 0);
  console.log('[saveTempAssignments] Successfully saved', rows.length, 'assignments');

  // 5. 검증: 실제로 저장되었는지 확인
  const { data: verifyData, error: verifyError } = await supabase
    .from('schedule_assignments')
    .select('id')
    .eq('schedule_id', schedule.id);
  
  if (verifyError) {
    console.error('[saveTempAssignments] Verification error:', verifyError);
  } else {
    console.log('[saveTempAssignments] VERIFICATION - DB has', verifyData?.length || 0, 'rows for schedule_id:', schedule.id);
  }

  return schedule;
}
