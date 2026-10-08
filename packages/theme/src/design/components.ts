import { parsePx } from './analyze';
import type { ComponentTokens, NormalizedDesign, Sourced } from './types';

/** Radius token name → component (theme component names, see `COMPONENT_FAMILIES`). */
const RADIUS_TARGETS: Readonly<Record<string, string>> = {
  button: 'button', card: 'card', input: 'input', modal: 'modal', badge: 'badge', avatar: 'avatar', dropdown: 'menu', tooltip: 'tooltip',
};
/** Sizing token name → components whose `height` it sets. Specific tokens first: the first one present wins. */
const HEIGHT_TARGETS: Readonly<Record<string, readonly string[]>> = {
  'button-height': ['button'], 'input-height': ['input'], 'control-height': ['button', 'input'],
};
/** Type-scale step → component that should use it. */
const TYPE_TARGETS: Readonly<Record<string, string>> = { button: 'button', input: 'input', label: 'form-label' };
/** Named shadow → component token that references it (`--maw-shadow-<name>`, emitted by the generator). */
const SHADOW_TARGETS: Readonly<Record<string, string>> = {
  card: 'card', modal: 'modal', dropdown: 'menu', button: 'button', hover: 'card-hover', focus: 'input-focus',
};

/** A value computed from another token: derived, and no more trustworthy than its source. */
function derivedFrom(source: Sourced<unknown>, value: string, how: string): Sourced<string> {
  return {
    value,
    source: source.source === 'estimated' ? 'estimated' : 'derived',
    confidence: Math.min(source.confidence, 0.95),
    note: how,
  };
}

/**
 * Fill component-level tokens from the design's own shape, size, type and shadow values — the places a design
 * names a radius for buttons or a height for controls but not as a component. Anything the design stated for a
 * component is left exactly as stated. Interaction states are not derived here: the theme already computes them
 * from the palette (`--maw-state-*`), and writing explicit tokens would override the design's own state rules.
 */
export function deriveComponentTokens(design: NormalizedDesign): NormalizedDesign {
  const components: Record<string, Record<string, Sourced<string>>> = {};
  for (const [name, props] of Object.entries(design.components)) components[name] = { ...props };

  const fill = (component: string, prop: string, token: Sourced<string>): void => {
    const existing = components[component] ?? (components[component] = {});
    if (existing[prop] === undefined) existing[prop] = token;
  };

  for (const [name, target] of Object.entries(RADIUS_TARGETS)) {
    const radius = design.radii[name];
    if (radius !== undefined) fill(target, 'rounded', derivedFrom(radius, `${radius.value}px`, `from radii.${name}`));
  }
  for (const [name, targets] of Object.entries(HEIGHT_TARGETS)) {
    const size = design.sizing[name];
    if (size !== undefined) for (const target of targets) fill(target, 'height', derivedFrom(size, size.value, `from sizing.${name}`));
  }
  for (const [name, target] of Object.entries(TYPE_TARGETS)) {
    const step = design.typography.scale[name];
    const anchor = step?.size ?? step?.weight;
    if (anchor !== undefined) fill(target, 'typography', derivedFrom(anchor, name, `uses type step "${name}"`));
  }
  for (const [name, target] of Object.entries(SHADOW_TARGETS)) {
    const shadow = design.shadows[name];
    if (shadow !== undefined) fill(target, 'shadow', derivedFrom(shadow, `var(--maw-shadow-${name})`, `from shadows.${name}`));
  }
  const cardPadding = design.spacing.semantic?.card;
  const paddingSource = cardPadding?.desktop ?? cardPadding?.tablet ?? cardPadding?.mobile;
  if (paddingSource !== undefined && parsePx(paddingSource.value) !== undefined) {
    fill('card', 'padding', derivedFrom(paddingSource, 'var(--maw-space-card)', 'from spacing.card'));
  }

  const next: ComponentTokens = components;
  return { ...design, components: next };
}
