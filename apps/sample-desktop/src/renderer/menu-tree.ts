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
