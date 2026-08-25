import { describe, it, expect } from 'vitest';
import { parseListQuery, parseFieldSelection } from '../dto/query-parser';

describe('parseListQuery', () => {
  it('returns defaults for empty input', () => {
    const result = parseListQuery({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.sortOrder).toBeUndefined();
  });

  it('parses string page and pageSize', () => {
    const result = parseListQuery({ page: '3', pageSize: '15' });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(15);
  });

  it('clamps pageSize to MAX_PAGE_SIZE', () => {
    const result = parseListQuery({ pageSize: '999' });
    expect(result.pageSize).toBe(100);
  });

  it('floors page to 1', () => {
    const result = parseListQuery({ page: '-5' });
    expect(result.page).toBe(1);
  });

  it('validates sortOrder', () => {
    expect(parseListQuery({ sortOrder: 'desc' }).sortOrder).toBe('desc');
    expect(parseListQuery({ sortOrder: 'invalid' }).sortOrder).toBeUndefined();
  });

  it('validates sortBy against allowed fields', () => {
    const result = parseListQuery(
      { sortBy: 'name' },
      { allowedSortFields: ['name', 'createdAt'] },
    );
    expect(result.sortBy).toBe('name');
  });

  it('rejects sortBy not in allowed fields', () => {
    const result = parseListQuery(
      { sortBy: 'secret' },
      { allowedSortFields: ['name', 'createdAt'] },
    );
    expect(result.sortBy).toBeUndefined();
  });

  it('passes through search and fields', () => {
    const result = parseListQuery({ search: 'hello', fields: 'id,name' });
    expect(result.search).toBe('hello');
    expect(result.fields).toBe('id,name');
  });
});

describe('parseFieldSelection', () => {
  it('splits comma-separated fields', () => {
    expect(parseFieldSelection('id,name,email')).toEqual(['id', 'name', 'email']);
  });

  it('trims whitespace', () => {
    expect(parseFieldSelection(' id , name ')).toEqual(['id', 'name']);
  });

  it('filters empty segments', () => {
    expect(parseFieldSelection('id,,name,')).toEqual(['id', 'name']);
  });

  it('returns undefined for undefined input', () => {
    expect(parseFieldSelection(undefined)).toBeUndefined();
  });
});
