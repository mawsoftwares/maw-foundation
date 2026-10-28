import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_SELECTION,
  ProjectUiStoreError,
  clearLayoutOverride,
  countLayoutOverrides,
  createDefaultProjectUi,
  createLayoutConfig,
  createMemoryProjectUiStore,
  createStorageProjectUiStore,
  layoutConfigsEqual,
  resolveProjectUi,
  restorePresetDefaults,
  setLayoutOverride,
  setLayoutPreset,
  setLayoutSetting,
  classicAdminPreset,
  validateLayoutOverrides,
  validateProjectUiConfig,
  validateThemeSelection,
  upgradeProjectUiConfig,
  defaultLayoutRegistry,
  type ProjectUiConfig,
  type StorageLike,
} from '../index';

const components = defaultLayoutRegistry.componentIds();
const ui = (patch: Partial<ProjectUiConfig> = {}): ProjectUiConfig => ({ ...createDefaultProjectUi(), ...patch });

describe('editing', () => {
  it('sets and clears nested overrides immutably, pruning empty parents', () => {
    const base = createLayoutConfig('classic-admin');
    const a = setLayoutOverride(base, ['sidebar', 'width'], 'lg');
    const b = setLayoutOverride(a, ['sidebar', 'variant'], 'floating');
    expect(base.overrides).toBeUndefined();
    expect(b.overrides).toEqual({ sidebar: { width: 'lg', variant: 'floating' } });
    expect(clearLayoutOverride(b, ['sidebar', 'width']).overrides).toEqual({ sidebar: { variant: 'floating' } });
    expect(clearLayoutOverride(clearLayoutOverride(b, ['sidebar', 'width']), ['sidebar', 'variant'])).toEqual(base);
  });

  it('what editing produces validates; invalid values are caught by validation, not editing', () => {
    const ok = setLayoutOverride(createLayoutConfig('classic-admin'), ['rightPanel', 'enabled'], true);
    expect(validateLayoutOverrides(ok.overrides, components).ok).toBe(true);
    const bad = setLayoutOverride(createLayoutConfig('classic-admin'), ['sidebar', 'width'], 'huge');
    expect(validateLayoutOverrides(bad.overrides, components).ok).toBe(false);
  });

  it('switching preset drops overrides; restore defaults keeps the preset', () => {
    const edited = setLayoutOverride(createLayoutConfig('classic-admin'), ['footer', 'enabled'], false);
    expect(setLayoutPreset(edited, 'floating-sidebar')).toEqual(createLayoutConfig('floating-sidebar'));
    expect(restorePresetDefaults(edited)).toEqual(createLayoutConfig('classic-admin'));
  });

  it('compares configs regardless of key order and counts customisations', () => {
    expect(layoutConfigsEqual({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true);
    expect(layoutConfigsEqual({ a: 1 }, { a: 2 })).toBe(false);
    const cfg = setLayoutOverride(setLayoutOverride(createLayoutConfig('classic-admin'), ['sidebar', 'width'], 'lg'), ['header', 'end'], ['search']);
    expect(countLayoutOverrides(cfg)).toBe(2);
    expect(countLayoutOverrides(createLayoutConfig('classic-admin'))).toBe(0);
  });

  it('setLayoutSetting removes the override when the value equals the preset default', () => {
    const base = createLayoutConfig('classic-admin');
    const changed = setLayoutSetting(base, classicAdminPreset, ['sidebar', 'width'], 'lg');
    expect(changed.overrides).toEqual({ sidebar: { width: 'lg' } });
    expect(setLayoutSetting(changed, classicAdminPreset, ['sidebar', 'width'], 'md')).toEqual(base);
    expect(setLayoutSetting(base, classicAdminPreset, ['header', 'end'], ['actions'])).toEqual(base);
  });

  it('ignores prototype-polluting paths', () => {
    setLayoutOverride(createLayoutConfig('classic-admin'), ['__proto__', 'polluted'], true);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });
});

describe('theme selection and project UI config', () => {
  it('validates closed presets and known theme ids', () => {
    expect(validateThemeSelection(DEFAULT_THEME_SELECTION).ok).toBe(true);
    expect(validateThemeSelection({ ...DEFAULT_THEME_SELECTION, themeId: 'client-a' }, new Set(['client-a'])).ok).toBe(true);
    expect(validateThemeSelection({ ...DEFAULT_THEME_SELECTION, themeId: 'nope' }, new Set(['client-a'])).ok).toBe(false);
    expect(validateThemeSelection({ ...DEFAULT_THEME_SELECTION, themeId: '../x' }).ok).toBe(false);
    expect(validateThemeSelection({ ...DEFAULT_THEME_SELECTION, spacing: 'tiny' }).ok).toBe(false);
    expect(validateThemeSelection({ ...DEFAULT_THEME_SELECTION, css: 'x' }).ok).toBe(false);
  });

  it('prefixes nested issue paths', () => {
    const r = validateProjectUiConfig({ version: 1, layout: { version: 1, presetId: 'x', overrides: { sidebar: { width: 'z' } } }, theme: DEFAULT_THEME_SELECTION }, components);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]?.path).toBe('layout.overrides.sidebar.width');
  });

  it('resolves defaults for nothing, and degrades layout and theme independently', () => {
    expect(resolveProjectUi(null)).toMatchObject({ source: 'default', theme: DEFAULT_THEME_SELECTION });
    const badTheme = resolveProjectUi(ui({ layout: createLayoutConfig('enterprise-dashboard'), theme: { ...DEFAULT_THEME_SELECTION, themeId: 'gone' } }), undefined, new Set(['x']));
    expect(badTheme.layout.presetId).toBe('enterprise-dashboard');
    expect(badTheme.theme).toEqual(DEFAULT_THEME_SELECTION);
    expect(badTheme.source).toBe('fallback');
    const badLayout = resolveProjectUi(ui({ layout: createLayoutConfig('removed'), theme: { ...DEFAULT_THEME_SELECTION, colorMode: 'dark' } }));
    expect(badLayout.layout.presetId).toBe('classic-admin');
    expect(badLayout.theme.colorMode).toBe('dark');
  });

  it('falls back for junk and future versions', () => {
    for (const junk of ['x', 3, [], { version: 99 }, {}]) expect(resolveProjectUi(junk).source).toBe('fallback');
  });
});

