import {
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Section
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
