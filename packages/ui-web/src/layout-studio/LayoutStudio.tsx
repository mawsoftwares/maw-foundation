import { getUIKitOverride } from '@mawsoftwares/ui-contract';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  LAYOUT_PERMISSIONS,
  COLOR_MODES,
  SPACING_PRESETS,
  TYPOGRAPHY_PRESETS,
  ProjectUiStoreError,
  countLayoutOverrides,
  createDefaultProjectUi,
  defaultLayoutRegistry,
  getAtPath,
  layoutConfigsEqual,
  resolveLayout,
  restorePresetDefaults,
  setLayoutPreset,
  setLayoutSetting,
  type LayoutIssue,
  type LayoutRegistry,
  type OverridePath,
  type ProjectUiConfig,
  type ProjectUiState,
  type ProjectUiStore,
  type ThemeSelection,
} from '@mawsoftwares/layout';
import type { ThemeRegistry } from '@mawsoftwares/theme';
import { Badge, Banner, Button, Card, Checkbox, Grid, Select, Stack, Tabs } from '../kit';
import { ShellPreview } from './ShellPreview';
import { ThemeGallery } from './ThemeGallery';
import { previewCssVars } from './theme-selection';
import { PREVIEW_VIEWPORTS, type PreviewViewport } from './viewport';

export interface LayoutStudioProps {
  /** Draft/published persistence. Studio only ever writes the draft; `publish` is a separate, permissioned step. */
  readonly store: ProjectUiStore;
  readonly registry?: LayoutRegistry;
  /** Themes the project may choose from. */
  readonly themes?: ThemeRegistry;
  /** RBAC check (from `useDynamicAccess`). Editing needs `Update_Layout`, publishing and rollback need `Publish_Layout`. */
  readonly can: (permission: string) => boolean;
  /** Called after a successful publish or rollback so the host can apply the new live config. */
  readonly onPublished?: (state: ProjectUiState) => void;
  /** Show the Studio's working copy (saved or not) in the real application, for this viewer only, before anything is published. */
  readonly onPreview?: (config: ProjectUiConfig) => void;
  /** Whether the OS prefers dark mode (for the `system` colour mode preview). */
  readonly prefersDark?: boolean;
}

type Tab = 'layout' | 'sidebar' | 'header' | 'panels' | 'shape' | 'theme' | 'history';
type Message = { readonly kind: 'success' | 'danger' | 'info'; readonly text: string; readonly issues?: readonly LayoutIssue[] };

const TABS: readonly { key: Tab; label: string }[] = [
  { key: 'layout', label: 'Layout' },
  { key: 'sidebar', label: 'Sidebar' },
  { key: 'header', label: 'Header' },
  { key: 'panels', label: 'Panels' },
  { key: 'shape', label: 'Shape' },
  { key: 'theme', label: 'Theme' },
  { key: 'history', label: 'History' },
];

const opts = (...values: readonly string[]): readonly { value: string; label: string }[] =>
  values.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1).replace(/-/g, ' ') }));
const BREAKPOINT_OPTIONS = [
  { value: 'sm', label: 'Small (640px)' },
  { value: 'md', label: 'Medium (768px)' },
  { value: 'lg', label: 'Large (1024px)' },
  { value: 'xl', label: 'Extra large (1280px)' },
];

const sameConfig = (a: ProjectUiConfig, b: ProjectUiConfig): boolean => layoutConfigsEqual(a, b);

/**
 * Layout Studio: pick a layout preset, tune it, choose theme options, preview at desktop/tablet/mobile, then save a
 * draft and (separately, with permission) publish. The preview is a self-contained wireframe, so nothing the user
 * does here changes the running application until `publish`.
 */
