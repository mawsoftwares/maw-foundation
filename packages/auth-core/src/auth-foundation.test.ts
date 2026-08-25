import { describe, it, expect, beforeEach } from 'vitest';
import { AccountStatus, DEFAULT_SECURITY_CONFIG } from '@maw/sdk';
import type { IUserRepository, UserRecord, CreateUserInput } from '@maw/sdk/contracts/IUserRepository';
import type { AccountStatusValue } from '@maw/sdk/security/AccountStatus';
import { randomUUID } from 'node:crypto';
import {
  transitionAccount,
  canApplyEvent,
  AccountEvent,
} from './account-status';
import {
  MemorySessionStore,
  SessionService,
} from './session-store';
import {
  MemoryEmailVerificationStore,
  EmailVerification,
} from './email-verification';
import {
  RegistrationService,
  type RegistrationInput,
} from './registration';
import {
  MemoryPasswordResetStore,
  PasswordResetService,
} from './password-reset';
import {
  PasswordChangeService,
} from './password-change';
import {
  OtpService,
  MemoryOtpSecretStore,
  MfaService,
} from './otp';
import {
  MemoryLoginAttemptStore,
} from './login-attempt-store';
import { LoginProtection } from './login-protection';
import {
  MemorySocialAccountStore,
  SocialAuthService,
  type ISocialAuthProvider,
  type SocialAuthProfile,
} from './social-auth';
import {
  DuplicateEmailError,
  PasswordPolicyError,
  TokenExpiredError,
  TokenAlreadyUsedError,
  InvalidCredentialsError,
} from './auth-errors';
import { ScryptHasher } from './password';

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
}

// ---------------------------------------------------------------------------
// Account Status State Machine
// ---------------------------------------------------------------------------

