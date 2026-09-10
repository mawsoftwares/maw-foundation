import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidUrl, isValidPhone } from './fields';

describe('isValidEmail', () => {
  it('accepts a plausible address', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('rejects a string with no @', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
  });

  it('rejects a missing domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });
});

describe('isValidUrl', () => {
  it('accepts an http(s) URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://example.com/path?x=1')).toBe(true);
  });

  it('rejects a URL missing the scheme', () => {
    expect(isValidUrl('example.com')).toBe(false);
  });

  it('rejects a non-http(s) scheme', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('accepts a plain international number', () => {
    expect(isValidPhone('+1 234 567 8900')).toBe(true);
  });

  it('accepts digits with hyphens/parentheses', () => {
    expect(isValidPhone('(123) 456-7890')).toBe(true);
  });

  it('rejects a too-short number', () => {
    expect(isValidPhone('12345')).toBe(false);
  });

  it('rejects letters', () => {
    expect(isValidPhone('call-me-maybe')).toBe(false);
  });
});
