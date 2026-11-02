import type { MawModule } from './contract';
import type { ModuleSelection } from './registration';

/**
 * Turns a list of disabled module keys (configuration) into a registry selection.
 * Unknown keys are reported instead of silently ignored.
 */
export function selectionFromDisabled(
  modules: readonly MawModule[],
  disabled: readonly string[],
): { selection: ModuleSelection; unknown: readonly string[] } {
  const keys = new Set(modules.map((m) => m.definition.key));
  const unknown = disabled.filter((k) => !keys.has(k));
  const off = new Set(disabled);
  return { selection: { enabled: new Set([...keys].filter((k) => !off.has(k))) }, unknown };
}
