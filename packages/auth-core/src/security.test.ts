import { describe, it, expect, afterEach } from 'vitest';
import { MemoryTokenBlacklist } from './token-blacklist';
import { LoginProtection } from './login-protection';
import { signAccessToken, verifyAccessToken } from './jwt';
import { validatePassword, DEFAULT_PASSWORD_POLICY } from '@maw/sdk/security/PasswordPolicy';

const SECRET = 'test-secret-please-change';

describe('MemoryTokenBlacklist', () => {
  let blacklist: MemoryTokenBlacklist;

  afterEach(() => {
    blacklist?.destroy();
  });

  it('adds and checks a blacklisted jti', async () => {
    blacklist = new MemoryTokenBlacklist(0);
    await blacklist.add('jti-1', Math.floor(Date.now() / 1000) + 3600);
    expect(await blacklist.isBlacklisted('jti-1')).toBe(true);
    expect(await blacklist.isBlacklisted('jti-unknown')).toBe(false);
  });

  it('auto-expires entries', async () => {
    blacklist = new MemoryTokenBlacklist(0);
    await blacklist.add('jti-old', Math.floor(Date.now() / 1000) - 10);
    expect(await blacklist.isBlacklisted('jti-old')).toBe(false);
  });
});

describe('LoginProtection', () => {
  it('locks after max attempts', () => {
    const lp = new LoginProtection({ maxAttempts: 3, lockoutDurationMs: 5000, progressiveDelay: false });
    lp.recordFailure('user-1');
    lp.recordFailure('user-1');
    const result = lp.recordFailure('user-1');
    expect(result.locked).toBe(true);
    expect(result.attemptsRemaining).toBe(0);
    expect(lp.isLocked('user-1')).toBe(true);
  });

  it('resets on success', () => {
    const lp = new LoginProtection({ maxAttempts: 3, lockoutDurationMs: 5000, progressiveDelay: false });
    lp.recordFailure('user-2');
    lp.recordFailure('user-2');
    lp.recordSuccess('user-2');
    expect(lp.isLocked('user-2')).toBe(false);
    const result = lp.recordFailure('user-2');
    expect(result.attemptsRemaining).toBe(2);
  });

  it('returns progressive delay', () => {
    const lp = new LoginProtection({ maxAttempts: 5, lockoutDurationMs: 5000, progressiveDelay: true });
    const r1 = lp.recordFailure('user-3');
    expect(r1.retryAfterMs).toBe(1000);
    const r2 = lp.recordFailure('user-3');
    expect(r2.retryAfterMs).toBe(2000);
  });
});

describe('JWT with jti and blacklist', () => {
  it('includes jti when issueJti is true', async () => {
    const token = signAccessToken(
      { tenantId: 't1', userId: 'u1', role: 'admin' },
      SECRET,
      { issueJti: true },
    );
    const claims = await verifyAccessToken(token, SECRET);
    expect(claims.jti).toBeDefined();
    expect(typeof claims.jti).toBe('string');
  });

  it('omits jti by default', async () => {
    const token = signAccessToken({ tenantId: 't1', userId: 'u1', role: 'admin' }, SECRET);
    const claims = await verifyAccessToken(token, SECRET);
    expect(claims.jti).toBeUndefined();
  });

  it('rejects blacklisted token', async () => {
    const blacklist = new MemoryTokenBlacklist(0);
    const token = signAccessToken(
      { tenantId: 't1', userId: 'u1', role: 'admin' },
      SECRET,
      { issueJti: true },
    );
    const claims = await verifyAccessToken(token, SECRET);
    await blacklist.add(claims.jti!, Math.floor(Date.now() / 1000) + 3600);
    await expect(verifyAccessToken(token, SECRET, { blacklist })).rejects.toThrow('token has been revoked');
    blacklist.destroy();
  });
});

describe('PasswordPolicy (SDK)', () => {
  it('rejects too-short passwords', () => {
    const errors = validatePassword('Ab1', DEFAULT_PASSWORD_POLICY);
    expect(errors.some((e) => e.rule === 'minLength')).toBe(true);
  });

  it('rejects missing uppercase', () => {
    const errors = validatePassword('abcdefgh1', DEFAULT_PASSWORD_POLICY);
    expect(errors.some((e) => e.rule === 'requireUppercase')).toBe(true);
  });

  it('rejects missing number', () => {
    const errors = validatePassword('Abcdefgh', DEFAULT_PASSWORD_POLICY);
    expect(errors.some((e) => e.rule === 'requireNumber')).toBe(true);
  });

  it('accepts a strong password', () => {
    const errors = validatePassword('StrongPass1', DEFAULT_PASSWORD_POLICY);
    expect(errors).toHaveLength(0);
  });
});
