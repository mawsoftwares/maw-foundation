import { describe, it, expect, beforeEach } from 'vitest';
import { SoftDeleteRepository } from '../soft-delete/index';
import type { RepositoryConfig } from '../repository/index';
import { MockPgPool } from '../testing/index';

interface ItemRow { id: string; name: string; deleted_at: string | null }
interface ItemEntity { id: string; name: string; deletedAt: string | null }

class ItemRepository extends SoftDeleteRepository<ItemRow, ItemEntity> {
  constructor(pool: MockPgPool) {
    super({ pool, table: 'items' } as RepositoryConfig<ItemRow, ItemEntity>);
  }
}

describe('SoftDeleteRepository', () => {
  let pool: MockPgPool;
  let repo: ItemRepository;

  beforeEach(() => {
    pool = new MockPgPool();
    repo = new ItemRepository(pool);
  });

  it('findManyActive adds deleted_at IS NULL', async () => {
    pool.mockQuery(/SELECT/, () => ({ rows: [], rowCount: 0 }));
    await repo.findManyActive(null);
    expect(pool.assertCalled(/deleted_at IS NULL/)).toBeDefined();
  });

  it('softDelete sets deleted_at = NOW()', async () => {
    pool.mockQuery(/UPDATE/, () => ({ rows: [], rowCount: 1 }));
    const result = await repo.softDelete('item-1');
    expect(result).toBe(true);
    expect(pool.assertCalled(/deleted_at = NOW/)).toBeDefined();
  });

  it('restore sets deleted_at = NULL', async () => {
    pool.mockQuery(/UPDATE/, () => ({ rows: [], rowCount: 1 }));
    const result = await repo.restore('item-1');
    expect(result).toBe(true);
    expect(pool.assertCalled(/deleted_at = NULL/)).toBeDefined();
  });

  it('hardDelete performs actual DELETE', async () => {
    pool.mockQuery(/DELETE/, () => ({ rows: [], rowCount: 1 }));
    const result = await repo.hardDelete('item-1');
    expect(result).toBe(true);
    expect(pool.assertCalled(/DELETE FROM items/)).toBeDefined();
  });

  it('returns false when no rows affected', async () => {
    pool.mockQuery(/UPDATE/, () => ({ rows: [], rowCount: 0 }));
    const result = await repo.softDelete('missing');
    expect(result).toBe(false);
  });
});
