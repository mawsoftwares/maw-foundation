import { describe, it, expect } from 'vitest';
import { DEFAULT_SECURITY_CONFIG, isOriginAllowed, parseCorsOrigins } from './SecurityConfig';
import { PREHASH_HEADER } from './password-prehash';

describe('parseCorsOrigins', () => {
  it('splits, trims, and drops empty entries', () => {
    expect(parseCorsOrigins(' http://localhost:5173 , http://localhost:3000, ')).toEqual([
      'http://localhost:5173',
      'http://localhost:3000',
    ]);
  });
});

describe('isOriginAllowed', () => {
  it('allows every origin when the list is empty', () => {
    expect(isOriginAllowed('http://localhost:5184', [])).toBe(true);
  });

  it('matches an exact origin', () => {
    expect(isOriginAllowed('http://localhost:5173', ['http://localhost:5173'])).toBe(true);
    expect(isOriginAllowed('http://localhost:5184', ['http://localhost:5173'])).toBe(false);
  });

  it('matches localhost port wildcards used when Vite picks another port', () => {
    const allowed = ['http://localhost:*', 'http://127.0.0.1:*'];
    expect(isOriginAllowed('http://localhost:5184', allowed)).toBe(true);
    expect(isOriginAllowed('http://localhost:5173', allowed)).toBe(true);
    expect(isOriginAllowed('http://localhost', allowed)).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:5173', allowed)).toBe(true);
  });

  it('does not treat a port wildcard as a hostname prefix', () => {
    const allowed = ['http://localhost:*'];
    expect(isOriginAllowed('http://localhost.evil.com:5173', allowed)).toBe(false);
    expect(isOriginAllowed('https://localhost:5173', allowed)).toBe(false);
    expect(isOriginAllowed('http://localhost:5173.evil', allowed)).toBe(false);
  });
});

describe('DEFAULT_SECURITY_CONFIG.cors.allowedHeaders', () => {
  it('allows the password-prehash header the login client sends', () => {
    expect(DEFAULT_SECURITY_CONFIG.cors.allowedHeaders).toContain(PREHASH_HEADER);
  });
});
