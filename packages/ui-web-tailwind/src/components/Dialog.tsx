import type { ReactNode } from 'react';
import type { DialogProps } from '@mawsoftwares/ui-contract';
import { DialogShell } from '../lib/dialog-shell';

/**
 * Same props as the `Dialog` in @mawsoftwares/ui-web: a Modal plus `closeOnOverlay` (default true) and a `style` for the panel.
 * Radix Dialog via the shared shell, so it also traps focus, locks scroll and restores focus on close.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
  closeOnOverlay = true,
  style,
}: DialogProps): ReactNode {
  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title={title}
      footer={footer}
      width={width}
      closeOnOverlay={closeOnOverlay}
      style={style}
      sheetMaxHeightClass="max-h-[95vh]"
    >
      {children}
    </DialogShell>
  );
}
