import { supabase } from './supabase';
import type { Rank } from '@/types/rank';

// Supabase 응답 타입 (snake_case)
interface RankRow {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  credit?: number | null;
  created_at?: string;
}

function toRank(row: RankRow): Rank {
  return {
    id: row.id,
    organizationId: row.organization_id,
    code: row.code,
    name: row.name,
    credit: row.credit ?? null,
    createdAt: row.created_at,
  };
}

/**
 * 조직의 모든 직급 조회
 */
export async function loadRanks(orgId: string): Promise<Rank[]> {
  const { data, error } = await supabase
    .from('ranks')
    .select('*')
    .eq('organization_id', orgId)
    .order('code');

  if (error) {
    console.error('[loadRanks] Supabase error:', error);
    throw new Error(`직급 조회 실패: ${error.message}`);
  }

  return (data as RankRow[]).map(toRank);
}

/**
 * 새 직급 생성
 */
export async function createRank(
  orgId: string,
  rankData: Omit<Rank, 'id' | 'organizationId' | 'createdAt'>
): Promise<Rank> {
  const row: Record<string, unknown> = {
    organization_id: orgId,
    code: rankData.code.toUpperCase(),
    name: rankData.name,
  };

  if (rankData.credit !== undefined) {
    row.credit = rankData.credit;
  }

  const { data, error } = await supabase
    .from('ranks')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[createRank] Supabase error:', error);
    if (error.code === '23505') {
      throw new Error(`이미 존재하는 직급 코드입니다: ${rankData.code}`);
    }
    throw new Error(`직급 생성 실패: ${error.message}`);
  }

  return toRank(data as RankRow);
}

/**
 * 직급 수정
 */
export async function updateRank(
  rankId: string,
  rankData: Partial<Omit<Rank, 'id' | 'organizationId' | 'createdAt'>>
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (rankData.code !== undefined) {
    updateData.code = rankData.code.toUpperCase();
  }
  if (rankData.name !== undefined) {
    updateData.name = rankData.name;
  }
  if (rankData.credit !== undefined) {
    updateData.credit = rankData.credit;
  }

  const { error } = await supabase
    .from('ranks')
    .update(updateData)
    .eq('id', rankId);

  if (error) {
    console.error('[updateRank] Supabase error:', error);
    if (error.code === '23505') {
      throw new Error(`이미 존재하는 직급 코드입니다`);
    }
    throw new Error(`직급 수정 실패: ${error.message}`);
  }
}

/**
 * 직급 삭제
 * FK 참조(employee 직급 연결, site_staffing_requirements) 시 DB가 차단함
 */
export async function deleteRank(rankId: string): Promise<void> {
  const { error } = await supabase
    .from('ranks')
    .delete()
    .eq('id', rankId);

  if (error) {
    console.error('[deleteRank] Supabase error:', error);
    if (error.code === '23503') {
      throw new Error(
        '이 직급은 현재 사용 중이어서 삭제할 수 없습니다. ' +
        '관련된 직원 또는 인원 요구사항에서 먼저 제거해주세요.'
      );
    }
    throw new Error(`직급 삭제 실패: ${error.message}`);
  }
}
