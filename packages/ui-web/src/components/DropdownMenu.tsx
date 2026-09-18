import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
} from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// DropdownMenu
// ---------------------------------------------------------------------------

export interface DropdownMenuItem {
  readonly key: string;
  readonly label: string;
  readonly danger?: boolean;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
  readonly onClick: () => void;
}

export function DropdownMenu({
  trigger,
  items,
}: {
  trigger: ReactNode;
  items: readonly DropdownMenuItem[];
}): ReactNode {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          role="menu"
          style={{
            ...base,
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            minWidth: 160,
            background: 'var(--maw-surface)',
            border: "none",
            borderRadius: 'var(--maw-radius-md)',
            boxShadow: 'var(--maw-shadow-lg)',
            zIndex: 'var(--maw-z-dropdown)' as unknown as number,
            overflow: 'hidden',
          }}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              title={item.disabled ? item.disabledReason : undefined}
              onClick={() => {
                if (item.disabled) return;
                item.onClick();
                setOpen(false);
              }}
              style={{
                ...base,
                display: 'block',
                width: '100%',
                padding: 'var(--maw-space-sm) var(--maw-space-md)',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                fontSize: 'var(--maw-text-sm)',
                color: item.disabled
                  ? 'var(--maw-fgSubtle)'
                  : item.danger ? 'var(--maw-danger)' : 'var(--maw-fg)',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                opacity: item.disabled ? 0.6 : 1,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
