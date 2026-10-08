import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { Stack } from '@mawsoftwares/ui-web';

type Mode = 'off' | 'side' | 'overlay' | 'difference';

const MODES: readonly { key: Mode; label: string }[] = [
  { key: 'off', label: 'Generated only' },
  { key: 'side', label: 'Side by side' },
  { key: 'overlay', label: 'Overlay' },
  { key: 'difference', label: 'Difference' },
];

/**
 * Reference design vs generated theme. The reference image stays in the browser (never uploaded).
 * Difference mode blends the two so matching pixels go black and mismatches stand out.
 */
export function ReferenceCompare({ children }: { children: ReactNode }): ReactNode {
  const [url, setUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('side');
  const [opacity, setOpacity] = useState(0.5);

  useEffect(() => () => { if (url !== null) URL.revokeObjectURL(url); }, [url]);

  const onFile = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file === undefined) return;
    setUrl(URL.createObjectURL(file));
  };

  const image = (style: React.CSSProperties): ReactNode => (
    <img src={url ?? undefined} alt="Reference design" style={{ display: 'block', width: '100%', ...style }} />
  );

  return (
    <div>
      <Stack direction="row" gap="var(--maw-space-md)" align="center" style={{ flexWrap: 'wrap', marginBottom: 'var(--maw-space-md)', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>
        <label>
          Reference image (PNG/JPG):{' '}
          <input type="file" accept="image/png,image/jpeg" onChange={onFile} />
        </label>
        {url !== null && (
          <>
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} aria-label="Comparison mode">
              {MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            {mode === 'overlay' && (
              <label>
                Opacity <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
              </label>
            )}
          </>
        )}
      </Stack>

      {url !== null && mode === 'side' ? (
        <div style={{ display: 'grid', gap: 'var(--maw-space-lg)', gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', marginBottom: 4 }}>REFERENCE DESIGN</div>
            {image({ border: '1px solid var(--maw-border)' })}
          </div>
          <div>
            <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', marginBottom: 4 }}>GENERATED THEME</div>
            {children}
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', isolation: 'isolate' }}>
          {children}
          {url !== null && (mode === 'overlay' || mode === 'difference') && image({
            position: 'absolute', top: 0, left: 0, pointerEvents: 'none',
            opacity: mode === 'overlay' ? opacity : 1,
            mixBlendMode: mode === 'difference' ? 'difference' : 'normal',
          })}
        </div>
      )}
    </div>
  );
}
