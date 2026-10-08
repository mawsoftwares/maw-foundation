/**
 * Token provenance: where a value came from and how far to trust it. Lets the validator and the
 * playground flag values that need manual review instead of presenting every token as exact.
 */
export type TokenSource =
  /** Read verbatim from the design reference. */
  | 'design'
  /** Computed from other design values (e.g. a hover shade derived from the brand colour). */
  | 'derived'
  /** Guessed — the reference did not state it (e.g. sampled from a screenshot). */
  | 'estimated'
  /** Entered or corrected by a person. */
  | 'manual'
  /** The built-in foundation default. */
  | 'default';

export interface TokenMeta {
  readonly source: TokenSource;
  /** 0..1. `design` and `manual` are 1; `estimated` should be below 1. */
  readonly confidence: number;
  readonly note?: string;
}

/** Keyed by token path, e.g. `palette.brand`, `radius.md`, `components.button-primary.height`. */
export type ProvenanceMap = Readonly<Record<string, TokenMeta>>;

/** Confidence under which a token is reported as needing manual review. */
export const REVIEW_CONFIDENCE_THRESHOLD = 0.8;

export function tokenMeta(source: TokenSource, confidence?: number, note?: string): TokenMeta {
  const fallback = source === 'estimated' ? 0.6 : source === 'derived' ? 0.85 : 1;
  const value = Math.min(1, Math.max(0, confidence ?? fallback));
  return note === undefined ? { source, confidence: value } : { source, confidence: value, note };
}

export function needsReview(meta: TokenMeta): boolean {
  return meta.source === 'estimated' || meta.confidence < REVIEW_CONFIDENCE_THRESHOLD;
}

/** Token paths whose provenance says they should be reviewed by a person, lowest confidence first. */
export function listReviewTokens(provenance: ProvenanceMap | undefined): readonly { path: string; meta: TokenMeta }[] {
  if (provenance === undefined) return [];
  return Object.entries(provenance)
    .filter(([, meta]) => needsReview(meta))
    .map(([path, meta]) => ({ path, meta }))
    .sort((a, b) => a.meta.confidence - b.meta.confidence || a.path.localeCompare(b.path));
}
