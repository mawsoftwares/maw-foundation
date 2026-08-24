/**
 * Navigation type helpers for Expo Router integration.
 * Business logic stays navigation-agnostic — the UI decides navigation.
 */

export interface NavItem {
  readonly key: string;
  readonly label: string;
  readonly icon?: string;
  readonly path: string;
  readonly group?: string;
  readonly sortOrder?: number;
  readonly permission?: string;
  readonly badge?: string | number;
}

export interface TabConfig {
  readonly name: string;
  readonly title: string;
  readonly icon?: string;
  readonly permission?: string;
}

export function filterNavByPermissions(
  items: readonly NavItem[],
  can: (permission: string) => boolean,
): NavItem[] {
  return items.filter((item) => !item.permission || can(item.permission));
}

export function sortNavItems(items: readonly NavItem[]): NavItem[] {
  return [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}
