import { describe, expect, it } from 'vitest';
import { applySearchParams, matchPagePath, pageFromPathname, pathnameForPage, stripBase } from './url-sync';

const entries = [
  { key: 'users', path: '/users' },
  { key: 'roles', path: '/admin/roles' },
];

describe('url-sync', () => {
  it('maps pathnames to page keys', () => {
    expect(pageFromPathname('/', '/', entries)).toBe('dashboard');
    expect(pageFromPathname('/users', '/', entries)).toBe('users');
    expect(pageFromPathname('/admin/roles/', '/', entries)).toBe('roles');
    expect(pageFromPathname('/audit-logs', '/', entries)).toBe('audit-logs');
  });

  it('honours a deploy base path', () => {
    expect(stripBase('/app/users', '/app/')).toBe('/users');
    expect(pageFromPathname('/app/', '/app/', entries)).toBe('dashboard');
    expect(pathnameForPage('users', '/app/', entries)).toBe('/app/users');
  });

  it('builds pathnames from menu paths with a key fallback', () => {
    expect(pathnameForPage('roles', '/', entries)).toBe('/admin/roles');
    expect(pathnameForPage('storage', '/', entries)).toBe('/storage');
  });

  it('matches inner paths by menu-path prefix', () => {
    expect(matchPagePath('/users/42', '/', entries)).toEqual({ page: 'users', subPath: ['42'] });
    expect(matchPagePath('/users/42/edit/', '/', entries)).toEqual({ page: 'users', subPath: ['42', 'edit'] });
    expect(matchPagePath('/admin/roles/a%20b', '/', entries)).toEqual({ page: 'roles', subPath: ['a b'] });
    expect(matchPagePath('/app/users/42', '/app/', entries)).toEqual({ page: 'users', subPath: ['42'] });
  });

  it('prefers the longest prefix and requires a segment boundary', () => {
    const nested = [...entries, { key: 'user-groups', path: '/users/groups' }];
    expect(matchPagePath('/users/groups/7', '/', nested)).toEqual({ page: 'user-groups', subPath: ['7'] });
    expect(matchPagePath('/users2', '/', nested)).toEqual({ page: 'users2', subPath: [] });
  });

  it('falls back to the last segment before the menu tree loads', () => {
    expect(matchPagePath('/users/42', '/', [])).toEqual({ page: '42', subPath: [] });
    expect(pageFromPathname('/users/42', '/', entries)).toBe('users');
  });

  it('merges query-string updates and drops empty values', () => {
    expect(applySearchParams('?q=a&page=2', { page: '3', sort: 'name' })).toBe('?q=a&page=3&sort=name');
    expect(applySearchParams('?q=a&page=2', { q: null, page: '' })).toBe('');
    expect(applySearchParams('', { q: 'x y' })).toBe('?q=x+y');
  });
});
