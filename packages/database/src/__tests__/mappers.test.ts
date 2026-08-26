import { describe, it, expect } from 'vitest';
import { snakeToCamel, camelToSnake, mapRow, mapRows, createRowMapper, dateToIso, nullToUndefined } from '../entity/mappers';

describe('snakeToCamel', () => {
  it('converts snake_case to camelCase', () => {
    expect(snakeToCamel('created_at')).toBe('createdAt');
    expect(snakeToCamel('tenant_id')).toBe('tenantId');
    expect(snakeToCamel('id')).toBe('id');
  });

  it('handles multiple underscores', () => {
    expect(snakeToCamel('first_name_last')).toBe('firstNameLast');
  });
});

describe('camelToSnake', () => {
  it('converts camelCase to snake_case', () => {
    expect(camelToSnake('createdAt')).toBe('created_at');
    expect(camelToSnake('tenantId')).toBe('tenant_id');
    expect(camelToSnake('id')).toBe('id');
  });
});

describe('mapRow', () => {
  it('converts all keys from snake to camel', () => {
    const row = { user_name: 'Alice', created_at: '2024-01-01', id: '123' };
    const result = mapRow<{ userName: string; createdAt: string; id: string }>(row);
    expect(result).toEqual({ userName: 'Alice', createdAt: '2024-01-01', id: '123' });
  });
});

describe('mapRows', () => {
  it('maps array of rows', () => {
    const rows = [
      { first_name: 'A' },
      { first_name: 'B' },
    ];
    const result = mapRows<{ firstName: string }>(rows);
    expect(result).toEqual([{ firstName: 'A' }, { firstName: 'B' }]);
  });
});

describe('createRowMapper', () => {
  it('uses default snake→camel when no mappings', () => {
    const mapper = createRowMapper();
    const result = mapper({ user_name: 'Test' });
    expect(result).toEqual({ userName: 'Test' });
  });

  it('applies custom function mappings', () => {
    const mapper = createRowMapper<{ raw_price: number }, { price: number }>({
      price: (row) => row.raw_price / 100,
    });
    const result = mapper({ raw_price: 1500 });
    expect(result.price).toBe(15);
  });

  it('applies column rename mappings', () => {
    const mapper = createRowMapper<{ usr_name: string }, { name: string }>({
      name: 'usr_name',
    });
    const result = mapper({ usr_name: 'Alice' });
    expect(result.name).toBe('Alice');
  });
});

describe('dateToIso', () => {
  it('converts Date to ISO string', () => {
    const d = new Date('2024-06-15T12:00:00Z');
    expect(dateToIso(d)).toBe('2024-06-15T12:00:00.000Z');
  });

  it('returns null for null', () => {
    expect(dateToIso(null)).toBeNull();
  });
});

describe('nullToUndefined', () => {
  it('converts null to undefined', () => {
    expect(nullToUndefined(null)).toBeUndefined();
  });

  it('passes through non-null values', () => {
    expect(nullToUndefined('hello')).toBe('hello');
    expect(nullToUndefined(0)).toBe(0);
  });
});
