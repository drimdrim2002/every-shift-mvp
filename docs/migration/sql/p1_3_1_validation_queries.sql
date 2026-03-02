-- ============================================================================
-- P1-3.1 Backfill Mapping Validation Query Catalog
-- Task ID: 10000000-0000-4000-8000-000000000049
-- Project: every-shift-mvp (vjmerqaxguovnojinxfq)
-- Measured baseline date: 2026-03-02 (KST)
-- Purpose: Pre/Post validation queries for P1-3.2 idempotent backfill SQL design
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PRE-01: Core table row-count snapshot
-- ----------------------------------------------------------------------------
select 'organizations' as table_name, count(*)::bigint as row_count from public.organizations
union all select 'employees', count(*) from public.employees
union all select 'schedules', count(*) from public.schedules
union all select 'schedule_assignments', count(*) from public.schedule_assignments
union all select 'site_requirements', count(*) from public.site_requirements
union all select 'organization_settings', count(*) from public.organization_settings
union all select 'sites', count(*) from public.sites
union all select 'ranks', count(*) from public.ranks
union all select 'skills', count(*) from public.skills
union all select 'site_staffing_requirements', count(*) from public.site_staffing_requirements
union all select 'profiles', count(*) from public.profiles
union all select 'organization_memberships', count(*) from public.organization_memberships
order by table_name;

-- ----------------------------------------------------------------------------
-- PRE-02: Operational organization detection rule
-- Rule: organization with employees > 0 AND site_requirements > 0 AND schedule_assignments > 0
-- ----------------------------------------------------------------------------
select
  o.id as organization_id,
  o.name,
  count(distinct e.id)::bigint as employees,
  count(distinct sr.id)::bigint as site_requirements,
  count(distinct sa.id)::bigint as schedule_assignments
from public.organizations o
left join public.employees e on e.organization_id = o.id
left join public.site_requirements sr on sr.organization_id = o.id
left join public.schedules sc on sc.organization_id = o.id
left join public.schedule_assignments sa on sa.schedule_id = sc.id
group by o.id, o.name
having count(distinct e.id) > 0
   and count(distinct sr.id) > 0
   and count(distinct sa.id) > 0
order by o.id;

-- ----------------------------------------------------------------------------
-- PRE-03: NULL distribution for backfill target columns
-- ----------------------------------------------------------------------------
select
  count(*) filter (where user_id is null)::bigint as employees_user_id_null,
  count(*) filter (where user_id is not null)::bigint as employees_user_id_filled
from public.employees;

select
  count(*) filter (where site_id is null)::bigint as assignments_site_id_null,
  count(*) filter (where site_id is not null)::bigint as assignments_site_id_filled
from public.schedule_assignments;

select
  count(*) filter (where site_id is null)::bigint as req_site_id_null,
  count(*) filter (where skill_id is null)::bigint as req_skill_id_null,
  count(*) filter (where rank_id is null)::bigint as req_rank_id_null
from public.site_requirements;

-- ----------------------------------------------------------------------------
-- PRE-04: Referential integrity check (site_requirements.organization_id vs shifts.organization_id)
-- pass condition: mismatch = 0
-- ----------------------------------------------------------------------------
select
  count(*) filter (where sr.organization_id <> sh.organization_id)::bigint as mismatch_count,
  count(*)::bigint as total_checked
from public.site_requirements sr
join public.shifts sh on sh.id = sr.shift_id;

-- ----------------------------------------------------------------------------
-- PRE-05: Assignment organization consistency (schedule vs employee)
-- pass condition: mismatch = 0
-- ----------------------------------------------------------------------------
select
  count(*) filter (where s.organization_id <> e.organization_id)::bigint as mismatch_count,
  count(*)::bigint as total_checked
from public.schedule_assignments sa
join public.schedules s on s.id = sa.schedule_id
join public.employees e on e.id = sa.employee_id;

