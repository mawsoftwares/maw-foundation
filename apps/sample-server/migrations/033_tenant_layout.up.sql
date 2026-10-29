-- Application layout configuration (draft + published) and its append-only revision history.
-- scope/scope_id reserve room for project-level overrides and per-user preferences ('tenant' + '' today).
-- No cross-database references: each client deployment owns its database.
CREATE TABLE IF NOT EXISTS tenant_layout (
  tenant_id          TEXT        NOT NULL,
  scope              TEXT        NOT NULL DEFAULT 'tenant' CHECK (scope IN ('tenant', 'project', 'user')),
  scope_id           TEXT        NOT NULL DEFAULT '',
  draft              JSONB,
  draft_updated_by   TEXT,
  draft_updated_at   TIMESTAMPTZ,
  published          JSONB,
  published_revision INTEGER,
  published_by       TEXT,
  published_at       TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, scope, scope_id)
);

CREATE TABLE IF NOT EXISTS tenant_layout_revision (
  id              BIGSERIAL   PRIMARY KEY,
  tenant_id       TEXT        NOT NULL,
  scope           TEXT        NOT NULL DEFAULT 'tenant' CHECK (scope IN ('tenant', 'project', 'user')),
  scope_id        TEXT        NOT NULL DEFAULT '',
  revision        INTEGER     NOT NULL,
  config          JSONB       NOT NULL,
  config_version  INTEGER     NOT NULL,
  action          TEXT        NOT NULL CHECK (action IN ('publish', 'rollback')),
  source_revision INTEGER,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_layout_revision_uq
  ON tenant_layout_revision (tenant_id, scope, scope_id, revision);
CREATE INDEX IF NOT EXISTS tenant_layout_revision_lookup
  ON tenant_layout_revision (tenant_id, scope, scope_id, created_at);
