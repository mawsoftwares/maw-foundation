import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// SettingsLayout
// ---------------------------------------------------------------------------

export interface SettingsGroup {
  readonly key: string;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

export interface SettingsLayoutProps {
  readonly groups: readonly SettingsGroup[];
  readonly style?: CSSProperties;
}

export function SettingsLayout({
  groups,
  style,
}: SettingsLayoutProps): ReactNode {
  return (
    <div style={{ ...base, ...style }}>
      {groups.map((group, i) => (
        <div key={group.key}>
          {i > 0 && <div style={{ borderTop: '1px solid var(--maw-border)', margin: 'var(--maw-space-lg) 0' }} />}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--maw-space-xl)',
            alignItems: 'start',
          }}>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: 'var(--maw-text-sm)',
                fontWeight: 600,
                color: 'var(--maw-fg)',
              }}>{group.title}</h3>
              {group.description && (
                <p style={{
                  margin: 'var(--maw-space-xs) 0 0',
                  fontSize: 'var(--maw-text-xs)',
                  color: 'var(--maw-fgMuted)',
                  lineHeight: 1.5,
                }}>{group.description}</p>
              )}
            </div>
            <div>{group.children}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
