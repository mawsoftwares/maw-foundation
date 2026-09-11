import type { IUsersRepository, User, ListUsersQueryDto } from './modules/users';
import { randomUUID } from 'crypto';

export class MemoryUsersRepository implements IUsersRepository {
  private users: Map<string, User> = new Map();

  constructor() {
    const seedUsers = [
      { id: 'u-superadmin', firstName: 'Super', lastName: 'Admin', email: 'superadmin@demo.test' },
      { id: 'u-owner', firstName: 'Owner', lastName: 'User', email: 'owner@demo.test' },
      { id: 'u-manager', firstName: 'Manager', lastName: 'User', email: 'manager@demo.test' },
      { id: 'u-clerk', firstName: 'Clerk', lastName: 'User', email: 'clerk@demo.test' },
    ];

    for (const u of seedUsers) {
      this.users.set(u.id, {
        id: u.id,
        tenantId: 'demo-tenant',
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        passwordHash: 'hash',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });
    }
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

  async searchUsers(tenantId: string, query: ListUsersQueryDto): Promise<{ items: User[]; total: number }> {
    let result = Array.from(this.users.values()).filter(u => u.tenantId === tenantId);
    
    if (query.status) {
      result = result.filter(u => u.status === query.status);
    } else {
      result = result.filter(u => u.status !== 'DISABLED');
    }
    
    if (query.search) {
      const term = query.search.toLowerCase();
      result = result.filter(u => 
        u.email.toLowerCase().includes(term) || 
        u.firstName.toLowerCase().includes(term) || 
        u.lastName.toLowerCase().includes(term)
      );
    }

    const total = result.length;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const offset = ((query.page || 1) - 1) * limit;
    
    result = result.slice(offset, offset + limit);
    return { items: result, total };
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
