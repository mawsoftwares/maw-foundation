import { TenantScopedRepository, QueryBuilder } from '@maw/database';
import type { PgPool, PgClient } from '@maw/database';
import type { User } from '../../domain/entities/User';
import type { AccountStatusValue } from '@maw/sdk/security/AccountStatus';

export interface IUsersRepository {
  create(user: Omit<User, 'createdAt' | 'updatedAt'>, client?: PgClient): Promise<User>;
  findById(id: string, tenantId: string, client?: PgClient): Promise<User | null>;
  findByEmail(tenantId: string, email: string, client?: PgClient): Promise<User | null>;
  findByPhone(tenantId: string, phone: string, client?: PgClient): Promise<User | null>;
  searchUsers(tenantId: string, query?: unknown, options?: unknown): Promise<User[]>;
  updateUser(id: string, tenantId: string, updates: Partial<User>, client?: PgClient): Promise<User | null>;
  softDelete(id: string, tenantId: string, client?: PgClient): Promise<boolean>;
  existsByEmail(tenantId: string, email: string, client?: PgClient): Promise<boolean>;
  existsByPhone(tenantId: string, phone: string, client?: PgClient): Promise<boolean>;
}

export class PgUserRepository extends TenantScopedRepository<Record<string, unknown>, User> implements IUsersRepository {
  constructor(pool: PgPool) {
    super({
      pool,
      table: 'users',
      mapper: (row: unknown): User => ({
        id: row.id,
        tenantId: row.tenant_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone ?? undefined,
        passwordHash: row.password_hash,
        avatar: row.avatar ?? undefined,
        status: row.status as AccountStatusValue,
        emailVerifiedAt: row.email_verified_at?.toISOString(),
        phoneVerifiedAt: row.phone_verified_at?.toISOString(),
        lastLoginAt: row.last_login_at?.toISOString(),
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        createdBy: row.created_by ?? undefined,
        updatedBy: row.updated_by ?? undefined,
        deletedAt: row.deleted_at?.toISOString(),
      })
    });
  }

  async create(user: Omit<User, 'createdAt' | 'updatedAt'>, client?: PgClient): Promise<User> {
    const columns = [
      'id', 'tenant_id', 'first_name', 'last_name', 'email', 'phone',
      'password_hash', 'avatar', 'status', 'email_verified_at',
      'phone_verified_at', 'last_login_at', 'created_by', 'updated_by'
    ];
    
    const values = [
      user.id,
      user.tenantId,
      user.firstName,
      user.lastName,
      user.email,
      user.phone ?? null,
      user.passwordHash,
      user.avatar ?? null,
      user.status,
      user.emailVerifiedAt ? new Date(user.emailVerifiedAt) : null,
      user.phoneVerifiedAt ? new Date(user.phoneVerifiedAt) : null,
      user.lastLoginAt ? new Date(user.lastLoginAt) : null,
      user.createdBy ?? null,
      user.updatedBy ?? null
    ];

    return this.insertReturning(columns, values, '*', client);
  }

  async findById(id: string, tenantId: string, client?: PgClient): Promise<User | null> {
    return this.findOneByIdInTenant(tenantId, id, client);
  }

  async findByEmail(tenantId: string, email: string, client?: PgClient): Promise<User | null> {
    const query = new QueryBuilder().where('email', email).whereNull('deleted_at');
    const { sql, params } = query.build();
    const qb = new QueryBuilder().whereRaw(sql.replace(/^WHERE /, ''), params);
    const users = await this.findManyInTenant(tenantId, qb, { client });
    return users[0] ?? null;
  }

  async findByPhone(tenantId: string, phone: string, client?: PgClient): Promise<User | null> {
    const query = new QueryBuilder().where('phone', phone).whereNull('deleted_at');
    const { sql, params } = query.build();
    const qb = new QueryBuilder().whereRaw(sql.replace(/^WHERE /, ''), params);
    const users = await this.findManyInTenant(tenantId, qb, { client });
    return users[0] ?? null;
  }

  async searchUsers(tenantId: string, query?: unknown, options?: unknown): Promise<User[]> {
    // simplified for now, will implement full filtering in list use-case
    const qb = new QueryBuilder().whereNull('deleted_at');
    return this.findManyInTenant(tenantId, qb, options);
  }

  async updateUser(id: string, tenantId: string, updates: Partial<User>, client?: PgClient): Promise<User | null> {
    const _allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'password_hash', 'avatar',
      'status', 'email_verified_at', 'phone_verified_at', 'last_login_at',
      'updated_by'
    ];
    
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    const mapField = (camel: keyof User, snake: string) => {
      if (updates[camel] !== undefined) {
        setClauses.push(`${snake} = $${paramIndex++}`);
        const val = updates[camel];
        params.push(
           val !== null && (snake.endsWith('_at')) ? new Date(val as string) : (val ?? null)
        );
      }
    };

    mapField('firstName', 'first_name');
    mapField('lastName', 'last_name');
    mapField('email', 'email');
    mapField('phone', 'phone');
    mapField('passwordHash', 'password_hash');
    mapField('avatar', 'avatar');
    mapField('status', 'status');
    mapField('emailVerifiedAt', 'email_verified_at');
    mapField('phoneVerifiedAt', 'phone_verified_at');
    mapField('lastLoginAt', 'last_login_at');
    mapField('updatedBy', 'updated_by');

    if (setClauses.length === 0) {
      return this.findById(id, tenantId, client);
    }

    setClauses.push(`updated_at = NOW()`);

    const qb = new QueryBuilder().where('id', id).where('tenant_id', tenantId);
    await super.update(setClauses.join(', '), params, qb, client);
    
    return this.findById(id, tenantId, client);
  }

  async softDelete(id: string, tenantId: string, client?: PgClient): Promise<boolean> {
    const qb = new QueryBuilder().where('id', id).where('tenant_id', tenantId);
    const count = await super.update('deleted_at = NOW(), updated_at = NOW()', [], qb, client);
    return count > 0;
  }

  async existsByEmail(tenantId: string, email: string, client?: PgClient): Promise<boolean> {
    const qb = new QueryBuilder().where('email', email).where('tenant_id', tenantId).whereNull('deleted_at');
    const count = await this.count(qb, client);
    return count > 0;
  }

  async existsByPhone(tenantId: string, phone: string, client?: PgClient): Promise<boolean> {
    const qb = new QueryBuilder().where('phone', phone).where('tenant_id', tenantId).whereNull('deleted_at');
    const count = await this.count(qb, client);
    return count > 0;
  }
}
