import { newId } from '@mawsoftwares/sdk/kernel/id';
import { toMinor, type Money } from '@mawsoftwares/sdk/kernel/money';

export function createTestId(prefix?: string): string {
  return newId(prefix);
}

export function createTestTimestamps(): { createdAt: string; updatedAt: string } {
  const now = new Date().toISOString();
  return { createdAt: now, updatedAt: now };
}

export function createTestEmail(name?: string): string {
  const slug = name ?? newId().slice(0, 8);
  return `test-${slug}@example.com`;
}

export function createTestMoney(major = 10): Money {
  return toMinor(major);
}

export function createTestTenantId(): string {
  return `tenant_${newId().slice(0, 12)}`;
}

export function createTestUserId(): string {
  return `user_${newId().slice(0, 12)}`;
}

export function incrementingCounter(prefix = 'item'): () => string {
  let count = 0;
  return () => {
    count += 1;
    return `${prefix}_${count}`;
  };
}
