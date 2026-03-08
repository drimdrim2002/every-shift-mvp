import { supabase } from './supabase';
import type { OrganizationSettings, WorkConstraints, MinimumRestHours } from '@/types/organization';

// Supabase 응답 타입 (snake_case)
interface OrganizationSettingsRow {
  id: string;
  organization_id: string;
  max_consecutive_night_shifts: number | null;
  minimum_rest_hours: MinimumRestHours;
  work_constraints: WorkConstraints;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_WORK_CONSTRAINTS: WorkConstraints = {
  weeklyTargetHours: 40,
  weeklyMaxHours: 52,
  weeklyOffDays: 2,
};

const DEFAULT_MINIMUM_REST_HOURS: MinimumRestHours = {
  D: 24,
  E: 24,
  N: 36,
};

function toSettings(row: OrganizationSettingsRow): OrganizationSettings {
  return {
    id: row.id,
    organizationId: row.organization_id,
    maxConsecutiveNightShifts: row.max_consecutive_night_shifts,
    minimumRestHours: row.minimum_rest_hours ?? DEFAULT_MINIMUM_REST_HOURS,
    workConstraints: row.work_constraints ?? DEFAULT_WORK_CONSTRAINTS,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 조직 설정 조회 (없으면 null 반환)
 */
export async function loadSettings(orgId: string): Promise<OrganizationSettings | null> {
  const { data, error } = await supabase
    .from('organization_settings')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle();

  if (error) {
    console.error('[loadSettings] Supabase error:', error);
    throw new Error(`설정 조회 실패: ${error.message}`);
  }

  return data ? toSettings(data as OrganizationSettingsRow) : null;
}

/**
 * 조직 설정 생성 또는 업데이트
 */
export async function upsertSettings(
  orgId: string,
  settings: Partial<Omit<OrganizationSettings, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>>
): Promise<OrganizationSettings> {
  const row: Record<string, unknown> = {
    organization_id: orgId,
  };

  if (settings.maxConsecutiveNightShifts !== undefined) {
    row.max_consecutive_night_shifts = settings.maxConsecutiveNightShifts;
  }
  if (settings.minimumRestHours !== undefined) {
    row.minimum_rest_hours = settings.minimumRestHours;
  }
  if (settings.workConstraints !== undefined) {
    row.work_constraints = settings.workConstraints;
  }

  const { data, error } = await supabase
    .from('organization_settings')
    .upsert(row, { onConflict: 'organization_id' })
    .select()
    .single();

  if (error) {
    console.error('[upsertSettings] Supabase error:', error);
    throw new Error(`설정 저장 실패: ${error.message}`);
  }

  return toSettings(data as OrganizationSettingsRow);
}