-- ----------------------------------------------------------------------------
-- PRE-06: Duplicate risk check in legacy site_requirements (org/shift/day)
-- pass condition: no rows returned
-- ----------------------------------------------------------------------------
select
  sr.organization_id,
  sr.shift_id,
  sr.day_of_week,
  count(*)::bigint as dup_count
from public.site_requirements sr
group by sr.organization_id, sr.shift_id, sr.day_of_week
having count(*) > 1
order by sr.organization_id, sr.shift_id, sr.day_of_week;

-- ----------------------------------------------------------------------------
-- PRE-07: Index drift check
-- expected:
--   - present: uq_site_requirements_scope
--   - expected but currently missing risk: uq_employees_org_user, uq_site_staffing_requirements_scope
-- ----------------------------------------------------------------------------
select
  i.indexname,
  i.indexdef
from pg_indexes i
where i.schemaname = 'public'
  and i.indexname in (
    'uq_site_requirements_scope',
    'uq_employees_org_user',
    'uq_site_staffing_requirements_scope'
  )
order by i.indexname;

-- ----------------------------------------------------------------------------
-- PRE-08: Migration ledger drift check
-- ----------------------------------------------------------------------------
select
  version,
  name
from supabase_migrations.schema_migrations
order by version;

-- ----------------------------------------------------------------------------
-- PRE-09: Column existence check (organizations.code/timezone absent by current policy)
-- pass condition: no rows returned
-- ----------------------------------------------------------------------------
select
  c.table_name,
  c.column_name
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'organizations'
  and c.column_name in ('code', 'timezone');

-- ----------------------------------------------------------------------------
-- POST-01: Master backfill completion check
-- pass condition:
--   each operational organization has >= 1 row in organization_settings/sites/ranks/skills
-- ----------------------------------------------------------------------------
with operational_orgs as (
  select
    o.id
  from public.organizations o
  left join public.employees e on e.organization_id = o.id
  left join public.site_requirements sr on sr.organization_id = o.id
  left join public.schedules sc on sc.organization_id = o.id
  left join public.schedule_assignments sa on sa.schedule_id = sc.id
  group by o.id
  having count(distinct e.id) > 0
     and count(distinct sr.id) > 0
     and count(distinct sa.id) > 0
)
select
  oo.id as organization_id,
  count(distinct os.id)::bigint as organization_settings_cnt,
  count(distinct si.id)::bigint as sites_cnt,
  count(distinct r.id)::bigint as ranks_cnt,
  count(distinct sk.id)::bigint as skills_cnt
from operational_orgs oo
left join public.organization_settings os on os.organization_id = oo.id
left join public.sites si on si.organization_id = oo.id
left join public.ranks r on r.organization_id = oo.id
left join public.skills sk on sk.organization_id = oo.id
group by oo.id
order by oo.id;

-- ----------------------------------------------------------------------------
-- POST-02: site_staffing_requirements migration count check
-- pass condition: source_count = target_count for operational organizations
-- ----------------------------------------------------------------------------
with operational_orgs as (
  select
    o.id
  from public.organizations o
  left join public.employees e on e.organization_id = o.id
  left join public.site_requirements sr on sr.organization_id = o.id
  left join public.schedules sc on sc.organization_id = o.id
  left join public.schedule_assignments sa on sa.schedule_id = sc.id
  group by o.id
  having count(distinct e.id) > 0
     and count(distinct sr.id) > 0
     and count(distinct sa.id) > 0
),
source_counts as (
  select
    sr.organization_id,
    count(*)::bigint as source_count
  from public.site_requirements sr
  join operational_orgs oo on oo.id = sr.organization_id
  group by sr.organization_id
),
target_counts as (
  select
    ssr.organization_id,
    count(*)::bigint as target_count
  from public.site_staffing_requirements ssr
  join operational_orgs oo on oo.id = ssr.organization_id
  group by ssr.organization_id
)
select
  oo.id as organization_id,
  coalesce(sc.source_count, 0)::bigint as source_count,
  coalesce(tc.target_count, 0)::bigint as target_count
