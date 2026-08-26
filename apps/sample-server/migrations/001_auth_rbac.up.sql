-- Reference Postgres schema for the auth + RBAC foundation (the sample server runs an
-- in-memory equivalent so it needs no DB; this is the real DDL a product would apply).
-- Modeled on Restaurant OS migration 008_role_permissions and Sushmapet's RBAC tables.

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL,
  audience      TEXT NOT NULL DEFAULT 'admin',
  password_hash TEXT NOT NULL,           -- scrypt$salt$key (never plaintext)
  scope_id      TEXT,                    -- ABAC axis, e.g. plant id; NULL = all
  UNIQUE (tenant_id, email)
);

-- The per-tenant, editable role→permission matrix (Control Center writes this).
CREATE TABLE tenant_role_permissions (
  tenant_id   TEXT NOT NULL,
  role        TEXT NOT NULL,
  permission  TEXT NOT NULL,
  UNIQUE (tenant_id, role, permission)
);

-- Refresh tokens: stored only as a SHA-256 hash, rotated on every use.
CREATE TABLE refresh_tokens (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  token_hash  TEXT NOT NULL UNIQUE,
  device_id   TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ
);

-- Enable Postgres RLS for tenant isolation (the app connects as a non-owner role):
--   ALTER TABLE tenant_role_permissions ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY tenant_isolation ON tenant_role_permissions
--     USING (tenant_id = current_setting('app.tenant_id', true));
