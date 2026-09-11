-- Application Management Platform: service catalogue, providers, and
-- per-application/per-environment enablement.

-- Global catalogue of shared services the platform can offer. Not
-- tenant-scoped — it describes platform capability, not per-tenant config.
-- Only Email ships with status 'available' in the MVP; the rest register as
-- 'coming_soon' so the UI and API surface stay ready for them.
CREATE TABLE IF NOT EXISTS service_catalogue (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           VARCHAR(50) NOT NULL,
  name           VARCHAR(200) NOT NULL,
  description    TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'coming_soon',
  config_schema  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_catalogue_status_check CHECK (status IN ('available', 'coming_soon', 'disabled'))
);

CREATE UNIQUE INDEX service_catalogue_code_unique ON service_catalogue (code);

-- Providers available for a service (smtp/ses/sendgrid/resend for EMAIL,
-- etc.). is_default marks the provider used when no
-- provider_configurations row overrides it for an application.
CREATE TABLE IF NOT EXISTS service_providers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code  VARCHAR(50) NOT NULL REFERENCES service_catalogue(code) ON DELETE CASCADE,
  code          VARCHAR(50) NOT NULL,
  name          VARCHAR(200) NOT NULL,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  status        VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_providers_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE UNIQUE INDEX service_providers_service_code_unique ON service_providers (service_code, code);
CREATE INDEX idx_service_providers_service ON service_providers (service_code);

-- Encrypted provider configuration. scope='shared' is the common
-- Mindsatwork-wide config used by approved applications by default;
-- scope='application' overrides it for one application. config_encrypted
-- holds AES-256-GCM ciphertext of the JSON config blob — never returned
-- decrypted by any API.
CREATE TABLE IF NOT EXISTS provider_configurations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code      VARCHAR(50) NOT NULL REFERENCES service_catalogue(code) ON DELETE CASCADE,
  provider_id       UUID NOT NULL REFERENCES service_providers(id) ON DELETE RESTRICT,
  scope             VARCHAR(20) NOT NULL DEFAULT 'shared',
  application_id    UUID REFERENCES applications(id) ON DELETE CASCADE,
  name              VARCHAR(200) NOT NULL,
  config_encrypted  TEXT NOT NULL,
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  status            VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by        TEXT,
  updated_by        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT provider_configurations_scope_check CHECK (scope IN ('shared', 'application')),
  CONSTRAINT provider_configurations_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT provider_configurations_application_scope_check CHECK (
    (scope = 'application' AND application_id IS NOT NULL) OR
    (scope = 'shared' AND application_id IS NULL)
  )
);

CREATE INDEX idx_provider_configurations_service ON provider_configurations (service_code);
CREATE INDEX idx_provider_configurations_application ON provider_configurations (application_id);

-- Per-environment enable/disable of a service, with an optional pointer to
-- the provider_configurations row it should use (null = fall back to the
-- service's shared default provider).
CREATE TABLE IF NOT EXISTS application_services (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id             UUID NOT NULL REFERENCES application_environments(id) ON DELETE CASCADE,
  service_code               VARCHAR(50) NOT NULL REFERENCES service_catalogue(code) ON DELETE CASCADE,
  enabled                    BOOLEAN NOT NULL DEFAULT FALSE,
  provider_configuration_id  UUID REFERENCES provider_configurations(id) ON DELETE SET NULL,
  rate_limit_window_ms       INTEGER,
  rate_limit_max_requests    INTEGER,
  usage_limit                INTEGER,
  created_by                 TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX application_services_env_service_unique ON application_services (environment_id, service_code);
CREATE INDEX idx_application_services_environment ON application_services (environment_id);
CREATE INDEX idx_application_services_service ON application_services (service_code);
