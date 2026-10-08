import { emptyNormalizedDesign, parseManualMapping } from './manual';
import type { DesignAdapter, DesignInput, NormalizedDesign } from './types';

/**
 * Thrown when no adapter can read an input. Carries an empty `template` so the caller can offer manual
 * entry (`kind: 'manual'`) instead of dead-ending.
 */
export class UnsupportedDesignInputError extends Error {
  readonly template: NormalizedDesign;

  constructor(readonly input: Pick<DesignInput, 'kind' | 'name'>, readonly adapterIds: readonly string[]) {
    super(
      `No design adapter can read a "${input.kind}" input${input.name === undefined ? '' : ` (${input.name})`}. `
      + `Registered adapters: ${adapterIds.length === 0 ? 'none' : adapterIds.join(', ')}. `
      + 'Provide the values manually with kind "manual".',
    );
    this.name = 'UnsupportedDesignInputError';
    this.template = emptyNormalizedDesign('manual', input.kind);
  }
}

export interface DesignPipeline {
  register(adapter: DesignAdapter): void;
  adapterIds(): readonly string[];
  /** Pick the first adapter that can handle `input` (manual input is always handled) and normalize it. */
  analyze(input: DesignInput): Promise<NormalizedDesign>;
}

/**
 * Adapter registry. Adapters are added from outside, so supporting a new format (Figma, image, PDF) never
 * touches this file or the generator.
 */
export function createDesignPipeline(initial: readonly DesignAdapter[] = []): DesignPipeline {
  const adapters: DesignAdapter[] = [...initial];
  return {
    register(adapter) {
      const existing = adapters.findIndex((a) => a.id === adapter.id);
      if (existing >= 0) adapters[existing] = adapter;
      else adapters.push(adapter);
    },
    adapterIds: () => adapters.map((a) => a.id),
    async analyze(input) {
      if (input.kind === 'manual') return parseManualMapping(input);
      const adapter = adapters.find((a) => a.canHandle(input));
      if (adapter === undefined) throw new UnsupportedDesignInputError(input, adapters.map((a) => a.id));
      return adapter.analyze(input);
    },
  };
}
