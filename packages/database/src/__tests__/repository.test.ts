import { describe, it, expect, beforeEach } from 'vitest';
import { BaseRepository } from '../repository/index';
import type { RepositoryConfig } from '../repository/index';
import { QueryBuilder } from '../query/index';
import { MockPgPool } from '../testing/index';

interface UserRow {
  id: string;
  user_name: string;
  created_at: string;
}

interface UserEntity {
  id: string;
  userName: string;
  createdAt: string;
}

class UserRepository extends BaseRepository<UserRow, UserEntity> {
  constructor(pool: MockPgPool) {
    super({ pool, table: 'users' } as RepositoryConfig<UserRow, UserEntity>);
  }
}

describe('BaseRepository', () => {
  let pool: MockPgPool;
  let repo: UserRepository;

  beforeEach(() => {
    pool = new MockPgPool();
    repo = new UserRepository(pool);
  });

  it('findOneById returns mapped entity', async () => {
    pool.mockQuery(/SELECT \* FROM users/, () => ({
      rows: [{ id: '1', user_name: 'Alice', created_at: '2024-01-01' }],
      rowCount: 1,
    }));

    const result = await repo.findOneById('1');
    expect(result).toEqual({ id: '1', userName: 'Alice', createdAt: '2024-01-01' });
    expect(pool.assertCalledWith(/WHERE id = \$1/, ['1'])).toBe(true);
  });

  it('findOneById returns null when not found', async () => {
    const result = await repo.findOneById('missing');
    expect(result).toBeNull();
  });

  it('findMany uses query builder', async () => {
    pool.mockQuery(/SELECT \* FROM users/, () => ({
      rows: [{ id: '1', user_name: 'A', created_at: '' }],
      rowCount: 1,
    }));

    const qb = new QueryBuilder().where('user_name', 'A');
    const results = await repo.findMany(qb, { limit: 5 });
    expect(results).toHaveLength(1);
    expect(pool.assertCalled(/LIMIT/)).toBeDefined();
  });

  it('count returns integer', async () => {
    pool.mockQuery(/COUNT/, () => ({
      rows: [{ count: '42' }],
      rowCount: 1,
    }));

    const qb = new QueryBuilder().where('active', true);
    const result = await repo.count(qb);
    expect(result).toBe(42);
  });

  it('insertReturning inserts and returns entity', async () => {
    pool.mockQuery(/INSERT INTO users/, () => ({
      rows: [{ id: '2', user_name: 'Bob', created_at: '2024-02-01' }],
      rowCount: 1,
    }));

    const result = await repo.insertReturning(
      ['id', 'user_name', 'created_at'],
      ['2', 'Bob', '2024-02-01'],
    );
    expect(result.userName).toBe('Bob');
    expect(pool.assertCalled(/RETURNING/)).toBeDefined();
  });

  it('delete uses query builder', async () => {
    pool.mockQuery(/DELETE FROM users/, () => ({ rows: [], rowCount: 1 }));
    const qb = new QueryBuilder().where('id', '1');
    const count = await repo.delete(qb);
    expect(count).toBe(1);
  });
});
