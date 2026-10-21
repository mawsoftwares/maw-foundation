export interface MenuTreeNode {
  id: number;
  key: string;
  label: string;
  path: string | null;
  icon: string | null;
  parentId: number | null;
  permission: string | null;
  featureFlag: string | null;
  sortOrder: number;
  isActive: boolean;
  children: MenuTreeNode[];
}

export async function loadMenuTree(): Promise<MenuTreeNode[]> {
  const { client } = await import('./api');
  const res = await client.request<{ data: MenuTreeNode[] }>('/api/v1/menus/tree');
  return res.data;
}

export function flattenMenuTree(nodes: MenuTreeNode[]): MenuTreeNode[] {
  const out: MenuTreeNode[] = [];
  const visit = (list: MenuTreeNode[]) => {
    for (const n of list) {
      out.push(n);
      if (n.children.length > 0) visit(n.children);
    }
  };
  visit(nodes);
  return out;
}

export function findMenuPath(nodes: MenuTreeNode[], key: string): MenuTreeNode[] | null {
  for (const node of nodes) {
    if (node.key === key) return [node];
    if (node.children.length === 0) continue;
    const nested = findMenuPath(node.children, key);
    if (nested !== null) return [node, ...nested];
  }
  return null;
}

/** Menu key whose DB path matches `path` (falls back to the path's last segment), so nested paths like /group/page resolve to a page key. */
export function findMenuKeyByPath(nodes: MenuTreeNode[], path: string): string {
  const hit = flattenMenuTree(nodes).find((n) => n.path === path);
  return hit?.key ?? path.split('/').filter(Boolean).pop() ?? '';
}

/** Fired by Menu Management after any change so the sidebar re-fetches the tree without a page reload. */
export const MENUS_CHANGED_EVENT = 'maw:menus-changed';
export function notifyMenusChanged(): void {
  window.dispatchEvent(new Event(MENUS_CHANGED_EVENT));
}
