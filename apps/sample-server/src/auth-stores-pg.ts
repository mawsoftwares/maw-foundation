import { randomUUID } from 'node:crypto';
import type { PgPool } from '@maw/database';
import type {
  IEmailVerificationStore,
  ILoginAttemptStore,
  IMfaChallengeStore,
  IOtpSecretStore,
  IPasswordResetStore,
  ISessionStore,
  LoginAttemptRecord,
  MfaChallengeRecord,
  ResetRecord,
  ServerSession,
  VerificationRecord,
} from '@maw/auth-core';
import type { DeviceInfo } from '@maw/sdk/contracts/identity';
import type { AccountStatusValue } from '@maw/sdk/security/AccountStatus';
import type { CreateUserInput, IUserRepository, UserRecord } from '@maw/sdk/contracts/IUserRepository';

/**
 * Postgres implementations of the auth ports, backed by `migrations/004_auth_foundation.sql`.
 * Each one mirrors an in-memory twin from @maw/auth-core, so the sample server picks a
 * side at the composition root and nothing downstream knows the difference.
 */

const USER_COLUMNS = `id, tenant_id, email, role, audience, password_hash, scope_id, name,
  account_status, email_verified, mfa_enabled, last_login_at, phone, phone_verified,
  created_at, updated_at`;

interface UserDbRow {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  audience: string;
  password_hash: string;
  scope_id: string | null;
  name: string | null;
  account_status: string;
  email_verified: boolean;
  mfa_enabled: boolean;
  last_login_at: Date | null;
  phone: string | null;
  phone_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

function toUserRecord(row: UserDbRow): UserRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    name: row.name ?? undefined,
    audience: row.audience,
    scopeId: row.scope_id,
    accountStatus: row.account_status as AccountStatusValue,
    emailVerified: row.email_verified,
    mfaEnabled: row.mfa_enabled,
    lastLoginAt: row.last_login_at?.toISOString(),
    phone: row.phone ?? undefined,
    phoneVerified: row.phone_verified,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PgUserRepository implements IUserRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: string): Promise<UserRecord | null> {
    const { rows } = await this.pool.query<UserDbRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] !== undefined ? toUserRecord(rows[0]) : null;
  }

  async findByEmail(tenantId: string, email: string): Promise<UserRecord | null> {
    const { rows } = await this.pool.query<UserDbRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE tenant_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1`,
      [tenantId, email],
    );
    return rows[0] !== undefined ? toUserRecord(rows[0]) : null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const { rows } = await this.pool.query<UserDbRow>(
      `INSERT INTO users (id, tenant_id, email, role, audience, password_hash, scope_id, name, account_status, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE)
       RETURNING ${USER_COLUMNS}`,
      [
        randomUUID(),
        input.tenantId,
        input.email,
        input.role,
        input.audience ?? 'admin',
        input.passwordHash,
        input.scopeId ?? null,
        input.name ?? null,
        input.accountStatus,
      ],
    );
    return toUserRecord(rows[0]!);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.pool.query(
      'UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1',
      [userId, passwordHash],
    );
  }

  async updateStatus(userId: string, status: AccountStatusValue): Promise<void> {
    await this.pool.query(
      'UPDATE users SET account_status = $2, updated_at = NOW() WHERE id = $1',
      [userId, status],
    );
  }

  async updateEmailVerified(userId: string, verified: boolean): Promise<void> {
    await this.pool.query(
      'UPDATE users SET email_verified = $2, updated_at = NOW() WHERE id = $1',
      [userId, verified],
    );
  }

  async updateLastLogin(userId: string, timestamp: string): Promise<void> {
    await this.pool.query(
      'UPDATE users SET last_login_at = $2, updated_at = NOW() WHERE id = $1',
      [userId, timestamp],
    );
  }

  async updateMfaEnabled(userId: string, enabled: boolean): Promise<void> {
    await this.pool.query(
      'UPDATE users SET mfa_enabled = $2, updated_at = NOW() WHERE id = $1',
      [userId, enabled],
    );
  }
}

interface SessionDbRow {
  id: string;
  tenant_id: string;
  user_id: string;
  device_id: string | null;
  device_info: DeviceInfo | null;
  refresh_token_hash: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  last_active_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
}

function toServerSession(row: SessionDbRow): ServerSession {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    deviceId: row.device_id,
    deviceInfo: row.device_info,
    refreshTokenHash: row.refresh_token_hash,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at.toISOString(),
    lastActiveAt: row.last_active_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    revokedAt: row.revoked_at?.toISOString() ?? null,
  };
}

const SESSION_COLUMNS = `id, tenant_id, user_id, device_id, device_info, refresh_token_hash,
  ip_address, user_agent, created_at, last_active_at, expires_at, revoked_at`;

export class PgSessionStore implements ISessionStore {
  constructor(private readonly pool: PgPool) {}

  async create(session: ServerSession): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_sessions (${SESSION_COLUMNS})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        session.id,
        session.tenantId,
        session.userId,
        session.deviceId,
        session.deviceInfo !== null ? JSON.stringify(session.deviceInfo) : null,
        session.refreshTokenHash,
        session.ipAddress,
        session.userAgent,
        session.createdAt,
        session.lastActiveAt,
        session.expiresAt,
        session.revokedAt,
      ],
    );
  }

  async findById(sessionId: string): Promise<ServerSession | null> {
    const { rows } = await this.pool.query<SessionDbRow>(
      `SELECT ${SESSION_COLUMNS} FROM user_sessions WHERE id = $1`,
      [sessionId],
    );
    return rows[0] !== undefined ? toServerSession(rows[0]) : null;
  }

  async findByUser(tenantId: string, userId: string): Promise<readonly ServerSession[]> {
    const { rows } = await this.pool.query<SessionDbRow>(
      `SELECT ${SESSION_COLUMNS} FROM user_sessions
       WHERE tenant_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
      [tenantId, userId],
    );
    return rows.map(toServerSession);
  }

  async updateLastActive(sessionId: string, timestamp: string): Promise<void> {
    await this.pool.query('UPDATE user_sessions SET last_active_at = $2 WHERE id = $1', [sessionId, timestamp]);
  }

  async updateRefreshTokenHash(sessionId: string, hash: string): Promise<void> {
    await this.pool.query('UPDATE user_sessions SET refresh_token_hash = $2 WHERE id = $1', [sessionId, hash]);
  }

  async revoke(sessionId: string, timestamp: string): Promise<void> {
    await this.pool.query(
      'UPDATE user_sessions SET revoked_at = $2 WHERE id = $1 AND revoked_at IS NULL',
      [sessionId, timestamp],
    );
  }

  async revokeAllForUser(tenantId: string, userId: string, exceptSessionId?: string): Promise<void> {
    await this.pool.query(
      `UPDATE user_sessions SET revoked_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND revoked_at IS NULL AND ($3::text IS NULL OR id <> $3)`,
      [tenantId, userId, exceptSessionId ?? null],
    );
  }

  async deleteExpired(): Promise<number> {
    const result = await this.pool.query('DELETE FROM user_sessions WHERE expires_at < NOW()');
    return result.rowCount ?? 0;
  }
}

