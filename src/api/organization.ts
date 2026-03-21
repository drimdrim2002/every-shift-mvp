import { supabase } from './supabase';
import { normalizeOrganizationType, type Organization } from '@/types/organization';

// Supabase 응답 타입 (snake_case)
interface OrganizationRow {
  id: string;
  name: string;
  type: string;
  created_at?: string;
  updated_at?: string;
}

// snake_case → camelCase 변환
function toOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    type: normalizeOrganizationType(row.type),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 조직 조회
 * @param orgId - 조직 ID
 * @returns 조직 정보
 */
export async function loadOrganization(orgId: string): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (error) {
    console.error('[loadOrganization] Supabase error:', error);
    throw new Error(`조직 조회 실패: ${error.message}`);
  }

  return toOrganization(data as OrganizationRow);
}

/**
 * 모든 조직 조회
 * @returns 조직 목록
 */
export async function loadAllOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('name');

  if (error) {
    console.error('[loadAllOrganizations] Supabase error:', error);
    throw new Error(`조직 목록 조회 실패: ${error.message}`);
  }

  return (data as OrganizationRow[]).map(toOrganization);
}

/**
 * 새 조직 생성
 * @param orgData - 조직 데이터 (id 제외)
 * @returns 생성된 조직
 */
export async function createOrganization(
  orgData: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Organization> {
  const row = {
    name: orgData.name,
    type: orgData.type,
  };

  const { data, error } = await supabase
    .from('organizations')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[createOrganization] Supabase error:', error);
    throw new Error(`조직 생성 실패: ${error.message}`);
  }

  return toOrganization(data as OrganizationRow);
}

/**
 * 조직 수정
 * @param orgId - 조직 ID
 * @param orgData - 수정할 데이터
 */
export async function updateOrganization(
  orgId: string,
  orgData: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (orgData.name !== undefined) {
    updateData.name = orgData.name;
  }
  if (orgData.type !== undefined) {
    updateData.type = orgData.type;
  }

  const { error } = await supabase
    .from('organizations')
    .update(updateData)
    .eq('id', orgId);

  if (error) {
    console.error('[updateOrganization] Supabase error:', error);
    throw new Error(`조직 수정 실패: ${error.message}`);
  }
}

/**
 * 조직 삭제
 * CASCADE로 관련 데이터 자동 삭제
 * @param orgId - 조직 ID
 */
export async function deleteOrganization(orgId: string): Promise<void> {
  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', orgId);

  if (error) {
    console.error('[deleteOrganization] Supabase error:', error);
    throw new Error(`조직 삭제 실패: ${error.message}`);
  }
}
