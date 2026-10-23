import { type ReactNode } from 'react';
import { Modal } from '../kit';
import { Drawer } from '../kit';
import type { OverlayProps } from '@mawsoftwares/ui-contract';

export type { OverlayProps };

export function Overlay({ layout = 'drawer', ...props }: OverlayProps): ReactNode {
  if (layout === 'modal') {
    return <Modal {...props} />;
  }
  return <Drawer {...props} />;
}
