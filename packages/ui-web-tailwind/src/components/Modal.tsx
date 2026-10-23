import type { ReactNode } from 'react';
import type { ModalProps } from '@mawsoftwares/ui-contract';
import { DialogShell } from '../lib/dialog-shell';

/** Same props as the `Modal` in @mawsoftwares/ui-web. Radix Dialog via the shared shell; always closes on backdrop click. */
export function Modal({ open, onClose, title, children, footer, width = 480 }: ModalProps): ReactNode {
  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title={title}
      footer={footer}
      width={width}
      closeOnOverlay
      sheetMaxHeightClass="max-h-[90vh]"
    >
      {children}
    </DialogShell>
  );
}
