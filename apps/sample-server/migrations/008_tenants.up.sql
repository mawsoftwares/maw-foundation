CREATE TABLE IF NOT EXISTS tenants (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'active',
  domain      TEXT UNIQUE,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants (slug);
CREATE INDEX idx_tenants_domain ON tenants (domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_tenants_status ON tenants (status);

-- Seed the demo tenant so existing data (which uses 'demo-tenant' as tenant_id) is linked
INSERT INTO tenants (id, name, slug, status, metadata)
VALUES ('demo-tenant', 'Demo Restaurant', 'demo-tenant', 'active', '{"plan": "trial"}')
ON CONFLICT (id) DO NOTHING;
