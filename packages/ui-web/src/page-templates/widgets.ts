import type { ReactNode } from 'react';
import type { ResolvedPageTemplate, WidgetPlacement, WidgetSpan } from '@mawsoftwares/page-templates';

/**
 * What an app provides for an approved widget id. Config only ever names the id; the code, data access and
 * permission check live here, in the app, never in the stored layout JSON.
 */
export interface WidgetEntry {
  readonly title: string;
  readonly render: () => ReactNode;
  readonly span?: WidgetSpan;
  readonly height?: number;
  /** RBAC code (e.g. `Read_Orders`). The widget is hidden unless `can(permission)` is true. */
  readonly permission?: string;
}

export type WidgetRegistry = Readonly<Record<string, WidgetEntry>>;

export interface WidgetCell {
  readonly key: string;
  readonly title: string;
  readonly span: WidgetSpan;
  readonly height: number | undefined;
  readonly node: ReactNode;
}

/**
 * Resolve a slot's placements to renderable cells. A placement is dropped (never an error) when the app has no entry
 * for it or the user lacks its permission; spans are capped to the grid's column count. Fails closed: a permissioned
 * widget is hidden when no `can` is supplied.
 */
export function buildWidgetCells(
  template: Pick<ResolvedPageTemplate, 'placements' | 'settings'>,
  slot: string,
  widgets: WidgetRegistry,
  can?: (permission: string) => boolean,
): WidgetCell[] {
  const placements: readonly WidgetPlacement[] = template.placements[slot] ?? [];
  const cells: WidgetCell[] = [];
  placements.forEach((p, i) => {
    const entry = widgets[p.widget];
    if (entry === undefined) return;
    if (entry.permission !== undefined && !(can?.(entry.permission) ?? false)) return;
    const wanted = p.span ?? entry.span ?? 1;
    cells.push({
      key: `${slot}-${p.widget}-${i}`,
      title: p.title ?? entry.title,
      span: Math.min(wanted, template.settings.columns) as WidgetSpan,
      height: entry.height,
      node: entry.render(),
    });
  });
  return cells;
}
