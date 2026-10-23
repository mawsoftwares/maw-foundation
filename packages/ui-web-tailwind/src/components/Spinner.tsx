import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../lib/cn';

/** Same props as the `Spinner` in @mawsoftwares/ui-web. */
export function Spinner({
  size = 24,
  style,
  className,
}: {
  size?: number;
  style?: CSSProperties;
  className?: string;
}): ReactNode {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('box-border shrink-0 animate-spin rounded-full border-[3px] border-border border-t-brand', className)}
      style={{ width: size, height: size, animationDuration: '0.6s', ...style }}
    />
  );
}
