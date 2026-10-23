import type { ReactNode } from 'react';
import type { SkeletonProps } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';

/**
 * Same props as the `Skeleton` in @mawsoftwares/ui-web, with the same shimmering gradient. The animation is defined
 * in this kit's theme.css (ui-web's lives in its ThemeProvider CSS) and is switched off for `prefers-reduced-motion`.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius,
  style,
  className,
}: SkeletonProps & { readonly className?: string }): ReactNode {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-shimmer rounded-sm bg-[linear-gradient(90deg,var(--maw-bgMuted)_25%,var(--maw-border)_37%,var(--maw-bgMuted)_63%)] bg-[length:400%_100%] motion-reduce:animate-none',
        className,
      )}
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function SkeletonRows({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}): ReactNode {
  return (
    <div role="status" aria-label="Loading" className={cn('flex flex-col gap-4', className)}>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-6">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} height={14} className={c === 0 ? 'flex-none basis-6' : 'flex-1'} />
          ))}
        </div>
      ))}
    </div>
  );
}
