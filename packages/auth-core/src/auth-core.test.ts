import { describe, it, expect } from 'vitest';
import { signAccessToken, verifyAccessToken } from './jwt';
import { hashPassword, verifyPassword } from './password';
import { RefreshTokens, hashToken, type IRefreshTokenStore, type RefreshRecord } from './refresh';

const SECRET = 'test-secret-please-change';

describe('jwt', () => {
  it('round-trips claims', async () => {
    const token = signAccessToken(
      { tenantId: 't1', userId: 'u1', role: 'manager', audience: 'admin', scopeId: 'p1' },
      SECRET,
    );
    const claims = await verifyAccessToken(token, SECRET);
    expect(claims).toMatchObject({ tenantId: 't1', userId: 'u1', role: 'manager', audience: 'admin', scopeId: 'p1' });
  });

  it('rejects a token signed with a different secret', async () => {
    const token = signAccessToken({ tenantId: 't1', userId: 'u1', role: 'viewer' }, SECRET);
    await expect(verifyAccessToken(token, 'wrong-secret')).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const token = signAccessToken({ tenantId: 't1', userId: 'u1', role: 'viewer' }, SECRET, -1);
    await expect(verifyAccessToken(token, SECRET)).rejects.toThrow();
  });
});

describe('password', () => {
  it('verifies a correct password and rejects a wrong one', () => {
    const stored = hashPassword('hunter2');
    expect(verifyPassword('hunter2', stored)).toBe(true);
    expect(verifyPassword('nope', stored)).toBe(false);
  });

  it('produces a self-describing scrypt hash and never stores plaintext', () => {
    const stored = hashPassword('secret');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(stored).not.toContain('secret');
  });
});

/** Minimal in-memory refresh store for the rotation test. */
class MemoryRefreshStore implements IRefreshTokenStore {
  private readonly rows = new Map<string, RefreshRecord>();
  async save(record: RefreshRecord): Promise<void> {
    this.rows.set(record.tokenHash, record);
  }
  async find(tokenHash: string): Promise<RefreshRecord | null> {
    return this.rows.get(tokenHash) ?? null;
  }
  async revoke(tokenHash: string): Promise<void> {
    const row = this.rows.get(tokenHash);
    if (row !== undefined) this.rows.set(tokenHash, { ...row, revokedAt: new Date() });
  }
}

describe('refresh token rotation', () => {
  it('rotates: the old token is revoked and a new one issued', async () => {
    const store = new MemoryRefreshStore();
    const svc = new RefreshTokens(store, 3600);
    const first = await svc.issue('t1', 'u1', 'device-a');

    const rotated = await svc.rotate(first);
    expect(rotated).not.toBeNull();
    expect(rotated?.token).not.toBe(first);
    expect(rotated?.userId).toBe('u1');

    // The presented (old) token is now revoked and cannot be reused.
    expect(await svc.rotate(first)).toBeNull();
    // The new token works.
    expect(await svc.rotate(rotated!.token)).not.toBeNull();
  });

  it('returns null for an unknown token', async () => {
    const svc = new RefreshTokens(new MemoryRefreshStore(), 3600);
    expect(await svc.rotate('never-issued')).toBeNull();
  });

  it('returns null for an expired token', async () => {
    const store = new MemoryRefreshStore();
    let clock = 1_000_000;
    const svc = new RefreshTokens(store, 10, () => clock);
    const token = await svc.issue('t1', 'u1');
    clock += 20_000; // advance past the 10s TTL
    expect(await svc.rotate(token)).toBeNull();
  });

  it('stores only a hash, never the raw token', async () => {
    const store = new MemoryRefreshStore();
    const svc = new RefreshTokens(store, 3600);
    const token = await svc.issue('t1', 'u1');
    expect(await store.find(hashToken(token))).not.toBeNull();
    expect(await store.find(token)).toBeNull();
  });
});
