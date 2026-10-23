import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { KpiCardProps } from '@mawsoftwares/ui-contract';
import { Card } from './Card';
import { Icon } from './Icon';

/**
 * Same props as the `KpiCard` in @mawsoftwares/ui-web: label, big value, optional icon and +/- percent change. `icon` goes through the kit's
 * Icon, so it can be an emoji (as in ui-web) or an icon name; `color` tints the value and icon. The change arrow is also spoken ("Up"/"Down").
 */
export function KpiCard({ label, value, change, changeLabel, icon, color, style }: KpiCardProps): ReactNode {
  const isPositive = change !== undefined && change >= 0;
  return (
    <Card padding="var(--maw-space-xl)" style={style}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[length:var(--maw-text-xs)] font-medium uppercase tracking-wider text-fg-muted">{label}</span>
          {icon !== undefined && (
            <span className="inline-flex text-brand" style={color !== undefined ? { color } : undefined}>
              <Icon name={icon} size={20} />
            </span>
          )}
        </div>
        <div className="text-[length:var(--maw-text-xl)] font-bold text-fg" style={color !== undefined ? { color } : undefined}>
          {value}
        </div>
        {change !== undefined && (
          <div className="flex items-center gap-1 text-[length:var(--maw-text-xs)]">
            <span className={`inline-flex items-center gap-0.5 ${isPositive ? 'text-success' : 'text-danger'}`}>
              <span className="sr-only">{isPositive ? 'Up' : 'Down'}</span>
              {isPositive ? <ArrowUp aria-hidden="true" className="size-3" /> : <ArrowDown aria-hidden="true" className="size-3" />}
              {Math.abs(change)}%
            </span>
            {changeLabel !== undefined && <span className="text-fg-muted">{changeLabel}</span>}
          </div>
        )}
      </div>
    </Card>
  );
}
