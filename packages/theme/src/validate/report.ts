import { createTheme, tokensToCssVars, type Theme, type ThemeOverrides } from '../index';
import { needsReview } from '../core/provenance';
import type { NormalizedDesign } from '../design/types';
import { checkAccessibility } from './accessibility';
import { areaForComponent, checkFidelity } from './fidelity';
import { compareRendered, expectationsFromDesign, type Measurements } from './measure';
import {
  VALIDATION_AREAS, type AccessibilityOverride, type AreaResult, type AreaStatus, type ValidationArea,
  type ValidationFinding, type ValidationReport,
} from './types';

export interface ValidateThemeInput {
  /** The generated theme overrides (their `provenance` drives the "estimate" findings). */
  readonly overrides: ThemeOverrides;
  /** The reference design. Without it only accessibility and provenance checks run. */
  readonly design?: NormalizedDesign;
  /** Computed styles read from rendered components (see `compareRendered`). */
  readonly measurements?: Measurements;
  /** Violations a person has explicitly accepted. */
  readonly accessibilityOverrides?: readonly AccessibilityOverride[];
}

/** Map a theme token path to its report area. */
function areaForPath(path: string): ValidationArea {
  const [head, second] = path.split('.');
  if (head === 'palette' || head === 'paletteDark') return 'colors';
  if (head === 'typography') return 'typography';
  if (head === 'spacing') return 'spacing';
  if (head === 'radius') return 'radius';
  if (head === 'shadows') return 'shadows';
  if (head === 'shell') return 'navigation';
  if (head === 'responsive') return 'responsive';
  if (head === 'components' && second !== undefined) return areaForComponent(second);
  if (head === 'extraTokens' || head === 'extraTokensDark') {
    const key = second ?? '';
    if (/^(color|gradient|opacity|state)/.test(key)) return 'colors';
    if (/^(space|border)/.test(key)) return 'spacing';
    if (/^radius/.test(key)) return 'radius';
    if (/^shadow/.test(key)) return 'shadows';
    if (/^text/.test(key)) return 'typography';
    if (/^shell/.test(key)) return 'navigation';
  }
  return 'components';
}

/** Values the generator guessed or the importer was unsure of — flagged so nobody mistakes them for exact. */
function provenanceFindings(overrides: ThemeOverrides): ValidationFinding[] {
  return Object.entries(overrides.provenance ?? {})
    .filter(([, meta]) => needsReview(meta))
    .map(([path, meta]) => ({
      id: `estimate.${path}`,
      area: areaForPath(path),
      severity: 'warning' as const,
      path,
      message: `${path} is ${meta.source === 'estimated' ? 'an estimate' : 'low confidence'} (${Math.round(meta.confidence * 100)}%)`
        + `${meta.note === undefined ? '' : `: ${meta.note}`}. Verify it against the reference.`,
    }));
}

/** Which areas the design actually says something about. The rest report `defaults`, not a match. */
function areasWithData(overrides: ThemeOverrides): ReadonlySet<ValidationArea> {
  const has = new Set<ValidationArea>(['accessibility']);
  const nonEmpty = (o: object | undefined): boolean => o !== undefined && Object.keys(o).length > 0;
  if (nonEmpty(overrides.palette) || nonEmpty(overrides.paletteDark)) has.add('colors');
  if (overrides.typography !== undefined && (overrides.typography.fontFamily !== undefined || nonEmpty(overrides.typography.scale))) has.add('typography');
  if (nonEmpty(overrides.spacing) || Object.keys(overrides.extraTokens ?? {}).some((k) => /^space/.test(k))) has.add('spacing');
  if (nonEmpty(overrides.radius)) has.add('radius');
  if (nonEmpty(overrides.shadows)) has.add('shadows');
  if (nonEmpty(overrides.shell)) has.add('navigation');
  if (nonEmpty(overrides.responsive)) has.add('responsive');
  for (const name of Object.keys(overrides.components ?? {})) has.add(areaForComponent(name));
  return has;
}

const open = (f: ValidationFinding): boolean => f.overridden === undefined;