export function LayoutStudio({ store, registry = defaultLayoutRegistry, themes, can, onPublished, onPreview, prefersDark = false }: LayoutStudioProps): ReactNode {
  const canEdit = can(LAYOUT_PERMISSIONS.update);
  const canPublish = can(LAYOUT_PERMISSIONS.publish);

  const [state, setState] = useState<ProjectUiState | null>(null);
  const [working, setWorking] = useState<ProjectUiConfig>(createDefaultProjectUi());
  const [tab, setTab] = useState<Tab>('layout');
  const [viewport, setViewport] = useState<PreviewViewport>('desktop');
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);

  const baseline = useMemo(() => state?.draft ?? state?.published ?? createDefaultProjectUi(registry.fallbackPresetId), [state, registry]);

  useEffect(() => {
    let cancelled = false;
    store.load().then(
      (s) => {
        if (cancelled) return;
        setState(s);
        setWorking(s.draft ?? s.published ?? createDefaultProjectUi(registry.fallbackPresetId));
      },
      () => !cancelled && setMessage({ kind: 'danger', text: 'Could not load the layout configuration.' }),
    );
    return () => { cancelled = true; };
  }, [store, registry]);

  const resolved = useMemo(() => resolveLayout(working.layout, registry), [working.layout, registry]);
  const preset = registry.getPreset(resolved.presetId) ?? registry.getPreset(registry.fallbackPresetId);
  const dirty = !sameConfig(working, baseline);
  const hasUnpublishedDraft = state?.draft != null;
  const cssVars = useMemo(() => previewCssVars(working.theme, themes, prefersDark), [working.theme, themes, prefersDark]);
  const customisations = countLayoutOverrides(working.layout);
  // Until a theme is chosen the gallery shows each preset in the look it was designed around; a chosen theme applies to all.
  const suggestedThemeFor = (id: string): string | undefined => {
    const suggested = registry.getPreset(id)?.suggestedThemeId;
    return suggested !== undefined && themes?.ids().includes(suggested) ? suggested : undefined;
  };
  const thumbVars = (id: string): Record<string, string> => {
    const suggested = working.theme.themeId === null ? suggestedThemeFor(id) : undefined;
    return suggested === undefined ? cssVars : previewCssVars({ ...working.theme, themeId: suggested }, themes, prefersDark);
  };
  const matchingTheme = suggestedThemeFor(resolved.presetId);

  const run = useCallback(async (action: () => Promise<ProjectUiState>, success: string, published = false): Promise<void> => {
    setBusy(true);
    try {
      const next = await action();
      setState(next);
      setWorking(next.draft ?? next.published ?? createDefaultProjectUi(registry.fallbackPresetId));
      setMessage({ kind: 'success', text: success });
      if (published) onPublished?.(next);
    } catch (e) {
      setMessage(
        e instanceof ProjectUiStoreError
          ? { kind: 'danger', text: e.message, issues: e.issues }
          : { kind: 'danger', text: 'Something went wrong. Your changes are still here.' },
      );
    } finally {
      setBusy(false);
    }
  }, [onPublished, registry]);

  if (preset === undefined) return <Banner variant="danger">No layout presets are registered.</Banner>;

  const setting = (path: OverridePath, value: unknown): void => {
    setMessage(null);
    setWorking((w) => ({ ...w, layout: setLayoutSetting(w.layout, preset, path, value) }));
  };
  const setTheme = (patch: Partial<ThemeSelection>): void => {
    setMessage(null);
    setWorking((w) => ({ ...w, theme: { ...w.theme, ...patch } }));
  };
  const value = (path: OverridePath): unknown => getAtPath(resolved.settings, path);
  const text = (path: OverridePath): string => String(value(path));
  const flag = (path: OverridePath): boolean => value(path) === true;
  const toggleComponent = (path: OverridePath, id: string, on: boolean): void => {
    const current = (value(path) as readonly string[]) ?? [];
    setting(path, on ? [...current, id] : current.filter((c) => c !== id));
  };

  const select = (label: string, path: OverridePath, options: readonly { value: string; label: string }[]): ReactNode => (
    <Select label={label} value={text(path)} options={options} disabled={!canEdit} onChange={(e) => setting(path, e.target.value)} />
  );
  const check = (label: string, path: OverridePath): ReactNode => (
    <Checkbox label={label} checked={flag(path)} disabled={!canEdit} onChange={(v) => setting(path, v)} />
  );
  const componentList = (legend: string, path: OverridePath): ReactNode => (
    <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
      <legend style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 600, marginBottom: 'var(--maw-space-sm)' }}>{legend}</legend>
      <Stack direction="row" gap="var(--maw-space-md)" style={{ flexWrap: 'wrap' }}>
        {[...registry.componentIds()].map((id) => (
          <Checkbox
            key={id}
            label={id}
            checked={((value(path) as readonly string[]) ?? []).includes(id)}
            disabled={!canEdit}
            onChange={(on) => toggleComponent(path, id, on)}
          />
        ))}
      </Stack>
    </fieldset>
  );

  const panel = ((): ReactNode => {
    switch (tab) {
      case 'layout':
        return (
          <Stack direction="column" gap="var(--maw-space-lg)">
            <div role="group" aria-label="Layout presets">
              <Grid minChildWidth={230} gap="var(--maw-space-md)">
                {registry.listPresets().map((p) => {
                  const selected = p.id === resolved.presetId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={!canEdit}
                      onClick={() => { setMessage(null); setWorking((w) => ({ ...w, layout: setLayoutPreset(w.layout, p.id) })); }}
                      style={{
                        all: 'unset',
                        boxSizing: 'border-box',
                        cursor: canEdit ? 'pointer' : 'not-allowed',
                        padding: 'var(--maw-space-sm)',
                        borderRadius: 'var(--maw-radius-lg)',
                        border: `2px solid ${selected ? 'var(--maw-brand)' : 'var(--maw-border)'}`,
                        background: 'var(--maw-surface)',
                        display: 'block',
                      }}
                    >
                      <ShellPreview presetId={p.id} label={p.label} settings={p.settings} viewport="desktop" cssVars={thumbVars(p.id)} scale={0.23} />
                      <div style={{ marginTop: 'var(--maw-space-sm)', fontWeight: 600, color: 'var(--maw-fg)' }}>{p.label}{selected ? ' ✓' : ''}</div>
                      <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>{p.description}</div>
                    </button>
                  );
                })}
              </Grid>
            </div>
            {themes !== undefined && (
              <div>
                <h3 style={{ margin: '0 0 var(--maw-space-sm)', fontSize: 'var(--maw-text-md)', color: 'var(--maw-fg)' }}>Theme</h3>
                <ThemeGallery compact themes={themes} value={working.theme.themeId} onSelect={(themeId) => setTheme({ themeId })} selection={working.theme} prefersDark={prefersDark} disabled={!canEdit} />
              </div>
            )}
            {matchingTheme !== undefined && working.theme.themeId !== matchingTheme && (
              <Banner variant="info">
                {resolved.label} was designed around the “{matchingTheme}” theme.{' '}
                <Button variant="ghost" disabled={!canEdit} onClick={() => setTheme({ themeId: matchingTheme })}>Use the matching theme</Button>
              </Banner>
            )}
            <Stack direction="row" gap="var(--maw-space-sm)" align="center">
              <Badge variant={customisations > 0 ? 'info' : 'neutral'}>{customisations} customisation{customisations === 1 ? '' : 's'}</Badge>
              <Button variant="ghost" disabled={!canEdit || customisations === 0} onClick={() => setWorking((w) => ({ ...w, layout: restorePresetDefaults(w.layout) }))}>
                Reset to {resolved.label} defaults
              </Button>
            </Stack>
          </Stack>
        );
      case 'sidebar':
        return (
          <Grid minChildWidth={200} gap="var(--maw-space-md)">
            {check('Show sidebar', ['sidebar', 'enabled'])}
            {select('Style', ['sidebar', 'variant'], opts('docked', 'floating', 'rail'))}
            {select('Position', ['sidebar', 'position'], opts('left', 'right'))}
            {select('Width', ['sidebar', 'width'], opts('sm', 'md', 'lg'))}
            {check('Collapsible', ['sidebar', 'collapsible'])}
            {check('Start collapsed', ['sidebar', 'defaultCollapsed'])}
            {select('Labels', ['sidebar', 'labels'], [{ value: 'beside', label: 'Beside the icon' }, { value: 'below', label: 'Below the icon (tile bar)' }])}
            {check('Expand on hover (rail)', ['sidebar', 'expandOnHover'])}
            {select('Mobile navigation below', ['responsive', 'sidebarCollapseBelow'], BREAKPOINT_OPTIONS)}
            {select('Mobile navigation style', ['responsive', 'mobileNavigation'], opts('drawer', 'bottom-bar'))}
            <div style={{ gridColumn: '1 / -1' }}>{componentList('Top of sidebar', ['sidebar', 'top'])}</div>
            <div style={{ gridColumn: '1 / -1' }}>{componentList('Bottom of sidebar', ['sidebar', 'bottom'])}</div>
          </Grid>
        );
      case 'header':
        return (
          <Grid minChildWidth={200} gap="var(--maw-space-md)">
            {check('Show header', ['header', 'enabled'])}
            {check('Sticky', ['header', 'sticky'])}
            {select('Style', ['header', 'variant'], opts('default', 'minimal', 'prominent'))}
            <span />
            <div style={{ gridColumn: '1 / -1' }}>{componentList('Header — left', ['header', 'start'])}</div>
            <div style={{ gridColumn: '1 / -1' }}>{componentList('Header — right', ['header', 'end'])}</div>
          </Grid>
        );
      case 'panels':
        return (
          <Grid minChildWidth={200} gap="var(--maw-space-md)">
            {check('Right panel', ['rightPanel', 'enabled'])}
            {select('Right panel width', ['rightPanel', 'width'], opts('sm', 'md', 'lg'))}
            {check('Right panel collapsible', ['rightPanel', 'collapsible'])}
            {check('Right panel open by default', ['rightPanel', 'defaultOpen'])}
            {select('Hide right panel below', ['responsive', 'rightPanelHideBelow'], BREAKPOINT_OPTIONS)}
            {check('Footer', ['footer', 'enabled'])}
            {select('Content width', ['content', 'width'], [{ value: 'contained', label: 'Contained' }, { value: 'full', label: 'Full width' }])}
            {select('Density', ['density'], opts('compact', 'comfortable', 'spacious'))}
          </Grid>
        );
      case 'shape':
        return (
          <Stack direction="column" gap="var(--maw-space-md)">
            <p style={{ margin: 0, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
              Geometry only. Colours come from the theme, so any theme works with any shape.
            </p>
            <Grid minChildWidth={200} gap="var(--maw-space-md)">
              {select('App frame', ['shape', 'frame'], [{ value: 'full-bleed', label: 'Full bleed' }, { value: 'inset', label: 'Rounded card on canvas' }])}
              {select('Corners', ['shape', 'corners'], opts('sharp', 'soft', 'round'))}
              {select('Navigation items', ['shape', 'nav'], [{ value: 'rounded', label: 'Rounded (theme default)' }, { value: 'pill', label: 'Pill' }])}
              {select('Active item', ['shape', 'indicator'], [{ value: 'fill', label: 'Filled' }, { value: 'bar', label: 'Side bar' }, { value: 'dot', label: 'Dot' }, { value: 'tab', label: 'Tab (curves into the page)' }])}
            </Grid>
            <p style={{ margin: 0, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
              Motion. Switched off automatically for people who prefer reduced motion. Shown in the live app and the Tailwind kit.
            </p>
            <Grid minChildWidth={200} gap="var(--maw-space-md)">
              {select('Sidebar animation', ['motion', 'sidebar'], [{ value: 'none', label: 'None' }, { value: 'snappy', label: 'Snappy' }, { value: 'smooth', label: 'Smooth' }, { value: 'gentle', label: 'Gentle (slow)' }, { value: 'spring', label: 'Springy' }])}
              {select('Navigation hover', ['motion', 'items'], [{ value: 'none', label: 'None' }, { value: 'slide', label: 'Slide' }, { value: 'lift', label: 'Lift' }, { value: 'scale', label: 'Grow' }, { value: 'glow', label: 'Glow' }])}
              {select('Menu entrance', ['motion', 'nav'], [{ value: 'none', label: 'All at once' }, { value: 'stagger', label: 'One after another' }])}
              {select('Page entrance', ['motion', 'page'], [{ value: 'none', label: 'None' }, { value: 'fade', label: 'Fade' }, { value: 'rise', label: 'Rise' }, { value: 'slide', label: 'Slide in' }, { value: 'zoom', label: 'Zoom' }, { value: 'blur', label: 'Focus (blur in)' }])}
            </Grid>
          </Stack>
        );
      case 'theme':
        return (
          <Stack direction="column" gap="var(--maw-space-lg)">
            {themes !== undefined ? (
              <ThemeGallery themes={themes} value={working.theme.themeId} onSelect={(themeId) => setTheme({ themeId })} selection={working.theme} prefersDark={prefersDark} disabled={!canEdit} />
            ) : (
              <Banner variant="info">No themes are registered for this project.</Banner>
            )}
            <p style={{ margin: 0, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
              Theme tokens come from the Theme Engine; Layout Studio only chooses between them. Any theme works with any layout.
            </p>
          <Grid minChildWidth={200} gap="var(--maw-space-md)">
            <Select label="Colour mode" value={working.theme.colorMode} disabled={!canEdit} options={opts(...COLOR_MODES)} onChange={(e) => setTheme({ colorMode: e.target.value as ThemeSelection['colorMode'] })} />
            <Select label="Typography" value={working.theme.typography} disabled={!canEdit} options={opts(...TYPOGRAPHY_PRESETS)} onChange={(e) => setTheme({ typography: e.target.value as ThemeSelection['typography'] })} />
            <Select label="Spacing" value={working.theme.spacing} disabled={!canEdit} options={opts(...SPACING_PRESETS)} onChange={(e) => setTheme({ spacing: e.target.value as ThemeSelection['spacing'] })} />
          </Grid>
          </Stack>
        );
      case 'history':
        return (
          <Stack direction="column" gap="var(--maw-space-sm)">
            {(state?.history ?? []).length === 0 && <div style={{ color: 'var(--maw-fgMuted)' }}>Nothing has been published yet.</div>}
            {(state?.history ?? []).map((h) => (
              <Stack key={h.revision} direction="row" align="center" gap="var(--maw-space-md)" style={{ justifyContent: 'space-between' }}>
                <span>
                  <strong>Revision {h.revision}</strong> — {h.action === 'rollback' ? `rolled back to ${h.sourceRevision}` : 'published'} · {new Date(h.at).toLocaleString()}
                  {h.revision === state?.publishedRevision && <> <Badge variant="success">Live</Badge></>}
                </span>
                {h.revision !== state?.publishedRevision && (
                  <Button variant="outline" disabled={!canPublish || busy} onClick={() => run(() => store.rollback(h.revision), `Rolled back to revision ${h.revision} and published it.`, true)}>
                    Roll back to this
                  </Button>
                )}
              </Stack>
            ))}
          </Stack>
        );
    }
  })();

  // The default kit draws only part of a layout (sidebar variant, corner shape); the full set needs a kit with its own shell.
  const fullShellKit = getUIKitOverride().AppShellView !== undefined;

  return (
    <Stack direction="column" gap="var(--maw-space-lg)">
      {!fullShellKit && (
        <Banner variant="warning">
          This app is using the default UI kit, which shows only part of a layout (sidebar style and corner shape). The right panel, tile
          bar, hover-expand, active-item markers and motion need the Tailwind UI kit, so presets can look alike here. The preview below
          always shows the complete layout.
        </Banner>
      )}
      <div aria-live="polite">
        {message !== null && (
          <Banner variant={message.kind} onDismiss={() => setMessage(null)}>
            {message.text}
            {message.issues !== undefined && message.issues.length > 0 && (
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{message.issues.slice(0, 6).map((i) => <li key={`${i.path}${i.message}`}>{i.path}: {i.message}</li>)}</ul>
            )}
          </Banner>
        )}
        {resolved.source === 'fallback' && <Banner variant="warning">The saved layout could not be applied; showing {resolved.label}.</Banner>}
        {!canEdit && <Banner variant="info">You can view the layout but not change it (requires {LAYOUT_PERMISSIONS.update}).</Banner>}
      </div>

      <Stack direction="row" align="center" gap="var(--maw-space-md)" style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Stack direction="row" align="center" gap="var(--maw-space-sm)">
          {dirty ? <Badge variant="warning">Unsaved changes</Badge> : hasUnpublishedDraft ? <Badge variant="info">Draft saved — not live</Badge> : <Badge variant="success">Matches live</Badge>}
          {state?.publishedRevision != null && <Badge variant="neutral">Live: revision {state.publishedRevision}</Badge>}
        </Stack>
        <Stack direction="row" gap="var(--maw-space-sm)" style={{ flexWrap: 'wrap' }}>
          <Button variant="ghost" disabled={!canEdit || busy} onClick={() => { setWorking(createDefaultProjectUi(registry.fallbackPresetId)); setMessage({ kind: 'info', text: 'Defaults restored in the editor. Save the draft to keep them.' }); }}>Restore defaults</Button>
          <Button variant="outline" disabled={!dirty || busy} onClick={() => { setWorking(baseline); setMessage(null); }}>Discard changes</Button>
          <Button variant="secondary" disabled={!canEdit || !dirty || busy} loading={busy} onClick={() => run(() => store.saveDraft(working), 'Draft saved. Users still see the live layout.')}>Save draft</Button>
          <Button disabled={!canPublish || dirty || !hasUnpublishedDraft || busy} onClick={() => run(() => store.publish(), 'Published. Users now see this layout.', true)}>Publish</Button>
        </Stack>
      </Stack>

      <Grid columns={{ xs: 'minmax(0, 1fr)', xl: '30rem minmax(0, 1fr)' }} gap="var(--maw-space-lg)">
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <Tabs tabs={TABS} activeTab={tab} onChange={(k) => setTab(k as Tab)} />
          </div>
          <div style={{ marginTop: 'var(--maw-space-lg)' }}>{panel}</div>
        </Card>
        <Card>
          <Stack direction="row" align="center" gap="var(--maw-space-sm)" style={{ marginBottom: 'var(--maw-space-md)', flexWrap: 'wrap' }}>
            <strong style={{ marginRight: 'auto' }}>Preview — {resolved.label}</strong>
            {(Object.keys(PREVIEW_VIEWPORTS) as PreviewViewport[]).map((v) => (
              <Button key={v} variant={v === viewport ? 'primary' : 'outline'} aria-pressed={v === viewport} onClick={() => setViewport(v)}>
                {PREVIEW_VIEWPORTS[v].label}
              </Button>
            ))}
          </Stack>
          <ShellPreview presetId={resolved.presetId} label={resolved.label} settings={resolved.settings} viewport={viewport} cssVars={cssVars} />
          <p style={{ margin: 'var(--maw-space-sm) 0 0', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
            This is the real application shell with sample content. Nothing here changes the live application until you publish.
          </p>
        </Card>
      </Grid>

      {onPreview !== undefined && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--maw-space-md)',
            flexWrap: 'wrap',
            padding: 'var(--maw-space-sm) var(--maw-space-md)',
            borderRadius: 'var(--maw-radius-lg)',
            border: '1px solid var(--maw-border)',
            background: 'var(--maw-surface)',
            boxShadow: '0 -4px 16px rgb(0 0 0 / 0.08)',
          }}
        >
          <span style={{ fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>See these choices across the whole app before publishing. Only you see it.</span>
          <Button disabled={busy} onClick={() => { onPreview(working); setMessage({ kind: 'info', text: 'Previewing in the app, for you only. Nothing is saved or published. Use “Exit preview” in the app to go back.' }); }}>Preview in the app</Button>
        </div>
      )}
    </Stack>
  );
}
