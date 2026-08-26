import {
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Accordion
// ---------------------------------------------------------------------------

export interface AccordionItem {
  readonly key: string;
  readonly title: string;
  readonly content: ReactNode;
  readonly disabled?: boolean;
}

export interface AccordionProps {
  readonly items: readonly AccordionItem[];
  readonly multiple?: boolean;
  readonly defaultExpanded?: readonly string[];
  readonly style?: CSSProperties;
}

export function Accordion({
  items,
  multiple = false,
  defaultExpanded = [],
  style,
}: AccordionProps): ReactNode {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set(defaultExpanded));

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (!multiple) next.clear();
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div style={{ ...base, border: '1px solid var(--maw-border)', borderRadius: 'var(--maw-radius-md)', overflow: 'hidden', ...style }}>
      {items.map((item, i) => {
        const isOpen = expanded.has(item.key);
        return (
          <div key={item.key}>
            {i > 0 && <div style={{ borderTop: '1px solid var(--maw-border)' }} />}
            <button
              onClick={() => !item.disabled && toggle(item.key)}
              aria-expanded={isOpen}
              disabled={item.disabled}
              style={{
                ...base,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: 'var(--maw-space-md) var(--maw-space-lg)',
                background: 'var(--maw-bg)',
                border: 'none',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                color: item.disabled ? 'var(--maw-fgMuted)' : 'var(--maw-fg)',
                fontSize: 'var(--maw-text-sm)',
                fontWeight: 600,
                textAlign: 'left',
              }}
            >
              {item.title}
              <span style={{
                transition: 'transform 0.2s',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                fontSize: 'var(--maw-text-xs)',
              }}>▼</span>
            </button>
            {isOpen && (
              <div style={{
                padding: 'var(--maw-space-md) var(--maw-space-lg)',
                background: 'var(--maw-bg)',
                color: 'var(--maw-fg)',
                fontSize: 'var(--maw-text-sm)',
                borderTop: '1px solid var(--maw-border)',
              }}>
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
