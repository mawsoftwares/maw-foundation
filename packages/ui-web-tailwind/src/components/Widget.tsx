import type { CSSProperties, ReactNode } from 'react';
import type { WidgetProps } from '@mawsoftwares/ui-contract';
import { resolveResponsive } from '../lib/responsive';
import { Card } from './Card';

// Static classes (Tailwind scans source); the per-breakpoint span arrives through CSS variables.
const SPAN_CLASSES =
  '[grid-column:span_var(--s-xs)] sm:[grid-column:span_var(--s-sm)] md:[grid-column:span_var(--s-md)] lg:[grid-column:span_var(--s-lg)] xl:[grid-column:span_var(--s-xl)] 2xl:[grid-column:span_var(--s-2xl)]';

/**
 * Same props as the `Widget` in @mawsoftwares/ui-web: a titled card for a dashboard grid. `span` is responsive (`{ xs: 1, md: 2 }`);
 * with a fixed `height` the body scrolls.
 */
export function Widget({ title, actions, children, span = 1, height, style }: WidgetProps): ReactNode {
  const vars: Record<string, string> = {};
  for (const [bp, value] of Object.entries(resolveResponsive<1 | 2 | 3 | 4>(span) ?? {})) vars[`--s-${bp}`] = String(value);
  return (
    <Card padding="0" className={`flex flex-col overflow-hidden ${SPAN_CLASSES}`} style={{ ...vars, height, ...style } as CSSProperties}>
      <div className="flex items-center justify-between border-b border-border px-[var(--maw-space-lg)] py-[var(--maw-space-md)]">
        <h3 className="m-0 text-sm font-semibold text-fg">{title}</h3>
        {actions}
      </div>
      <div className="flex-1 overflow-y-auto p-[var(--maw-space-lg)]">{children}</div>
    </Card>
  );
}
