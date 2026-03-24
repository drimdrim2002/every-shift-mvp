import { supabase } from './supabase';
import {
  assertPersistedOrganizationType,
  normalizeOrganizationType,
  ORGANIZATION_MANAGEMENT_ALLOWED_ACCESS_STATES,
  type Organization,
  type OrganizationManagementScope,
  type OrganizationProfileInput,
  type OrganizationProfilePatch,
} from '@/types/organization';

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

function assertOrganizationManagementAccess(
  accessState: OrganizationManagementScope['accessState'],
): void {
  if (
    accessState &&
    ORGANIZATION_MANAGEMENT_ALLOWED_ACCESS_STATES.includes(
      accessState as (typeof ORGANIZATION_MANAGEMENT_ALLOWED_ACCESS_STATES)[number],
    )
  ) {
    return;
  }

  throw new Error('조직 관리 권한이 없습니다.');
}

export function resolveOrganizationManagementOrganizationId(
  scope: OrganizationManagementScope,
  targetOrganizationId?: string | null,
): string {
  assertOrganizationManagementAccess(scope.accessState);

  if (scope.accessState === 'super_active') {
    const resolvedOrganizationId = targetOrganizationId ?? scope.organizationId;
    if (!resolvedOrganizationId) {
      throw new Error('슈퍼 관리자는 대상 조직을 선택해야 합니다.');
    }

    return resolvedOrganizationId;
  }

  if (!scope.organizationId) {
    throw new Error('관리자 조직 범위를 확인할 수 없습니다.');
  }

  if (targetOrganizationId && targetOrganizationId !== scope.organizationId) {
    throw new Error('다른 조직 데이터에는 접근할 수 없습니다.');
  }

  return scope.organizationId;
}

/**
 * 조직 조회
 * @param orgId - 조직 ID
 * @returns 조직 정보
 */
export async function loadOrganization(orgId: string): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, type, created_at, updated_at')
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
    .select('id, name, type, created_at, updated_at')
    .order('name');

  if (error) {
    console.error('[loadAllOrganizations] Supabase error:', error);
    throw new Error(`조직 목록 조회 실패: ${error.message}`);
  }

  return (data as OrganizationRow[]).map(toOrganization);
}

/**
 * Canonical P5 read boundary for the organization management screen:
 * direct `.from()` access protected by route guards + RLS.
 */
export async function loadOrganizationsForManagement(
  scope: OrganizationManagementScope,
): Promise<Organization[]> {
  assertOrganizationManagementAccess(scope.accessState);

  if (scope.accessState === 'super_active') {
    return loadAllOrganizations();
  }

  return [await loadOrganization(resolveOrganizationManagementOrganizationId(scope))];
}

/**
 * Canonical P5 detail read boundary for the organization management screen.
 */
export async function loadOrganizationForManagement(
  scope: OrganizationManagementScope,
  targetOrganizationId?: string | null,
): Promise<Organization> {
  return loadOrganization(
    resolveOrganizationManagementOrganizationId(scope, targetOrganizationId),
  );
}

/**
 * 새 조직 생성
 * @param orgData - 조직 데이터 (id 제외)
 * @returns 생성된 조직
 */
export async function createOrganization(
  orgData: OrganizationProfileInput,
): Promise<Organization> {
  const row = {
    name: orgData.name,
    type: assertPersistedOrganizationType(orgData.type),
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
  orgData: OrganizationProfilePatch,
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (orgData.name !== undefined) {
    updateData.name = orgData.name;
  }
  if (orgData.type !== undefined) {
    updateData.type = assertPersistedOrganizationType(orgData.type);
  }

  if (Object.keys(updateData).length === 0) {
    return;
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
 * Canonical P5 write boundary for the organization management screen.
 * Root organization creation/deletion remains outside the Phase 5 screen scope.
 */
export async function saveOrganizationForManagement(
  scope: OrganizationManagementScope,
  orgData: OrganizationProfilePatch,
  targetOrganizationId?: string | null,
): Promise<Organization> {
  const resolvedOrganizationId = resolveOrganizationManagementOrganizationId(
    scope,
    targetOrganizationId,
  );

  await updateOrganization(resolvedOrganizationId, orgData);
  return loadOrganization(resolvedOrganizationId);
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
