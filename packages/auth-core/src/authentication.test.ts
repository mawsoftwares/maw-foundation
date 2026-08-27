import { describe, it, expect, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AccountStatus, DEFAULT_SECURITY_CONFIG } from '@mawsoftwares/sdk';
import type { AccountStatusValue } from '@mawsoftwares/sdk/security/AccountStatus';
import type { IUserRepository, UserRecord, CreateUserInput } from '@mawsoftwares/sdk/contracts/IUserRepository';
import type { IEncryptionService } from '@mawsoftwares/sdk/contracts/IEncryptionService';
import {
  AuthenticationService,
  MemoryMfaChallengeStore,
  MemoryLoginAttemptStore,
  MemoryOtpSecretStore,
  MemorySessionStore,
  LoginProtection,
  MfaService,
  OtpService,
  ScryptHasher,
  SessionService,
  AccountDisabledError,
  AccountLockedError,
  AccountPendingVerificationError,
  InvalidCredentialsError,
  InvalidOtpError,
  TokenExpiredError,
} from './index';

class MemoryUserRepository implements IUserRepository {
  readonly users = new Map<string, UserRecord>();

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(tenantId: string, email: string): Promise<UserRecord | null> {
    for (const u of this.users.values()) {
      if (u.tenantId === tenantId && u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const now = new Date().toISOString();
    const record: UserRecord = {
      id: randomUUID(),
      tenantId: input.tenantId,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      name: input.name,
      audience: input.audience,
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
    this.patch(userId, { passwordHash });
  }

  async updateStatus(userId: string, accountStatus: AccountStatusValue): Promise<void> {
    this.patch(userId, { accountStatus });
  }

  async updateEmailVerified(userId: string, emailVerified: boolean): Promise<void> {
    this.patch(userId, { emailVerified });
  }

  async updateLastLogin(userId: string, lastLoginAt: string): Promise<void> {
    this.patch(userId, { lastLoginAt });
  }

  async updateMfaEnabled(userId: string, mfaEnabled: boolean): Promise<void> {
    this.patch(userId, { mfaEnabled });
  }

  private patch(userId: string, changes: Partial<UserRecord>): void {
    const u = this.users.get(userId);
    if (u) this.users.set(userId, { ...u, ...changes, updatedAt: new Date().toISOString() });
  }
}

/** Reversible stand-in for AES so the test does not need a key. */
const passthroughEncryption: IEncryptionService = {
  encrypt: async (plaintext) => `enc:${plaintext}`,
  decrypt: async (ciphertext) => ciphertext.replace(/^enc:/, ''),
  generateKey: async () => 'test-key',
};

const TENANT = 't1';
const PASSWORD = 'CorrectH0rse!';

describe('AuthenticationService', () => {
  let users: MemoryUserRepository;
  let sessionService: SessionService;
  let loginAttempts: MemoryLoginAttemptStore;
  let loginProtection: LoginProtection;
  let otpService: OtpService;
  let otpSecretStore: MemoryOtpSecretStore;
  let mfaService: MfaService;
  let auth: AuthenticationService;

  async function seedUser(overrides: Partial<UserRecord> = {}): Promise<UserRecord> {
    const user = await users.create({
      tenantId: TENANT,
      email: 'user@test.com',
      passwordHash: await ScryptHasher.hash(PASSWORD),
      role: 'manager',
      audience: 'admin',
      scopeId: 'plant-1',
      accountStatus: AccountStatus.ACTIVE,
    });
    users.users.set(user.id, { ...user, ...overrides });
    return users.users.get(user.id)!;
  }

  beforeEach(() => {
    users = new MemoryUserRepository();
    sessionService = new SessionService({
      store: new MemorySessionStore(),
      config: DEFAULT_SECURITY_CONFIG.session,
    });
    loginAttempts = new MemoryLoginAttemptStore();
    loginProtection = new LoginProtection({ maxAttempts: 3, lockoutDurationMs: 60_000 });
    otpService = new OtpService(DEFAULT_SECURITY_CONFIG.otp);
    otpSecretStore = new MemoryOtpSecretStore();
    mfaService = new MfaService({
      otpService,
      store: otpSecretStore,
      encryptionService: passthroughEncryption,
      userRepository: users,
      hasher: {
        hash: async (v) => ScryptHasher.hash(v),
        verify: async (v, h) => ScryptHasher.verify(v, h),
      },
    });
    auth = new AuthenticationService({
      userRepository: users,
      hasher: ScryptHasher,
      sessionService,
      loginProtection,
      loginAttemptStore: loginAttempts,
      mfaService,
      mfaChallengeStore: new MemoryMfaChallengeStore(),
    });
  });

  it('creates a session and stamps last login on success', async () => {
    const user = await seedUser();

    const result = await auth.authenticate({
      tenantId: TENANT,
      email: 'user@test.com',
      password: PASSWORD,
      ipAddress: '10.0.0.1',
      deviceInfo: { deviceId: 'device-1', deviceName: 'Laptop' },
    });

    expect(result.outcome).toBe('success');
    if (result.outcome !== 'success') return;

    expect(result.session.userId).toBe(user.id);
    expect(result.session.deviceId).toBe('device-1');
    expect(result.session.ipAddress).toBe('10.0.0.1');
    expect((await users.findById(user.id))!.lastLoginAt).toBeDefined();

    const sessions = await sessionService.listForUser(TENANT, user.id);
    expect(sessions).toHaveLength(1);
  });

  it('rejects a wrong password and records the attempt', async () => {
    await seedUser();

    await expect(
      auth.authenticate({ tenantId: TENANT, email: 'user@test.com', password: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsError);

    const failures = await loginAttempts.getRecentFailures(`${TENANT}:user@test.com`, new Date(0).toISOString());
    expect(failures).toHaveLength(1);
    expect(failures[0]!.failureReason).toBe('BAD_PASSWORD');
  });

  it('gives the same error for an unknown email as for a bad password', async () => {
    await expect(
      auth.authenticate({ tenantId: TENANT, email: 'nobody@test.com', password: PASSWORD }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('locks the account after the configured number of failures', async () => {
    await seedUser();
    const attempt = () =>
      auth.authenticate({ tenantId: TENANT, email: 'user@test.com', password: 'wrong' });

    await expect(attempt()).rejects.toThrow(InvalidCredentialsError);
    await expect(attempt()).rejects.toThrow(InvalidCredentialsError);
    await expect(attempt()).rejects.toThrow(InvalidCredentialsError);

    // Even the correct password is refused while the lockout holds.
    await expect(
      auth.authenticate({ tenantId: TENANT, email: 'user@test.com', password: PASSWORD }),
    ).rejects.toThrow(AccountLockedError);
  });

  it('clears the lockout counter after a successful login', async () => {
    await seedUser();
    await expect(
      auth.authenticate({ tenantId: TENANT, email: 'user@test.com', password: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsError);

    await auth.authenticate({ tenantId: TENANT, email: 'user@test.com', password: PASSWORD });
    expect(loginProtection.isLocked(`${TENANT}:user@test.com`)).toBe(false);
  });

  it.each([
    [AccountStatus.PENDING_VERIFICATION, AccountPendingVerificationError],
    [AccountStatus.LOCKED, AccountLockedError],
    [AccountStatus.SUSPENDED, AccountDisabledError],
    [AccountStatus.DISABLED, AccountDisabledError],
  ])('refuses a %s account even with the right password', async (status, expectedError) => {
    await seedUser({ accountStatus: status });

    await expect(
      auth.authenticate({ tenantId: TENANT, email: 'user@test.com', password: PASSWORD }),
    ).rejects.toThrow(expectedError);
  });

  describe('with MFA enabled', () => {
    let user: UserRecord;
    let secret: string;

    beforeEach(async () => {
      user = await seedUser();
      const enrollment = await mfaService.enroll(user.id, user.email);
      secret = enrollment.secret;
      await mfaService.activate(user.id, otpService.generate(secret));
      user = (await users.findById(user.id))!;
    });

    it('issues a challenge instead of a session', async () => {
      const result = await auth.authenticate({
        tenantId: TENANT, email: 'user@test.com', password: PASSWORD,
      });

      expect(result.outcome).toBe('mfa_required');
      if (result.outcome !== 'mfa_required') return;
      expect(result.challengeToken).toHaveLength(64);
      expect(await sessionService.listForUser(TENANT, user.id)).toHaveLength(0);
    });

    it('completes the login when the challenge is answered with a TOTP code', async () => {
      const challenge = await auth.authenticate({
        tenantId: TENANT, email: 'user@test.com', password: PASSWORD, rememberMe: true,
      });
      if (challenge.outcome !== 'mfa_required') throw new Error('expected an MFA challenge');

      const result = await auth.completeMfaChallenge(
        challenge.challengeToken,
        otpService.generate(secret),
      );

      expect(result.outcome).toBe('success');
      expect(result.session.userId).toBe(user.id);
      // rememberMe carried over from the first leg extends the session TTL.
      const ttlMs = new Date(result.session.expiresAt).getTime() - new Date(result.session.createdAt).getTime();
      expect(ttlMs).toBe(DEFAULT_SECURITY_CONFIG.session.rememberMeTtlSeconds * 1000);
    });

    it('accepts a backup code and burns it', async () => {
      const enrollment = await mfaService.enroll(user.id, user.email);
      await mfaService.activate(user.id, otpService.generate(enrollment.secret));
      const backupCode = enrollment.backupCodes[0]!;

      const challenge = await auth.authenticate({
        tenantId: TENANT, email: 'user@test.com', password: PASSWORD,
      });
      if (challenge.outcome !== 'mfa_required') throw new Error('expected an MFA challenge');

      const result = await auth.completeMfaChallenge(challenge.challengeToken, backupCode);
      expect(result.outcome).toBe('success');
      expect(await otpSecretStore.getBackupCodes(user.id)).not.toContain(backupCode);
    });

    it('rejects a wrong code and refuses to replay the challenge after success', async () => {
      const challenge = await auth.authenticate({
        tenantId: TENANT, email: 'user@test.com', password: PASSWORD,
      });
      if (challenge.outcome !== 'mfa_required') throw new Error('expected an MFA challenge');

      await expect(auth.completeMfaChallenge(challenge.challengeToken, '000000'))
        .rejects.toThrow(InvalidOtpError);

      await auth.completeMfaChallenge(challenge.challengeToken, otpService.generate(secret));

      await expect(auth.completeMfaChallenge(challenge.challengeToken, otpService.generate(secret)))
        .rejects.toThrow(TokenExpiredError);
    });
  });
});
