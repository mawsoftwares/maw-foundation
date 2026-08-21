import { describe, it, expect, afterEach } from 'vitest';
import { AesEncryptionService } from './security/AesEncryptionService';
import { MemoryRateLimiter } from './security/MemoryRateLimiter';
import { redact } from './security/LogRedactor';

describe('AesEncryptionService', () => {
  it('round-trips encrypt/decrypt', async () => {
    const svc = new AesEncryptionService('a'.repeat(64));
    const ciphertext = await svc.encrypt('hello world');
    expect(ciphertext.startsWith('v1:')).toBe(true);
    const plaintext = await svc.decrypt(ciphertext);
    expect(plaintext).toBe('hello world');
  });

  it('produces different ciphertext for same input', async () => {
    const svc = new AesEncryptionService('b'.repeat(64));
    const c1 = await svc.encrypt('same');
    const c2 = await svc.encrypt('same');
    expect(c1).not.toBe(c2);
  });

  it('fails to decrypt with wrong key', async () => {
    const svc1 = new AesEncryptionService('a'.repeat(64));
    const svc2 = new AesEncryptionService('b'.repeat(64));
    const ciphertext = await svc1.encrypt('secret');
    await expect(svc2.decrypt(ciphertext)).rejects.toThrow();
  });

  it('generates a valid key', async () => {
    const svc = new AesEncryptionService('a'.repeat(64));
    const key = await svc.generateKey();
    expect(key).toHaveLength(64);
  });
});

describe('MemoryRateLimiter', () => {
  let limiter: MemoryRateLimiter;

  afterEach(() => {
    limiter?.destroy();
  });

  it('allows requests within limit', async () => {
    limiter = new MemoryRateLimiter(0);
    const config = { windowMs: 60_000, maxRequests: 3 };
    const r1 = await limiter.check('key-1', config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
  });

  it('denies requests over limit', async () => {
    limiter = new MemoryRateLimiter(0);
    const config = { windowMs: 60_000, maxRequests: 2 };
    await limiter.check('key-2', config);
    await limiter.check('key-2', config);
    const r3 = await limiter.check('key-2', config);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets a key', async () => {
    limiter = new MemoryRateLimiter(0);
    const config = { windowMs: 60_000, maxRequests: 1 };
    await limiter.check('key-3', config);
    await limiter.reset('key-3');
    const result = await limiter.check('key-3', config);
    expect(result.allowed).toBe(true);
  });
});

describe('LogRedactor', () => {
  it('redacts sensitive fields', () => {
    const input = { username: 'alice', password: 'secret', token: 'abc123' };
    const output = redact(input);
    expect(output.username).toBe('alice');
    expect(output.password).toBe('[REDACTED]');
    expect(output.token).toBe('[REDACTED]');
  });

  it('redacts nested objects', () => {
    const input = { user: { name: 'bob', authorization: 'Bearer xyz' } };
    const output = redact(input);
    expect(output.user.name).toBe('bob');
    expect(output.user.authorization).toBe('[REDACTED]');
  });

  it('handles arrays', () => {
    const input = [{ password: 'x' }, { name: 'y' }];
    const output = redact(input);
    expect(output[0].password).toBe('[REDACTED]');
    expect(output[1].name).toBe('y');
  });

  it('supports additional keys', () => {
    const input = { customSecret: 'value', name: 'test' };
    const output = redact(input, ['customSecret']);
    expect(output.customSecret).toBe('[REDACTED]');
    expect(output.name).toBe('test');
  });
});
