import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Card, Stack, Badge, Banner, Button, TextAreaField, useTheme, useDynamicAccess, ListPage } from '@mawsoftwares/ui-web';
import { normalizeDesignMarkdown, type DesignMdNormalizeResult } from '@mawsoftwares/theme';

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

const PRESET_THEMES = [
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    image: '/themes/glassmorphism.jpg',
    template: `---
version: alpha
name: Glassmorphism
colors:
  background: "#0f172a"
  on-background: "#f8fafc"
  surface: "rgba(30, 41, 59, 0.7)"
  surface-elevated: "rgba(51, 65, 85, 0.8)"
  on-surface: "#f1f5f9"
  on-surface-muted: "#94a3b8"
  outline: "rgba(255, 255, 255, 0.1)"
  primary: "#a855f7"
  primary-strong: "#9333ea"
  primary-warm: "#c084fc"
  primary-focus: "#7e22ce"
  on-primary: "#ffffff"
  shell-base: "#020617"
  on-shell: "#f8fafc"
typography:
  body-md:
    fontFamily: "Inter, system-ui, sans-serif"
rounded:
  md: "16px"
---`
  },
  {
    id: 'neobrutalism',
    name: 'Neobrutalism',
    image: '/themes/neobrutalism.jpg',
    template: `---
version: alpha
name: Neobrutalism
colors:
  background: "#fdfbf7"
  on-background: "#000000"
  surface: "#ffffff"
  surface-elevated: "#ffffff"
  on-surface: "#000000"
  on-surface-muted: "#000000"
  outline: "#000000"
  primary: "#fbbf24"
  primary-strong: "#f59e0b"
  primary-warm: "#fcd34d"
  primary-focus: "#d97706"
  on-primary: "#000000"
  shell-base: "#fdfbf7"
  on-shell: "#000000"
typography:
  body-md:
    fontFamily: "'Space Grotesk', system-ui, sans-serif"
    fontWeight: "600"
rounded:
  md: "0px"
---`
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    image: '/themes/minimalist.jpg',
    template: `---
version: alpha
name: Minimalist
colors:
  background: "#ffffff"
  on-background: "#111827"
  surface: "#f9fafb"
  surface-elevated: "#ffffff"
  on-surface: "#111827"
  on-surface-muted: "#6b7280"
  outline: "#e5e7eb"
  primary: "#111827"
  primary-strong: "#000000"
  primary-warm: "#374151"
  primary-focus: "#000000"
  on-primary: "#ffffff"
  shell-base: "#f3f4f6"
  on-shell: "#111827"
typography:
  body-md:
    fontFamily: "Inter, system-ui, sans-serif"
rounded:
  md: "4px"
---`
  },
  {
    id: 'bento',
    name: 'Bento Box',
    image: '/themes/bento.jpg',
    template: `---
version: alpha
name: Bento Box
colors:
  background: "#f0fdf4"
  on-background: "#064e3b"
  surface: "#ffffff"
  surface-elevated: "#ffffff"
  on-surface: "#064e3b"
  on-surface-muted: "#047857"
  outline: "#d1fae5"
  primary: "#10b981"
  primary-strong: "#059669"
  primary-warm: "#34d399"
  primary-focus: "#047857"
  on-primary: "#ffffff"
  shell-base: "#ecfdf5"
  on-shell: "#064e3b"
typography:
  body-md:
    fontFamily: "Outfit, system-ui, sans-serif"
rounded:
  md: "24px"
---`
  }
];

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
  const [result, setResult] = useState<DesignMdNormalizeResult>();
  const [error, setError] = useState<string>();

  const applyText = useCallback((text: string) => {
    const normalized = normalizeDesignMarkdown(text);
    setResult(normalized);
    if (normalized.recognized.length === 0) {
      setDesignMdText(text);
      localStorage.setItem(DESIGN_MD_CONTENT_STORAGE_KEY, text);
      return normalized;
    }
    setDesignMdText(normalized.canonical);
    applyThemeOverrides(normalized.overrides);
    localStorage.setItem(DESIGN_MD_STORAGE_KEY, JSON.stringify(normalized.overrides));
    localStorage.setItem(DESIGN_MD_CONTENT_STORAGE_KEY, normalized.canonical);
    return normalized;
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
      description="Any design.md becomes a live MAW theme — parsed, mapped to our tokens, and adapted so the app stays readable."
    >
      <Card>
        <Stack direction="column" gap="var(--maw-space-lg)">
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
              Import any format (YAML, lists, CSS variables, unlabeled hex). We map it into MAW roles —
              primary → buttons, background → page canvas, surface → cards — and keep accents off chrome
              so the shell stays usable. Canonical YAML is written back so you can edit and re-Apply.
            </p>
            <a href="/design.md" target="_blank" rel="noreferrer" style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-brand)' }}>
              View example design.md
            </a>
          </div>

          <div style={{ marginTop: 'var(--maw-space-md)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 'var(--maw-text-md)', fontWeight: 600 }}>Preset Themes</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--maw-space-md)' }}>
              {PRESET_THEMES.map(preset => (
                <div
                  key={preset.id}
                  style={{
                    border: '1px solid var(--maw-border)',
                    borderRadius: 'var(--maw-radius-md)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={() => {
                    if (!canManage) return;
                    setDesignMdText(preset.template);
                    applyText(preset.template);
                    setFileName(`${preset.id}.md`);
                  }}
                >
                  <img src={preset.image} alt={preset.name} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '8px 12px', fontSize: 'var(--maw-text-sm)', fontWeight: 500, background: 'var(--maw-bg)', borderTop: '1px solid var(--maw-border)' }}>
                    {preset.name}
                  </div>
                </div>
              ))}
            </div>
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
              {result.converted && (
                <Banner variant="info">Converted the imported file into canonical design.md format.</Banner>
              )}
              {result.recognized.length === 0 && (
                <Banner variant="warning">
                  Nothing in that file looked like theme tokens. Include hex/rgb/hsl colors (named keys help), CSS variables,
                  or a colors: YAML map — then Apply again.
                </Banner>
              )}
              {result.warnings.filter((w) => w.startsWith('Mapped unlabeled') || w.startsWith('Adapted into')).map((w, i) => (
                <Banner key={`inferred-${i}`} variant="info">{w}</Banner>
              ))}
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
              {result.warnings.filter((w) => !w.startsWith('No recognized') && !w.startsWith('Mapped unlabeled') && !w.startsWith('Adapted into')).map((w, i) => (
                <Banner key={i} variant="warning">{w}</Banner>
              ))}
            </Stack>
          )}
        </Stack>
      </Card>
    </ListPage>
  );
}
