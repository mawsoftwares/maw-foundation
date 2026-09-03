import { randomUUID } from 'node:crypto';
import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq, and, sql, isNull, lt, ne, desc } from 'drizzle-orm';
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
} from '@mawsoftwares/auth-core';
import type { DeviceInfo } from '@mawsoftwares/sdk/contracts/identity';
import type { AccountStatusValue } from '@mawsoftwares/sdk/security/AccountStatus';
import type { CreateUserInput, IUserRepository, UserRecord } from '@mawsoftwares/sdk/contracts/IUserRepository';

type UsersRow = typeof schema.users.$inferSelect;

function toUserRecord(row: UsersRow): UserRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role,
    name: row.name ?? undefined,
    audience: row.audience,
    scopeId: row.scopeId,
    accountStatus: row.accountStatus as AccountStatusValue,
    emailVerified: row.emailVerified,
    mfaEnabled: row.mfaEnabled,
    lastLoginAt: row.lastLoginAt?.toISOString(),
    phone: row.phone ?? undefined,
    phoneVerified: row.phoneVerified,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PgUserRepository implements IUserRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(id: string): Promise<UserRecord | null> {
    const rows = await this.db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return rows[0] !== undefined ? toUserRecord(rows[0]) : null;
  }

  async listByTenant(tenantId: string): Promise<UserRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.tenantId, tenantId))
      .orderBy(schema.users.createdAt);
    return rows.map(toUserRecord);
  }

  async findByEmail(tenantId: string, email: string): Promise<UserRecord | null> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.tenantId, tenantId), sql`LOWER(${schema.users.email}) = LOWER(${email})`))
      .limit(1);
    return rows[0] !== undefined ? toUserRecord(rows[0]) : null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const rows = await this.db
      .insert(schema.users)
      .values({
        id: randomUUID(),
        tenantId: input.tenantId,
        email: input.email,
        role: input.role,
        audience: input.audience ?? 'admin',
        passwordHash: input.passwordHash,
        scopeId: input.scopeId ?? null,
        name: input.name ?? null,
        accountStatus: input.accountStatus,
        emailVerified: false,
      })
      .returning();
    return toUserRecord(rows[0]!);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));
  }

  async updateStatus(userId: string, status: AccountStatusValue): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ accountStatus: status, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));
  }

  async updateEmailVerified(userId: string, verified: boolean): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ emailVerified: verified, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));
  }

  async updateLastLogin(userId: string, timestamp: string): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ lastLoginAt: new Date(timestamp), updatedAt: new Date() })
      .where(eq(schema.users.id, userId));
  }

  async updateMfaEnabled(userId: string, enabled: boolean): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ mfaEnabled: enabled, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));
  }

  async purgePersonalData(userId: string, anonymizedEmail: string): Promise<void> {
    await this.db
      .update(schema.users)
      .set({
        email: anonymizedEmail,
        name: null,
        phone: null,
        accountStatus: 'DISABLED',
        mfaEnabled: false,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));
  }
}

type SessionRow = typeof schema.userSessions.$inferSelect;

function toServerSession(row: SessionRow): ServerSession {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    deviceId: row.deviceId,
    deviceInfo: row.deviceInfo as DeviceInfo | null,
    refreshTokenHash: row.refreshTokenHash,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
    lastActiveAt: row.lastActiveAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
  };
}

export class PgSessionStore implements ISessionStore {
  constructor(private readonly db: DrizzleDb) {}

  async create(session: ServerSession): Promise<void> {
    await this.db.insert(schema.userSessions).values({
      id: session.id,
      tenantId: session.tenantId,
      userId: session.userId,
      deviceId: session.deviceId,
      deviceInfo: session.deviceInfo !== null ? JSON.parse(JSON.stringify(session.deviceInfo)) : null,
      refreshTokenHash: session.refreshTokenHash,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: new Date(session.createdAt),
      lastActiveAt: new Date(session.lastActiveAt),
      expiresAt: new Date(session.expiresAt),
      revokedAt: session.revokedAt ? new Date(session.revokedAt) : null,
    });
  }

  async findById(sessionId: string): Promise<ServerSession | null> {
    const rows = await this.db.select().from(schema.userSessions).where(eq(schema.userSessions.id, sessionId));
    return rows[0] !== undefined ? toServerSession(rows[0]) : null;
  }

