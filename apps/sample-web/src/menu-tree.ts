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

/** Fetches the active menu tree from the DB-backed Menu Management module. */
export async function loadMenuTree(): Promise<MenuTreeNode[]> {
  const { client } = await import('./api');
  const res = await client.request<{ data: MenuTreeNode[] }>('/api/v1/menus/tree');
  return res.data;
}

/** Flattens a menu tree (depth-first, parents before children) into a single ordered list. */
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

/** Ancestor chain from a root down to `key`, or null if the key is not in the tree. */
export function findMenuPath(nodes: MenuTreeNode[], key: string): MenuTreeNode[] | null {
  for (const node of nodes) {
    if (node.key === key) return [node];
    if (node.children.length === 0) continue;
    const nested = findMenuPath(node.children, key);
    if (nested !== null) return [node, ...nested];
  }
  return null;
}
