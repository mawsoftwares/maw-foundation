import type { IHasher } from '@mawsoftwares/sdk/contracts/IHasher';

export interface PasswordHistoryEntry {
  readonly passwordHash: string;
  readonly createdAt: string;
}

export interface IPasswordHistoryStore {
  getRecent(userId: string, count: number): Promise<readonly PasswordHistoryEntry[]>;
  record(userId: string, passwordHash: string): Promise<void>;
}

export class MemoryPasswordHistoryStore implements IPasswordHistoryStore {
  private readonly store = new Map<string, PasswordHistoryEntry[]>();

  async getRecent(userId: string, count: number): Promise<readonly PasswordHistoryEntry[]> {
    const entries = this.store.get(userId) ?? [];
    return entries.slice(-count);
  }

  async record(userId: string, passwordHash: string): Promise<void> {
    const entries = this.store.get(userId) ?? [];
    entries.push({ passwordHash, createdAt: new Date().toISOString() });
    this.store.set(userId, entries);
  }
}

export async function isPasswordInHistory(
  password: string,
  userId: string,
  store: IPasswordHistoryStore,
  hasher: IHasher,
  count: number,
): Promise<boolean> {
  const recent = await store.getRecent(userId, count);
  for (const entry of recent) {
    if (await hasher.verify(password, entry.passwordHash)) return true;
  }
  return false;
}
