import { describe, it, expect, beforeEach } from 'vitest';
import { AccountStatus, DEFAULT_SECURITY_CONFIG } from '@mawsoftwares/sdk';
import type { IUserRepository, UserRecord, CreateUserInput } from '@mawsoftwares/sdk/contracts/IUserRepository';
import type { AccountStatusValue } from '@mawsoftwares/sdk/security/AccountStatus';
import { randomUUID } from 'node:crypto';
import {
  MemorySessionStore,
  SessionService,
  MemoryEmailVerificationStore,
  EmailVerification,
  RegistrationService,
  MemoryPasswordResetStore,
  PasswordResetService,
  PasswordChangeService,
  ScryptHasher,
} from './index';

class MemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, UserRecord>();

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(tenantId: string, email: string): Promise<UserRecord | null> {
    for (const u of this.users.values()) {
      if (u.tenantId === tenantId && u.email === email) return u;
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
}

describe('Auth Foundation Integration', () => {
  let userRepo: MemoryUserRepository;
  let sessionService: SessionService;
  let registrationService: RegistrationService;
  let emailVerification: EmailVerification;
  let passwordResetService: PasswordResetService;
  let passwordChangeService: PasswordChangeService;
  let resetEmails: { email: string; token: string }[];

  beforeEach(() => {
    userRepo = new MemoryUserRepository();
    const hasher = ScryptHasher;

    sessionService = new SessionService({
      store: new MemorySessionStore(),
      config: DEFAULT_SECURITY_CONFIG.session,
    });

    emailVerification = new EmailVerification({
      store: new MemoryEmailVerificationStore(),
      ttlSeconds: DEFAULT_SECURITY_CONFIG.registration.emailVerificationTtlSeconds,
    });

    registrationService = new RegistrationService({
      userRepository: userRepo,
      hasher,
      passwordPolicy: DEFAULT_SECURITY_CONFIG.passwordPolicy,
      registrationConfig: DEFAULT_SECURITY_CONFIG.registration,
      emailVerification,
    });

    resetEmails = [];
    passwordResetService = new PasswordResetService({
      userRepository: userRepo,
      hasher,
      passwordPolicy: DEFAULT_SECURITY_CONFIG.passwordPolicy,
      resetConfig: DEFAULT_SECURITY_CONFIG.passwordReset,
      store: new MemoryPasswordResetStore(),
      sendResetEmail: async (email, token) => { resetEmails.push({ email, token }); },
      sessionService,
    });

    passwordChangeService = new PasswordChangeService({
      userRepository: userRepo,
      hasher,
      passwordPolicy: DEFAULT_SECURITY_CONFIG.passwordPolicy,
    });
  });

  it('full lifecycle: register → verify → login → change password → forgot → reset → sessions', async () => {
    // 1. Register
    const { user, verificationToken } = await registrationService.register({
      email: 'lifecycle@test.com',
      password: 'InitialP@ss1',
      tenantId: 't1',
    });
    expect(user.accountStatus).toBe(AccountStatus.PENDING_VERIFICATION);
    expect(verificationToken).toBeDefined();

    // 2. Verify email
    const verified = await registrationService.verifyEmail(verificationToken!);
    expect(verified.accountStatus).toBe(AccountStatus.ACTIVE);
    expect(verified.emailVerified).toBe(true);

    // 3. Create a session (simulating login)
    const session = await sessionService.create(user.tenantId, user.id, { rememberMe: false });
    expect(session.userId).toBe(user.id);

    // 4. Change password
    await passwordChangeService.change(user.id, 'InitialP@ss1', 'Changed1!Pwd');

    // 5. Verify old password no longer works
    const updated = await userRepo.findById(user.id);
    expect(await ScryptHasher.verify('InitialP@ss1', updated!.passwordHash)).toBe(false);
    expect(await ScryptHasher.verify('Changed1!Pwd', updated!.passwordHash)).toBe(true);

    // 6. Forgot password → request reset
    await passwordResetService.requestReset('t1', 'lifecycle@test.com');
    expect(resetEmails).toHaveLength(1);

    // 7. Reset password
    await passwordResetService.executeReset(resetEmails[0]!.token, 'ResetNew1!Pass');

    // 8. Verify the new password works
    const afterReset = await userRepo.findById(user.id);
    expect(await ScryptHasher.verify('ResetNew1!Pass', afterReset!.passwordHash)).toBe(true);

    // 9. Sessions should be revoked after password reset
    const activeSessions = await sessionService.listForUser('t1', user.id);
    expect(activeSessions).toHaveLength(0);

    // 10. Create new session after reset
    const newSession = await sessionService.create('t1', user.id);
    const sessions = await sessionService.listForUser('t1', user.id);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.id).toBe(newSession.id);
  });

  it('multiple sessions management', async () => {
    const { user } = await registrationService.register({
      email: 'multi@test.com',
      password: 'StrongP@ss1',
      tenantId: 't1',
    });

    const s1 = await sessionService.create('t1', user.id, { deviceInfo: { deviceId: 'd1', deviceName: 'Phone' } });
    const s2 = await sessionService.create('t1', user.id, { deviceInfo: { deviceId: 'd2', deviceName: 'Laptop' } });
    const s3 = await sessionService.create('t1', user.id, { deviceInfo: { deviceId: 'd3', deviceName: 'Tablet' } });

    let sessions = await sessionService.listForUser('t1', user.id);
    expect(sessions).toHaveLength(3);

    await sessionService.revoke(s2.id);
    sessions = await sessionService.listForUser('t1', user.id);
    expect(sessions).toHaveLength(2);
    expect(sessions.find((s) => s.id === s2.id)).toBeUndefined();

    await sessionService.revokeAll('t1', user.id, s1.id);
    sessions = await sessionService.listForUser('t1', user.id);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.id).toBe(s1.id);
  });
});