interface OneTimeTokenDbRow {
  token_hash: string;
  user_id: string;
  email: string;
  expires_at: Date;
  used_at: Date | null;
}

/**
 * Email-verification and password-reset tokens have identical shapes, so both stores
 * share this implementation and differ only in the table they point at.
 */
class PgOneTimeTokenStore {
  constructor(
    private readonly pool: PgPool,
    private readonly table: 'email_verification_tokens' | 'password_reset_tokens',
  ) {}

  async save(record: VerificationRecord | ResetRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO ${this.table} (token_hash, user_id, email, expires_at, used_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (token_hash) DO UPDATE SET used_at = EXCLUDED.used_at`,
      [record.tokenHash, record.userId, record.email, record.expiresAt, record.usedAt],
    );
  }

  async findByTokenHash(hash: string): Promise<(VerificationRecord & ResetRecord) | null> {
    const { rows } = await this.pool.query<OneTimeTokenDbRow>(
      `SELECT token_hash, user_id, email, expires_at, used_at FROM ${this.table} WHERE token_hash = $1`,
      [hash],
    );
    const r = rows[0];
    if (r === undefined) return null;
    return {
      tokenHash: r.token_hash,
      userId: r.user_id,
      email: r.email,
      expiresAt: r.expires_at.toISOString(),
      usedAt: r.used_at?.toISOString() ?? null,
    };
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.table} WHERE user_id = $1`, [userId]);
  }
}

export class PgEmailVerificationStore extends PgOneTimeTokenStore implements IEmailVerificationStore {
  constructor(pool: PgPool) {
    super(pool, 'email_verification_tokens');
  }
}

