import type { ReactNode } from 'react';
import type { OverlayProps } from '@mawsoftwares/ui-contract';
import { Drawer } from './Drawer';
import { Modal } from './Modal';

/** Same props as the `Overlay` in @mawsoftwares/ui-web: the same content as a side Drawer (default) or a centered Modal. */
export function Overlay({ layout = 'drawer', ...props }: OverlayProps): ReactNode {
  return layout === 'modal' ? <Modal {...props} /> : <Drawer {...props} />;
}
