import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  phone,
  setDefaultPhoneRegion,
  getDefaultPhoneRegion,
  getPhoneProfile,
  normalizePhoneDigits,
} from './validate';

describe('phone region profiles', () => {
  const previous = getDefaultPhoneRegion();

  afterEach(() => {
    setDefaultPhoneRegion(previous);
  });

  it('defaults to IN profile', () => {
    setDefaultPhoneRegion('IN');
    expect(getDefaultPhoneRegion()).toBe('IN');
    expect(getPhoneProfile().minDigits).toBe(10);
    expect(getPhoneProfile().placeholder).toBe('9876543210');
  });

  it('falls back to INTL for unknown regions', () => {
    expect(getPhoneProfile('XX').region).toBe('INTL');
  });
});

describe('phone (IN)', () => {
  beforeEach(() => setDefaultPhoneRegion('IN'));
  afterEach(() => setDefaultPhoneRegion('IN'));

  it('accepts a 10-digit Indian mobile', () => {
    expect(phone('9876543210').valid).toBe(true);
  });

  it('accepts +91 and 91 prefixes', () => {
    expect(phone('+919876543210').valid).toBe(true);
    expect(phone('919876543210').valid).toBe(true);
  });

  it('accepts a leading 0 trunk prefix', () => {
    expect(phone('09876543210').valid).toBe(true);
  });

  it('rejects too few digits', () => {
    const result = phone('987654321');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at least 10/);
  });

  it('rejects landline-like numbers starting with 2', () => {
    const result = phone('2123456789');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Indian mobile/);
  });

  it('rejects letters', () => {
    expect(phone('call-me-maybe').valid).toBe(false);
  });

  it('normalizes IN digits', () => {
    expect(normalizePhoneDigits('+91 98765-43210', 'IN')).toBe('9876543210');
  });
});

describe('phone (INTL)', () => {
  beforeEach(() => setDefaultPhoneRegion('INTL'));
  afterEach(() => setDefaultPhoneRegion('IN'));

  it('accepts an international E.164-ish number', () => {
    expect(phone('+1 234 567 8900').valid).toBe(true);
  });

  it('rejects too few digits', () => {
    const result = phone('12345');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at least 7/);
  });

  it('rejects too many digits', () => {
    const result = phone('1234567890123456');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at most 15/);
  });
});
