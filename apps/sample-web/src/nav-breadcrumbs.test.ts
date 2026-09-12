import { describe, expect, it } from 'vitest';
import type { NavItem } from '@mawsoftwares/ui-web';
import { findMenuPath, type MenuTreeNode } from './menu-tree';
import { buildPageBreadcrumbs, sidebarActiveKey } from './nav-breadcrumbs';

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { key: 'superadmin', label: 'Super Admin', path: '/superadmin' },
  { key: 'users', label: 'Users', path: '/users' },
];

function node(partial: Partial<MenuTreeNode> & Pick<MenuTreeNode, 'key' | 'label'>): MenuTreeNode {
  return {
    id: 0,
    path: `/${partial.key}`,
    icon: null,
    parentId: null,
    permission: null,
    featureFlag: null,
    sortOrder: 0,
    isActive: true,
    children: [],
    ...partial,
  };
}

describe('buildPageBreadcrumbs', () => {
  it('shows only the hub on the Super Admin page', () => {
    expect(buildPageBreadcrumbs('superadmin', NAV)).toEqual([
      { label: 'Home', path: '/dashboard' },
      { label: 'Super Admin' },
    ]);
  });

  it('nests a Super Admin tool under a clickable hub crumb', () => {
    expect(buildPageBreadcrumbs('rbac', NAV)).toEqual([
      { label: 'Home', path: '/dashboard' },
      { label: 'Super Admin', path: '/superadmin' },
      { label: 'RBAC Admin' },
    ]);
  });

  it('uses the tool label, not the raw page key', () => {
    const crumbs = buildPageBreadcrumbs('feature-flags', NAV);
    expect(crumbs[crumbs.length - 1]).toEqual({ label: 'Feature Flags' });
  });

  it('walks a nested menu tree for non-hub pages', () => {
    const tree: MenuTreeNode[] = [
      node({
        key: 'finance',
        label: 'Finance',
        children: [node({ key: 'invoices', label: 'Invoices' })],
      }),
    ];
    expect(buildPageBreadcrumbs('invoices', NAV, tree)).toEqual([
      { label: 'Home', path: '/dashboard' },
      { label: 'Finance', path: '/finance' },
      { label: 'Invoices' },
    ]);
  });

  it('falls back to the sidebar label for top-level pages', () => {
    expect(buildPageBreadcrumbs('users', NAV)).toEqual([
      { label: 'Home', path: '/dashboard' },
      { label: 'Users' },
    ]);
  });
});

describe('sidebarActiveKey', () => {
  it('keeps Super Admin selected while a hub child is open', () => {
    expect(sidebarActiveKey('theme', NAV)).toBe('superadmin');
  });

  it('uses the page itself when it is already a sidebar item', () => {
    expect(sidebarActiveKey('users', NAV)).toBe('users');
  });
});

describe('findMenuPath', () => {
  it('returns the ancestor chain', () => {
    const tree: MenuTreeNode[] = [
      node({
        key: 'superadmin',
        label: 'Super Admin',
        children: [node({ key: 'rbac', label: 'RBAC Admin' })],
      }),
    ];
    const path = findMenuPath(tree, 'rbac');
    expect(path?.map((n) => n.key)).toEqual(['superadmin', 'rbac']);
  });

  it('returns null when the key is missing', () => {
    expect(findMenuPath([node({ key: 'dashboard', label: 'Dashboard' })], 'rbac')).toBeNull();
  });
});
