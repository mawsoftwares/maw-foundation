/**
 * Component state styling, driven by data.
 *
 * A spec says "for this component/variant, in this state, these CSS properties may be themed". The engine
 * emits a rule only when the active theme actually defines the matching token
 * (`--maw-comp-<family>-[<variant>-]<state>-<prop>`), so a theme that says nothing about hover renders exactly
 * as before, while a design that states it gets it everywhere. New components add a spec; the engine never changes.
 */
export type ComponentState =
  | 'hover' | 'active' | 'focus' | 'disabled' | 'readonly' | 'error' | 'filled' | 'selected' | 'loading';

/** Token prop name (the suffix in the CSS variable) → the CSS property it controls. */
export interface StateProp {
  readonly token: string;
  readonly cssProp: string;
}

export interface ComponentStateSpec {
  /** Token family, e.g. `buttons` (matches `--maw-comp-buttons-*`). */
  readonly family: string;
  /** Token variant segment, e.g. `primary`; empty for family-wide tokens (`inputs`). */
  readonly variant: string;
  /** CSS selector of the element, e.g. `.maw-btn--primary`. */
  readonly selector: string;
  /** Selector suffix for each state the component supports, e.g. `{ hover: ':hover:not(:disabled)' }`. */
  readonly states: Readonly<Partial<Record<ComponentState, string>>>;
  readonly props: readonly StateProp[];
}

export const STATE_PROPS: Readonly<Record<string, StateProp>> = {
  background: { token: 'background', cssProp: 'background' },
  color: { token: 'text-color', cssProp: 'color' },
  border: { token: 'border', cssProp: 'border' },
  borderColor: { token: 'border-color', cssProp: 'border-color' },
  shadow: { token: 'shadow', cssProp: 'box-shadow' },
  opacity: { token: 'opacity', cssProp: 'opacity' },
};

const { background, color, border, borderColor, shadow, opacity } = STATE_PROPS as Record<string, StateProp>;

const CONTROL_STATES = {
  hover: ':hover:not(:disabled)',
  active: ':active:not(:disabled)',
  focus: ':focus-visible',
  disabled: ':disabled',
  loading: "[aria-busy='true']",
} as const;

function buttonSpec(variant: string): ComponentStateSpec {
  return {
    family: 'buttons',
    variant,
    selector: `.maw-btn--${variant}`,
    states: CONTROL_STATES,
    props: [background!, color!, border!, shadow!, opacity!],
  };
}

export const DEFAULT_STATE_SPECS: readonly ComponentStateSpec[] = [
  ...['primary', 'secondary', 'outline', 'ghost', 'destructive', 'danger', 'link'].map(buttonSpec),
  {
    family: 'inputs',
    variant: '',
    selector: '.maw-input',
    states: {
      hover: ':hover:not(:disabled):not(:focus)',
      focus: ':focus',
      filled: '.maw-input--filled',
      error: '.maw-input--error',
      disabled: ':disabled',
      readonly: '[readonly]',
    },
    props: [background!, color!, borderColor!, shadow!, opacity!],
  },
  {
    family: 'tabs',
    variant: '',
    selector: '.maw-tab',
    states: { hover: ':hover:not(.maw-tab--active)', focus: ':focus-visible', selected: '.maw-tab--active' },
    props: [background!, color!, borderColor!],
  },
  {
    family: 'cards',
    variant: '',
    selector: '.maw-card',
    states: { hover: '.maw-card--interactive:hover', selected: '.maw-card--selected' },
    props: [background!, border!, shadow!],
  },
  {
    family: 'toggles',
    variant: '',
    selector: '.maw-toggle',
    states: { focus: ':focus-within', disabled: '.maw-toggle--disabled' },
    props: [background!, opacity!],
  },
];

/** CSS variable name for one state token. */
export function stateTokenName(spec: ComponentStateSpec, state: ComponentState, prop: StateProp): string {
  return ['--maw-comp', spec.family, spec.variant, state, prop.token].filter((part) => part !== '').join('-');
}

/**
 * Rules for every state token the theme defines. `definedVars` is the theme's CSS-variable map
 * (`tokensToCssVars`). `!important` is deliberate: components set their resting look inline, and a state
 * the design explicitly specified has to win over it.
 */
export function componentStateCss(
  definedVars: Readonly<Record<string, string>>,
  specs: readonly ComponentStateSpec[] = DEFAULT_STATE_SPECS,
): string {
  const rules: string[] = [];
  for (const spec of specs) {
    for (const [state, suffix] of Object.entries(spec.states) as [ComponentState, string][]) {
      const decls = spec.props
        .map((prop) => ({ prop, name: stateTokenName(spec, state, prop) }))
        .filter(({ name }) => definedVars[name] !== undefined)
        .map(({ prop, name }) => `${prop.cssProp}:var(${name}) !important;`);
      if (decls.length > 0) rules.push(`${spec.selector}${suffix}{${decls.join('')}}`);
    }
  }
  return rules.join('\n');
}
