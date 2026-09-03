import { describe, it, expect, beforeEach } from 'vitest';
import {
  signAccessToken,
  verifyAccessToken,
  ScryptHasher,
  hashPassword,
  SessionService,
  MemorySessionStore,
  MemoryTokenBlacklist,
  generateCsrfToken,
  csrfTokensMatch,
  UNSAFE_METHODS,
  AccountPurgeService,
  MemoryPasswordHistoryStore,
  isPasswordInHistory,
  type AuthClaims,
} from '@mawsoftwares/auth-core';
import { AccountStatus, DEFAULT_SECURITY_CONFIG } from '@mawsoftwares/sdk';
import type { IUserRepository, UserRecord, CreateUserInput } from '@mawsoftwares/sdk/contracts/IUserRepository';
import type { AccountStatusValue } from '@mawsoftwares/sdk/security/AccountStatus';
import { validateSecuritySecrets } from '@mawsoftwares/platform/server';

const JWT_SECRET = 'test-secret-that-is-long-enough-for-tests-only';

class MemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, UserRecord>();

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }
  async findByEmail(tenantId: string, email: string): Promise<UserRecord | null> {
    for (const u of this.users.values()) {
      if (u.tenantId === tenantId && u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  }
  async listByTenant(tenantId: string): Promise<UserRecord[]> {
    return [...this.users.values()].filter((u) => u.tenantId === tenantId);
  }
  async create(input: CreateUserInput): Promise<UserRecord> {
    const now = new Date().toISOString();
    const record: UserRecord = {
      id: `u-${Date.now()}`,
      tenantId: input.tenantId,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      name: input.name,
      audience: input.audience ?? 'admin',
      scopeId: input.scopeId ?? null,
      accountStatus: input.accountStatus,
      emailVerified: false,
      mfaEnabled: false,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(record.id, record);
    return record;
  }
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) this.users.set(userId, { ...u, passwordHash, updatedAt: new Date().toISOString() });
  }
  async updateStatus(userId: string, status: AccountStatusValue): Promise<void> {
    const u = this.users.get(userId);
    if (u) this.users.set(userId, { ...u, accountStatus: status, updatedAt: new Date().toISOString() });
  }
  async updateEmailVerified(userId: string, verified: boolean): Promise<void> {
    const u = this.users.get(userId);
    if (u) this.users.set(userId, { ...u, emailVerified: verified, updatedAt: new Date().toISOString() });
  }
  async updateLastLogin(userId: string, timestamp: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) this.users.set(userId, { ...u, lastLoginAt: timestamp, updatedAt: new Date().toISOString() });
  }
  async updateMfaEnabled(userId: string, enabled: boolean): Promise<void> {
    const u = this.users.get(userId);
    if (u) this.users.set(userId, { ...u, mfaEnabled: enabled, updatedAt: new Date().toISOString() });
  }
  async purgePersonalData(userId: string, anonymizedEmail: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) this.users.set(userId, { ...u, email: anonymizedEmail, name: undefined, phone: undefined, accountStatus: 'DISABLED' as const, mfaEnabled: false, updatedAt: new Date().toISOString() });
  }

  seed(user: UserRecord): void {
    this.users.set(user.id, user);
  }
}

