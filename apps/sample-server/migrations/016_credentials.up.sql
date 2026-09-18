-- Application Management Platform: HMAC gateway credentials.
-- client_secret_encrypted holds AES-256-GCM ciphertext (AesEncryptionService
-- format), never a one-way hash — HMAC verification needs the original
-- value. The raw secret is shown once at creation and never stored or
-- returned in plaintext again.

CREATE TABLE IF NOT EXISTS application_credentials (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id             UUID NOT NULL REFERENCES application_environments(id) ON DELETE CASCADE,
  client_id_public           VARCHAR(64) NOT NULL,
  client_secret_encrypted    TEXT NOT NULL,
  secret_last_four           VARCHAR(8) NOT NULL,
  status                     VARCHAR(20) NOT NULL DEFAULT 'active',
  expires_at                 TIMESTAMPTZ,
  grace_period_ends_at       TIMESTAMPTZ,
  last_used_at               TIMESTAMPTZ,
  rotated_from_credential_id UUID REFERENCES application_credentials(id) ON DELETE SET NULL,
  created_by                 TEXT,
  revoked_by                 TEXT,
  revoked_at                 TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT application_credentials_status_check CHECK (status IN ('active', 'rotating', 'revoked', 'expired'))
);

CREATE UNIQUE INDEX application_credentials_client_id_unique ON application_credentials (client_id_public);
CREATE INDEX idx_application_credentials_environment ON application_credentials (environment_id);
CREATE INDEX idx_application_credentials_status ON application_credentials (environment_id, status);
