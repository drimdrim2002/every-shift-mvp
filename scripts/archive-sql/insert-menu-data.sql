-- 기본 메뉴 데이터 삽입

-- 메뉴 데이터 삽입
INSERT INTO menus (id, pid, name, path, component, type, status, auth_code, sort_order, meta) VALUES
-- 1. 대시보드 (Workspace)
(1, NULL, 'Workspace', '/workspace', '/dashboard/workspace/index', 'menu', 1, NULL, 0,
 '{"icon": "carbon:workspace", "title": "page.dashboard.workspace", "affixTab": true}'),

-- 2. 시스템 관리 (System)
(2, NULL, 'System', '/system', NULL, 'catalog', 1, NULL, 9997,
 '{"icon": "carbon:settings", "title": "system.title", "badge": "new", "badgeType": "normal", "badgeVariants": "primary"}'),

-- 2-1. 메뉴 관리
(201, 2, 'SystemMenu', '/system/menu', '/system/menu/list', 'menu', 1, 'System:Menu:List', 1,
 '{"icon": "carbon:menu", "title": "system.menu.title"}'),

-- 메뉴 관리 버튼들
(20101, 201, 'SystemMenuCreate', NULL, NULL, 'button', 1, 'System:Menu:Create', 1,
 '{"title": "common.create"}'),
(20102, 201, 'SystemMenuEdit', NULL, NULL, 'button', 1, 'System:Menu:Edit', 2,
 '{"title": "common.edit"}'),
(20103, 201, 'SystemMenuDelete', NULL, NULL, 'button', 1, 'System:Menu:Delete', 3,
 '{"title": "common.delete"}'),

-- 2-2. 부서 관리
(202, 2, 'SystemDept', '/system/dept', '/system/dept/list', 'menu', 1, 'System:Dept:List', 2,
 '{"icon": "carbon:container-services", "title": "system.dept.title"}'),

-- 부서 관리 버튼들
(20401, 202, 'SystemDeptCreate', NULL, NULL, 'button', 1, 'System:Dept:Create', 1,
 '{"title": "common.create"}'),
(20402, 202, 'SystemDeptEdit', NULL, NULL, 'button', 1, 'System:Dept:Edit', 2,
 '{"title": "common.edit"}'),
(20403, 202, 'SystemDeptDelete', NULL, NULL, 'button', 1, 'System:Dept:Delete', 3,
 '{"title": "common.delete"}'),

-- 9. 프로젝트 (Project)
(9, NULL, 'Project', '/vben-admin', NULL, 'catalog', 1, NULL, 9998,
 '{"badgeType": "dot", "title": "demos.vben.title", "icon": "carbon:data-center"}'),

-- 9-1. 문서
(901, 9, 'VbenDocument', '/vben-admin/document', 'IFrameView', 'embedded', 1, NULL, 1,
 '{"icon": "carbon:book", "iframeSrc": "https://doc.vben.pro", "title": "demos.vben.document"}'),

-- 9-2. GitHub
(902, 9, 'VbenGithub', '/vben-admin/github', 'IFrameView', 'link', 1, NULL, 2,
 '{"icon": "carbon:logo-github", "link": "https://github.com/vbenjs/vue-vben-admin", "title": "Github"}'),

-- 9-3. Ant Design Vue (비활성)
(903, 9, 'VbenAntdv', '/vben-admin/antdv', 'IFrameView', 'link', 0, NULL, 3,
 '{"icon": "carbon:hexagon-vertical-solid", "badgeType": "dot", "link": "https://ant.vben.pro", "title": "demos.vben.antdv"}'),

-- 10. About
(10, NULL, 'About', '/about', '_core/about/index', 'menu', 1, NULL, 9999,
 '{"icon": "lucide:copyright", "title": "demos.vben.about"}');

-- 역할별 메뉴 접근 권한 설정
INSERT INTO role_menu_access (role, menu_id, can_access) VALUES
-- super 역할 (모든 메뉴 접근 가능)
('super', 1, true),
('super', 2, true),
('super', 201, true),
('super', 20101, true),
('super', 20102, true),
('super', 20103, true),
('super', 202, true),
('super', 20401, true),
('super', 20402, true),
('super', 20403, true),
('super', 9, true),
('super', 901, true),
('super', 902, true),
('super', 903, true),
('super', 10, true),

-- admin 역할 (시스템 관리 제한적 접근)
('admin', 1, true),
('admin', 2, true),
('admin', 201, true),
('admin', 20101, false), -- 메뉴 생성 불가
('admin', 20102, true),
('admin', 20103, false), -- 메뉴 삭제 불가
('admin', 202, true),
('admin', 20401, true),
('admin', 20402, true),
('admin', 20403, false), -- 부서 삭제 불가
('admin', 9, true),
('admin', 901, true),
('admin', 902, true),
('admin', 903, false), -- 비활성 링크 접근 불가
('admin', 10, true),

-- user 역할 (기본 메뉴만 접근)
('user', 1, true),
('user', 2, false), -- 시스템 관리 접근 불가
('user', 201, false),
('user', 20101, false),
('user', 20102, false),
('user', 20103, false),
('user', 202, false),
('user', 20401, false),
('user', 20402, false),
('user', 20403, false),
('user', 9, true),
('user', 901, true),
('user', 902, true),
('user', 903, false),
('user', 10, true);

-- 업데이트 트리거 생성 (updated_at 자동 갱신)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_menus_updated_at
    BEFORE UPDATE ON menus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