function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  const now = new Date().toISOString();
  return {
    id: 'u-1',
    tenantId: 't-1',
    email: 'test@example.com',
    passwordHash: hashPassword('password123'),
    role: 'owner',
    audience: 'admin',
    scopeId: null,
    accountStatus: AccountStatus.ACTIVE,
    emailVerified: true,
    mfaEnabled: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('Auth Security Foundation E2E', () => {
  let userRepo: MemoryUserRepository;
  let sessionStore: MemorySessionStore;
  let sessionService: SessionService;
  let blacklist: MemoryTokenBlacklist;

  beforeEach(() => {
    userRepo = new MemoryUserRepository();
    sessionStore = new MemorySessionStore();
    sessionService = new SessionService({ store: sessionStore, config: DEFAULT_SECURITY_CONFIG.session });
    blacklist = new MemoryTokenBlacklist();
    userRepo.seed(makeUser());
  });

  describe('JWT + Blacklisting', () => {
    it('issues and verifies a token with JTI', async () => {
      const claims: AuthClaims = { userId: 'u-1', tenantId: 't-1', role: 'owner', audience: 'admin' };
      const token = signAccessToken(claims, JWT_SECRET, { issueJti: true });
      const verified = await verifyAccessToken(token, JWT_SECRET);
      expect(verified.userId).toBe('u-1');
      expect(verified.jti).toBeDefined();
    });

    it('rejects a blacklisted JTI', async () => {
      const claims: AuthClaims = { userId: 'u-1', tenantId: 't-1', role: 'owner', audience: 'admin' };
      const token = signAccessToken(claims, JWT_SECRET, { issueJti: true });
      const verified = await verifyAccessToken(token, JWT_SECRET);
      await blacklist.add(verified.jti!, Math.floor(Date.now() / 1000) + 3600);
      await expect(verifyAccessToken(token, JWT_SECRET, { blacklist })).rejects.toThrow();
    });

    it('accepts a non-blacklisted token when blacklist is provided', async () => {
      const claims: AuthClaims = { userId: 'u-1', tenantId: 't-1', role: 'owner', audience: 'admin' };
      const token = signAccessToken(claims, JWT_SECRET, { issueJti: true });
      const verified = await verifyAccessToken(token, JWT_SECRET, { blacklist });
      expect(verified.userId).toBe('u-1');
    });
  });

  describe('CSRF Double-Submit', () => {
    it('generates valid CSRF tokens that match', () => {
      const token = generateCsrfToken();
      expect(token).toBeTruthy();
      expect(csrfTokensMatch(token, token)).toBe(true);
    });

    it('rejects mismatched CSRF tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(csrfTokensMatch(token1, token2)).toBe(false);
    });

    it('identifies unsafe methods', () => {
      expect(UNSAFE_METHODS.includes('POST')).toBe(true);
      expect(UNSAFE_METHODS.includes('PUT')).toBe(true);
      expect(UNSAFE_METHODS.includes('DELETE')).toBe(true);
      expect(UNSAFE_METHODS.includes('GET')).toBe(false);
      expect(UNSAFE_METHODS.includes('HEAD')).toBe(false);
    });
  });

  describe('Session Ownership', () => {
    it('allows owner to revoke their own session', async () => {
      const session = await sessionService.create('t-1', 'u-1', { refreshTokenHash: 'hash-1' });
      const result = await sessionService.revokeOwned(session.id, 't-1', 'u-1');
      expect(result).toBe(true);
    });

    it('rejects revocation of another users session', async () => {
      const session = await sessionService.create('t-1', 'u-1', { refreshTokenHash: 'hash-1' });
      const result = await sessionService.revokeOwned(session.id, 't-1', 'u-other');
      expect(result).toBe(false);
    });

    it('rejects revocation of non-existent session', async () => {
      const result = await sessionService.revokeOwned('nonexistent', 't-1', 'u-1');
      expect(result).toBe(false);
    });
  });

  describe('Production Secret Validation', () => {
    it('throws for weak JWT secret in production', () => {
      expect(() =>
        validateSecuritySecrets({ jwtSecret: 'short', allowInsecure: false }),
      ).toThrow('JWT_SECRET');
    });

    it('throws for default JWT secret in production', () => {
      expect(() =>
        validateSecuritySecrets({ jwtSecret: 'dev-only-secret-change-me', allowInsecure: false }),
      ).toThrow('JWT_SECRET');
    });

    it('accepts strong JWT secret in production', () => {
      expect(() =>
        validateSecuritySecrets({
          jwtSecret: 'a-very-strong-secret-that-is-definitely-long-enough',
          allowInsecure: false,
        }),
      ).not.toThrow();
    });

    it('throws for all-zero MFA key in production', () => {
      expect(() =>
        validateSecuritySecrets({
          jwtSecret: 'a-very-strong-secret-that-is-definitely-long-enough',
          mfaEncryptionKey: '0'.repeat(64),
          allowInsecure: false,
        }),
      ).toThrow('MFA_ENCRYPTION_KEY');
    });

    it('skips validation when allowInsecure is true', () => {
      expect(() =>
        validateSecuritySecrets({ jwtSecret: 'short', allowInsecure: true }),
      ).not.toThrow();
    });
  });

  describe('Account Purge (GDPR)', () => {
    it('purges personal data after password confirmation', async () => {
      const purge = new AccountPurgeService({
        userRepository: userRepo,
        hasher: ScryptHasher,
        sessionService,
      });

      const session = await sessionService.create('t-1', 'u-1', { refreshTokenHash: 'hash-1' });

      await purge.purge('u-1', 'password123');

      const user = await userRepo.findById('u-1');
      expect(user).not.toBeNull();
      expect(user!.email).toMatch(/^deleted-.*@purged\.local$/);
      expect(user!.name).toBeUndefined();
      expect(user!.phone).toBeUndefined();
      expect(user!.accountStatus).toBe('DISABLED');

      const sessions = await sessionService.listForUser('t-1', 'u-1');
      const active = sessions.filter((s) => s.revokedAt === null);
      expect(active.length).toBe(0);
    });

    it('rejects purge with wrong password', async () => {
      const purge = new AccountPurgeService({
        userRepository: userRepo,
        hasher: ScryptHasher,
        sessionService,
      });

      await expect(purge.purge('u-1', 'wrong-password')).rejects.toThrow('Password is incorrect');
    });
  });

  describe('Password History', () => {
    it('detects reused passwords', async () => {
      const store = new MemoryPasswordHistoryStore();
      const hash1 = hashPassword('password1');
      const hash2 = hashPassword('password2');

      await store.record('u-1', hash1);
      await store.record('u-1', hash2);

      const isReused = await isPasswordInHistory('password1', 'u-1', store, ScryptHasher, 5);
      expect(isReused).toBe(true);

      const isNew = await isPasswordInHistory('password3', 'u-1', store, ScryptHasher, 5);
      expect(isNew).toBe(false);
    });
  });
});
