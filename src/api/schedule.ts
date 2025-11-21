import { supabase } from './supabase';
import type { AssignmentMap } from '@/types/schedule';

interface ShiftReference {
  code: string;
}

interface AssignmentRow {
  employee_id: string;
  date: string;
  shifts: ShiftReference | null;
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

// 근무표 배정 조회
export async function getScheduleAssignments(scheduleId: string): Promise<AssignmentMap> {
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
      .select('employee_id, date, shifts(code)')
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

  // AssignmentMap 형식으로 변환
  const assignments: AssignmentMap = {};
  allData.forEach((row) => {
    if (!assignments[row.employee_id]) {
      assignments[row.employee_id] = {};
    }
    assignments[row.employee_id][row.date] = row.shifts?.code ?? '';
  });

  console.log('[getScheduleAssignments] Assignment keys count:', Object.keys(assignments).length);

  return assignments;
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
