import type { LayoutIssue, LayoutResult } from '@mawsoftwares/layout';

/**
 * Page template model. A template is the STRUCTURE of a page (named content slots + which slots accept widget
 * placements). It carries no business data and no styling: the layout engine owns the application frame, the theme
 * engine owns the look, and business modules fill the slots.
 */

export const CURRENT_PAGE_TEMPLATE_VERSION = 1;

export type { LayoutIssue as PageTemplateIssue, LayoutResult as PageTemplateResult };

export interface TemplateSlot {
  readonly id: string;
  readonly label: string;
  /** A page cannot render without its required slots being supplied. */
  readonly required: boolean;
}

export type WidgetSpan = 1 | 2 | 3 | 4;

export interface PageTemplateSettings {
  readonly width: 'contained' | 'full';
  /** Show the `aside` slot (when the template has one and the page supplies it). */
  readonly aside: boolean;
  /** Widget grid columns on wide screens; narrower screens step down automatically. */
  readonly columns: 1 | 2 | 3 | 4;
}

export interface PageTemplateDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly slots: readonly TemplateSlot[];
  /** Slot ids that may hold widget placements (a subset of `slots`). */
  readonly widgetSlots: readonly string[];
  readonly defaults: PageTemplateSettings;
}

/** One approved widget placed into a widget slot. The widget id must be registered; `title` is plain text. */
export interface WidgetPlacement {
  readonly slot: string;
  readonly widget: string;
  readonly span?: WidgetSpan;
  readonly title?: string;
}

/** The persisted form for one page. */
export interface StoredPageConfig {
  readonly version: number;
  readonly templateId: string;
  readonly settings?: Partial<PageTemplateSettings>;
  readonly widgets?: readonly WidgetPlacement[];
}

export type PageTemplateSource = 'default' | 'config' | 'fallback';

export interface ResolvedPageTemplate {
  readonly templateId: string;
  readonly label: string;
  readonly slots: readonly TemplateSlot[];
  readonly widgetSlots: readonly string[];
  readonly settings: PageTemplateSettings;
  /** Placements grouped by slot, in configured order. */
  readonly placements: Readonly<Record<string, readonly WidgetPlacement[]>>;
  readonly source: PageTemplateSource;
  readonly issues: readonly LayoutIssue[];
}
