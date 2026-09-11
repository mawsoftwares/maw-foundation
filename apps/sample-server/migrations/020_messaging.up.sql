-- Messaging: Email/SMS/WhatsApp templates, provider credentials ("Masters"),
-- and a send-attempt audit trail. Ported from the servicemate project's
-- message-templates / email-templates / integration-credentials /
-- message-send-logs features into maw-foundation's conventions (uuid PKs,
-- to match the other admin-managed tables added since — clients,
-- applications, credentials, service_catalogue, email_templates).

CREATE TABLE IF NOT EXISTS messaging_email_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier     VARCHAR(150) NOT NULL UNIQUE,
  name           VARCHAR(200) NOT NULL,
  subject        VARCHAR(500) NOT NULL,
  body           TEXT NOT NULL,
  from_address   VARCHAR(255),
  to_address     TEXT,
  cc_address     TEXT,
  bcc_address    TEXT,
  variables      JSONB NOT NULL DEFAULT '[]',
  description    TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messaging_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel        VARCHAR(20) NOT NULL,
  identifier     VARCHAR(150) NOT NULL,
  name           VARCHAR(200) NOT NULL,
  body           TEXT NOT NULL,
  variables      JSONB NOT NULL DEFAULT '[]',
  description    TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT messaging_templates_channel_identifier_key UNIQUE (channel, identifier)
);
CREATE INDEX IF NOT EXISTS idx_messaging_templates_channel ON messaging_templates(channel);

CREATE TABLE IF NOT EXISTS messaging_credentials (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel        VARCHAR(20) NOT NULL UNIQUE,
  provider       VARCHAR(50) NOT NULL,
  name           VARCHAR(150) NOT NULL,
  config         JSONB NOT NULL DEFAULT '{}',
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messaging_send_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel              VARCHAR(20) NOT NULL,
  identifier           VARCHAR(150),
  template_id          UUID,
  status               VARCHAR(20) NOT NULL DEFAULT 'pending',
  to_address           TEXT,
  cc_address           TEXT,
  bcc_address          TEXT,
  rendered_subject     TEXT,
  rendered_body        TEXT,
  error_message        TEXT,
  provider_response    JSONB,
  related_entity_type  VARCHAR(100),
  related_entity_id    VARCHAR(100),
  sent_by              TEXT,
  sent_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messaging_send_logs_channel ON messaging_send_logs(channel);
CREATE INDEX IF NOT EXISTS idx_messaging_send_logs_created ON messaging_send_logs(created_at);
