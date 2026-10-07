-- Application-wide theme. One row per tenant holding the design.md source; every user of the tenant gets the
-- same theme because clients load it from here instead of from their own browser's localStorage.
CREATE TABLE IF NOT EXISTS tenant_theme (
  tenant_id   TEXT PRIMARY KEY,
  design_md   TEXT NOT NULL,
  updated_by  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
