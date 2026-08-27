-- Migration: Create Feature Flags Schema
-- Up
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  default_value BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  fail_closed BOOLEAN NOT NULL DEFAULT TRUE,
  risk_level VARCHAR(50) NOT NULL DEFAULT 'LOW',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_feature_flags_is_active ON feature_flags(is_active);

CREATE TABLE feature_flag_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  scope_type VARCHAR(50) NOT NULL, -- GLOBAL, ENVIRONMENT, PRODUCT, TENANT, USER
  scope_id VARCHAR(255),
  state VARCHAR(20) NOT NULL, -- ON, OFF, INHERIT
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  UNIQUE(feature_flag_id, scope_type, scope_id)
);

CREATE INDEX idx_feature_flag_overrides_lookup ON feature_flag_overrides(feature_flag_id, scope_type, scope_id);

CREATE TABLE feature_flag_rollouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  hash_key VARCHAR(50) NOT NULL DEFAULT 'tenant_id',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE feature_flag_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  attribute VARCHAR(255) NOT NULL,
  operator VARCHAR(50) NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE feature_flag_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  enabled_from TIMESTAMP WITH TIME ZONE NOT NULL,
  enabled_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE feature_flag_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  depends_on_feature_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- REQUIRES, CONFLICTS_WITH
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(feature_flag_id, depends_on_feature_id)
);

-- Down
DROP TABLE IF EXISTS feature_flag_dependencies;
DROP TABLE IF EXISTS feature_flag_schedules;
DROP TABLE IF EXISTS feature_flag_rules;
DROP TABLE IF EXISTS feature_flag_rollouts;
DROP TABLE IF EXISTS feature_flag_overrides;
DROP TABLE IF EXISTS feature_flags;
