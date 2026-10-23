import { Fragment, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import type { BreadcrumbTrailProps } from '@mawsoftwares/ui-contract';

/**
 * Same props as the `BreadcrumbTrail` in @mawsoftwares/ui-web: items with a `path` (except the last) are links, the last is the
 * current page. A real `<nav aria-label="Breadcrumb">` with an ordered list and `aria-current="page"`; renders nothing when empty.
 */
export function BreadcrumbTrail({ items, onNavigate, style }: BreadcrumbTrailProps): ReactNode {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" style={style} className="box-border font-sans text-sm text-[var(--maw-shell-fg-muted,var(--maw-fgMuted))]">
      <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
        {items.map((crumb, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={i}>
              {i > 0 && (
                <li aria-hidden="true" className="flex text-fg-subtle">
                  <ChevronRight className="size-3.5" />
                </li>
              )}
              <li className="flex items-center">
                {isLast || crumb.path === undefined ? (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={isLast ? 'font-medium text-[var(--maw-shell-fg,var(--maw-fg))]' : undefined}
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigate(crumb.path as string)}
                    className="cursor-pointer rounded-sm border-0 bg-transparent p-0 font-[inherit] text-[length:inherit] text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    {crumb.label}
                  </button>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
