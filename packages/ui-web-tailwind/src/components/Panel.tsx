import type { ReactNode } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown } from 'lucide-react';
import type { PanelProps } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';

const VARIANT = {
  default: 'bg-[var(--maw-comp-panels-background,var(--maw-surface))]',
  // ui-web's `outlined` has no visible outline (its borders were removed); here the name is honoured.
  outlined: 'border border-border bg-transparent',
  elevated: 'bg-[var(--maw-comp-panels-background,var(--maw-surface))] shadow-[var(--maw-comp-panels-shadow,var(--maw-shadow-md))]',
} as const;

/**
 * Same props as the `Panel` in @mawsoftwares/ui-web. When `collapsible`, the header toggle is a Radix Collapsible
 * trigger (aria-expanded, keyboard, animated height); the body unmounts while collapsed, like ui-web.
 */
export function Panel({
  title,
  children,
  actions,
  collapsible = false,
  defaultCollapsed = false,
  variant = 'default',
  style,
}: PanelProps): ReactNode {
  const root = cn(
    'box-border overflow-hidden rounded-[var(--maw-comp-panels-border-radius,var(--maw-radius-md))] font-sans text-fg',
    VARIANT[variant],
  );

  const header = (withToggle: boolean): ReactNode =>
    title === undefined ? null : (
      <div
        className={cn(
          'flex items-center justify-between border-b border-border px-4 py-3',
          // The divider belongs to the open state; Collapsible sets data-state on the root, so style via the group.
          withToggle && 'group-data-[state=closed]/panel:border-b-0',
        )}
      >
        <div className="flex items-center gap-2">
          {withToggle && (
            <Collapsible.Trigger
              aria-label={`Toggle ${title}`}
              className="group/trigger inline-flex size-6 items-center justify-center rounded-sm text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
            >
              <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=closed]/trigger:-rotate-90" />
            </Collapsible.Trigger>
          )}
          <h3 className="m-0 text-sm font-semibold text-fg">{title}</h3>
        </div>
        {actions !== undefined && <div className="flex gap-1">{actions}</div>}
      </div>
    );

  if (!collapsible) {
    return (
      <div style={style} className={root}>
        {header(false)}
        <div className="p-4">{children}</div>
      </div>
    );
  }

  return (
    <Collapsible.Root defaultOpen={!defaultCollapsed} style={style} className={cn('group/panel', root)}>
      {header(true)}
      <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="p-4">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
