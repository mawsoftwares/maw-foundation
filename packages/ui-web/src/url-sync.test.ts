import { describe, expect, it } from 'vitest';
import { pageFromPathname, pathnameForPage, stripBase } from './url-sync';

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
});
