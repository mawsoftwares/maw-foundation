import {
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Panel
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
    default: { background: 'var(--maw-surface)', border: '1px solid var(--maw-border)' },
    outlined: { background: 'transparent', border: '1px solid var(--maw-border)' },
    elevated: { background: 'var(--maw-surface)', border: 'none', boxShadow: 'var(--maw-shadow-md)' },
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
