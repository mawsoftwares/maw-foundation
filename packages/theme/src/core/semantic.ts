import type { Palette } from '../index';

/**
 * Interaction-state and divider tokens derived from the palette. Components read these (`--maw-state-*`)
 * instead of computing their own hover/active/disabled colours, so a design that states them explicitly can
 * override them through `extraTokens` / component tokens and everything follows.
 */
export function deriveStateVars(p: Palette): Record<string, string> {
  return {
    '--maw-color-divider': p.border,
    '--maw-state-brand-hover': `color-mix(in srgb, ${p.brand} 90%, black)`,
    '--maw-state-brand-active': `color-mix(in srgb, ${p.brand} 80%, black)`,
    '--maw-state-hover': `color-mix(in srgb, ${p.fg} 6%, transparent)`,
    '--maw-state-active': `color-mix(in srgb, ${p.fg} 10%, transparent)`,
    '--maw-state-selected': `color-mix(in srgb, ${p.brand} 12%, transparent)`,
    '--maw-state-focus-ring': p.borderFocus,
    '--maw-state-focus-ring-width': '2px',
    '--maw-state-focus-ring-offset': '2px',
    '--maw-state-disabled-bg': p.bgMuted,
    '--maw-state-disabled-fg': p.fgSubtle,
    '--maw-state-disabled-border': p.border,
    '--maw-state-disabled-opacity': '0.6',
    '--maw-state-overlay': p.overlay,
  };
}