from operational_orgs oo
left join source_counts sc on sc.organization_id = oo.id
left join target_counts tc on tc.organization_id = oo.id
order by oo.id;

-- ----------------------------------------------------------------------------
-- POST-03: schedule_assignments.site_id fill check for operational organizations
-- pass condition: remaining_null_site_id = 0
-- ----------------------------------------------------------------------------
with operational_orgs as (
  select
    o.id
  from public.organizations o
  left join public.employees e on e.organization_id = o.id
  left join public.site_requirements sr on sr.organization_id = o.id
  left join public.schedules sc on sc.organization_id = o.id
  left join public.schedule_assignments sa on sa.schedule_id = sc.id
  group by o.id
  having count(distinct e.id) > 0
     and count(distinct sr.id) > 0
     and count(distinct sa.id) > 0
)
select
  s.organization_id,
  count(*) filter (where sa.site_id is null)::bigint as remaining_null_site_id,
  count(*)::bigint as total_assignments
from public.schedule_assignments sa
join public.schedules s on s.id = sa.schedule_id
join operational_orgs oo on oo.id = s.organization_id
group by s.organization_id
order by s.organization_id;

-- ----------------------------------------------------------------------------
-- POST-04: FK integrity check for newly referenced columns
-- pass condition: all orphan_* = 0
-- ----------------------------------------------------------------------------
select
  (
    select count(*)::bigint
    from public.schedule_assignments sa
    left join public.sites si on si.id = sa.site_id
    where sa.site_id is not null and si.id is null
  ) as orphan_assignment_site,
  (
    select count(*)::bigint
    from public.site_requirements sr
    left join public.sites si on si.id = sr.site_id
    where sr.site_id is not null and si.id is null
  ) as orphan_requirement_site,
  (
    select count(*)::bigint
    from public.site_requirements sr
    left join public.skills sk on sk.id = sr.skill_id
    where sr.skill_id is not null and sk.id is null
  ) as orphan_requirement_skill,
  (
    select count(*)::bigint
    from public.site_requirements sr
    left join public.ranks r on r.id = sr.rank_id
    where sr.rank_id is not null and r.id is null
  ) as orphan_requirement_rank;

-- ----------------------------------------------------------------------------
-- POST-05: Uniqueness check for site_staffing_requirements target scope
-- pass condition: no rows returned
-- ----------------------------------------------------------------------------
select
  organization_id,
  site_id,
  shift_id,
  day_of_week,
  coalesce(skill_id, '00000000-0000-0000-0000-000000000000'::uuid) as skill_scope,
  coalesce(rank_id, '00000000-0000-0000-0000-000000000000'::uuid) as rank_scope,
  count(*)::bigint as dup_count
from public.site_staffing_requirements
group by
  organization_id,
  site_id,
  shift_id,
  day_of_week,
  coalesce(skill_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(rank_id, '00000000-0000-0000-0000-000000000000'::uuid)
having count(*) > 1
order by organization_id, site_id, shift_id, day_of_week;

-- ----------------------------------------------------------------------------
-- POST-06: Source preservation check (site_requirements row count unchanged)
-- baseline expected value for 2026-03-02 snapshot: 21
-- ----------------------------------------------------------------------------
with baseline as (
  select 21::bigint as expected_site_requirements_count
)
select
  b.expected_site_requirements_count,
  count(sr.*)::bigint as current_site_requirements_count,
  (count(sr.*)::bigint - b.expected_site_requirements_count)::bigint as delta
from baseline b
left join public.site_requirements sr on true
group by b.expected_site_requirements_count;

-- ----------------------------------------------------------------------------
-- POST-07: employees.user_id policy check (this phase keeps NULLs by design)
-- ----------------------------------------------------------------------------
select
  count(*) filter (where user_id is null)::bigint as user_id_null_count,
  count(*) filter (where user_id is not null)::bigint as user_id_filled_count,
  count(*)::bigint as total_employees
from public.employees;
