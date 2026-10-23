import type { CSSProperties, ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { DrawerProps } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';

/**
 * Same props as the `Drawer` in @mawsoftwares/ui-web. Radix Dialog (focus trap, Escape, scroll lock, ARIA)
 * pinned to a side. On small screens a right-side drawer stretches to the viewport (forms) and a left-side
 * drawer keeps a 20rem cap (nav) unless `fullWidthOnMobile` says otherwise — ui-web's rule.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = 'right',
  width = 400,
  fullWidthOnMobile,
  style,
  contentStyle,
}: DrawerProps): ReactNode {
  const stretchOnMobile = fullWidthOnMobile ?? side === 'right';
  const panelWidth = typeof width === 'number' ? `${width}px` : width;
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--maw-z-modal)] animate-overlay-in bg-[var(--maw-overlay)]" />
        <Dialog.Content
          aria-describedby={undefined}
          style={{ '--drawer-w': panelWidth, ...style } as CSSProperties}
          className={cn(
            'fixed inset-y-0 z-[var(--maw-z-modal)] box-border flex w-[var(--drawer-w)] max-w-[90vw] flex-col bg-[var(--maw-comp-drawers-background,var(--maw-surface))] font-sans text-fg outline-none',
            side === 'left'
              ? 'left-0 animate-drawer-in-left shadow-[4px_0_24px_color-mix(in_srgb,#000_12%,transparent)]'
              : 'right-0 animate-drawer-in-right shadow-[-4px_0_24px_color-mix(in_srgb,#000_12%,transparent)]',
            stretchOnMobile ? 'max-md:w-full max-md:max-w-full' : 'max-md:max-w-[min(20rem,85vw)]',
          )}
        >
          {title !== undefined ? (
            <div className="flex shrink-0 items-center justify-between border-b border-border p-6">
              <Dialog.Title className="m-0 text-xl font-semibold text-fg">{title}</Dialog.Title>
              <Dialog.Close
                aria-label="Close"
                className="inline-flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>
          ) : (
            <Dialog.Title className="sr-only">Drawer</Dialog.Title>
          )}
          <div className="flex-1 overflow-auto p-6" style={contentStyle}>
            {children}
          </div>
          {footer !== undefined && footer !== null && footer !== false && (
            <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
