-- Dynamic Master Data Engine tables

CREATE TABLE IF NOT EXISTS masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description VARCHAR(1000),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  allow_custom_values BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64),
  updated_by VARCHAR(64),
  deleted_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX masters_tenant_code_unique ON masters (tenant_id, code) WHERE (deleted_at IS NULL);
CREATE INDEX idx_masters_tenant_id ON masters (tenant_id);
CREATE INDEX idx_masters_code ON masters (tenant_id, code) WHERE deleted_at IS NULL;
CREATE INDEX idx_masters_status ON masters (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_masters_is_system ON masters (is_system) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS master_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(200) NOT NULL,
  data_type VARCHAR(20) NOT NULL DEFAULT 'string',
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_unique BOOLEAN NOT NULL DEFAULT FALSE,
  is_searchable BOOLEAN NOT NULL DEFAULT FALSE,
  is_filterable BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  default_value TEXT,
  config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64),
  updated_by VARCHAR(64),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX master_fields_master_code_unique ON master_fields (master_id, code) WHERE (deleted_at IS NULL);
CREATE INDEX idx_master_fields_master_id ON master_fields (master_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS master_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  label VARCHAR(500) NOT NULL,
  value TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64),
  updated_by VARCHAR(64),
  deleted_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX master_values_master_code_unique ON master_values (master_id, code) WHERE (deleted_at IS NULL);
CREATE INDEX idx_master_values_master_id ON master_values (master_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_master_values_active ON master_values (master_id, is_active, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_master_values_code ON master_values (master_id, code) WHERE deleted_at IS NULL;
