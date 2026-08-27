import { FeatureDefinition } from '../domain/types.js';

export class FeatureRegistry {
  private features = new Map<string, FeatureDefinition>();

  register(definition: FeatureDefinition): void {
    if (this.features.has(definition.key)) {
      // Depending on policy, we might throw or just log.
      // For now, we will override deterministically.
      console.warn(`Feature ${definition.key} is already registered. Overwriting.`);
    }
    this.features.set(definition.key, definition);
  }

  registerMany(definitions: FeatureDefinition[]): void {
    for (const def of definitions) {
      this.register(def);
    }
  }

  get(key: string): FeatureDefinition | undefined {
    return this.features.get(key);
  }

  has(key: string): boolean {
    return this.features.has(key);
  }

  list(): FeatureDefinition[] {
    return Array.from(this.features.values());
  }
}

// Global singleton instance for module bootstrapping
export const featureRegistry = new FeatureRegistry();
