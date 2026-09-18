-- Application Management Platform: applications, team members, environments.

CREATE TABLE IF NOT EXISTS applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(100) NOT NULL,
  description     TEXT,
  app_type        VARCHAR(20) NOT NULL DEFAULT 'other',
  ownership       VARCHAR(20) NOT NULL DEFAULT 'client_owned',
  frontend_url    TEXT,
  backend_url     TEXT,
  repository_url  TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by      TEXT,
  updated_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT applications_app_type_check CHECK (app_type IN ('web', 'mobile', 'backend', 'saas', 'internal', 'other')),
  CONSTRAINT applications_ownership_check CHECK (ownership IN ('mindsatwork_internal', 'client_owned')),
  CONSTRAINT applications_status_check CHECK (status IN ('draft', 'active', 'suspended', 'archived'))
);

CREATE UNIQUE INDEX applications_tenant_slug_unique ON applications (tenant_id, slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_tenant ON applications (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_client ON applications (client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_status ON applications (tenant_id, status) WHERE deleted_at IS NULL;

-- Responsible team members. role_label is a descriptive label only — access
-- control stays entirely in the RBAC permission system, not here.
CREATE TABLE IF NOT EXISTS application_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_label      VARCHAR(50) NOT NULL DEFAULT 'member',
  added_by        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX application_members_app_user_unique ON application_members (application_id, user_id);
CREATE INDEX idx_application_members_application ON application_members (application_id);
CREATE INDEX idx_application_members_user ON application_members (user_id);

-- Development / Staging / Production (or a named custom environment).
-- Credentials and service enablement are scoped to an environment row, never
-- to the application directly, so a Production credential cannot resolve
-- Development configuration by construction.
CREATE TABLE IF NOT EXISTS application_environments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id           UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  env_type                 VARCHAR(20) NOT NULL,
  env_name                 VARCHAR(100) NOT NULL,
  allowed_origins          JSONB NOT NULL DEFAULT '[]',
  allowed_ips              JSONB NOT NULL DEFAULT '[]',
  rate_limit_window_ms     INTEGER,
  rate_limit_max_requests  INTEGER,
  usage_limit              INTEGER,
  webhook_url              TEXT,
  status                   VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by               TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT application_environments_env_type_check CHECK (env_type IN ('development', 'staging', 'production', 'custom')),
  CONSTRAINT application_environments_status_check CHECK (status IN ('active', 'disabled'))
);

-- At most one Development / Staging / Production row per application; custom
-- environments (env_type = 'custom') may repeat, distinguished by env_name.
CREATE UNIQUE INDEX application_environments_app_type_unique ON application_environments (application_id, env_type) WHERE env_type <> 'custom';
CREATE UNIQUE INDEX application_environments_app_name_unique ON application_environments (application_id, env_name);
CREATE INDEX idx_application_environments_application ON application_environments (application_id);
CREATE INDEX idx_application_environments_status ON application_environments (application_id, status);
