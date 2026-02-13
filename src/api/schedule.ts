import { supabase } from './supabase';
import type {
  AssignmentMap,
  ConstraintCode,
  ConstraintMap,
  OffReasonMap,
  CommentMap,
  PreferenceStatus,
  SchedulePreference,
  PlanningOrganization,
  PlanningShift,
  PlanningEmployee,
  PlanningAssignment,
} from '@/types/schedule';

interface ShiftReference {
  code: string;
}

interface AssignmentRow {
  employee_id: string;
  date: string;
  shifts: ShiftReference | null;
  off_reason: string | null;
  comment: string | null;
}

// Supabase 조회 결과 타입 (shifts가 배열로 반환될 수 있음)
interface AssignmentQueryResult {
  employee_id: string;
  date: string;
  shifts: ShiftReference | ShiftReference[] | null;
  off_reason: string | null;
  comment: string | null;
}

interface AssignmentWithShiftId {
  employee_id: string;
  shift_id: string;
  date: string;
  shifts: ShiftReference | ShiftReference[] | null;
}

interface RawSchedulePreference {
  id: string;
  schedule_id: string;
  employee_id: string;
  date: string;
  request_code: string;
  request_note: string | null;
  is_soft: boolean;
  resolution_status: PreferenceStatus;
  resolved_shift_id: string | null;
  resolved_at: string | null;
  created_at?: string;
  updated_at?: string;
}

