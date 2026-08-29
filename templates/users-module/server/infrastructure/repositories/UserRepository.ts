import { TenantScopedRepository, QueryBuilder } from '@mawsoftwares/database';
import type { PgPool, PgClient } from '@mawsoftwares/database';
import type { User } from '../../domain/entities/User';
import type { ListUsersQueryDto } from '../../application/dto';
import type { AccountStatusValue } from '@mawsoftwares/sdk/security/AccountStatus';

/**
 * Users Module Template — Repository Port
 *
 * Extend this interface as your User entity grows.
 * Add methods like findByEmployeeCode(), findByDepartment(), etc.
 */
export interface IUsersRepository {
  create(user: Omit<User, 'createdAt' | 'updatedAt'>, client?: PgClient): Promise<User>;
  findById(id: string, tenantId: string, client?: PgClient): Promise<User | null>;
  findByEmail(tenantId: string, email: string, client?: PgClient): Promise<User | null>;
  findByPhone(tenantId: string, phone: string, client?: PgClient): Promise<User | null>;
  searchUsers(tenantId: string, query?: unknown, options?: { limit?: number; offset?: number }): Promise<User[]>;
  count(tenantId: string, query?: unknown): Promise<number>;
  updateUser(id: string, tenantId: string, updates: Partial<User>, client?: PgClient): Promise<User | null>;
  softDelete(id: string, tenantId: string, client?: PgClient): Promise<boolean>;
  existsByEmail(tenantId: string, email: string, client?: PgClient): Promise<boolean>;
  existsByPhone(tenantId: string, phone: string, client?: PgClient): Promise<boolean>;
}

/**
 * Postgres implementation over the project-owned users table.
 *
 * When you add fields to User:
 *   1. Add them to the migration (001_create_users_table.ts)
 *   2. Add them to the `mapper` function below
 *   3. Add them to the `create()` INSERT columns/values
 *   4. Add them to `updateUser()` field mapping
 */
export class PgUserRepository
  extends TenantScopedRepository<Record<string, unknown>, User>
  implements IUsersRepository
{
  constructor(pool: PgPool) {
    super({
      pool,
      table: 'users',
      mapper: (row: Record<string, unknown>): User => ({
        id:              row['id'] as string,
        tenantId:        row['tenant_id'] as string,
        firstName:       row['first_name'] as string,
        lastName:        row['last_name'] as string,
        email:           row['email'] as string,
        phone:           (row['phone'] as string | null) ?? undefined,
        passwordHash:    row['password_hash'] as string,
        avatar:          (row['avatar'] as string | null) ?? undefined,
        role:            (row['role'] as string | null) ?? undefined,
        status:          row['status'] as AccountStatusValue,
        emailVerifiedAt: (row['email_verified_at'] as Date | null)?.toISOString(),
        phoneVerifiedAt: (row['phone_verified_at'] as Date | null)?.toISOString(),
        lastLoginAt:     (row['last_login_at'] as Date | null)?.toISOString(),
        createdAt:       (row['created_at'] as Date).toISOString(),
        updatedAt:       (row['updated_at'] as Date).toISOString(),
        createdBy:       (row['created_by'] as string | null) ?? undefined,
        updatedBy:       (row['updated_by'] as string | null) ?? undefined,
        deletedAt:       (row['deleted_at'] as Date | null)?.toISOString() ?? null,
        // ADD: project-specific field mappings here
      }),
    });
  }

  async create(user: Omit<User, 'createdAt' | 'updatedAt'>, client?: PgClient): Promise<User> {
    // ADD: project-specific columns here
    const columns = [
      'id', 'tenant_id', 'first_name', 'last_name', 'email', 'phone',
      'password_hash', 'avatar', 'role', 'status', 'email_verified_at',
      'phone_verified_at', 'last_login_at', 'created_by',
    ];
    const values = [
      user.id, user.tenantId, user.firstName, user.lastName, user.email, user.phone ?? null,
      user.passwordHash, user.avatar ?? null, user.role ?? 'viewer', user.status,
      user.emailVerifiedAt ? new Date(user.emailVerifiedAt) : null,
      user.phoneVerifiedAt ? new Date(user.phoneVerifiedAt) : null,
      user.lastLoginAt     ? new Date(user.lastLoginAt)     : null,
      user.createdBy ?? null,
    ];
    return this.insertReturning(columns, values, '*', client);
  }

  async findById(id: string, tenantId: string, client?: PgClient): Promise<User | null> {
    return this.findOneByIdInTenant(tenantId, id, client);
  }

  async findByEmail(tenantId: string, email: string, client?: PgClient): Promise<User | null> {
    const qb = new QueryBuilder().where('email', email).whereNull('deleted_at');
    const { sql, params } = qb.build();
    const qb2 = new QueryBuilder().whereRaw(sql.replace(/^WHERE /, ''), params);
    const users = await this.findManyInTenant(tenantId, qb2, { client });
    return users[0] ?? null;
  }

  async findByPhone(tenantId: string, phone: string, client?: PgClient): Promise<User | null> {
    const qb = new QueryBuilder().where('phone', phone).whereNull('deleted_at');
    const { sql, params } = qb.build();
    const qb2 = new QueryBuilder().whereRaw(sql.replace(/^WHERE /, ''), params);
    const users = await this.findManyInTenant(tenantId, qb2, { client });
    return users[0] ?? null;
  }

  async searchUsers(
    tenantId: string,
    query?: unknown,
    options?: { limit?: number; offset?: number },
  ): Promise<User[]> {
    const q = (query ?? {}) as ListUsersQueryDto;
    const qb = new QueryBuilder().whereNull('deleted_at');
    if (q.status) qb.where('status', q.status);
    if (q.role)   qb.where('role', q.role);
    return this.findManyInTenant(tenantId, qb, options);
  }

  async count(tenantId: string, query?: unknown): Promise<number> {
    const q = (query ?? {}) as ListUsersQueryDto;
    const qb = new QueryBuilder().whereNull('deleted_at');
    if (q.status) qb.where('status', q.status);
    if (q.role)   qb.where('role', q.role);
    const all = await this.findManyInTenant(tenantId, qb);
    return all.length;
  }

  async updateUser(id: string, tenantId: string, updates: Partial<User>, client?: PgClient): Promise<User | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    const field = (snake: string, camel: keyof User) => {
      if (updates[camel] !== undefined) {
        setClauses.push(`${snake} = $${i++}`);
        const val = updates[camel];
        params.push(val !== null && snake.endsWith('_at') ? new Date(val as string) : (val ?? null));
      }
    };

    field('first_name',       'firstName');
    field('last_name',        'lastName');
    field('email',            'email');
    field('phone',            'phone');
    field('password_hash',    'passwordHash');
    field('avatar',           'avatar');
    field('role',             'role');
    field('status',           'status');
    field('email_verified_at','emailVerifiedAt');
    field('phone_verified_at','phoneVerifiedAt');
    field('last_login_at',    'lastLoginAt');
    field('updated_by',       'updatedBy');
    // ADD: project-specific field mappings here

    if (setClauses.length === 0) return this.findById(id, tenantId, client);
    setClauses.push('updated_at = NOW()');

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
    return (await this.findByEmail(tenantId, email, client)) !== null;
  }

  async existsByPhone(tenantId: string, phone: string, client?: PgClient): Promise<boolean> {
    return (await this.findByPhone(tenantId, phone, client)) !== null;
  }
}
