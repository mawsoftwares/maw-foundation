-- Application Management Platform: clients.
-- A client owns one or more registered applications.

CREATE TABLE IF NOT EXISTS clients (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT NOT NULL,
  name           VARCHAR(200) NOT NULL,
  type           VARCHAR(20) NOT NULL DEFAULT 'internal',
  contact_name   VARCHAR(200),
  contact_email  VARCHAR(320),
  contact_phone  VARCHAR(32),
  company_name   VARCHAR(200),
  status         VARCHAR(20) NOT NULL DEFAULT 'active',
  notes          TEXT,
  created_by     TEXT,
  updated_by     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  CONSTRAINT clients_type_check CHECK (type IN ('internal', 'external')),
  CONSTRAINT clients_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE INDEX idx_clients_tenant ON clients (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_status ON clients (tenant_id, status) WHERE deleted_at IS NULL;
