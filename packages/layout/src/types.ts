/**
 * Layout configuration model. Pure data: it names slots, variants and approved component ids, and never
 * carries code, class names, colors or business data. Rendering is done by a UI kit (see ui-web).
 * Visual styling belongs to @mawsoftwares/theme; page composition belongs to page templates.
 */

/** Bump when the stored shape changes, and add a step to `LAYOUT_MIGRATIONS`. */
export const CURRENT_LAYOUT_VERSION = 1;

/** The named regions every layout composes. */
export const LAYOUT_SLOTS = ['sidebar', 'header', 'content', 'footer', 'rightPanel'] as const;
export type LayoutSlot = (typeof LAYOUT_SLOTS)[number];

/** Same names as the theme breakpoints used by ui-web (`sm | md | lg | xl`). */
export type LayoutBreakpoint = 'sm' | 'md' | 'lg' | 'xl';
export type LayoutSize = 'sm' | 'md' | 'lg';
export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';

export interface SidebarSettings {
  readonly enabled: boolean;
  readonly position: 'left' | 'right';
  /** `docked` fills the edge, `floating` is an inset card, `rail` is icons-only until expanded. */
  readonly variant: 'docked' | 'floating' | 'rail';
  readonly width: LayoutSize;
  readonly collapsible: boolean;
  readonly defaultCollapsed: boolean;
  /** `beside`: label next to the icon. `below`: icon tiles with a small label under each (a fixed, narrow bar). */
  readonly labels: 'beside' | 'below';
  /** A rail expands over the content while hovered or focused, then folds back. */
  readonly expandOnHover: boolean;
  /** Approved component ids rendered above/below the navigation (e.g. brand, user-menu). */
  readonly top: readonly string[];
  readonly bottom: readonly string[];
}

export interface HeaderSettings {
  readonly enabled: boolean;
  readonly variant: 'default' | 'minimal' | 'prominent';
  readonly sticky: boolean;
  readonly start: readonly string[];
  readonly end: readonly string[];
}

export interface RightPanelSettings {
  readonly enabled: boolean;
  readonly width: LayoutSize;
  readonly collapsible: boolean;
  readonly defaultOpen: boolean;
}

export interface FooterSettings {
  readonly enabled: boolean;
}

export interface ContentSettings {
  /** `contained` honours the theme's container max width; `full` uses the whole slot. */
  readonly width: 'contained' | 'full';
}

export interface ResponsiveSettings {
  /** Sidebar becomes mobile navigation below this breakpoint. */
  readonly sidebarCollapseBelow: LayoutBreakpoint;
  /** The right panel is hidden (or moved into a drawer) below this breakpoint. */
  readonly rightPanelHideBelow: LayoutBreakpoint;
  readonly mobileNavigation: 'drawer' | 'bottom-bar';
}

/**
 * The SHAPE of the application chrome — geometry only, never colour (colour is the theme's job, so any theme works
 * with any layout).
 */
export interface ShapeSettings {
  /** `inset`: the app sits inside a rounded card on a tinted canvas (desktop only). */
  readonly frame: 'full-bleed' | 'inset';
  /** Roundness of the app card, the floating sidebar and similar chrome. */
  readonly corners: 'sharp' | 'soft' | 'round';
  /** `pill`: navigation items are fully rounded; `rounded` keeps the theme's own radius. */
  readonly nav: 'rounded' | 'pill';
  /** How the active navigation item is marked: a filled item, a side bar, or a dot. */
  readonly indicator: 'fill' | 'bar' | 'dot';
}

/** Movement only; every kit turns it off for people who prefer reduced motion. */
export interface MotionSettings {
  /** How the sidebar changes width: instantly, a smooth ease, or a springy overshoot. */
  readonly sidebar: 'none' | 'smooth' | 'spring';
  /** Hover feedback on navigation items. */
  readonly items: 'none' | 'slide' | 'lift';
  /** Entrance of the page content when the page changes. */
  readonly page: 'none' | 'fade' | 'rise';
}

/** The complete, resolved layout description. */
export interface LayoutSettings {
  readonly density: LayoutDensity;
  readonly sidebar: SidebarSettings;
  readonly header: HeaderSettings;
  readonly rightPanel: RightPanelSettings;
  readonly footer: FooterSettings;
  readonly content: ContentSettings;
  readonly responsive: ResponsiveSettings;
  readonly shape: ShapeSettings;
  readonly motion: MotionSettings;
}

type DeepPartial<T> = T extends readonly unknown[] ? T : T extends object ? { readonly [K in keyof T]?: DeepPartial<T[K]> } : T;

/** What a project edits: only the differences from the preset's defaults. */
export type LayoutOverrides = DeepPartial<LayoutSettings>;

/** The persisted/serialisable form, stored per tenant (draft and published copies). */
export interface StoredLayoutConfig {
  readonly version: number;
  readonly presetId: string;
  readonly overrides?: LayoutOverrides;
}

export interface LayoutIssue {
  /** Dotted path into the config, e.g. `overrides.sidebar.width`. */
  readonly path: string;
  readonly message: string;
}

export type LayoutResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly LayoutIssue[] };

export interface LayoutPreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** Complete defaults. Overrides are merged on top and re-validated. */
  readonly settings: LayoutSettings;
  /**
   * A theme id this preset looks best with (e.g. the one it was designed around). A hint for pickers only: layout and theme stay
   * independent, any theme works with any layout, and the id is ignored when the app has no such theme.
   */
  readonly suggestedThemeId?: string;
}

export type LayoutSource = 'default' | 'config' | 'fallback';

export interface ResolvedLayout {
  readonly presetId: string;
  readonly label: string;
  readonly settings: LayoutSettings;
  /** `default`: nothing configured; `config`: applied as stored; `fallback`: stored config was unusable. */
  readonly source: LayoutSource;
  /** Why a fallback happened (empty otherwise). Safe to log; contains no user data. */
  readonly issues: readonly LayoutIssue[];
}
