import { DEFAULT_LAYOUT_COMPONENTS } from './components';
import { PRESET_ID_PATTERN, MAX_PRESET_ID_LENGTH, validateLayoutSettings } from './validate';
import type { LayoutPreset } from './types';

/** The layout every project gets when nothing (valid) is configured. Must remain registered. */
export const DEFAULT_LAYOUT_PRESET_ID = 'classic-admin';

export interface LayoutRegistry {
  readonly fallbackPresetId: string;
  registerPreset(preset: LayoutPreset): void;
  registerComponent(id: string): void;
  getPreset(id: string): LayoutPreset | undefined;
  hasPreset(id: string): boolean;
  listPresets(): readonly LayoutPreset[];
  /** Approved component ids a layout may reference. */
  componentIds(): ReadonlySet<string>;
}

export interface CreateLayoutRegistryOptions {
  readonly presets?: readonly LayoutPreset[];
  readonly components?: readonly string[];
  readonly fallbackPresetId?: string;
}

/**
 * An isolated registry (tests, per-app extension). Registration is developer-time configuration, so invalid or
 * duplicate presets throw immediately instead of surfacing later as a broken shell.
 */
export function createLayoutRegistry(options: CreateLayoutRegistryOptions = {}): LayoutRegistry {
  const presets = new Map<string, LayoutPreset>();
  const components = new Set<string>(options.components ?? DEFAULT_LAYOUT_COMPONENTS);
  const fallbackPresetId = options.fallbackPresetId ?? DEFAULT_LAYOUT_PRESET_ID;

  const registry: LayoutRegistry = {
    fallbackPresetId,
    registerComponent(id) {
      components.add(id);
    },
    registerPreset(preset) {
      if (preset.id.length > MAX_PRESET_ID_LENGTH || !PRESET_ID_PATTERN.test(preset.id)) {
        throw new Error(`Invalid layout preset id "${preset.id}".`);
      }
      if (presets.has(preset.id)) throw new Error(`Layout preset "${preset.id}" is already registered.`);
      const check = validateLayoutSettings(preset.settings, components);
      if (!check.ok) {
        const detail = check.issues.map((i) => `${i.path}: ${i.message}`).join('; ');
        throw new Error(`Layout preset "${preset.id}" has invalid settings (${detail}).`);
      }
      presets.set(preset.id, preset);
    },
    getPreset: (id) => presets.get(id),
    hasPreset: (id) => presets.has(id),
    listPresets: () => [...presets.values()],
    componentIds: () => components,
  };

  for (const preset of options.presets ?? []) registry.registerPreset(preset);
  return registry;
}
