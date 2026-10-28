import type { CSSProperties, ReactNode } from 'react';
import type { ThemeRegistry } from '@mawsoftwares/theme';
import type { ThemeSelection } from '@mawsoftwares/layout';
import { previewCssVars } from './theme-selection';

export interface ThemeGalleryProps {
  readonly themes: ThemeRegistry;
  /** The chosen theme id; `null` = the application's own theme. */
  readonly value: string | null;
  readonly onSelect: (themeId: string | null) => void;
  readonly selection: ThemeSelection;
  readonly prefersDark: boolean;
  readonly disabled?: boolean;
  /** Smaller cards (for use under the layout gallery). */
  readonly compact?: boolean;
}

/** A tiny drawing of an app in the theme's own colours: sidebar with an active item, header, and two cards. */
function Swatch({ vars }: { vars: Record<string, string> | undefined }): ReactNode {
  const v = (name: string, fallback: string): string => `var(${name}, ${fallback})`;
  const box: CSSProperties = {
    ...(vars as CSSProperties | undefined),
    display: 'flex',
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid var(--maw-border)',
    background: v('--maw-bgSubtle', '#f4f4f5'),
  };
  const bar = (w: string, opacity: number): CSSProperties => ({ height: 4, width: w, borderRadius: 2, background: v('--maw-shell-fg', '#18181b'), opacity });
  return (
    <div aria-hidden style={box}>
      <div style={{ width: '24%', background: v('--maw-shell-bg', '#ffffff'), padding: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ ...bar('60%', 1), height: 5, background: v('--maw-shell-logo', v('--maw-brand', '#6366f1')) }} />
        <div style={{ padding: 3, borderRadius: 4, background: v('--maw-comp-nav-item-active-background', v('--maw-shell-nav-active-bg', v('--maw-brand', '#6366f1'))) }}>
          <div style={{ ...bar('70%', 0), background: v('--maw-comp-nav-item-active-text-color', '#ffffff'), opacity: 0.9 }} />
        </div>
        <div style={bar('80%', 0.6)} />
        <div style={bar('55%', 0.6)} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 10, background: v('--maw-shell-header-bg', v('--maw-bg', '#ffffff')), borderBottom: `1px solid ${v('--maw-shell-header-border', v('--maw-border', '#e4e4e7'))}` }} />
        <div style={{ flex: 1, padding: 6, display: 'flex', gap: 5 }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ flex: 1, borderRadius: 4, background: v('--maw-bg', '#ffffff'), border: `1px solid ${v('--maw-border', '#e4e4e7')}`, padding: 4 }}>
              <div style={{ height: 4, width: i === 0 ? '70%' : '45%', borderRadius: 2, background: v('--maw-brand', '#6366f1') }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Pick a theme by looking at it: one card per registered theme, drawn in its own colours. */
export function ThemeGallery({ themes, value, onSelect, selection, prefersDark, disabled = false, compact = false }: ThemeGalleryProps): ReactNode {
  const options: ReadonlyArray<{ id: string | null; label: string; description: string }> = [
    { id: null, label: 'Application default', description: 'The theme the application already uses.' },
    ...themes.ids().map((id) => ({ id, label: themes.get(id)?.label ?? id, description: themes.get(id)?.description ?? '' })),
  ];
  return (
    <div role="radiogroup" aria-label="Theme" style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 150 : 190}px, 1fr))`, gap: 'var(--maw-space-md)' }}>
      {options.map((o) => {
        const selected = o.id === value;
        return (
          <button
            key={o.id ?? 'default'}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onSelect(o.id)}
            style={{
              all: 'unset',
              boxSizing: 'border-box',
              cursor: disabled ? 'not-allowed' : 'pointer',
              padding: 'var(--maw-space-sm)',
              borderRadius: 'var(--maw-radius-lg)',
              border: `2px solid ${selected ? 'var(--maw-brand)' : 'var(--maw-border)'}`,
              background: 'var(--maw-surface)',
              display: 'block',
              opacity: disabled ? 0.6 : 1,
            }}
          >
            <Swatch vars={o.id === null ? undefined : previewCssVars({ ...selection, themeId: o.id }, themes, prefersDark)} />
            <div style={{ marginTop: 'var(--maw-space-xs)', fontWeight: 600, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fg)' }}>{o.label}{selected ? ' ✓' : ''}</div>
            {!compact && <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>{o.description}</div>}
          </button>
        );
      })}
    </div>
  );
}
