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

// ---------------------------------------------------------------------------
// Panel — bordered content container with optional header
// ---------------------------------------------------------------------------

export interface PanelProps {
  readonly title?: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
  readonly collapsible?: boolean;
  readonly defaultCollapsed?: boolean;
  readonly variant?: 'default' | 'outlined' | 'elevated';
  readonly style?: CSSProperties;
}

export function Panel({
  title,
  children,
  actions,
  collapsible = false,
  defaultCollapsed = false,
  variant = 'default',
  style,
}: PanelProps): ReactNode {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const variantStyles: Record<string, CSSProperties> = {
    default: { background: 'var(--maw-bg)', border: '1px solid var(--maw-border)' },
    outlined: { background: 'transparent', border: '1px solid var(--maw-border)' },
    elevated: { background: 'var(--maw-bg)', border: 'none', boxShadow: 'var(--maw-shadow-md)' },
  };

  return (
    <div style={{
      ...base,
      borderRadius: 'var(--maw-radius-md)',
      overflow: 'hidden',
      ...variantStyles[variant],
      ...style,
    }}>
      {title !== undefined && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--maw-space-md) var(--maw-space-lg)',
          borderBottom: collapsed ? 'none' : '1px solid var(--maw-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--maw-space-sm)' }}>
            {collapsible && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                aria-expanded={!collapsed}
                style={{
                  ...base,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--maw-fgMuted)',
                  padding: 0,
                  fontSize: 'var(--maw-text-xs)',
                  transition: 'transform 0.2s',
                  transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                }}
              >▼</button>
            )}
            <h3 style={{ margin: 0, fontSize: 'var(--maw-text-sm)', fontWeight: 600, color: 'var(--maw-fg)' }}>
              {title}
            </h3>
          </div>
          {actions && <div style={{ display: 'flex', gap: 'var(--maw-space-xs)' }}>{actions}</div>}
        </div>
      )}
      {!collapsed && (
        <div style={{ padding: 'var(--maw-space-lg)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section — semantic page section with title and optional description
// ---------------------------------------------------------------------------

export interface SectionProps {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
  readonly style?: CSSProperties;
}

export function Section({
  title,
  description,
  children,
  actions,
  style,
}: SectionProps): ReactNode {
  return (
    <section style={{ ...base, ...style }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 'var(--maw-space-lg)',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 'var(--maw-text-lg)', fontWeight: 600, color: 'var(--maw-fg)' }}>
            {title}
          </h2>
          {description && (
            <p style={{ margin: 'var(--maw-space-xs) 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
              {description}
            </p>
          )}
        </div>
        {actions && <div style={{ display: 'flex', gap: 'var(--maw-space-sm)', flexShrink: 0 }}>{actions}</div>}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Grid — responsive CSS grid layout
// ---------------------------------------------------------------------------

export interface GridProps {
  readonly children: ReactNode;
  readonly columns?: number | string;
  readonly gap?: string;
  readonly minChildWidth?: number;
  readonly style?: CSSProperties;
}

export function Grid({
  children,
  columns,
  gap = 'var(--maw-space-md)',
  minChildWidth,
  style,
}: GridProps): ReactNode {
  const gridTemplateColumns = minChildWidth
    ? `repeat(auto-fill, minmax(${minChildWidth}px, 1fr))`
    : typeof columns === 'number'
      ? `repeat(${columns}, 1fr)`
      : columns ?? 'repeat(auto-fill, minmax(250px, 1fr))';

  return (
    <div style={{
      ...base,
      display: 'grid',
      gridTemplateColumns,
      gap,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spacer — flexible whitespace
// ---------------------------------------------------------------------------

export interface SpacerProps {
  readonly size?: string;
  readonly axis?: 'horizontal' | 'vertical';
  readonly style?: CSSProperties;
}

export function Spacer({
  size = 'var(--maw-space-md)',
  axis = 'vertical',
  style,
}: SpacerProps): ReactNode {
  return (
    <div
      aria-hidden="true"
      style={{
        ...base,
        ...(axis === 'vertical'
          ? { height: size, width: '100%' }
          : { width: size, height: '100%', display: 'inline-block' }),
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
