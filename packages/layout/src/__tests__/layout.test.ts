import { describe, expect, it } from 'vitest';
import {
  CURRENT_LAYOUT_VERSION,
  DEFAULT_LAYOUT_PRESET_ID,
  classicAdminPreset,
  createLayoutRegistry,
  defaultLayoutRegistry,
  mergeLayoutSettings,
  migrateLayoutConfig,
  resolveLayout,
  validateLayoutOverrides,
  validateLayoutSettings,
  validateStoredLayoutConfig,
  type LayoutPreset,
} from '../index';

const components = defaultLayoutRegistry.componentIds();

describe('registry', () => {
  it('ships all eight presets, with classic-admin as fallback', () => {
    expect(defaultLayoutRegistry.listPresets().map((p) => p.id)).toEqual([
      'classic-admin',
      'floating-sidebar',
      'enterprise-dashboard',
      'split-workspace',
      'communication-workspace',
      'analytics-dashboard',
      'project-workspace',
      'listing-workspace',
    ]);
    expect(defaultLayoutRegistry.fallbackPresetId).toBe(DEFAULT_LAYOUT_PRESET_ID);
  });

  it('every built-in preset passes validation', () => {
    for (const p of defaultLayoutRegistry.listPresets()) expect(validateLayoutSettings(p.settings, components).ok).toBe(true);
  });

  it('accepts new presets without touching the core and rejects duplicates', () => {
    const registry = createLayoutRegistry({ presets: [classicAdminPreset] });
    const custom: LayoutPreset = { ...classicAdminPreset, id: 'my-layout', label: 'Mine' };
    registry.registerPreset(custom);
    expect(registry.hasPreset('my-layout')).toBe(true);
    expect(() => registry.registerPreset(custom)).toThrow(/already registered/);
  });

  it('rejects presets with bad ids or invalid settings at registration', () => {
    const registry = createLayoutRegistry();
    expect(() => registry.registerPreset({ ...classicAdminPreset, id: 'Bad Id' })).toThrow(/Invalid layout preset id/);
    const broken = { ...classicAdminPreset, id: 'broken', settings: { ...classicAdminPreset.settings, density: 'huge' } } as unknown as LayoutPreset;
    expect(() => registry.registerPreset(broken)).toThrow(/invalid settings/);
  });

  it('only allows registered component ids, and new ones can be added', () => {
    const registry = createLayoutRegistry();
    const preset: LayoutPreset = {
      ...classicAdminPreset,
      id: 'with-widget',
      settings: { ...classicAdminPreset.settings, header: { ...classicAdminPreset.settings.header, end: ['weather'] } },
    };
    expect(() => registry.registerPreset(preset)).toThrow(/approved registry/);
    registry.registerComponent('weather');
    registry.registerPreset(preset);
    expect(registry.hasPreset('with-widget')).toBe(true);
  });
});

describe('preset safety (every built-in preset)', () => {
  const presets = defaultLayoutRegistry.listPresets();

  it('keeps the app\'s header actions reachable (user menu / logout live there)', () => {
    for (const p of presets) {
      expect(p.settings.header.enabled, p.id).toBe(true);
      expect(p.settings.header.end, p.id).toContain('actions');
    }
  });

  it('keeps navigation reachable: a sidebar, and a rail never claims to be collapsible', () => {
    for (const p of presets) {
      expect(p.settings.sidebar.enabled, p.id).toBe(true);
      if (p.settings.sidebar.variant === 'rail') expect(p.settings.sidebar.collapsible, p.id).toBe(false);
    }
  });

  it('never hides the right panel at a narrower breakpoint than the sidebar collapses', () => {
    const order = ['sm', 'md', 'lg', 'xl'];
    for (const p of presets) {
      expect(order.indexOf(p.settings.responsive.rightPanelHideBelow), p.id).toBeGreaterThanOrEqual(order.indexOf(p.settings.responsive.sidebarCollapseBelow));
    }
  });

  it('has unique labels and descriptions for the gallery', () => {
    expect(new Set(presets.map((p) => p.label)).size).toBe(presets.length);
    for (const p of presets) expect(p.description.length, p.id).toBeGreaterThan(20);
  });
});

describe('shape (geometry only)', () => {
  const byId = (id: string) => defaultLayoutRegistry.getPreset(id)!.settings.shape;

  it('classic admin stays full-bleed; the card-style presets are inset', () => {
    expect(byId('classic-admin')).toEqual({ frame: 'full-bleed', corners: 'soft', nav: 'rounded' });
    for (const id of ['split-workspace', 'communication-workspace', 'analytics-dashboard', 'listing-workspace']) {
      expect(byId(id).frame, id).toBe('inset');
    }
  });

  it('overrides may change shape; unknown shape values and keys are rejected', () => {
    expect(validateLayoutOverrides({ shape: { nav: 'pill', corners: 'round' } }, components).ok).toBe(true);
    expect(validateLayoutOverrides({ shape: { nav: 'oval' } }, components).ok).toBe(false);
    expect(validateLayoutOverrides({ shape: { color: 'red' } }, components).ok).toBe(false);
  });

  it('shape never carries colour: only closed geometry values exist', () => {
    const r = resolveLayout({ version: 1, presetId: 'classic-admin', overrides: { shape: { frame: 'inset' } } });
    expect(r.source).toBe('config');
    expect(r.settings.shape.frame).toBe('inset');
    expect(r.settings.shape.corners).toBe('soft');
  });
});

