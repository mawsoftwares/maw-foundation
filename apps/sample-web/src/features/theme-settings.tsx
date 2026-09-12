import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Card, Stack, Badge, Banner, Button, TextAreaField, useTheme, useDynamicAccess, ListPage } from '@mawsoftwares/ui-web';
import { parseDesignMarkdown, type DesignMdParseResult } from '@mawsoftwares/theme';

/** Read by App.tsx's Shell on boot to re-apply the last design.md theme after a reload. */
export const DESIGN_MD_STORAGE_KEY = 'maw-design-md-branding';

/** Raw markdown text behind the last-applied theme, so the editor can be reopened where it was left off. */
const DESIGN_MD_CONTENT_STORAGE_KEY = 'maw-design-md-content';

const DEFAULT_TEMPLATE = `---
version: alpha
name: Custom Theme
colors:
  background: "#fcfaf7"
  on-background: "#423d38"
  surface: "#f3f4f6"
  surface-elevated: "#ffffff"
  on-surface: "#423d38"
  on-surface-muted: "#797067"
  outline: "#e3e0dd"
  primary: "#fe6e00"
  primary-strong: "#ff6b00"
  primary-warm: "#ffb74d"
  primary-focus: "#f97015"
  on-primary: "#ffffff"
  shell-base: "#000000"
  on-shell: "#ffffff"
  success: "#00c758"
  warning: "#edb200"
  danger: "#fb2c36"
  info: "#3080ff"
typography:
  body-md:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
rounded:
  md: "8px"
---`;

const PALETTE_SWATCHES = [
  ['brand', 'Primary'],
  ['bgSubtle', 'Canvas'],
  ['bg', 'Surface'],
  ['fg', 'Text'],
] as const;

export function ThemeSettingsView(): ReactNode {
  const { applyThemeOverrides, theme } = useTheme();
  const { can } = useDynamicAccess();
  const canManage = can('Manage_Theme');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>();
  const [designMdText, setDesignMdText] = useState<string>(
    () => localStorage.getItem(DESIGN_MD_CONTENT_STORAGE_KEY) ?? DEFAULT_TEMPLATE,
  );
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<DesignMdParseResult>();
  const [error, setError] = useState<string>();

  const applyText = useCallback((text: string) => {
    const parsed = parseDesignMarkdown(text);
    applyThemeOverrides(parsed.overrides);
    localStorage.setItem(DESIGN_MD_STORAGE_KEY, JSON.stringify(parsed.overrides));
    localStorage.setItem(DESIGN_MD_CONTENT_STORAGE_KEY, text);
    setResult(parsed);
    return parsed;
  }, [applyThemeOverrides]);

  const handleFile = useCallback(async (file: File) => {
    setApplying(true);
    setError(undefined);
    try {
      const text = await file.text();
      setDesignMdText(text);
      applyText(text);
      setFileName(file.name);
    } catch {
      setError('Could not read that file. Make sure it is a plain-text .md file.');
    } finally {
      setApplying(false);
    }
  }, [applyText]);

  const handleApplyText = useCallback(() => {
    setError(undefined);
    setFileName(undefined);
    applyText(designMdText);
  }, [applyText, designMdText]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([designMdText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'design.md';
    link.click();
    URL.revokeObjectURL(url);
  }, [designMdText]);

  const handleReset = useCallback(() => {
    localStorage.removeItem(DESIGN_MD_STORAGE_KEY);
    localStorage.removeItem(DESIGN_MD_CONTENT_STORAGE_KEY);
    window.location.reload();
  }, []);

  return (
    <ListPage
      title="Theme Designer"
      description="Import a YAML design.md (colors, shell, type, radius) or a simple Key: value list to apply a live app theme."
    >
      <Card>
        <Stack direction="column" gap="var(--maw-space-lg)">
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
              Paste a design-system YAML document (frontmatter with a <code>colors:</code> map) or one
              {' '}<code>Key: value</code> token per line. Recognized keys are case-insensitive.
            </p>
            <a href="/design.md" target="_blank" rel="noreferrer" style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-brand)' }}>
              View example design.md
            </a>
          </div>

          <TextAreaField
            name="designMd"
            label="design.md"
            value={designMdText}
            onChange={setDesignMdText}
            rows={18}
            disabled={!canManage}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept=".md,text/markdown,text/plain,.yaml,.yml"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />

          <Stack direction="row" align="center" gap="var(--maw-space-sm)" style={{ flexWrap: 'wrap' }}>
            <Button onClick={handleApplyText} loading={applying} disabled={!canManage || designMdText.trim() === ''}>
              Apply changes
            </Button>
            <Button variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={!canManage}>
              Load from file
            </Button>
            <Button variant="ghost" onClick={handleDownload} disabled={designMdText.trim() === ''}>
              Download design.md
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
                {PALETTE_SWATCHES.map(([key, label]) => {
                  const value = theme.light[key];
                  return (
                    <Stack key={key} direction="row" align="center" gap="var(--maw-space-xs)">
                      <span style={{
                        width: 16, height: 16, borderRadius: 'var(--maw-radius-sm)',
                        background: value, border: '1px solid var(--maw-border)',
                      }} />
                      <span style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
                        {label}: {value}
                      </span>
                    </Stack>
                  );
                })}
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
