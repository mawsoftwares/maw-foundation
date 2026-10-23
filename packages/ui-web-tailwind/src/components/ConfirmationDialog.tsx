import type { ReactNode } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Button } from './Button';

export interface ConfirmationDialogProps {
  readonly open: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly title?: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly variant?: 'primary' | 'danger';
  readonly loading?: boolean;
}

/**
 * Same props as the `ConfirmationDialog` in @mawsoftwares/ui-web. Radix AlertDialog (role="alertdialog",
 * focus trap, Escape → cancel; outside click does not dismiss, as is correct for a destructive prompt).
 * Confirm is a plain kit Button so `onConfirm` fires once and the parent decides when to close.
 */
export function ConfirmationDialog({
  open,
  onConfirm,
  onCancel,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
}: ConfirmationDialogProps): ReactNode {
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[var(--maw-z-modal)] animate-overlay-in bg-[var(--maw-comp-modals-overlay-background,var(--maw-overlay))] backdrop-blur-[2px]" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[var(--maw-z-modal)] box-border w-[420px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 animate-dialog-in overflow-hidden rounded-lg bg-[var(--maw-surface)] font-sans shadow-[var(--maw-shadow-xl)] outline-none">
          <div className="p-6">
            <AlertDialog.Title className="m-0 mb-2 text-lg font-semibold text-fg">{title}</AlertDialog.Title>
            <AlertDialog.Description className="m-0 text-sm leading-normal text-fg-muted">
              {message}
            </AlertDialog.Description>
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-6 py-3">
            {/* Radix focuses the Cancel part on open (safe default for a destructive prompt); its click
                closes the dialog via onOpenChange, which calls onCancel — so no onClick here. */}
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" disabled={loading}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
