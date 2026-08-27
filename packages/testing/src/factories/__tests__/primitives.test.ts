import { describe, it, expect } from 'vitest';
import {
  createTestId,
  createTestTimestamps,
  createTestEmail,
  createTestMoney,
  createTestTenantId,
  createTestUserId,
  incrementingCounter,
} from '../primitives';

describe('primitives', () => {
  it('createTestId generates unique IDs', () => {
    const a = createTestId();
    const b = createTestId();
    expect(a).not.toBe(b);
    expect(typeof a).toBe('string');
    expect(a.length).toBeGreaterThan(0);
  });

  it('createTestId with prefix', () => {
    const id = createTestId('usr');
    expect(id).toMatch(/^usr/);
  });

  it('createTestTimestamps returns ISO strings', () => {
    const ts = createTestTimestamps();
    expect(new Date(ts.createdAt).toISOString()).toBe(ts.createdAt);
    expect(new Date(ts.updatedAt).toISOString()).toBe(ts.updatedAt);
  });

  it('createTestEmail without name', () => {
    const email = createTestEmail();
    expect(email).toMatch(/^test-\w+@example\.com$/);
  });

  it('createTestEmail with name', () => {
    const email = createTestEmail('admin');
    expect(email).toBe('test-admin@example.com');
  });

  it('createTestMoney defaults to 1000 (10 major)', () => {
    expect(createTestMoney()).toBe(1000);
  });

  it('createTestMoney with custom major', () => {
    expect(createTestMoney(25)).toBe(2500);
  });

  it('createTestTenantId has tenant_ prefix', () => {
    expect(createTestTenantId()).toMatch(/^tenant_/);
  });

  it('createTestUserId has user_ prefix', () => {
    expect(createTestUserId()).toMatch(/^user_/);
  });

  it('incrementingCounter produces sequential values', () => {
    const next = incrementingCounter('task');
    expect(next()).toBe('task_1');
    expect(next()).toBe('task_2');
    expect(next()).toBe('task_3');
  });

  it('incrementingCounter with default prefix', () => {
    const next = incrementingCounter();
    expect(next()).toBe('item_1');
  });
});
