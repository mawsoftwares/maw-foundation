import { describe, it, expect } from 'vitest';
import { isJwtExpired } from '../index';

function base64url(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeToken(payload: Record<string, unknown>): string {
  const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('isJwtExpired', () => {
  it('returns false for a valid, unexpired token', () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(isJwtExpired(token)).toBe(false);
  });

  it('returns true for an expired token', () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) - 3600 });
    expect(isJwtExpired(token)).toBe(true);
  });

  it('fails open (false) for a malformed token', () => {
    expect(isJwtExpired('not-a-jwt')).toBe(false);
    expect(isJwtExpired('a.b')).toBe(false);
    expect(isJwtExpired('a.!!!not-base64!!!.c')).toBe(false);
  });

  it('fails open (false) for null/undefined', () => {
    expect(isJwtExpired(null)).toBe(false);
    expect(isJwtExpired(undefined)).toBe(false);
  });

  it('fails open (false) when exp claim is missing', () => {
    const token = makeToken({ sub: 'user-1' });
    expect(isJwtExpired(token)).toBe(false);
  });
});
