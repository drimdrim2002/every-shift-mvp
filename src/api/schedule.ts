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
  const { data, error } = await supabase
    .from('schedule_assignments')
    .select('employee_id, date, shifts(code)')
    .eq('schedule_id', scheduleId);

  if (error) throw error;

  // AssignmentMap 형식으로 변환
  const assignments: AssignmentMap = {};
  (data as AssignmentRow[]).forEach((row) => {
    if (!assignments[row.employee_id]) {
      assignments[row.employee_id] = {};
    }
    assignments[row.employee_id][row.date] = row.shifts?.code || '';
  });

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
