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
