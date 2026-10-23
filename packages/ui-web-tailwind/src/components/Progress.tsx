import type { ReactNode } from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import type { ProgressProps } from '@mawsoftwares/ui-contract';

/** Same props as the `Progress` in @mawsoftwares/ui-web. Radix Progress (role="progressbar" + aria-valuenow). */
export function Progress({ value, max = 100, height = 8, style }: ProgressProps): ReactNode {
  const clamped = Math.min(max, Math.max(0, value));
  const pct = max > 0 ? (clamped / max) * 100 : 0;
  return (
    <ProgressPrimitive.Root
      value={clamped}
      max={max}
      aria-label="Progress"
      style={{ height, borderRadius: height / 2, ...style }}
      className="relative box-border w-full overflow-hidden bg-bg-muted"
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full bg-brand transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${100 - pct}%)`, borderRadius: height / 2 }}
      />
    </ProgressPrimitive.Root>
  );
}
