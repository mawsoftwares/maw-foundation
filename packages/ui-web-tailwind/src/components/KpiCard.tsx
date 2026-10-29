import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { KpiCardProps } from '@mawsoftwares/ui-contract';
import { Card } from './Card';
import { Icon } from './Icon';

/**
 * Same props as the `KpiCard` in @mawsoftwares/ui-web: label, big value, optional icon and +/- percent change. `icon` goes through the kit's
 * Icon, so it can be an emoji (as in ui-web) or an icon name; `color` tints the value and icon. The change arrow is also spoken ("Up"/"Down").
 */
const SPARK_W = 120;
const SPARK_H = 32;

/** A small trend line with a soft fill under it. Drawn left to right once, unless the user prefers reduced motion. */
function Sparkline({ data, stroke }: { data: readonly number[]; stroke: string }): ReactNode {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pad = 3;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * SPARK_W},${pad + (SPARK_H - 2 * pad) - ((v - min) / range) * (SPARK_H - 2 * pad)}`);
  const line = pts.join(' ');
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} className="mt-2 h-8 w-full max-w-[160px] overflow-visible" preserveAspectRatio="none" style={{ color: stroke }}>
      <polygon points={`0,${SPARK_H} ${line} ${SPARK_W},${SPARK_H}`} fill="currentColor" opacity="0.10" className="motion-safe:animate-[maw-fx-fade_900ms_ease-out_400ms_backwards]" />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        strokeDasharray={1}
        className="motion-safe:animate-[maw-fx-draw_1100ms_cubic-bezier(0.22,1,0.36,1)_250ms_backwards]"
      />
    </svg>
  );
}

export function KpiCard({ label, value, change, changeLabel, icon, color, trend, style }: KpiCardProps): ReactNode {
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
        {trend !== undefined && trend.length >= 2 && <Sparkline data={trend} stroke={color ?? (isPositive || change === undefined ? 'var(--maw-brand)' : 'var(--maw-danger)')} />}
      </div>
    </Card>
  );
}
