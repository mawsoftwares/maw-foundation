-- Persistence for the auth foundation built in @maw/auth-core: account lifecycle on
-- users, server-side sessions, one-time tokens (email verification / password reset),
-- MFA enrollment, and login history. Everything here has an in-memory twin so the
-- sample server still boots with no database.

-- --- Account lifecycle columns on the 001 users table ---
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name           TEXT,
  ADD COLUMN IF NOT EXISTS account_status TEXT        NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN     NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mfa_enabled    BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phone          TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- PENDING_VERIFICATION | ACTIVE | SUSPENDED | LOCKED | DISABLED (see AccountStatus).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE users ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'DISABLED'));

-- --- Server-side sessions (device management, "sign out everywhere") ---
CREATE TABLE IF NOT EXISTS user_sessions (
  id                 TEXT PRIMARY KEY,
  tenant_id          TEXT NOT NULL,
  user_id            TEXT NOT NULL,
  device_id          TEXT,
  device_info        JSONB,
  refresh_token_hash TEXT,
  ip_address         TEXT,
  user_agent         TEXT,
  created_at         TIMESTAMPTZ NOT NULL,
  last_active_at     TIMESTAMPTZ NOT NULL,
  expires_at         TIMESTAMPTZ NOT NULL,
  revoked_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expiry ON user_sessions (expires_at);

-- --- One-time tokens: stored as SHA-256 hashes, never in the clear ---
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  email      TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens (user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  email      TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id);

-- Short-lived handoff between a correct password and the second factor.
CREATE TABLE IF NOT EXISTS mfa_challenges (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  tenant_id   TEXT NOT NULL,
  remember_me BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL
);

-- --- MFA enrollment: TOTP secret is encrypted, backup codes are salted hashes ---
CREATE TABLE IF NOT EXISTS mfa_secrets (
  user_id           TEXT PRIMARY KEY,
  encrypted_secret  TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mfa_backup_codes (
  id        BIGSERIAL PRIMARY KEY,
  user_id   TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  used_at   TIMESTAMPTZ,
  UNIQUE (user_id, code_hash)
);

CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user ON mfa_backup_codes (user_id) WHERE used_at IS NULL;

-- --- Login history (feeds lockout counting and the activity timeline) ---
CREATE TABLE IF NOT EXISTS login_attempts (
  id             BIGSERIAL PRIMARY KEY,
  attempt_key    TEXT NOT NULL,
  attempted_at   TIMESTAMPTZ NOT NULL,
  success        BOOLEAN NOT NULL,
  ip_address     TEXT,
  user_agent     TEXT,
  failure_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_key ON login_attempts (attempt_key, attempted_at DESC);
