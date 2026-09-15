import { type ReactNode } from 'react';
import { Modal } from './Modal';
import { Drawer } from './Drawer';

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: number;
  layout?: 'drawer' | 'modal';
}

export function Overlay({ layout = 'drawer', ...props }: OverlayProps): ReactNode {
  if (layout === 'modal') {
    return <Modal {...props} />;
  }
  return <Drawer {...props} />;
}