function statusOf(area: ValidationArea, findings: readonly ValidationFinding[], hasData: boolean): AreaStatus {
  if (findings.some((f) => open(f) && f.severity === 'error')) return 'fail';
  if (findings.some((f) => open(f) && f.severity === 'warning')) return 'review';
  return hasData || area === 'accessibility' ? 'match' : 'defaults';
}

/**
 * Validate a generated theme: accessibility (always), approximations from provenance, design-vs-theme
 * mismatches, and rendered-vs-design differences when measurements are supplied.
 * Accessibility violations are reported separately and left as designed; `accessibilityOverrides` records an
 * explicit acceptance, which marks the finding overridden instead of hiding it.
 */
export function validateTheme(input: ValidateThemeInput): ValidationReport {
  const theme: Theme = createTheme(input.overrides);
  const a11y = checkAccessibility(theme);
  const accepted = new Map((input.accessibilityOverrides ?? []).map((o) => [o.findingId, o.reason]));

  const all: ValidationFinding[] = [
    ...a11y.findings.map((f) => (accepted.has(f.id) ? { ...f, overridden: { reason: accepted.get(f.id) ?? '' } } : f)),
    ...provenanceFindings(input.overrides),
    ...(input.design === undefined ? [] : checkFidelity(input.design, theme)),
    ...(input.design === undefined || input.measurements === undefined
      ? []
      : compareRendered(expectationsFromDesign(input.design, tokensToCssVars(false, theme)), input.measurements)),
  ];
  // The same token can be flagged twice (provenance + fidelity); keep one per id.
  const findings = [...new Map(all.map((f) => [f.id, f])).values()];

  const hasData = areasWithData(input.overrides);
  const areas: AreaResult[] = VALIDATION_AREAS.map((area) => {
    const inArea = findings.filter((f) => f.area === area);
    return { area, status: statusOf(area, inArea, hasData.has(area)), findings: inArea };
  });

  return {
    areas,
    findings,
    summary: {
      errors: findings.filter((f) => open(f) && f.severity === 'error').length,
      warnings: findings.filter((f) => open(f) && f.severity === 'warning').length,
      info: findings.filter((f) => f.severity === 'info').length,
      overridden: findings.filter((f) => !open(f)).length,
    },
    accessibility: findings.filter((f) => f.accessibility === true),
    skipped: a11y.skipped,
  };
}

/** The palette slot a fix writes to, e.g. `palette.fg`. */
function fixTarget(finding: ValidationFinding): string | undefined {
  const fix = finding.fix?.patch;
  if (fix === undefined) return undefined;
  for (const mode of ['palette', 'paletteDark'] as const) {
    const key = Object.keys(fix[mode] ?? {})[0];
    if (key !== undefined) return `${mode}.${key}`;
  }
  return undefined;
}

const MAX_FIX_PASSES = 6;

/**
 * Layer the suggested fixes for the given finding ids onto `overrides`. This is the explicit "apply the
 * accessibility fix" action; validation itself never changes a theme.
 *
 * A colour is often checked against several backgrounds. After applying a fix, the same colour is re-checked and
 * adjusted again until it passes every pair it takes part in, so one click resolves the colour, not just one pair.
 */
export function applyAccessibilityFixes(overrides: ThemeOverrides, report: ValidationReport, findingIds: readonly string[]): ThemeOverrides {
  let result = overrides;
  const targets = new Set<string>();
  for (const finding of report.findings) {
    if (!findingIds.includes(finding.id) || finding.fix === undefined) continue;
    const target = fixTarget(finding);
    if (target !== undefined) targets.add(target);
    result = {
      ...result,
      palette: { ...result.palette, ...finding.fix.patch.palette },
      paletteDark: { ...result.paletteDark, ...finding.fix.patch.paletteDark },
    };
  }
  for (let pass = 0; pass < MAX_FIX_PASSES && targets.size > 0; pass++) {
    const next = validateTheme({ overrides: result });
    const remaining = next.accessibility.filter((f) => f.fix !== undefined && f.overridden === undefined && targets.has(fixTarget(f) ?? ''));
    if (remaining.length === 0) break;
    for (const finding of remaining) {
      result = {
        ...result,
        palette: { ...result.palette, ...finding.fix?.patch.palette },
        paletteDark: { ...result.paletteDark, ...finding.fix?.patch.paletteDark },
      };
    }
  }
  return result;
}
