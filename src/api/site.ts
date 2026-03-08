import { supabase } from './supabase';
import type { Site } from '@/types/site';

// Supabase 응답 타입 (snake_case)
interface SiteRow {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  created_at?: string;
}

function toSite(row: SiteRow): Site {
  return {
    id: row.id,
    organizationId: row.organization_id,
    code: row.code,
    name: row.name,
    createdAt: row.created_at,
  };
}

/**
 * 조직의 모든 사이트 조회
 */
export async function loadSites(orgId: string): Promise<Site[]> {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('organization_id', orgId)
    .order('code');

  if (error) {
    console.error('[loadSites] Supabase error:', error);
    throw new Error(`사이트 조회 실패: ${error.message}`);
  }

  return (data as SiteRow[]).map(toSite);
}

/**
 * 새 사이트 생성
 */
export async function createSite(
  orgId: string,
  siteData: Omit<Site, 'id' | 'organizationId' | 'createdAt'>
): Promise<Site> {
  const row = {
    organization_id: orgId,
    code: siteData.code.toUpperCase(),
    name: siteData.name,
  };

  const { data, error } = await supabase
    .from('sites')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[createSite] Supabase error:', error);
    if (error.code === '23505') {
      throw new Error(`이미 존재하는 사이트 코드입니다: ${siteData.code}`);
    }
    throw new Error(`사이트 생성 실패: ${error.message}`);
  }

  return toSite(data as SiteRow);
}

/**
 * 사이트 수정
 */
export async function updateSite(
  siteId: string,
  siteData: Partial<Omit<Site, 'id' | 'organizationId' | 'createdAt'>>
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (siteData.code !== undefined) {
    updateData.code = siteData.code.toUpperCase();
  }
  if (siteData.name !== undefined) {
    updateData.name = siteData.name;
  }

  const { error } = await supabase
    .from('sites')
    .update(updateData)
    .eq('id', siteId);

  if (error) {
    console.error('[updateSite] Supabase error:', error);
    if (error.code === '23505') {
      throw new Error(`이미 존재하는 사이트 코드입니다`);
    }
    throw new Error(`사이트 수정 실패: ${error.message}`);
  }
}

/**
 * 사이트 삭제
 * FK 참조(site_staffing_requirements, employee_site_assignments) 시 DB가 차단함
 */
export async function deleteSite(siteId: string): Promise<void> {
  const { error } = await supabase
    .from('sites')
    .delete()
    .eq('id', siteId);

  if (error) {
    console.error('[deleteSite] Supabase error:', error);
    if (error.code === '23503') {
      throw new Error(
        '이 사이트는 현재 사용 중이어서 삭제할 수 없습니다. ' +
        '관련된 인원 요구사항 또는 직원 배정을 먼저 제거해주세요.'
      );
    }
    throw new Error(`사이트 삭제 실패: ${error.message}`);
  }
}
