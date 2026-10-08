import type { ResponsiveMap } from '../core/responsive';
import type { TokenMeta } from '../core/provenance';

/**
 * Normalized design model: the framework-independent intermediate representation every design adapter
 * produces and the theme generator consumes. It knows nothing about React, Next, React Native or CSS-in-JS.
 */

/** A value together with where it came from and how far to trust it. */
export type Sourced<T> = TokenMeta & { readonly value: T };

export type DesignInputKind =
  | 'figma' | 'design-md' | 'html' | 'css' | 'json-tokens' | 'image' | 'pdf' | 'theme-config' | 'manual';

/** What a client hands us. Adapters decide whether they can read it. */
export interface DesignInput {
  readonly kind: DesignInputKind;
  /** Text formats as a string; binary formats (images, PDF) as bytes. */
  readonly content: string | Uint8Array;
  readonly name?: string;
  readonly mimeType?: string;
  /** Free-form adapter hints, e.g. a Figma node id or a viewport size. */
  readonly hints?: Readonly<Record<string, string>>;
}

export interface DesignAdapter {
  readonly id: string;
  canHandle(input: DesignInput): boolean;
  analyze(input: DesignInput): Promise<NormalizedDesign>;
}

// --- Colors -----------------------------------------------------------------

/**
 * Semantic roles the generator understands. Adapters may add others (they pass through as extras).
 * Core: primary, primaryDark, primaryLight, onPrimary, secondary, accent, background, surface, surfaceMuted,
 * card, text, textMuted, textSubtle, border, divider, success, warning, error, info, successBg, warningBg, errorBg,
 * infoBg, hover, active, focus, disabled, overlay.
 */
export type ColorRoles = Readonly<Record<string, Sourced<string>>>;

export interface ColorTokens {
  readonly light: ColorRoles;
  /** Only the roles the design specifies for dark mode; the rest are derived by the theme. */
  readonly dark?: ColorRoles;
  /** Named gradients as CSS gradient strings. */
  readonly gradients?: Readonly<Record<string, Sourced<string>>>;
  /** Named opacities, `0..1` as strings (e.g. `disabled: '0.5'`). */
  readonly opacity?: Readonly<Record<string, Sourced<string>>>;
}

// --- Typography -------------------------------------------------------------

export interface TypeStep {
  readonly size?: Sourced<string>;
  readonly weight?: Sourced<string>;
  readonly lineHeight?: Sourced<string>;
  readonly letterSpacing?: Sourced<string>;
  readonly family?: Sourced<string>;
  readonly textTransform?: Sourced<string>;
}

export interface TypographyTokens {
  readonly fontFamily?: Sourced<string>;
  readonly monoFamily?: Sourced<string>;
  /** Any scale the design uses (`display`, `h1`…`button`, `label`). Not a fixed set. */
  readonly scale: Readonly<Record<string, TypeStep>>;
}

// --- Spacing ----------------------------------------------------------------

export type SpacingSystemKind = '4px' | '8px' | 'custom' | 'mixed';

export interface SpacingSystem {
  readonly kind: SpacingSystemKind;
  /** The base unit when `kind` is `4px` / `8px` (or a detected custom base). */
  readonly base?: number;
  /** Share of observed values that sit on the detected grid, 0..1. */
  readonly fit?: number;
}

export interface SpacingTokens {
  readonly system?: SpacingSystem;
  /** Scale steps in px (`xs`, `md`, or any names the design uses). */
  readonly scale: Readonly<Record<string, Sourced<number>>>;
  /** Purpose-named spacing (`page`, `section`, `card`, `grid-gap`, `form-gap`, `button`, `table`), per device. */
  readonly semantic?: Readonly<Record<string, ResponsiveMap<Sourced<string>>>>;
}

// --- Shape, borders, shadows, sizing -----------------------------------------

/** px, or the string `pill` / `circle` style values the design uses verbatim. */
export type RadiusTokens = Readonly<Record<string, Sourced<number>>>;

export type BorderTokens = Readonly<Record<string, Sourced<string>>>;

export interface ShadowLayer {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly blur: number;
  readonly spread: number;
  readonly color: string;
  /** 0..1, applied to `color`; omit when `color` already carries alpha. */
  readonly opacity?: number;
  readonly inset?: boolean;
}

/**
 * Keys `sm|md|lg|xl|inner|none` fill the theme's elevation scale; others (`card`, `modal`, `focus`) pass through.
 * A string value is verbatim CSS, used when a shadow could not be broken into layers.
 */
export type ShadowTokens = Readonly<Record<string, Sourced<readonly ShadowLayer[] | string>>>;

/** Application chrome (sidebar + header): `bg`, `fg`, `fgMuted`, `border`, `blur`, `hover`. */
export type ShellDesignTokens = Readonly<Record<string, Sourced<string>>>;

/** Motion: `fast|normal|slow|smooth|bounce` fill the theme's transitions; others pass through. */
export type TransitionTokens = Readonly<Record<string, Sourced<string>>>;

/** Component heights, container widths, icon sizes, e.g. `control-md: '40px'`. */
export type SizingTokens = Readonly<Record<string, Sourced<string>>>;

// --- Components, responsive, assets ------------------------------------------

/**
 * `button-primary`, `button-primary-hover`, `input-error`, `table-header`… → CSS-ish props
 * (`backgroundColor`, `textColor`, `rounded`, `height`, `padding`). Same naming the theme's component tokens use.
 */
export type ComponentTokens = Readonly<Record<string, Readonly<Record<string, Sourced<string>>>>>;

/** Per-device overrides for any token, keyed by CSS-variable name without `--maw-` (e.g. `space-page`). */
export type ResponsiveDesignTokens = Readonly<Record<string, ResponsiveMap<Sourced<string>>>>;

export interface FontAsset {
  readonly family: string;
  readonly weights?: readonly number[];
  /** Where the font can be loaded from, when the design says (otherwise it may be unavailable). */
  readonly url?: string;
}

export interface DesignAssets {
  readonly logo?: Sourced<string>;
  readonly favicon?: Sourced<string>;
  readonly fonts?: readonly FontAsset[];
  /** Icon style when identifiable: `outline`, `filled`, `duotone`… */
  readonly iconStyle?: Sourced<string>;
}

export interface DesignMeta {
  readonly name?: string;
  readonly description?: string;
  /** Id of the adapter that produced this model. */
  readonly adapter: string;
  readonly inputKind: DesignInputKind;
}

export interface NormalizedDesign {
  readonly meta: DesignMeta;
  readonly colors: ColorTokens;
  readonly typography: TypographyTokens;
  readonly spacing: SpacingTokens;
  readonly radii: RadiusTokens;
  readonly borders: BorderTokens;
  readonly shadows: ShadowTokens;
  readonly sizing: SizingTokens;
  readonly shell: ShellDesignTokens;
  readonly transitions: TransitionTokens;
  readonly components: ComponentTokens;
  readonly responsive: ResponsiveDesignTokens;
  readonly assets: DesignAssets;
  /** Tokens with no dedicated slot, kept so nothing the design said is silently dropped. */
  readonly extras: Readonly<Record<string, Sourced<string>>>;
  /** Things the adapter could not read or had to guess; shown in validation. */
  readonly warnings: readonly string[];
}
