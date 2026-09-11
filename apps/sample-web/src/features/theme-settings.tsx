import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Card, Stack, Badge, Banner, Button, useTheme, useDynamicAccess, ListPage } from '@mawsoftwares/ui-web';
import { parseDesignMarkdown, type DesignMdParseResult, type TenantBranding } from '@mawsoftwares/theme';

/** Read by App.tsx's Shell on boot to re-apply the last design.md theme after a reload. */
export const DESIGN_MD_STORAGE_KEY = 'maw-design-md-branding';

const SWATCH_FIELDS: readonly (keyof TenantBranding)[] = ['primaryColor', 'secondaryColor', 'accentColor'];

export function ThemeSettingsView(): ReactNode {
  const { applyBranding } = useTheme();
  const { can } = useDynamicAccess();
  const canManage = can('Manage_Theme');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>();
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<DesignMdParseResult>();
  const [error, setError] = useState<string>();

  const handleFile = useCallback(async (file: File) => {
    setApplying(true);
    setError(undefined);
    try {
      const text = await file.text();
      const parsed = parseDesignMarkdown(text);
      applyBranding(parsed.branding);
      localStorage.setItem(DESIGN_MD_STORAGE_KEY, JSON.stringify(parsed.branding));
      setResult(parsed);
      setFileName(file.name);
    } catch {
      setError('Could not read that file. Make sure it is a plain-text .md file.');
    } finally {
      setApplying(false);
    }
  }, [applyBranding]);

  const handleReset = useCallback(() => {
    localStorage.removeItem(DESIGN_MD_STORAGE_KEY);
    window.location.reload();
  }, []);

  return (
    <ListPage
      title="Theme Designer"
      description="Select a design.md file to apply its colors, font, and radius as the live app theme."
    >
      <Card>
        <Stack direction="column" gap="var(--maw-space-lg)">
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
              The file should list one token per line, e.g.:
            </p>
            <pre style={{
              margin: 0,
              padding: 'var(--maw-space-md)',
              background: 'var(--maw-bgMuted)',
              borderRadius: 'var(--maw-radius-md)',
              fontFamily: 'var(--maw-font-mono)',
              fontSize: 'var(--maw-text-xs)',
              color: 'var(--maw-fg)',
              overflowX: 'auto',
            }}>
{`- Primary Color: #4f46e5
- Secondary Color: #818cf8
- Accent Color: #4338ca
- Font Family: Inter
- Border Radius: 12`}
            </pre>
            <a href="/design.md" target="_blank" rel="noreferrer" style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-brand)' }}>
              View example design.md
            </a>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".md,text/markdown,text/plain"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />

          <Stack direction="row" align="center" gap="var(--maw-space-sm)">
            <Button onClick={() => fileInputRef.current?.click()} loading={applying} disabled={!canManage}>
              Select design.md
            </Button>
            {result !== undefined && (
              <Button variant="ghost" onClick={handleReset}>Reset to default theme</Button>
            )}
            {fileName !== undefined && (
              <span style={{ fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>{fileName}</span>
            )}
          </Stack>

          {!canManage && (
            <Banner variant="warning">You don't have the Manage_Theme permission — selecting a file won't apply it.</Banner>
          )}

          {error !== undefined && <Banner variant="danger">{error}</Banner>}

          {result !== undefined && (
            <Stack direction="column" gap="var(--maw-space-sm)">
              <Stack direction="row" gap="var(--maw-space-sm)" style={{ flexWrap: 'wrap' }}>
                {SWATCH_FIELDS.filter((f) => result.branding[f] !== undefined).map((f) => (
                  <Stack key={f} direction="row" align="center" gap="var(--maw-space-xs)">
                    <span style={{
                      width: 16, height: 16, borderRadius: 'var(--maw-radius-sm)',
                      background: result.branding[f] as string, border: '1px solid var(--maw-border)',
                    }} />
                    <span style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
                      {f}: {result.branding[f]}
                    </span>
                  </Stack>
                ))}
              </Stack>
              {result.recognized.length > 0 && (
                <Badge variant="success">{result.recognized.length} token(s) applied</Badge>
              )}
              {result.warnings.map((w, i) => (
                <Banner key={i} variant="warning">{w}</Banner>
              ))}
            </Stack>
          )}
        </Stack>
      </Card>
    </ListPage>
  );
}
