import type { CSSProperties, ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from './cn';

export interface DialogShellProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly width: number;
  readonly closeOnOverlay: boolean;
  readonly style?: CSSProperties;
  /** Bottom-sheet height cap on small screens (Modal 90vh, Dialog 95vh — ui-web's values). */
  readonly sheetMaxHeightClass: string;
}

/**
 * Shared body of the kit's Modal and Dialog: Radix Dialog (focus trap, Escape, scroll lock, portal, ARIA) rendered as a
 * bottom sheet below `md` and a centered dialog from `md` up, matching ui-web's useIsMobile behaviour.
 */
export function DialogShell({
  open,
  onClose,
  title,
  children,
  footer,
  width,
  closeOnOverlay,
  style,
  sheetMaxHeightClass,
}: DialogShellProps): ReactNode {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--maw-z-modal)] animate-overlay-in bg-[var(--maw-comp-modals-overlay-background,var(--maw-overlay))] backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby={undefined}
          style={{ '--modal-w': `${width}px`, ...style } as CSSProperties}
          // Backdrop clicks are "pointer down outside"; Escape and the close button are unaffected.
          onPointerDownOutside={closeOnOverlay ? undefined : (e) => e.preventDefault()}
          className={cn(
            'fixed z-[var(--maw-z-modal)] box-border flex flex-col overflow-hidden font-sans text-fg outline-none',
            'bg-[var(--maw-comp-modals-background,var(--maw-surface))] shadow-[var(--maw-comp-modals-shadow,var(--maw-shadow-xl))]',
            // mobile: bottom sheet
            'inset-x-0 bottom-0 w-full animate-sheet-in rounded-t-lg',
            sheetMaxHeightClass,
            // md+: centered dialog
            'md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[85vh] md:w-[var(--modal-w)] md:max-w-[90vw]',
            'md:-translate-x-1/2 md:-translate-y-1/2 md:animate-dialog-in md:rounded-[var(--maw-comp-modals-border-radius,var(--maw-radius-lg))]',
          )}
        >
          {title !== undefined ? (
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <Dialog.Title className="m-0 text-lg font-semibold text-fg">{title}</Dialog.Title>
              <Dialog.Close
                aria-label="Close"
                className="inline-flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
              >
                ✕
              </Dialog.Close>
            </div>
          ) : (
            <Dialog.Title className="sr-only">Dialog</Dialog.Title>
          )}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
          {footer !== undefined && footer !== null && footer !== false && (
            <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