  async findByUser(tenantId: string, userId: string): Promise<readonly ServerSession[]> {
    const rows = await this.db
      .select()
      .from(schema.userSessions)
      .where(and(eq(schema.userSessions.tenantId, tenantId), eq(schema.userSessions.userId, userId)))
      .orderBy(desc(schema.userSessions.createdAt));
    return rows.map(toServerSession);
  }

  async updateLastActive(sessionId: string, timestamp: string): Promise<void> {
    await this.db
      .update(schema.userSessions)
      .set({ lastActiveAt: new Date(timestamp) })
      .where(eq(schema.userSessions.id, sessionId));
  }

  async updateRefreshTokenHash(sessionId: string, hash: string): Promise<void> {
    await this.db
      .update(schema.userSessions)
      .set({ refreshTokenHash: hash })
      .where(eq(schema.userSessions.id, sessionId));
  }

  async revoke(sessionId: string, timestamp: string): Promise<void> {
    await this.db
      .update(schema.userSessions)
      .set({ revokedAt: new Date(timestamp) })
      .where(and(eq(schema.userSessions.id, sessionId), isNull(schema.userSessions.revokedAt)));
  }

  async revokeAllForUser(tenantId: string, userId: string, exceptSessionId?: string): Promise<void> {
    const conditions = [
      eq(schema.userSessions.tenantId, tenantId),
      eq(schema.userSessions.userId, userId),
      isNull(schema.userSessions.revokedAt),
    ];
    if (exceptSessionId) {
      conditions.push(ne(schema.userSessions.id, exceptSessionId));
    }
    await this.db
      .update(schema.userSessions)
      .set({ revokedAt: new Date() })
      .where(and(...conditions));
  }

  async deleteExpired(): Promise<number> {
    const deleted = await this.db
      .delete(schema.userSessions)
      .where(lt(schema.userSessions.expiresAt, new Date()))
      .returning({ id: schema.userSessions.id });
    return deleted.length;
  }
}

type TokenTable = typeof schema.emailVerificationTokens | typeof schema.passwordResetTokens;

class PgOneTimeTokenStore {
  constructor(
    private readonly db: DrizzleDb,
    private readonly table: TokenTable,
  ) {}

  async save(record: VerificationRecord | ResetRecord): Promise<void> {
    await this.db
      .insert(this.table)
      .values({
        tokenHash: record.tokenHash,
        userId: record.userId,
        email: record.email,
        expiresAt: new Date(record.expiresAt),
        usedAt: record.usedAt ? new Date(record.usedAt) : null,
      })
      .onConflictDoUpdate({
        target: this.table.tokenHash,
        set: { usedAt: record.usedAt ? new Date(record.usedAt) : null },
      });
  }

  async findByTokenHash(hash: string): Promise<(VerificationRecord & ResetRecord) | null> {
    const rows = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.tokenHash, hash));
    const r = rows[0];
    if (r === undefined) return null;
    return {
      tokenHash: r.tokenHash,
      userId: r.userId,
      email: r.email,
      expiresAt: r.expiresAt.toISOString(),
      usedAt: r.usedAt?.toISOString() ?? null,
    };
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.db.delete(this.table).where(eq(this.table.userId, userId));
  }
}

export class PgEmailVerificationStore extends PgOneTimeTokenStore implements IEmailVerificationStore {
  constructor(db: DrizzleDb) {
    super(db, schema.emailVerificationTokens);
  }
}

export class PgPasswordResetStore extends PgOneTimeTokenStore implements IPasswordResetStore {
  constructor(db: DrizzleDb) {
    super(db, schema.passwordResetTokens);
  }
}

export class PgMfaChallengeStore implements IMfaChallengeStore {
  constructor(private readonly db: DrizzleDb) {}

  async save(record: MfaChallengeRecord): Promise<void> {
    await this.db.insert(schema.mfaChallenges).values({
      tokenHash: record.tokenHash,
      userId: record.userId,
      tenantId: record.tenantId,
      rememberMe: record.rememberMe,
      expiresAt: new Date(record.expiresAt),
    });
  }

