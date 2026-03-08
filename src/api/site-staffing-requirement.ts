import { supabase } from './supabase';
import type {
  SiteStaffingRequirement,
  SiteStaffingRequirementInput,
} from '@/types/site-staffing-requirement';

// Supabase 응답 타입 (snake_case)
interface SiteStaffingRequirementRow {
  id: string;
  organization_id: string;
  site_id: string;
  shift_id: string;
  day_of_week: number;
  required_count: number;
  skill_id: string | null;
  rank_id: string | null;
  created_at?: string;
  updated_at?: string;
}

function toRequirement(row: SiteStaffingRequirementRow): SiteStaffingRequirement {
  return {
    id: row.id,
    organizationId: row.organization_id,
    siteId: row.site_id,
    shiftId: row.shift_id,
    dayOfWeek: row.day_of_week,
    requiredCount: row.required_count,
    skillId: row.skill_id,
    rankId: row.rank_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 사이트의 요일별 인원 요구사항 조회
 * @param orgId - 조직 ID
 * @param siteId - 사이트 ID (옵션 — null이면 전체 조직 조회)
 */
export async function loadRequirements(
  orgId: string,
  siteId?: string | null
): Promise<SiteStaffingRequirement[]> {
  let query = supabase
    .from('site_staffing_requirements')
    .select('*')
    .eq('organization_id', orgId)
    .order('day_of_week');

  if (siteId) {
    query = query.eq('site_id', siteId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[loadRequirements] Supabase error:', error);
    throw new Error(`인원 요구사항 조회 실패: ${error.message}`);
  }

  return (data as SiteStaffingRequirementRow[]).map(toRequirement);
}

/**
 * 사이트 인원 요구사항 일괄 upsert
 * Unique constraint: uq_site_staffing_requirements_scope
 */
export async function upsertRequirements(
  requirements: SiteStaffingRequirementInput[]
): Promise<SiteStaffingRequirement[]> {
  if (requirements.length === 0) return [];

  const rows = requirements.map((req) => ({
    organization_id: req.organizationId,
    site_id: req.siteId,
    shift_id: req.shiftId,
    day_of_week: req.dayOfWeek,
    required_count: req.requiredCount,
    skill_id: req.skillId ?? null,
    rank_id: req.rankId ?? null,
  }));

  const { data, error } = await supabase
    .from('site_staffing_requirements')
    .upsert(rows, {
      onConflict:
        'organization_id,site_id,shift_id,day_of_week',
    })
    .select();

  if (error) {
    console.error('[upsertRequirements] Supabase error:', error);
    throw new Error(`인원 요구사항 저장 실패: ${error.message}`);
  }

  return (data as SiteStaffingRequirementRow[]).map(toRequirement);
}
