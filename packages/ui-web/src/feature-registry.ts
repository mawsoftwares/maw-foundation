import type { ComponentType } from 'react';

/**
 * Frontend counterpart of `@mawsoftwares/rbac-core` `ModuleRegistry`.
 *
 * Each product feature is a definition: key (must match the server module key),
 * optional permission codes that gate the panel, and a React panel. Adding a
 * screen = one feature file + one `registry.register(...)` line.
 */
export interface FeatureDefinition {
  readonly key: string;
  readonly name: string;
  /**
   * Any of these `Action_Module` codes shows the panel. Empty / omitted = always
   * visible when logged in. Admins bypass via `FeatureHost`.
   */
  readonly permissions?: readonly string[];
  readonly Panel: ComponentType;
}

export class FeatureRegistry {
  private readonly features: FeatureDefinition[] = [];

  register(...definitions: FeatureDefinition[]): void {
    for (const def of definitions) {
      if (this.features.some((f) => f.key === def.key)) {
        throw new Error(`Feature "${def.key}" is already registered`);
      }
      this.features.push(def);
    }
  }

  getAll(): readonly FeatureDefinition[] {
    return this.features;
  }

  getByKey(key: string): FeatureDefinition | undefined {
    return this.features.find((f) => f.key === key);
  }
}
