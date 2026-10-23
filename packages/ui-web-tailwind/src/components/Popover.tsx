import type { ReactNode } from 'react';
import * as RadixPopover from '@radix-ui/react-popover';
import type { PopoverProps } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';
import { POPOVER_CONTENT_CLASS } from '../lib/picker';

/**
 * Same props as the `Popover` in @mawsoftwares/ui-web: controlled (`open` / `onClose`) and anchored to an element you own via
 * `anchorRef`. Radix Popover supplies collision handling (it flips/shifts to stay on screen), Escape and outside-click.
 * Clicks on the anchor itself are not "outside", so a toggle button doesn't close-then-reopen the panel.
 */
export function Popover({
  open,
  onClose,
  anchorRef,
  children,
  placement = 'bottom',
  align = 'center',
  style,
}: PopoverProps): ReactNode {
  return (
    <RadixPopover.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <RadixPopover.Anchor virtualRef={anchorRef} />
      <RadixPopover.Portal>
        <RadixPopover.Content
          side={placement}
          align={align}
          sideOffset={8}
          collisionPadding={8}
          role="dialog"
          style={style}
          className={cn(
            POPOVER_CONTENT_CLASS,
            'box-border min-w-[220px] max-w-[min(320px,calc(100vw-16px))] rounded-[var(--maw-comp-popovers-border-radius,var(--maw-radius-lg))] bg-[var(--maw-comp-popovers-background,var(--maw-surface))] p-[var(--maw-comp-popovers-padding,var(--maw-space-md))] shadow-[var(--maw-comp-popovers-shadow,var(--maw-shadow-lg))] z-[var(--maw-z-popover)]',
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
          }}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