describe('Account Status State Machine', () => {
  it('transitions PENDING_VERIFICATION → ACTIVE on VERIFY_EMAIL', () => {
    expect(transitionAccount(AccountStatus.PENDING_VERIFICATION, AccountEvent.VERIFY_EMAIL)).toBe(AccountStatus.ACTIVE);
  });

  it('transitions ACTIVE → SUSPENDED on SUSPEND', () => {
    expect(transitionAccount(AccountStatus.ACTIVE, AccountEvent.SUSPEND)).toBe(AccountStatus.SUSPENDED);
  });

  it('transitions SUSPENDED → ACTIVE on UNSUSPEND', () => {
    expect(transitionAccount(AccountStatus.SUSPENDED, AccountEvent.UNSUSPEND)).toBe(AccountStatus.ACTIVE);
  });

  it('transitions ACTIVE → LOCKED on LOCK', () => {
    expect(transitionAccount(AccountStatus.ACTIVE, AccountEvent.LOCK)).toBe(AccountStatus.LOCKED);
  });

  it('transitions LOCKED → ACTIVE on UNLOCK', () => {
    expect(transitionAccount(AccountStatus.LOCKED, AccountEvent.UNLOCK)).toBe(AccountStatus.ACTIVE);
  });

  it('transitions ACTIVE → DISABLED on DISABLE', () => {
    expect(transitionAccount(AccountStatus.ACTIVE, AccountEvent.DISABLE)).toBe(AccountStatus.DISABLED);
  });

  it('rejects invalid transition', () => {
    expect(() => transitionAccount(AccountStatus.DISABLED, AccountEvent.VERIFY_EMAIL)).toThrow();
  });

  it('canApplyEvent returns false for invalid', () => {
    expect(canApplyEvent(AccountStatus.DISABLED, AccountEvent.UNLOCK)).toBe(false);
  });

  it('canApplyEvent returns true for valid', () => {
    expect(canApplyEvent(AccountStatus.ACTIVE, AccountEvent.SUSPEND)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Session Service
// ---------------------------------------------------------------------------

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    service = new SessionService({
      store: new MemorySessionStore(),
      config: { maxConcurrentSessions: 3, sessionTtlSeconds: 3600, rememberMeTtlSeconds: 2592000 },
    });
  });

  it('creates a session', async () => {
    const session = await service.create('t1', 'u1');
    expect(session.tenantId).toBe('t1');
    expect(session.userId).toBe('u1');
    expect(session.revokedAt).toBeNull();
  });

  it('lists active sessions for a user', async () => {
    await service.create('t1', 'u1');
    await service.create('t1', 'u1');
    const list = await service.listForUser('t1', 'u1');
    expect(list).toHaveLength(2);
  });

  it('revokes a session', async () => {
    const session = await service.create('t1', 'u1');
    await service.revoke(session.id);
    const list = await service.listForUser('t1', 'u1');
    expect(list).toHaveLength(0);
  });

  it('revokes all except current', async () => {
    const s1 = await service.create('t1', 'u1');
    await service.create('t1', 'u1');
    await service.create('t1', 'u1');
    await service.revokeAll('t1', 'u1', s1.id);
    const list = await service.listForUser('t1', 'u1');
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(s1.id);
  });

  it('enforces max concurrent sessions by revoking oldest', async () => {
    await service.create('t1', 'u1');
    await service.create('t1', 'u1');
    await service.create('t1', 'u1');
    await service.create('t1', 'u1');
    const list = await service.listForUser('t1', 'u1');
    expect(list).toHaveLength(3);
  });

  it('uses remember-me TTL when flagged', async () => {
    const short = await service.create('t1', 'u1', { rememberMe: false });
    const long = await service.create('t1', 'u1', { rememberMe: true });
    const shortExpiry = new Date(short.expiresAt).getTime() - new Date(short.createdAt).getTime();
    const longExpiry = new Date(long.expiresAt).getTime() - new Date(long.createdAt).getTime();
    expect(longExpiry).toBeGreaterThan(shortExpiry);
  });
});

// ---------------------------------------------------------------------------
// Email Verification
// ---------------------------------------------------------------------------

describe('EmailVerification', () => {
  let ev: EmailVerification;

  beforeEach(() => {
    ev = new EmailVerification({ store: new MemoryEmailVerificationStore(), ttlSeconds: 3600 });
  });

  it('generates and verifies a token', async () => {
    const { token } = await ev.generate('u1', 'test@example.com');
    const result = await ev.verify(token);
    expect(result.userId).toBe('u1');
    expect(result.email).toBe('test@example.com');
  });

  it('rejects used token', async () => {
    const { token } = await ev.generate('u1', 'test@example.com');
    await ev.verify(token);
    await expect(ev.verify(token)).rejects.toThrow(TokenAlreadyUsedError);
  });

  it('rejects expired token', async () => {
    const short = new EmailVerification({ store: new MemoryEmailVerificationStore(), ttlSeconds: -1 });
    const { token } = await short.generate('u1', 'test@example.com');
    await expect(short.verify(token)).rejects.toThrow(TokenExpiredError);
  });

  it('rejects invalid token', async () => {
    await expect(ev.verify('bogus')).rejects.toThrow(TokenExpiredError);
  });

  it('resend deletes old and creates new', async () => {
    const first = await ev.generate('u1', 'test@example.com');
    const second = await ev.resend('u1', 'test@example.com');
    expect(second.token).not.toBe(first.token);
    await expect(ev.verify(first.token)).rejects.toThrow();
    const result = await ev.verify(second.token);
    expect(result.userId).toBe('u1');
  });
});

// ---------------------------------------------------------------------------
// Registration Service
// ---------------------------------------------------------------------------

describe('RegistrationService', () => {
  let userRepo: MemoryUserRepository;
  let service: RegistrationService;

  beforeEach(() => {
    userRepo = new MemoryUserRepository();
    service = new RegistrationService({
      userRepository: userRepo,
      hasher: ScryptHasher,
      passwordPolicy: DEFAULT_SECURITY_CONFIG.passwordPolicy,
      registrationConfig: { requireEmailVerification: true, emailVerificationTtlSeconds: 3600, defaultRole: 'viewer' },
      emailVerification: new EmailVerification({ store: new MemoryEmailVerificationStore(), ttlSeconds: 3600 }),
    });
  });

  it('registers a user with verification', async () => {
    const result = await service.register({ email: 'new@test.com', password: 'StrongP@ss1', tenantId: 't1' });
    expect(result.user.accountStatus).toBe(AccountStatus.PENDING_VERIFICATION);
    expect(result.verificationToken).toBeDefined();
  });

  it('registers without verification when disabled', async () => {
    const noVerify = new RegistrationService({
      userRepository: userRepo,
      hasher: ScryptHasher,
      passwordPolicy: DEFAULT_SECURITY_CONFIG.passwordPolicy,
      registrationConfig: { requireEmailVerification: false, emailVerificationTtlSeconds: 3600, defaultRole: 'viewer' },
    });
    const result = await noVerify.register({ email: 'new2@test.com', password: 'StrongP@ss1', tenantId: 't1' });
    expect(result.user.accountStatus).toBe(AccountStatus.ACTIVE);
    expect(result.verificationToken).toBeUndefined();
  });

  it('rejects duplicate email', async () => {
    await service.register({ email: 'dup@test.com', password: 'StrongP@ss1', tenantId: 't1' });
    await expect(service.register({ email: 'dup@test.com', password: 'StrongP@ss1', tenantId: 't1' })).rejects.toThrow(DuplicateEmailError);
  });

  it('rejects weak password', async () => {
    await expect(service.register({ email: 'weak@test.com', password: 'short', tenantId: 't1' })).rejects.toThrow(PasswordPolicyError);
  });

  it('verifies email and activates account', async () => {
    const result = await service.register({ email: 'verify@test.com', password: 'StrongP@ss1', tenantId: 't1' });
    const user = await service.verifyEmail(result.verificationToken!);
    expect(user.accountStatus).toBe(AccountStatus.ACTIVE);
    expect(user.emailVerified).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Password Reset Service
// ---------------------------------------------------------------------------

describe('PasswordResetService', () => {
  let userRepo: MemoryUserRepository;
  let service: PasswordResetService;
  let sentEmails: { email: string; token: string }[];

  beforeEach(async () => {
    userRepo = new MemoryUserRepository();
    sentEmails = [];
    const hasher = ScryptHasher;
    await userRepo.create({
      tenantId: 't1',
      email: 'existing@test.com',
      passwordHash: await hasher.hash('OldP@ss123'),
      role: 'viewer',
      accountStatus: AccountStatus.ACTIVE,
    });

    service = new PasswordResetService({
      userRepository: userRepo,
      hasher,
      passwordPolicy: DEFAULT_SECURITY_CONFIG.passwordPolicy,
      resetConfig: { ttlSeconds: 3600, maxAttempts: 3 },
      store: new MemoryPasswordResetStore(),
      sendResetEmail: async (email, token) => { sentEmails.push({ email, token }); },
    });
  });

  it('sends reset email for existing user', async () => {
    await service.requestReset('t1', 'existing@test.com');
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]!.email).toBe('existing@test.com');
  });

  it('silently succeeds for non-existent user (enumeration-safe)', async () => {
    await service.requestReset('t1', 'nobody@test.com');
    expect(sentEmails).toHaveLength(0);
  });

  it('resets password with valid token', async () => {
    await service.requestReset('t1', 'existing@test.com');
    const token = sentEmails[0]!.token;
    await service.executeReset(token, 'NewStr0ng!Pass');
  });

  it('rejects invalid reset token', async () => {
    await expect(service.executeReset('invalid', 'NewStr0ng!Pass')).rejects.toThrow(TokenExpiredError);
  });

  it('rejects used reset token', async () => {
    await service.requestReset('t1', 'existing@test.com');
    const token = sentEmails[0]!.token;
    await service.executeReset(token, 'NewStr0ng!Pass');
    await expect(service.executeReset(token, 'Another1!')).rejects.toThrow(TokenAlreadyUsedError);
  });

  it('rejects weak new password on reset', async () => {
    await service.requestReset('t1', 'existing@test.com');
    const token = sentEmails[0]!.token;
    await expect(service.executeReset(token, 'weak')).rejects.toThrow(PasswordPolicyError);
  });
});

// ---------------------------------------------------------------------------
// Password Change Service
// ---------------------------------------------------------------------------

describe('PasswordChangeService', () => {
  let userRepo: MemoryUserRepository;
  let service: PasswordChangeService;

  beforeEach(async () => {
    userRepo = new MemoryUserRepository();
    await userRepo.create({
      tenantId: 't1',
      email: 'user@test.com',
      passwordHash: await ScryptHasher.hash('Current1!'),
      role: 'viewer',
      accountStatus: AccountStatus.ACTIVE,
    });

    service = new PasswordChangeService({
      userRepository: userRepo,
      hasher: ScryptHasher,
      passwordPolicy: DEFAULT_SECURITY_CONFIG.passwordPolicy,
    });
  });

  it('changes password with correct current', async () => {
    const user = await userRepo.findByEmail('t1', 'user@test.com');
    await service.change(user!.id, 'Current1!', 'NewP@ssw0rd');
    const updated = await userRepo.findById(user!.id);
    expect(await ScryptHasher.verify('NewP@ssw0rd', updated!.passwordHash)).toBe(true);
  });

  it('rejects wrong current password', async () => {
    const user = await userRepo.findByEmail('t1', 'user@test.com');
    await expect(service.change(user!.id, 'WrongPass1!', 'NewP@ssw0rd')).rejects.toThrow(InvalidCredentialsError);
  });

  it('rejects weak new password', async () => {
    const user = await userRepo.findByEmail('t1', 'user@test.com');
    await expect(service.change(user!.id, 'Current1!', 'weak')).rejects.toThrow(PasswordPolicyError);
  });
});

// ---------------------------------------------------------------------------
// OTP Service
// ---------------------------------------------------------------------------

describe('OtpService', () => {
  const config = { issuer: 'TestApp', digits: 6, stepSeconds: 30, window: 1 };
  let otpService: OtpService;

  beforeEach(() => {
    otpService = new OtpService(config);
  });

  it('generates a secret and otpauth URI', () => {
    const { secret, otpauthUri } = otpService.generateSecret('user@test.com');
    expect(secret).toBeTruthy();
    expect(otpauthUri).toContain('otpauth://totp/');
    expect(otpauthUri).toContain('TestApp');
  });

  it('generates backup codes', () => {
    const codes = otpService.generateBackupCodes(8);
    expect(codes).toHaveLength(8);
    const unique = new Set(codes);
    expect(unique.size).toBe(8);
  });

  it('verifies a valid TOTP', () => {
    const { secret } = otpService.generateSecret('user@test.com');
    const { createHmac } = require('node:crypto');
    const now = BigInt(Math.floor(Date.now() / 1000));
    const counter = now / BigInt(config.stepSeconds);
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeBigUInt64BE(counter);
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleaned = secret.replace(/=+$/, '').toUpperCase();
    let bits = 0; let value = 0; const bytes: number[] = [];
    for (const char of cleaned) {
      const idx = base32Chars.indexOf(char);
      if (idx === -1) continue;
      value = (value << 5) | idx; bits += 5;
      if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
    }
    const key = Buffer.from(bytes);
    const hmac = createHmac('sha1', key).update(counterBuf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = ((hmac[offset] & 0x7f) << 24 | (hmac[offset+1] & 0xff) << 16 | (hmac[offset+2] & 0xff) << 8 | (hmac[offset+3] & 0xff)) % (10 ** 6);
    const token = code.toString().padStart(6, '0');
    expect(otpService.verify(secret, token)).toBe(true);
  });

  it('rejects an invalid TOTP', () => {
    const { secret } = otpService.generateSecret('user@test.com');
    expect(otpService.verify(secret, '000000')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MFA Service
// ---------------------------------------------------------------------------

describe('MfaService', () => {
  let mfaService: MfaService;
  let userRepo: MemoryUserRepository;

  beforeEach(async () => {
    userRepo = new MemoryUserRepository();
    await userRepo.create({
      tenantId: 't1',
      email: 'mfa@test.com',
      passwordHash: 'hash',
      role: 'viewer',
      accountStatus: AccountStatus.ACTIVE,
    });

    const otpService = new OtpService({ issuer: 'Test', digits: 6, stepSeconds: 30, window: 1 });
    mfaService = new MfaService({
      otpService,
      store: new MemoryOtpSecretStore(),
      encryptionService: {
        async encrypt(plain: string) { return Buffer.from(plain).toString('base64'); },
        async decrypt(cipher: string) { return Buffer.from(cipher, 'base64').toString(); },
      },
      userRepository: userRepo,
      hasher: ScryptHasher,
    });
  });

  it('enrolls and returns secret + backup codes', async () => {
    const user = await userRepo.findByEmail('t1', 'mfa@test.com');
    const result = await mfaService.enroll(user!.id, 'mfa@test.com');
    expect(result.secret).toBeTruthy();
    expect(result.otpauthUri).toContain('otpauth://');
    expect(result.backupCodes.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Login Attempt Store
// ---------------------------------------------------------------------------

describe('MemoryLoginAttemptStore', () => {
  it('records and retrieves failures', async () => {
    const store = new MemoryLoginAttemptStore();
    await store.record({ key: 'k1', timestamp: new Date().toISOString(), success: false });
    await store.record({ key: 'k1', timestamp: new Date().toISOString(), success: true });
    await store.record({ key: 'k1', timestamp: new Date().toISOString(), success: false });
    const failures = await store.getRecentFailures('k1', new Date(0).toISOString());
    expect(failures).toHaveLength(2);
  });

  it('clears attempts for a key', async () => {
    const store = new MemoryLoginAttemptStore();
    await store.record({ key: 'k1', timestamp: new Date().toISOString(), success: false });
    await store.clear('k1');
    const failures = await store.getRecentFailures('k1', new Date(0).toISOString());
    expect(failures).toHaveLength(0);
  });
});

describe('LoginProtection with persistent store', () => {
  it('persists failures to the store', async () => {
    const store = new MemoryLoginAttemptStore();
    const protection = new LoginProtection({}, store);
    protection.recordFailure('user@test.com', { ipAddress: '1.2.3.4' });
    await new Promise((r) => setTimeout(r, 10));
    const failures = await store.getRecentFailures('user@test.com', new Date(0).toISOString());
    expect(failures).toHaveLength(1);
  });

  it('clears persistent store on success', async () => {
    const store = new MemoryLoginAttemptStore();
    const protection = new LoginProtection({}, store);
    protection.recordFailure('user@test.com');
    await new Promise((r) => setTimeout(r, 10));
    protection.recordSuccess('user@test.com');
    await new Promise((r) => setTimeout(r, 10));
    const failures = await store.getRecentFailures('user@test.com', new Date(0).toISOString());
    expect(failures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Social Auth Service
// ---------------------------------------------------------------------------

describe('SocialAuthService', () => {
  let userRepo: MemoryUserRepository;
  let socialStore: MemorySocialAccountStore;
  let service: SocialAuthService;

  const mockProvider: ISocialAuthProvider = {
    providerName: 'google',
    async exchangeCode(_code: string, _redirectUri: string): Promise<SocialAuthProfile> {
      return { provider: 'google', providerId: 'g-123', email: 'social@test.com', emailVerified: true, name: 'Social User' };
    },
  };

  beforeEach(() => {
    userRepo = new MemoryUserRepository();
    socialStore = new MemorySocialAccountStore();
    service = new SocialAuthService({
      providers: new Map([['google', mockProvider]]),
      socialAccountStore: socialStore,
      userRepository: userRepo,
      hasher: ScryptHasher,
    });
  });

  it('auto-registers a new user on first social login', async () => {
    const result = await service.authenticate('google', 'code', 'http://localhost', 't1');
    expect(result.isNewUser).toBe(true);
    expect(result.user.email).toBe('social@test.com');
    expect(result.linkedProviders).toContain('google');
  });

  it('returns existing user on subsequent social login', async () => {
    const first = await service.authenticate('google', 'code', 'http://localhost', 't1');
    const second = await service.authenticate('google', 'code', 'http://localhost', 't1');
    expect(second.isNewUser).toBe(false);
    expect(second.user.id).toBe(first.user.id);
  });

  it('links to existing user by email match', async () => {
    await userRepo.create({
      tenantId: 't1',
      email: 'social@test.com',
      passwordHash: 'hash',
      role: 'viewer',
      accountStatus: AccountStatus.ACTIVE,
    });
    const result = await service.authenticate('google', 'code', 'http://localhost', 't1');
    expect(result.isNewUser).toBe(false);
    expect(result.linkedProviders).toContain('google');
  });

  it('unlinks a provider', async () => {
    const result = await service.authenticate('google', 'code', 'http://localhost', 't1');
    await service.unlinkAccount(result.user.id, 'google');
    const providers = await service.getLinkedProviders(result.user.id);
    expect(providers).toHaveLength(0);
  });

  it('throws for unknown provider', async () => {
    await expect(service.authenticate('facebook', 'code', 'http://localhost', 't1')).rejects.toThrow('Unknown social auth provider');
  });
});
