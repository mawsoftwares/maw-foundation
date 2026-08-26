import type { IUsersRepository } from '@maw/users';
import type { User } from '@maw/users/src/domain/entities/User';
import { randomUUID } from 'crypto';

export class MemoryUsersRepository implements IUsersRepository {
  private users: Map<string, User> = new Map();

  constructor() {
    const id = randomUUID();
    this.users.set(id, {
      id,
      tenantId: 'demo-tenant',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@demo.com',
      passwordHash: 'hash',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });
  }

  async create(user: Omit<User, 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<User> {
    const u: User = {
      ...user,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    this.users.set(u.id, u);
    return u;
  }

  async findById(id: string, tenantId: string): Promise<User | null> {
    const u = this.users.get(id);
    return u && u.tenantId === tenantId && !u.deletedAt ? u : null;
  }

  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    const found = Array.from(this.users.values()).find(
      (u) => u.tenantId === tenantId && u.email === email && !u.deletedAt
    );
    return found ?? null;
  }

  async findByPhone(tenantId: string, phone: string): Promise<User | null> {
    const found = Array.from(this.users.values()).find(
      (u) => u.tenantId === tenantId && u.phone === phone && !u.deletedAt
    );
    return found ?? null;
  }

  async searchUsers(tenantId: string, query?: any, options?: any): Promise<User[]> {
    let result = Array.from(this.users.values()).filter(u => u.tenantId === tenantId && !u.deletedAt);
    
    // pagination mock
    if (options && options.limit) {
       result = result.slice(options.offset || 0, (options.offset || 0) + options.limit);
    }
    return result;
  }

  async updateUser(id: string, tenantId: string, updates: Partial<User>): Promise<User | null> {
    const u = await this.findById(id, tenantId);
    if (!u) return null;
    const updated = { ...u, ...updates, updatedAt: new Date().toISOString() };
    this.users.set(id, updated);
    return updated;
  }

  async softDelete(id: string, tenantId: string): Promise<boolean> {
    const u = await this.findById(id, tenantId);
    if (!u) return false;
    this.users.set(id, { ...u, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    return true;
  }

  async existsByEmail(tenantId: string, email: string): Promise<boolean> {
    return (await this.findByEmail(tenantId, email)) !== null;
  }

  async existsByPhone(tenantId: string, phone: string): Promise<boolean> {
    return (await this.findByPhone(tenantId, phone)) !== null;
  }
}
