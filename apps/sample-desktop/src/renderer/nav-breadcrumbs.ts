import type { BreadcrumbItem, NavItem } from '@mawsoftwares/ui-web';
import { findMenuPath, type MenuTreeNode } from './menu-tree';
import { SUPERADMIN_TOOLS } from './superadmin-tools';

const HOME: BreadcrumbItem = { label: 'Home', path: '/dashboard' };
const SUPERADMIN_HUB: BreadcrumbItem = { label: 'Super Admin', path: '/superadmin' };

export function buildPageBreadcrumbs(
  page: string,
  navItems: readonly NavItem[],
  menuTree: MenuTreeNode[] | null = null,
): BreadcrumbItem[] {
  if (page === 'superadmin') {
    return [HOME, { label: SUPERADMIN_HUB.label }];
  }

  const tool = SUPERADMIN_TOOLS.find((t) => t.key === page);
  if (tool !== undefined) {
    return [HOME, SUPERADMIN_HUB, { label: tool.label }];
  }

  if (menuTree !== null) {
    const trail = findMenuPath(menuTree, page);
    if (trail !== null && trail.length > 0) {
      return [
        HOME,
        ...trail.map((node, index) => ({
          label: node.label,
          path: index < trail.length - 1 ? (node.path ?? `/${node.key}`) : undefined,
        })),
      ];
    }
  }

  const match = navItems.find((item) => item.key === page);
  return [HOME, { label: match?.label ?? page }];
}

export function sidebarActiveKey(page: string, sidebarItems: readonly NavItem[]): string {
  if (sidebarItems.some((item) => item.key === page)) return page;
  if (page === 'superadmin' || SUPERADMIN_TOOLS.some((tool) => tool.key === page)) {
    return 'superadmin';
  }
  return page;
}
