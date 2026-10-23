import type { ReactNode } from 'react';
import type { DividerProps } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';

/** Same props as the `Divider` in @mawsoftwares/ui-web: a 1px `<hr>` with theme spacing; `style={{ margin }}` overrides it. */
export function Divider({ style, className }: DividerProps & { readonly className?: string } = {}): ReactNode {
  return (
    <hr
      style={style}
      className={cn('m-0 my-[var(--maw-space-lg)] box-border h-0 w-full border-0 border-t border-border', className)}
    />
  );
}