describe('validation', () => {
  it('rejects unknown keys, bad enums and unapproved components in overrides', () => {
    const r = validateLayoutOverrides(
      { sidebar: { width: 'xxl', onClick: 'alert(1)', top: ['evil-script'] }, banner: {} },
      components,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const paths = r.issues.map((i) => i.path);
    expect(paths).toContain('overrides.sidebar.width');
    expect(paths).toContain('overrides.sidebar.onClick');
    expect(paths).toContain('overrides.sidebar.top[0]');
    expect(paths).toContain('overrides.banner');
  });

  it('rejects duplicate and oversized component lists', () => {
    expect(validateLayoutOverrides({ header: { end: ['search', 'search'] } }, components).ok).toBe(false);
    const many = Array.from({ length: 17 }, (_, i) => `c${i}`);
    expect(validateLayoutOverrides({ header: { end: many } }, components).ok).toBe(false);
  });

  it('requires every field in full settings', () => {
    expect(validateLayoutSettings({ density: 'compact' }, components).ok).toBe(false);
  });

  it('validates the stored envelope', () => {
    expect(validateStoredLayoutConfig({ version: 1, presetId: 'classic-admin' }, components).ok).toBe(true);
    expect(validateStoredLayoutConfig({ version: 1, presetId: '../etc' }, components).ok).toBe(false);
    expect(validateStoredLayoutConfig({ version: 1, presetId: 'x', extra: 1 }, components).ok).toBe(false);
    expect(validateStoredLayoutConfig('nope', components).ok).toBe(false);
  });
});

describe('merge', () => {
  it('merges nested overrides without mutating the preset and replaces arrays', () => {
    const before = JSON.stringify(classicAdminPreset.settings);
    const merged = mergeLayoutSettings(classicAdminPreset.settings, { sidebar: { width: 'lg', top: ['brand', 'search'] } });
    expect(merged.sidebar.width).toBe('lg');
    expect(merged.sidebar.top).toEqual(['brand', 'search']);
    expect(merged.sidebar.variant).toBe('docked');
    expect(JSON.stringify(classicAdminPreset.settings)).toBe(before);
  });

  it('ignores prototype-polluting keys', () => {
    const payload = JSON.parse('{"__proto__":{"polluted":true}}') as object;
    mergeLayoutSettings(classicAdminPreset.settings, payload);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });
});

describe('migration', () => {
  it('passes current-version configs through', () => {
    const r = migrateLayoutConfig({ version: CURRENT_LAYOUT_VERSION, presetId: 'classic-admin' });
    expect(r.ok).toBe(true);
  });

  it('rejects newer, missing and non-object versions', () => {
    expect(migrateLayoutConfig({ version: CURRENT_LAYOUT_VERSION + 1, presetId: 'x' }).ok).toBe(false);
    expect(migrateLayoutConfig({ presetId: 'x' }).ok).toBe(false);
    expect(migrateLayoutConfig(null).ok).toBe(false);
  });

  it('runs a chain of migrations in order', () => {
    const r = migrateLayoutConfig(
      { version: 1, presetId: 'old' },
      {
        currentVersion: 3,
        migrations: {
          1: (c) => ({ ...c, version: 2, step1: true }),
          2: (c) => ({ ...c, version: 3, step2: true }),
        },
      },
    );
    expect(r).toEqual({ ok: true, value: { version: 3, presetId: 'old', step1: true, step2: true } });
  });

  it('fails on a missing or non-advancing step', () => {
    expect(migrateLayoutConfig({ version: 1 }, { currentVersion: 2, migrations: {} }).ok).toBe(false);
    expect(migrateLayoutConfig({ version: 1 }, { currentVersion: 2, migrations: { 1: (c) => c } }).ok).toBe(false);
  });
});

describe('resolveLayout', () => {
  it('defaults to Classic Admin when nothing is configured', () => {
    for (const none of [null, undefined]) {
      const r = resolveLayout(none);
      expect(r.presetId).toBe('classic-admin');
      expect(r.source).toBe('default');
      expect(r.issues).toEqual([]);
    }
  });

  it('applies a preset with overrides', () => {
    const r = resolveLayout({ version: 1, presetId: 'floating-sidebar', overrides: { footer: { enabled: true } } });
    expect(r.presetId).toBe('floating-sidebar');
    expect(r.source).toBe('config');
    expect(r.settings.sidebar.variant).toBe('floating');
    expect(r.settings.footer.enabled).toBe(true);
  });

  it('falls back safely for a missing preset, invalid config, newer version and junk', () => {
    const cases: unknown[] = [
      { version: 1, presetId: 'removed-preset' },
      { version: 1, presetId: 'classic-admin', overrides: { sidebar: { width: 'giant' } } },
      { version: 99, presetId: 'classic-admin' },
      'garbage',
      42,
      [],
    ];
    for (const input of cases) {
      const r = resolveLayout(input);
      expect(r.presetId).toBe('classic-admin');
      expect(r.source).toBe('fallback');
      expect(r.issues.length).toBeGreaterThan(0);
    }
  });

  it('never throws and returns a valid layout for arbitrary input', () => {
    for (const input of [{}, { version: 1 }, { version: 1, presetId: 5 }, { version: 1, presetId: 'x', overrides: 7 }, Symbol.iterator]) {
      expect(validateLayoutSettings(resolveLayout(input).settings, components).ok).toBe(true);
    }
  });

  it('throws only when the registry itself lacks its fallback', () => {
    expect(() => resolveLayout(null, createLayoutRegistry())).toThrow(/Fallback layout preset/);
  });
});