export class PgPasswordResetStore extends PgOneTimeTokenStore implements IPasswordResetStore {
  constructor(pool: PgPool) {
    super(pool, 'password_reset_tokens');
  }
}

export class PgMfaChallengeStore implements IMfaChallengeStore {
  constructor(private readonly pool: PgPool) {}

  async save(record: MfaChallengeRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO mfa_challenges (token_hash, user_id, tenant_id, remember_me, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [record.tokenHash, record.userId, record.tenantId, record.rememberMe, record.expiresAt],
    );
  }

  async findByTokenHash(hash: string): Promise<MfaChallengeRecord | null> {
    const { rows } = await this.pool.query<{
      token_hash: string; user_id: string; tenant_id: string; remember_me: boolean; expires_at: Date;
    }>(
      'SELECT token_hash, user_id, tenant_id, remember_me, expires_at FROM mfa_challenges WHERE token_hash = $1',
      [hash],
    );
    const r = rows[0];
    if (r === undefined) return null;
    return {
      tokenHash: r.token_hash,
      userId: r.user_id,
      tenantId: r.tenant_id,
      rememberMe: r.remember_me,
      expiresAt: r.expires_at.toISOString(),
    };
  }

  async delete(hash: string): Promise<void> {
    await this.pool.query('DELETE FROM mfa_challenges WHERE token_hash = $1', [hash]);
  }
}

export class PgOtpSecretStore implements IOtpSecretStore {
  constructor(private readonly pool: PgPool) {}

  async saveSecret(userId: string, encryptedSecret: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO mfa_secrets (user_id, encrypted_secret) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET encrypted_secret = EXCLUDED.encrypted_secret`,
      [userId, encryptedSecret],
    );
  }

  async getSecret(userId: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ encrypted_secret: string }>(
      'SELECT encrypted_secret FROM mfa_secrets WHERE user_id = $1',
      [userId],
    );
    return rows[0]?.encrypted_secret ?? null;
  }

  async saveBackupCodes(userId: string, codeHashes: readonly string[]): Promise<void> {
    await this.pool.query('DELETE FROM mfa_backup_codes WHERE user_id = $1', [userId]);
    for (const hash of codeHashes) {
      await this.pool.query(
        'INSERT INTO mfa_backup_codes (user_id, code_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, hash],
      );
    }
  }

  async getBackupCodes(userId: string): Promise<readonly string[]> {
    const { rows } = await this.pool.query<{ code_hash: string }>(
      'SELECT code_hash FROM mfa_backup_codes WHERE user_id = $1 AND used_at IS NULL',
      [userId],
    );
    return rows.map((r) => r.code_hash);
  }

  async useBackupCode(userId: string, codeHash: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE mfa_backup_codes SET used_at = NOW() WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL',
      [userId, codeHash],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async deleteAll(userId: string): Promise<void> {
    await this.pool.query('DELETE FROM mfa_secrets WHERE user_id = $1', [userId]);
    await this.pool.query('DELETE FROM mfa_backup_codes WHERE user_id = $1', [userId]);
  }
}

export class PgLoginAttemptStore implements ILoginAttemptStore {
  constructor(private readonly pool: PgPool) {}

  async record(attempt: LoginAttemptRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO login_attempts (attempt_key, attempted_at, success, ip_address, user_agent, failure_reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        attempt.key,
        attempt.timestamp,
        attempt.success,
        attempt.ipAddress ?? null,
        attempt.userAgent ?? null,
        attempt.failureReason ?? null,
      ],
    );
  }

  async getRecentFailures(key: string, since: string): Promise<readonly LoginAttemptRecord[]> {
    const { rows } = await this.pool.query<{
      attempt_key: string; attempted_at: Date; success: boolean;
      ip_address: string | null; user_agent: string | null; failure_reason: string | null;
    }>(
      `SELECT attempt_key, attempted_at, success, ip_address, user_agent, failure_reason
       FROM login_attempts
       WHERE attempt_key = $1 AND success = FALSE AND attempted_at >= $2
       ORDER BY attempted_at DESC`,
      [key, since],
    );
    return rows.map((r) => ({
      key: r.attempt_key,
      timestamp: r.attempted_at.toISOString(),
      success: r.success,
      ipAddress: r.ip_address ?? undefined,
      userAgent: r.user_agent ?? undefined,
      failureReason: r.failure_reason ?? undefined,
    }));
  }

  async clear(key: string): Promise<void> {
    await this.pool.query('DELETE FROM login_attempts WHERE attempt_key = $1', [key]);
  }
}
