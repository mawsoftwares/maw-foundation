import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

export interface PopoverProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly anchorRef: React.RefObject<HTMLElement | null>;
  readonly children: ReactNode;
  readonly placement?: 'top' | 'bottom' | 'left' | 'right';
  readonly align?: 'start' | 'center' | 'end';
  readonly style?: CSSProperties;
}

export function Popover({
  open,
  onClose,
  anchorRef,
  children,
  placement = 'bottom',
  align = 'center',
  style,
}: PopoverProps): ReactNode {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const gap = 8;
    const along = align === 'start' ? rect.left : align === 'end' ? rect.right : rect.left + rect.width / 2;

    switch (placement) {
      case 'top':
        setPos({ top: rect.top - gap, left: along });
        break;
      case 'bottom':
        setPos({ top: rect.bottom + gap, left: along });
        break;
      case 'left':
        setPos({ top: rect.top + rect.height / 2, left: rect.left - gap });
        break;
      case 'right':
        setPos({ top: rect.top + rect.height / 2, left: rect.right + gap });
        break;
    }
  }, [open, anchorRef, placement, align]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const transformOrigin: Record<string, string> = {
    top: 'bottom center',
    bottom: 'top center',
    left: 'center right',
    right: 'center left',
  };

  const translateX = align === 'start' ? '0' : align === 'end' ? '-100%' : '-50%';
  const translate: Record<string, string> = {
    top: `translate(${translateX}, -100%)`,
    bottom: `translate(${translateX}, 0)`,
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  };

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      style={{
        ...base,
        position: 'fixed',
        top: pos.top,
        left: Math.min(Math.max(8, pos.left), window.innerWidth - 8),
        transform: translate[placement],
        transformOrigin: transformOrigin[placement],
        background: 'var(--maw-bg)',
        border: '1px solid var(--maw-border)',
        borderRadius: 'var(--maw-radius-lg)',
        boxShadow: 'var(--maw-shadow-lg)',
        padding: 'var(--maw-space-md)',
        zIndex: 'var(--maw-z-popover)' as unknown as number,
        minWidth: 220,
        maxWidth: 'min(320px, calc(100vw - 16px))',
        ...style,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
