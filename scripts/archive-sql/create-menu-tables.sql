-- 메뉴 테이블 생성 스크립트

-- 메뉴 아이템 테이블
CREATE TABLE IF NOT EXISTS menus (
  id BIGINT PRIMARY KEY,
  pid BIGINT REFERENCES menus(id) ON DELETE CASCADE, -- 부모 메뉴 ID
  name VARCHAR(100) NOT NULL,
  path VARCHAR(255),
  component VARCHAR(255),
  type VARCHAR(20) NOT NULL DEFAULT 'menu', -- menu, catalog, button, embedded, link
  status INTEGER NOT NULL DEFAULT 1, -- 0: 비활성, 1: 활성
  auth_code VARCHAR(100), -- 권한 코드 (System:Menu:List 등)
  sort_order INTEGER DEFAULT 0,

  -- 메타 정보 (JSON 타입)
  meta JSONB DEFAULT '{}',

  -- 시스템 필드
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 사용자별 메뉴 접근 권한 테이블
CREATE TABLE IF NOT EXISTS user_menu_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_id BIGINT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  can_access BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, menu_id)
);

-- 역할별 메뉴 접근 권한 테이블
CREATE TABLE IF NOT EXISTS role_menu_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  menu_id BIGINT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  can_access BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, menu_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_menus_pid ON menus(pid);
CREATE INDEX IF NOT EXISTS idx_menus_type ON menus(type);
CREATE INDEX IF NOT EXISTS idx_menus_status ON menus(status);
CREATE INDEX IF NOT EXISTS idx_menus_auth_code ON menus(auth_code);
CREATE INDEX IF NOT EXISTS idx_user_menu_access_user_id ON user_menu_access(user_id);
CREATE INDEX IF NOT EXISTS idx_role_menu_access_role ON role_menu_access(role);

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_menu_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_menu_access ENABLE ROW LEVEL SECURITY;

-- 메뉴 접근 정책 (모든 사용자가 메뉴를 읽을 수 있지만, 관리자만 수정 가능)
CREATE POLICY "메뉴 조회 허용" ON menus
  FOR SELECT USING (true);

CREATE POLICY "관리자만 메뉴 관리 가능" ON menus
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super', 'admin')
    )
  );

-- 사용자별 메뉴 접근 정책
CREATE POLICY "자신의 메뉴 접근 권한만 조회 가능" ON user_menu_access
  FOR SELECT USING (user_id = auth.uid());

-- 역할별 메뉴 접근 정책 (모든 인증된 사용자가 조회 가능)
CREATE POLICY "역할별 메뉴 접근 권한 조회 허용" ON role_menu_access
  FOR SELECT USING (auth.role() = 'authenticated');

-- 메뉴 관련 함수들
CREATE OR REPLACE FUNCTION get_user_menus(target_user_id UUID)
RETURNS TABLE (
  id BIGINT,
  pid BIGINT,
  name VARCHAR(100),
  path VARCHAR(255),
  component VARCHAR(255),
  type VARCHAR(20),
  status INTEGER,
  auth_code VARCHAR(100),
  sort_order INTEGER,
  meta JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 사용자 역할 기반으로 메뉴 조회
  RETURN QUERY
  SELECT DISTINCT
    m.id, m.pid, m.name, m.path, m.component,
    m.type, m.status, m.auth_code, m.sort_order, m.meta
  FROM menus m
  WHERE m.status = 1
    AND (
      -- 역할 기반 접근
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_menu_access rma ON ur.role = rma.role
        WHERE ur.user_id = target_user_id
          AND rma.menu_id = m.id
          AND rma.can_access = true
      )
      OR
      -- 개별 사용자 접근
      EXISTS (
        SELECT 1 FROM user_menu_access uma
        WHERE uma.user_id = target_user_id
          AND uma.menu_id = m.id
          AND uma.can_access = true
      )
      OR
      -- 기본 접근 (권한 코드가 없는 메뉴)
      (m.auth_code IS NULL OR m.auth_code = '')
    )
  ORDER BY m.sort_order, m.id;
END;
$$;

-- 메뉴 계층 구조 조회 함수
CREATE OR REPLACE FUNCTION get_menu_tree(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH RECURSIVE menu_tree AS (
    -- 루트 메뉴들 (pid가 NULL인 것들)
    SELECT
      m.id, m.pid, m.name, m.path, m.component,
      m.type, m.status, m.auth_code, m.sort_order, m.meta,
      ARRAY[m.id] as path_array,
      0 as level
    FROM get_user_menus(target_user_id) m
    WHERE m.pid IS NULL

    UNION ALL

    -- 하위 메뉴들
    SELECT
      m.id, m.pid, m.name, m.path, m.component,
      m.type, m.status, m.auth_code, m.sort_order, m.meta,
      mt.path_array || m.id,
      mt.level + 1
    FROM get_user_menus(target_user_id) m
    JOIN menu_tree mt ON m.pid = mt.id
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'pid', pid,
      'name', name,
      'path', path,
      'component', component,
      'type', type,
      'status', status,
      'authCode', auth_code,
      'sortOrder', sort_order,
      'meta', meta,
      'level', level
    ) ORDER BY sort_order, id
  ) INTO result
  FROM menu_tree;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
