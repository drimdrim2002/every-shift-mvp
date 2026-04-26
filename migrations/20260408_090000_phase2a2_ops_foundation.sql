-- Phase2A Slice O1.1: ops bootstrap foundation schema
-- Keep this migration narrow:
-- - no membership tables
-- - no RBAC tables
-- - only the locked sites and organization_settings schema

CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_schedule_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  pilot_site_id UUID NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  minimum_rest_hours INTEGER NOT NULL DEFAULT 11,
  checklist_cursor TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Existing environments may already have Phase2B-oriented `sites` and
-- `organization_settings` tables. `CREATE TABLE IF NOT EXISTS` does not add
-- missing columns, so upgrade them before any indexes/triggers reference the
-- locked Phase2A-2 columns.
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_schedule_active BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE sites
SET
  code = COALESCE(NULLIF(code, ''), 'SITE-' || LEFT(id::text, 8)),
  name = COALESCE(NULLIF(name, ''), COALESCE(NULLIF(code, ''), 'Site ' || LEFT(id::text, 8))),
  is_active = COALESCE(is_active, TRUE),
  is_schedule_active = COALESCE(is_schedule_active, FALSE),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW());

WITH ranked_sites AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id
      ORDER BY
        is_schedule_active DESC,
        (code = 'MAIN') DESC,
        created_at ASC,
        id ASC
    ) AS schedule_active_rank
  FROM sites
  WHERE is_active IS TRUE
)
UPDATE sites
SET is_schedule_active = ranked_sites.schedule_active_rank = 1
FROM ranked_sites
WHERE sites.id = ranked_sites.id;

ALTER TABLE sites
  ALTER COLUMN code SET NOT NULL,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN is_active SET DEFAULT TRUE,
  ALTER COLUMN is_active SET NOT NULL,
  ALTER COLUMN is_schedule_active SET DEFAULT FALSE,
  ALTER COLUMN is_schedule_active SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
DECLARE
  v_minimum_rest_hours_type TEXT;
BEGIN
  SELECT data_type
  INTO v_minimum_rest_hours_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'organization_settings'
    AND column_name = 'minimum_rest_hours';

  IF v_minimum_rest_hours_type IS NOT NULL
    AND v_minimum_rest_hours_type <> 'integer'
  THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'organization_settings'
        AND column_name = 'minimum_rest_hours_by_shift'
    ) THEN
      RAISE EXCEPTION USING
        MESSAGE = 'organization_settings.minimum_rest_hours has an unexpected type and minimum_rest_hours_by_shift already exists',
        ERRCODE = '42701';
    END IF;

    ALTER TABLE organization_settings
      RENAME COLUMN minimum_rest_hours TO minimum_rest_hours_by_shift;

    COMMENT ON COLUMN organization_settings.minimum_rest_hours_by_shift IS
      'Legacy per-shift rest-hour settings preserved during Phase2A-2 ops foundation migration.';
  END IF;
END $$;

ALTER TABLE organization_settings
  ADD COLUMN IF NOT EXISTS pilot_site_id UUID,
  ADD COLUMN IF NOT EXISTS minimum_rest_hours INTEGER,
  ADD COLUMN IF NOT EXISTS checklist_cursor TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE organization_settings
SET
  minimum_rest_hours = COALESCE(minimum_rest_hours, 11),
  checklist_cursor = COALESCE(checklist_cursor, ''),
  updated_at = COALESCE(updated_at, NOW());

UPDATE organization_settings os
SET pilot_site_id = s.id
FROM sites s
WHERE os.pilot_site_id IS NULL
  AND s.organization_id = os.organization_id
  AND s.is_schedule_active IS TRUE;

ALTER TABLE organization_settings
  ALTER COLUMN minimum_rest_hours SET DEFAULT 11,
  ALTER COLUMN minimum_rest_hours SET NOT NULL,
  ALTER COLUMN checklist_cursor SET DEFAULT '',
  ALTER COLUMN checklist_cursor SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
DECLARE
  v_organization_id_attnum SMALLINT;
BEGIN
  SELECT attnum
  INTO v_organization_id_attnum
  FROM pg_attribute
  WHERE attrelid = 'organization_settings'::regclass
    AND attname = 'organization_id';

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'organization_settings'::regclass
      AND contype IN ('p', 'u')
      AND conkey = ARRAY[v_organization_id_attnum]
  ) THEN
    ALTER TABLE organization_settings
      ADD CONSTRAINT organization_settings_organization_id_key
      UNIQUE (organization_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'organization_settings'::regclass
      AND conname = 'organization_settings_pilot_site_id_fkey'
  ) THEN
    ALTER TABLE organization_settings
      ADD CONSTRAINT organization_settings_pilot_site_id_fkey
      FOREIGN KEY (pilot_site_id) REFERENCES sites(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sites_organization_id_code_key'
  ) THEN
    ALTER TABLE sites
      ADD CONSTRAINT sites_organization_id_code_key
      UNIQUE (organization_id, code);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS sites_one_schedule_active_per_org_idx
  ON sites (organization_id)
  WHERE is_schedule_active;

CREATE OR REPLACE FUNCTION set_ops_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_organization_settings_pilot_site()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pilot_site_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM sites
    WHERE id = NEW.pilot_site_id
      AND organization_id = NEW.organization_id
      AND is_schedule_active = TRUE
  ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'pilot_site_id must reference the organization''s schedule-active site',
      ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_sites_pilot_site_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM organization_settings
    WHERE pilot_site_id = OLD.id
      AND (
        organization_id <> NEW.organization_id
        OR NEW.is_schedule_active IS NOT TRUE
      )
  ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'referenced pilot_site_id must remain the organization''s schedule-active site',
      ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sites_set_updated_at ON sites;
CREATE TRIGGER sites_set_updated_at
BEFORE UPDATE ON sites
FOR EACH ROW
EXECUTE FUNCTION set_ops_updated_at();

DROP TRIGGER IF EXISTS sites_validate_pilot_site_reference ON sites;
CREATE TRIGGER sites_validate_pilot_site_reference
BEFORE UPDATE ON sites
FOR EACH ROW
EXECUTE FUNCTION enforce_sites_pilot_site_reference();

DROP TRIGGER IF EXISTS organization_settings_set_updated_at ON organization_settings;
CREATE TRIGGER organization_settings_set_updated_at
BEFORE UPDATE ON organization_settings
FOR EACH ROW
EXECUTE FUNCTION set_ops_updated_at();

DROP TRIGGER IF EXISTS organization_settings_validate_pilot_site ON organization_settings;
CREATE TRIGGER organization_settings_validate_pilot_site
BEFORE INSERT OR UPDATE ON organization_settings
FOR EACH ROW
EXECUTE FUNCTION enforce_organization_settings_pilot_site();

COMMENT ON TABLE sites IS 'Organization sites with a single schedule-active site lock per organization.';
COMMENT ON TABLE organization_settings IS 'Organization-level bootstrap settings for the pilot site and ops checklist.';