describe('upgradeProjectUiConfig (read-time migration)', () => {
  it('passes current configs through unchanged', () => {
    const cfg = ui({ layout: createLayoutConfig('floating-sidebar') });
    expect(upgradeProjectUiConfig(cfg)).toEqual({ ok: true, value: cfg });
  });

  it('migrates the envelope and the nested layout independently, in order', () => {
    const old = { version: 1, layout: { version: 1, presetId: 'classic-admin' }, theme: DEFAULT_THEME_SELECTION };
    const r = upgradeProjectUiConfig(old, {
      projectUi: { currentVersion: 2, migrations: { 1: (c) => ({ ...c, version: 2, theme: { ...(c['theme'] as object), spacing: 'compact' } }) } },
      layout: { currentVersion: 2, migrations: { 1: (c) => ({ ...c, version: 2, presetId: 'floating-sidebar' }) } },
    });
    expect(r).toEqual({
      ok: true,
      value: { version: 2, layout: { version: 2, presetId: 'floating-sidebar' }, theme: { ...DEFAULT_THEME_SELECTION, spacing: 'compact' } },
    });
  });

  it('rejects rows written by a newer release, and junk, without throwing', () => {
    expect(upgradeProjectUiConfig({ version: 99, layout: {}, theme: {} }).ok).toBe(false);
    expect(upgradeProjectUiConfig({ version: 1, layout: { version: 99 }, theme: {} }).ok).toBe(false);
    expect(upgradeProjectUiConfig(null).ok).toBe(false);
    expect(upgradeProjectUiConfig({ version: 1 }).ok).toBe(false);
  });
});

