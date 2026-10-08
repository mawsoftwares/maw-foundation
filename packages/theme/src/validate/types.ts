import type { ThemeOverrides } from '../index';

export type ValidationArea =
  | 'colors' | 'typography' | 'spacing' | 'radius' | 'shadows'
  | 'buttons' | 'forms' | 'cards' | 'navigation' | 'components' | 'responsive' | 'accessibility';

export const VALIDATION_AREAS: readonly ValidationArea[] = [
  'colors', 'typography', 'spacing', 'radius', 'shadows', 'buttons', 'forms', 'cards', 'navigation', 'components', 'responsive', 'accessibility',
];

/** `error`: definitely wrong (e.g. text below 3:1). `warning`: needs a look. `info`: worth knowing. */
export type Severity = 'error' | 'warning' | 'info';

/** An explicit, opt-in change that resolves a finding. Never applied automatically. */
export interface SuggestedFix {
  readonly description: string;
  /** Overrides to layer on top of the theme (use `extendTheme`). */
  readonly patch: ThemeOverrides;
}

export interface ValidationFinding {
  /** Stable id, so an acknowledgement survives re-validation. */
  readonly id: string;
  readonly area: ValidationArea;
  readonly severity: Severity;
  readonly message: string;
  /** Token path or component the finding is about. */
  readonly path?: string;
  /** Present for accessibility findings: reported separately and only changeable by explicit override. */
  readonly accessibility?: boolean;
  readonly fix?: SuggestedFix;
  /** Set when a person has explicitly accepted this finding. */
  readonly overridden?: { readonly reason: string };
}

/**
 * `match`: checked, nothing to flag. `review`: warnings only. `fail`: an open error.
 * `defaults`: the design says nothing about this area, so the theme uses built-in values — not a claim of fidelity.
 */
export type AreaStatus = 'match' | 'review' | 'fail' | 'defaults';

export interface AreaResult {
  readonly area: ValidationArea;
  readonly status: AreaStatus;
  readonly findings: readonly ValidationFinding[];
}

export interface AccessibilityOverride {
  readonly findingId: string;
  /** Why the violation is accepted; recorded in the report. */
  readonly reason: string;
}

export interface ValidationReport {
  readonly areas: readonly AreaResult[];
  readonly findings: readonly ValidationFinding[];
  readonly summary: { readonly errors: number; readonly warnings: number; readonly info: number; readonly overridden: number };
  /** Accessibility findings, separately, as required. */
  readonly accessibility: readonly ValidationFinding[];
  /** Values the checker could not evaluate (e.g. `color-mix()`); not counted as passing. */
  readonly skipped: readonly string[];
}