  async findByTokenHash(hash: string): Promise<MfaChallengeRecord | null> {
    const rows = await this.db
      .select()
      .from(schema.mfaChallenges)
      .where(eq(schema.mfaChallenges.tokenHash, hash));
    const r = rows[0];
    if (r === undefined) return null;
    return {
      tokenHash: r.tokenHash,
      userId: r.userId,
      tenantId: r.tenantId,
      rememberMe: r.rememberMe,
      expiresAt: r.expiresAt.toISOString(),
    };
  }

  async delete(hash: string): Promise<void> {
    await this.db.delete(schema.mfaChallenges).where(eq(schema.mfaChallenges.tokenHash, hash));
  }
}

export class PgOtpSecretStore implements IOtpSecretStore {
  constructor(private readonly db: DrizzleDb) {}

  async saveSecret(userId: string, encryptedSecret: string): Promise<void> {
    await this.db
      .insert(schema.mfaSecrets)
      .values({ userId, encryptedSecret })
      .onConflictDoUpdate({
        target: schema.mfaSecrets.userId,
        set: { encryptedSecret },
      });
  }

  async getSecret(userId: string): Promise<string | null> {
    const rows = await this.db
      .select({ encryptedSecret: schema.mfaSecrets.encryptedSecret })
      .from(schema.mfaSecrets)
      .where(eq(schema.mfaSecrets.userId, userId));
    return rows[0]?.encryptedSecret ?? null;
  }

  async saveBackupCodes(userId: string, codeHashes: readonly string[]): Promise<void> {
    await this.db.delete(schema.mfaBackupCodes).where(eq(schema.mfaBackupCodes.userId, userId));
    if (codeHashes.length > 0) {
      await this.db.insert(schema.mfaBackupCodes).values(
        codeHashes.map((codeHash) => ({ userId, codeHash })),
      );
    }
  }

  async getBackupCodes(userId: string): Promise<readonly string[]> {
    const rows = await this.db
      .select({ codeHash: schema.mfaBackupCodes.codeHash })
      .from(schema.mfaBackupCodes)
      .where(and(eq(schema.mfaBackupCodes.userId, userId), isNull(schema.mfaBackupCodes.usedAt)));
    return rows.map((r) => r.codeHash);
  }

  async useBackupCode(userId: string, codeHash: string): Promise<boolean> {
    const updated = await this.db
      .update(schema.mfaBackupCodes)
      .set({ usedAt: new Date() })
      .where(and(
        eq(schema.mfaBackupCodes.userId, userId),
        eq(schema.mfaBackupCodes.codeHash, codeHash),
        isNull(schema.mfaBackupCodes.usedAt),
      ))
      .returning({ id: schema.mfaBackupCodes.id });
    return updated.length > 0;
  }

  async deleteAll(userId: string): Promise<void> {
    await this.db.delete(schema.mfaSecrets).where(eq(schema.mfaSecrets.userId, userId));
    await this.db.delete(schema.mfaBackupCodes).where(eq(schema.mfaBackupCodes.userId, userId));
  }
}

export class PgLoginAttemptStore implements ILoginAttemptStore {
  constructor(private readonly db: DrizzleDb) {}

  async record(attempt: LoginAttemptRecord): Promise<void> {
    await this.db.insert(schema.loginAttempts).values({
      attemptKey: attempt.key,
      attemptedAt: new Date(attempt.timestamp),
      success: attempt.success,
      ipAddress: attempt.ipAddress ?? null,
      userAgent: attempt.userAgent ?? null,
      failureReason: attempt.failureReason ?? null,
    });
  }

  async getRecentFailures(key: string, since: string): Promise<readonly LoginAttemptRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.loginAttempts)
      .where(and(
        eq(schema.loginAttempts.attemptKey, key),
        eq(schema.loginAttempts.success, false),
        sql`${schema.loginAttempts.attemptedAt} >= ${since}`,
      ))
      .orderBy(desc(schema.loginAttempts.attemptedAt));
    return rows.map((r) => ({
      key: r.attemptKey,
      timestamp: r.attemptedAt.toISOString(),
      success: r.success,
      ipAddress: r.ipAddress ?? undefined,
      userAgent: r.userAgent ?? undefined,
      failureReason: r.failureReason ?? undefined,
    }));
  }

  async clear(key: string): Promise<void> {
    await this.db.delete(schema.loginAttempts).where(eq(schema.loginAttempts.attemptKey, key));
  }
}