describe('project UI store', () => {
  const draftA = ui({ layout: createLayoutConfig('floating-sidebar') });
  const draftB = ui({ layout: createLayoutConfig('enterprise-dashboard') });

  it('starts empty: nothing published, no draft', async () => {
    const s = await createMemoryProjectUiStore().load();
    expect(s).toEqual({ draft: null, published: null, publishedRevision: null, history: [] });
  });

  it('saving a draft never changes what is published', async () => {
    const store = createMemoryProjectUiStore();
    await store.saveDraft(draftA);
    await store.publish();
    const s = await store.saveDraft(draftB);
    expect(s.published).toEqual(draftA);
    expect(s.draft).toEqual(draftB);
  });

  it('publish promotes the draft as a new revision and clears it', async () => {
    const store = createMemoryProjectUiStore({ actor: 'u1', now: () => new Date('2026-01-01T00:00:00Z') });
    await store.saveDraft(draftA);
    const s = await store.publish();
    expect(s.draft).toBeNull();
    expect(s.published).toEqual(draftA);
    expect(s.publishedRevision).toBe(1);
    expect(s.history[0]).toEqual({ revision: 1, action: 'publish', sourceRevision: null, at: '2026-01-01T00:00:00.000Z', by: 'u1' });
  });

  it('rollback re-publishes an old config as a new revision without rewriting history', async () => {
    const store = createMemoryProjectUiStore();
    await store.saveDraft(draftA); await store.publish();
    await store.saveDraft(draftB); await store.publish();
    const s = await store.rollback(1);
    expect(s.published).toEqual(draftA);
    expect(s.publishedRevision).toBe(3);
    expect(s.history.map((h) => [h.revision, h.action, h.sourceRevision])).toEqual([[3, 'rollback', 1], [2, 'publish', null], [1, 'publish', null]]);
  });

  it('rejects invalid drafts, publishing with no draft, and unknown revisions', async () => {
    const store = createMemoryProjectUiStore();
    await expect(store.saveDraft(ui({ layout: createLayoutConfig('removed') }))).rejects.toMatchObject({ code: 'INVALID' });
    await expect(store.saveDraft({ ...draftA, theme: { ...DEFAULT_THEME_SELECTION, spacing: 'x' as never } })).rejects.toBeInstanceOf(ProjectUiStoreError);
    await expect(store.publish()).rejects.toMatchObject({ code: 'NO_DRAFT' });
    await expect(store.rollback(9)).rejects.toMatchObject({ code: 'NO_SUCH_REVISION' });
  });

  it('a draft identical to what is live is not kept as a draft; discard clears it', async () => {
    const store = createMemoryProjectUiStore();
    await store.saveDraft(draftA); await store.publish();
    expect((await store.saveDraft(draftA)).draft).toBeNull();
    await store.saveDraft(draftB);
    expect((await store.discardDraft()).draft).toBeNull();
  });

  it('persists across store instances (reload) and ignores corrupt storage', async () => {
    const data = new Map<string, string>();
    const storage: StorageLike = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
    const first = createStorageProjectUiStore(storage, 'k');
    await first.saveDraft(draftA); await first.publish(); await first.saveDraft(draftB);
    const reloaded = await createStorageProjectUiStore(storage, 'k').load();
    expect(reloaded.published).toEqual(draftA);
    expect(reloaded.draft).toEqual(draftB);

    data.set('k', '{not json');
    expect(await createStorageProjectUiStore(storage, 'k').load()).toMatchObject({ published: null, draft: null });
    data.set('k', JSON.stringify({ draft: { evil: true }, revisions: [{ revision: 1, config: { nope: 1 } }] }));
    expect(await createStorageProjectUiStore(storage, 'k').load()).toMatchObject({ published: null, draft: null });
  });

  it('survives storage that throws on write', async () => {
    const storage: StorageLike = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    const store = createStorageProjectUiStore(storage, 'k');
    await store.saveDraft(draftA);
    expect((await store.publish()).published).toEqual(draftA);
  });
});
