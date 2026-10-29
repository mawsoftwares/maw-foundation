import { defaultLayoutRegistry } from './default-registry';
import { migrateLayoutConfig, type MigrateOptions } from './migrate';
import type { LayoutRegistry } from './registry';
import type { LayoutIssue, LayoutPreset, ResolvedLayout, StoredLayoutConfig } from './types';
import { mergeLayoutSettings, validateLayoutSettings, validateStoredLayoutConfig } from './validate';

function fromPreset(preset: LayoutPreset, source: ResolvedLayout['source'], issues: readonly LayoutIssue[]): ResolvedLayout {
  return { presetId: preset.id, label: preset.label, settings: preset.settings, source, issues };
}

/**
 * Turn whatever was stored (nothing, a draft, a row from an older release, garbage) into a layout that is
 * always renderable. Never throws:
 *   - nothing configured            → fallback preset, source `default`
 *   - unusable config               → fallback preset, source `fallback`, with `issues`
 *   - unknown/removed preset id     → fallback preset (the project's overrides are dropped, not misapplied)
 *   - valid                         → preset defaults + overrides, source `config`
 */
export function resolveLayout(
  stored: unknown,
  registry: LayoutRegistry = defaultLayoutRegistry,
  migrate: MigrateOptions = {},
): ResolvedLayout {
  const fallback = registry.getPreset(registry.fallbackPresetId);
  if (fallback === undefined) throw new Error(`Fallback layout preset "${registry.fallbackPresetId}" is not registered.`);
  if (stored === null || stored === undefined) return fromPreset(fallback, 'default', []);

  const migrated = migrateLayoutConfig(stored, migrate);
  if (!migrated.ok) return fromPreset(fallback, 'fallback', migrated.issues);

  const components = registry.componentIds();
  const envelope = validateStoredLayoutConfig(migrated.value, components);
  if (!envelope.ok) return fromPreset(fallback, 'fallback', envelope.issues);

  const config: StoredLayoutConfig = envelope.value;
  const preset = registry.getPreset(config.presetId);
  if (preset === undefined) {
    return fromPreset(fallback, 'fallback', [{ path: 'presetId', message: `Layout preset "${config.presetId}" is not available.` }]);
  }

  const settings = mergeLayoutSettings(preset.settings, config.overrides);
  // The merge of two valid parts is valid today, but presets can change between releases: re-check before rendering.
  const final = validateLayoutSettings(settings, components);
  if (!final.ok) return fromPreset(fallback, 'fallback', final.issues);

  return { presetId: preset.id, label: preset.label, settings: final.value, source: 'config', issues: [] };
}
