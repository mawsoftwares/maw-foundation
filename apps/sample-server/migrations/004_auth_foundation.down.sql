DROP INDEX IF EXISTS idx_login_attempts_key;
DROP TABLE IF EXISTS login_attempts;

DROP INDEX IF EXISTS idx_mfa_backup_codes_user;
DROP TABLE IF EXISTS mfa_backup_codes;
DROP TABLE IF EXISTS mfa_secrets;
DROP TABLE IF EXISTS mfa_challenges;

DROP INDEX IF EXISTS idx_password_reset_user;
DROP TABLE IF EXISTS password_reset_tokens;

DROP INDEX IF EXISTS idx_email_verification_user;
DROP TABLE IF EXISTS email_verification_tokens;

DROP INDEX IF EXISTS idx_user_sessions_expiry;
DROP INDEX IF EXISTS idx_user_sessions_user;
DROP TABLE IF EXISTS user_sessions;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE users
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS account_status,
  DROP COLUMN IF EXISTS email_verified,
  DROP COLUMN IF EXISTS mfa_enabled,
  DROP COLUMN IF EXISTS last_login_at,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS phone_verified,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at;
