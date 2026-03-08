import { supabase } from './supabase';
import type { Skill } from '@/types/skill';

// Supabase 응답 타입 (snake_case)
interface SkillRow {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  created_at?: string;
}

function toSkill(row: SkillRow): Skill {
  return {
    id: row.id,
    organizationId: row.organization_id,
    code: row.code,
    name: row.name,
    createdAt: row.created_at,
  };
}

/**
 * 조직의 모든 스킬 조회
 */
export async function loadSkills(orgId: string): Promise<Skill[]> {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('organization_id', orgId)
    .order('code');

  if (error) {
    console.error('[loadSkills] Supabase error:', error);
    throw new Error(`스킬 조회 실패: ${error.message}`);
  }

  return (data as SkillRow[]).map(toSkill);
}

/**
 * 새 스킬 생성
 */
export async function createSkill(
  orgId: string,
  skillData: Omit<Skill, 'id' | 'organizationId' | 'createdAt'>
): Promise<Skill> {
  const row = {
    organization_id: orgId,
    code: skillData.code.toUpperCase(),
    name: skillData.name,
  };

  const { data, error } = await supabase
    .from('skills')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[createSkill] Supabase error:', error);
    if (error.code === '23505') {
      throw new Error(`이미 존재하는 스킬 코드입니다: ${skillData.code}`);
    }
    throw new Error(`스킬 생성 실패: ${error.message}`);
  }

  return toSkill(data as SkillRow);
}

/**
 * 스킬 수정
 */
export async function updateSkill(
  skillId: string,
  skillData: Partial<Omit<Skill, 'id' | 'organizationId' | 'createdAt'>>
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (skillData.code !== undefined) {
    updateData.code = skillData.code.toUpperCase();
  }
  if (skillData.name !== undefined) {
    updateData.name = skillData.name;
  }

  const { error } = await supabase
    .from('skills')
    .update(updateData)
    .eq('id', skillId);

  if (error) {
    console.error('[updateSkill] Supabase error:', error);
    if (error.code === '23505') {
      throw new Error(`이미 존재하는 스킬 코드입니다`);
    }
    throw new Error(`스킬 수정 실패: ${error.message}`);
  }
}

/**
 * 스킬 삭제
 * FK 참조(employee_skills, site_staffing_requirements) 시 DB가 차단함
 */
export async function deleteSkill(skillId: string): Promise<void> {
  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('id', skillId);

  if (error) {
    console.error('[deleteSkill] Supabase error:', error);
    if (error.code === '23503') {
      throw new Error(
        '이 스킬은 현재 사용 중이어서 삭제할 수 없습니다. ' +
        '관련된 직원 또는 인원 요구사항에서 먼저 제거해주세요.'
      );
    }
    throw new Error(`스킬 삭제 실패: ${error.message}`);
  }
}
