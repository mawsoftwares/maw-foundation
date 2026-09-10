import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidUrl, isValidPhone, applyMask, unmask } from './fields';

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

describe('applyMask', () => {
  it('inserts literal separators as digits are typed', () => {
    expect(applyMask('123456789012', '9999 9999 9999')).toBe('1234 5678 9012');
  });

  it('uppercases letter tokens', () => {
    expect(applyMask('abcde1234f', 'AAAAA9999A')).toBe('ABCDE1234F');
  });

  it('drops non-matching characters', () => {
    expect(applyMask('12a34', '9999')).toBe('1234');
  });

  it('passes through already-formatted input without doubling literals', () => {
    expect(applyMask('1234 5678 9012', '9999 9999 9999')).toBe('1234 5678 9012');
  });

  it('truncates output to the mask length', () => {
    expect(applyMask('123456789', '9999')).toBe('1234');
  });

  it('handles a mix of alphanumeric and literal tokens', () => {
    expect(applyMask('ab12cd', 'AA-99-AA')).toBe('AB-12-CD');
  });
});

describe('unmask', () => {
  it('strips inserted literals back to significant characters', () => {
    expect(unmask('1234 5678 9012', '9999 9999 9999')).toBe('123456789012');
  });

  it('handles a partially-filled masked value', () => {
    expect(unmask('1234 56', '9999 9999 9999')).toBe('123456');
  });
});
