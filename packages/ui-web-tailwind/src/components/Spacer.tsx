import type { ReactNode } from 'react';
import type { SpacerProps } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';

/** Same props as the `Spacer` in @mawsoftwares/ui-web. `size` is any CSS length, so it is applied inline rather than as a class. */
export function Spacer({
  size = 'var(--maw-space-md)',
  axis = 'vertical',
  style,
}: SpacerProps): ReactNode {
  return (
    <div
      aria-hidden="true"
      className={cn('box-border shrink-0', axis === 'vertical' ? 'w-full' : 'inline-block h-full')}
      style={axis === 'vertical' ? { height: size, ...style } : { width: size, ...style }}
    />
  );
}
