import { describe, it, expect } from 'vitest';
import { QueryBuilder, safeSortColumn } from '../query/index';

describe('QueryBuilder', () => {
  it('builds empty WHERE for no conditions', () => {
    const qb = new QueryBuilder();
    const { sql, params } = qb.build();
    expect(sql).toBe('');
    expect(params).toEqual([]);
  });

  it('builds WHERE with single condition', () => {
    const qb = new QueryBuilder();
    qb.where('name', 'Alice');
    const { sql, params } = qb.build();
    expect(sql).toBe('WHERE name = $1');
    expect(params).toEqual(['Alice']);
  });

  it('chains multiple conditions with AND', () => {
    const qb = new QueryBuilder();
    qb.where('status', 'active').where('tenant_id', 'T1');
    const { sql, params } = qb.build();
    expect(sql).toBe('WHERE status = $1 AND tenant_id = $2');
    expect(params).toEqual(['active', 'T1']);
  });

  it('supports whereOp', () => {
    const qb = new QueryBuilder();
    qb.whereOp('age', '>=', 18);
    const { sql, params } = qb.build();
    expect(sql).toBe('WHERE age >= $1');
    expect(params).toEqual([18]);
  });

  it('supports whereNull / whereNotNull', () => {
    const qb = new QueryBuilder();
    qb.whereNull('deleted_at').whereNotNull('email');
    const { sql } = qb.build();
    expect(sql).toBe('WHERE deleted_at IS NULL AND email IS NOT NULL');
  });

  it('supports whereIn', () => {
    const qb = new QueryBuilder();
    qb.whereIn('id', ['a', 'b', 'c']);
    const { sql, params } = qb.build();
    expect(sql).toBe('WHERE id IN ($1, $2, $3)');
    expect(params).toEqual(['a', 'b', 'c']);
  });

  it('handles empty whereIn with FALSE', () => {
    const qb = new QueryBuilder();
    qb.whereIn('id', []);
    const { sql, params } = qb.build();
    expect(sql).toBe('WHERE FALSE');
    expect(params).toEqual([]);
  });

  it('supports whereRaw', () => {
    const qb = new QueryBuilder();
    qb.whereRaw('created_at > $1', [new Date('2024-01-01')]);
    const { sql, params } = qb.build();
    expect(sql).toBe('WHERE created_at > $1');
    expect(params).toHaveLength(1);
  });

  it('builds with pagination', () => {
    const qb = new QueryBuilder();
    qb.where('active', true);
    const { sql, params } = qb.buildWithPagination({
      orderBy: 'created_at',
      direction: 'desc',
      limit: 10,
      offset: 20,
      allowedSortColumns: ['created_at', 'name'],
    });
    expect(sql).toBe('WHERE active = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3');
    expect(params).toEqual([true, 10, 20]);
  });

  it('rejects disallowed sort columns', () => {
    const qb = new QueryBuilder();
    const { sql } = qb.buildWithPagination({
      orderBy: 'DROP TABLE users;--',
      allowedSortColumns: ['name', 'created_at'],
      limit: 10,
    });
    expect(sql).not.toContain('ORDER BY');
    expect(sql).toContain('LIMIT');
  });

  it('starts param index from custom value', () => {
    const qb = new QueryBuilder(3);
    qb.where('x', 1);
    const { sql, params, nextParamIndex } = qb.build();
    expect(sql).toBe('WHERE x = $3');
    expect(params).toEqual([1]);
    expect(nextParamIndex).toBe(4);
  });
});

describe('safeSortColumn', () => {
  it('returns column if in allowlist', () => {
    expect(safeSortColumn('name', ['name', 'created_at'])).toBe('name');
  });

  it('returns null for disallowed column', () => {
    expect(safeSortColumn('password', ['name', 'created_at'])).toBeNull();
  });

  it('rejects SQL injection attempts', () => {
    expect(safeSortColumn('name; DROP TABLE users', ['name'])).toBeNull();
  });
});