function normalizePreferenceCode(requestCode: string): ConstraintCode | null {
  if (requestCode === 'O') return 'O';
  if (requestCode === 'H' || requestCode === 'E' || requestCode === 'L') return 'O';
  return null;
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
        solver_execution_id: null,
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

// Step4 근무 불가 요청 조회
export async function getSchedulePreferences(scheduleId: string): Promise<{
  constraints: ConstraintMap;
  notes: CommentMap;
  preferences: SchedulePreference[];
}> {
  const rawPreferences: RawSchedulePreference[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('schedule_preferences')
      .select(
        'id, schedule_id, employee_id, date, request_code, request_note, is_soft, resolution_status, resolved_shift_id, resolved_at, created_at, updated_at'
      )
      .eq('schedule_id', scheduleId)
      .order('date', { ascending: true })
      .order('employee_id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`요청 데이터 조회 실패: ${error.message}`);

    if (data && data.length > 0) {
      rawPreferences.push(...(data as RawSchedulePreference[]));
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  const preferences: SchedulePreference[] = rawPreferences
    .map((pref): SchedulePreference | null => {
      const normalizedCode = normalizePreferenceCode(pref.request_code);
      if (!normalizedCode) return null;
      return {
        ...pref,
        request_code: normalizedCode,
      };
    })
    .filter((pref): pref is SchedulePreference => pref !== null);

  const constraints: ConstraintMap = {};
  const notes: CommentMap = {};

  preferences.forEach((pref) => {
    if (!constraints[pref.employee_id]) {
      constraints[pref.employee_id] = {};
      notes[pref.employee_id] = {};
    }
    constraints[pref.employee_id]![pref.date] = pref.request_code;
    if (pref.request_note) {
      notes[pref.employee_id]![pref.date] = pref.request_note;
    }
  });

  return { constraints, notes, preferences };
}

// Step4 근무 불가 요청 저장 (전체 교체)
export async function saveSchedulePreferences(
  scheduleId: string,
  constraints: ConstraintMap,
  notes?: CommentMap
): Promise<void> {
  const rows: Array<{
    schedule_id: string;
    employee_id: string;
    date: string;
    request_code: ConstraintCode;
    request_note?: string;
    is_soft: boolean;
    resolution_status: PreferenceStatus;
    resolved_shift_id: null;
    resolved_at: null;
  }> = [];

  Object.entries(constraints).forEach(([employeeId, dateMap]) => {
    Object.entries(dateMap).forEach(([date, requestCode]) => {
      if (requestCode !== 'O') {
        return;
      }

      const requestNote = notes?.[employeeId]?.[date];
      rows.push({
        schedule_id: scheduleId,
        employee_id: employeeId,
        date,
        request_code: requestCode,
        request_note: requestNote || undefined,
        is_soft: true,
        resolution_status: 'pending',
        resolved_shift_id: null,
        resolved_at: null,
      });
    });
  });

  const { error: deleteError } = await supabase
    .from('schedule_preferences')
    .delete()
    .eq('schedule_id', scheduleId);

  if (deleteError) {
    throw new Error(`기존 요청 삭제 실패: ${deleteError.message}`);
  }

  if (rows.length === 0) return;

  const { error: insertError } = await supabase.from('schedule_preferences').insert(rows);
  if (insertError) {
    throw new Error(`요청 저장 실패: ${insertError.message}`);
  }
}

// 요청 반영 상태 초기화
export async function resetPreferenceResolution(scheduleId: string): Promise<void> {
  const { error } = await supabase
    .from('schedule_preferences')
    .update({
      resolution_status: 'pending',
      resolved_shift_id: null,
      resolved_at: null,
    })
    .eq('schedule_id', scheduleId);

  if (error) {
    throw new Error(`요청 상태 초기화 실패: ${error.message}`);
  }
}

// schedule_assignments 결과 기준으로 요청 반영 상태 갱신
export async function refreshPreferenceResolution(scheduleId: string): Promise<SchedulePreference[]> {
  const { preferences } = await getSchedulePreferences(scheduleId);
  if (preferences.length === 0) return [];

  const assignmentRows: AssignmentWithShiftId[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('schedule_assignments')
      .select('employee_id, shift_id, date, shifts(code)')
      .eq('schedule_id', scheduleId)
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`배정 조회 실패: ${error.message}`);
    }

    if (data && data.length > 0) {
      const normalized = (data as AssignmentWithShiftId[]).map((row) => ({
        ...row,
        shifts: Array.isArray(row.shifts) ? row.shifts[0] || null : row.shifts,
      }));
      assignmentRows.push(...normalized);
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  const assignmentMap = new Map<string, { shiftId: string; shiftCode: string | null }>();
  assignmentRows.forEach((row) => {
    const shiftRef = Array.isArray(row.shifts) ? row.shifts[0] || null : row.shifts;
    assignmentMap.set(`${row.employee_id}_${row.date}`, {
      shiftId: row.shift_id,
      shiftCode: shiftRef?.code ?? null,
    });
  });

  const resolvedAt = new Date().toISOString();
  const updates = preferences.map((pref) => {
    const match = assignmentMap.get(`${pref.employee_id}_${pref.date}`);
    const isFulfilled = match?.shiftCode === 'O';
    return {
      id: pref.id,
      schedule_id: pref.schedule_id,
      employee_id: pref.employee_id,
      date: pref.date,
      request_code: pref.request_code,
      request_note: pref.request_note,
      is_soft: pref.is_soft,
      resolution_status: (isFulfilled ? 'fulfilled' : 'unfulfilled') as PreferenceStatus,
      resolved_shift_id: match?.shiftId ?? null,
      resolved_at: resolvedAt,
    };
  });

  const { data, error } = await supabase
    .from('schedule_preferences')
    .upsert(updates, { onConflict: 'id' })
    .select(
      'id, schedule_id, employee_id, date, request_code, request_note, is_soft, resolution_status, resolved_shift_id, resolved_at, created_at, updated_at'
    );

  if (error) {
    throw new Error(`요청 반영 상태 갱신 실패: ${error.message}`);
  }

  return (data || []) as SchedulePreference[];
}

// 근무표 배정 조회 (assignments와 offReasons, comments 함께 반환)
export async function getScheduleAssignments(scheduleId: string): Promise<{
  assignments: AssignmentMap;
  offReasons: OffReasonMap;
  comments: CommentMap;
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
      .select('employee_id, date, shifts(code), off_reason, comment')
      .eq('schedule_id', scheduleId)
      .range(from, from + pageSize - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      // Supabase 조회 결과를 AssignmentRow로 변환
      const queryResults = data as unknown as AssignmentQueryResult[];
      const normalizedRows: AssignmentRow[] = queryResults.map((row) => ({
        employee_id: row.employee_id,
        date: row.date,
        shifts: Array.isArray(row.shifts) ? row.shifts[0] || null : row.shifts,
        off_reason: row.off_reason || null,
        comment: row.comment || null,
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

  // AssignmentMap과 OffReasonMap, CommentMap 형식으로 변환
  const assignments: AssignmentMap = {};
  const offReasons: OffReasonMap = {};
  const comments: CommentMap = {};

  allData.forEach((row) => {
    if (!assignments[row.employee_id]) {
      assignments[row.employee_id] = {};
      offReasons[row.employee_id] = {};
      comments[row.employee_id] = {};
    }
    assignments[row.employee_id]![row.date] = row.shifts?.code ?? '';

    // off_reason이 있으면 offReasons에 저장
    if (row.off_reason) {
      offReasons[row.employee_id]![row.date] = row.off_reason;
    }

    // comment가 있으면 comments에 저장
    if (row.comment) {
      comments[row.employee_id]![row.date] = row.comment;
    }
  });

  console.log('[getScheduleAssignments] Assignment keys count:', Object.keys(assignments).length);
  console.log('[getScheduleAssignments] OffReason keys count:', Object.keys(offReasons).length);
  console.log('[getScheduleAssignments] Comment keys count:', Object.keys(comments).length);

  return { assignments, offReasons, comments };
}

// 배정 수정
export async function updateAssignment(
  scheduleId: string,
  employeeId: string,
  date: string,
  shiftId: string,
  comment?: string
) {
  const updateData: any = {
    schedule_id: scheduleId,
    employee_id: employeeId,
    shift_id: shiftId,
    date,
  };

  if (comment !== undefined) {
    updateData.comment = comment;
  }

  // Upsert
  const { error } = await supabase
    .from('schedule_assignments')
    .upsert(updateData, {
      onConflict: 'schedule_id,employee_id,date',
    });

  if (error) throw error;

  // 근무표 상태를 'changed'로 변경
  await supabase.from('schedules').update({ status: 'changed' }).eq('id', scheduleId);
}

// 근무표 완료 처리
export async function completeSchedule(scheduleId: string) {
  const { error } = await supabase.from('schedules').update({ status: 'complete' }).eq('id', scheduleId);

  if (error) throw error;
}

// 이번달 근무표만 삭제 (지난달 데이터 보존)
export async function deleteThisMonthAssignments(scheduleId: string, month: string) {
  // Calculate date range for current month
  const [year, monthPart] = month.split('-');
  const startDate = `${month}-01`;
  
  // Get last day of month: new Date(year, month, 0) returns last day of previous month
  // Since monthPart is 1-based, this gives us the correct last day
  const lastDay = new Date(Number(year), Number(monthPart), 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
  
  console.log(`[deleteThisMonthAssignments] Deleting assignments from ${startDate} to ${endDate}`);
  
  // Delete only current month's assignments
  const { error: deleteError } = await supabase
    .from('schedule_assignments')
    .delete()
    .eq('schedule_id', scheduleId)
    .gte('date', startDate)
    .lte('date', endDate);
    
  if (deleteError) throw deleteError;
  
  // Reset schedule status
  const { error: updateError } = await supabase
    .from('schedules')
    .update({
      status: 'created',
      hard_score: null,
      soft_score: null,
      solver_execution_id: null,
    })
    .eq('id', scheduleId);
    
  if (updateError) throw updateError;
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
  shiftsMap: Record<string, string> // shiftCode -> shiftId 매핑
) {
  console.log('[saveTempAssignments] START - orgId:', orgId, 'month:', month);
  console.log('[saveTempAssignments] shiftsMap:', shiftsMap);
  console.log('[saveTempAssignments] assignments keys:', Object.keys(assignments).length);

  // 1. schedule 생성 또는 기존 것 가져오기
  const schedule = await createSchedule(orgId, month);
  console.log('[saveTempAssignments] Schedule ID:', schedule.id);
  console.log('[saveTempAssignments] Schedule status:', schedule.status);

  // 2. assignments를 배열로 변환
  const rows: Array<{
    schedule_id: string;
    employee_id: string;
    shift_id: string;
    date: string;
    is_locked: boolean;
  }> = [];

  let skippedCount = 0;
  Object.entries(assignments).forEach(([employeeId, dateMap]) => {
    Object.entries(dateMap).forEach(([date, shiftCode]) => {
      if (shiftCode && shiftsMap[shiftCode]) {
        rows.push({
          schedule_id: schedule.id,
          employee_id: employeeId,
          shift_id: shiftsMap[shiftCode],
          date,
          is_locked: false,
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

  return schedule;
}

// Planning Payload 데이터 조회 함수들

// 조직 정보 조회
export async function getPlanningOrganization(organizationId: string): Promise<Pick<PlanningOrganization, 'id' | 'name' | 'type'>> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, type')
    .eq('id', organizationId)
    .single();

  if (error) throw new Error(`조직 정보 조회 실패: ${error.message}`);
  if (!data) throw new Error('조직 정보를 찾을 수 없습니다');

  return {
    id: data.id,
    name: data.name,
    type: data.type,
  };
}

// 시프트 정보 조회
export async function getPlanningShifts(organizationId: string): Promise<PlanningShift[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select('id, code, name, start_time, end_time')
    .eq('organization_id', organizationId)
    .order('code');

  if (error) throw new Error(`시프트 정보 조회 실패: ${error.message}`);
  if (!data) return [];

  return data.map(shift => ({
    id: shift.id,
    code: shift.code,
    name: shift.name,
    start_time: shift.start_time ?? '00:00:00',
    end_time: shift.end_time ?? '00:00:00',
  }));
}

// 직원 정보 조회
export async function getPlanningEmployees(organizationId: string): Promise<PlanningEmployee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, available_shifts')
    .eq('organization_id', organizationId)
    .order('name');

  if (error) throw new Error(`직원 정보 조회 실패: ${error.message}`);
  if (!data) return [];

  return data.map(emp => ({
    employee_id: emp.id,
    name: emp.name,
    available_shifts: emp.available_shifts || ['D', 'E', 'N', 'O'],
  }));
}

// 스케줄 배정 정보 조회 (Planning용)
export async function getPlanningAssignments(scheduleId: string): Promise<PlanningAssignment[]> {
  const allData: PlanningAssignment[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  // 페이지네이션하여 모든 데이터 조회
  while (hasMore) {
    const { data, error } = await supabase
      .from('schedule_assignments')
      .select('employee_id, shift_id, date, is_locked')
      .eq('schedule_id', scheduleId)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`배정 정보 조회 실패: ${error.message}`);

    if (data && data.length > 0) {
      allData.push(...data.map(row => ({
        employee_id: row.employee_id,
        shift_id: row.shift_id,
        date: row.date,
        is_locked: row.is_locked ?? false,
      })));
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allData;
}
