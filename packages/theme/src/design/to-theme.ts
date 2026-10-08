import { listReviewTokens, type ProvenanceMap } from '../core/provenance';
import type { ThemeOverrides } from '../index';
import { createDesignMdAdapter } from './adapters/design-md';
import { analyzeDesign, type DesignAnalysis } from './analyze';
import { deriveComponentTokens } from './components';
import { generateTheme } from './generator';
import { mergeNormalizedDesign } from './manual';
import { createDesignPipeline, type DesignPipeline } from './pipeline';
import type { DesignInput, NormalizedDesign } from './types';

export interface DesignToThemeOptions {
  /** Adapters to use; defaults to the design.md adapter (see `createDefaultDesignPipeline`). */
  readonly pipeline?: DesignPipeline;
  /** Hand-entered corrections applied over what the adapter extracted, before analysis. */
  readonly manual?: Partial<NormalizedDesign>;
}

export interface DesignToThemeResult {
  readonly overrides: ThemeOverrides;
  /** The final normalized design (adapter output + corrections + analysis + derived component tokens). */
  readonly design: NormalizedDesign;
  readonly analysis: DesignAnalysis;
  /** Theme-token-level provenance (same as `overrides.provenance`). */
  readonly provenance: ProvenanceMap;
  /** Importer and generator warnings. */
  readonly warnings: readonly string[];
  /** Theme tokens that are estimated or low confidence, lowest first. */
  readonly review: ReturnType<typeof listReviewTokens>;
}

export function createDefaultDesignPipeline(): DesignPipeline {
  return createDesignPipeline([createDesignMdAdapter()]);
}

/** The synchronous half of the pipeline: corrections → analysis → component derivation → theme. */
export function normalizedToTheme(design: NormalizedDesign, manual?: Partial<NormalizedDesign>): DesignToThemeResult {
  const corrected = manual === undefined ? design : mergeNormalizedDesign(design, manual);
  const { design: analyzed, analysis } = analyzeDesign(corrected);
  const final = deriveComponentTokens(analyzed);
  const generated = generateTheme(final);
  return {
    overrides: generated.overrides,
    design: final,
    analysis,
    provenance: generated.provenance,
    warnings: generated.warnings,
    review: listReviewTokens(generated.provenance),
  };
}

/**
 * Design input → theme, end to end:
 * input → adapter → normalized design → corrections → analysis → component tokens → theme overrides.
 * Throws `UnsupportedDesignInputError` (with a manual-entry template) when no adapter can read the input.
 */
export async function designToTheme(input: DesignInput, options: DesignToThemeOptions = {}): Promise<DesignToThemeResult> {
  const pipeline = options.pipeline ?? createDefaultDesignPipeline();
  return normalizedToTheme(await pipeline.analyze(input), options.manual);
}
