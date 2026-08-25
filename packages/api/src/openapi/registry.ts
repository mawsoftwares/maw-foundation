import type { RouteDefinition, RouteMetadata, HttpMethod } from './types';

export class RouteRegistry {
  private readonly routes: RouteDefinition[] = [];

  register(
    method: HttpMethod,
    path: string,
    metadata: RouteMetadata,
    version?: string,
  ): void {
    this.routes.push({ method, path, metadata, version });
  }

  getAll(): readonly RouteDefinition[] {
    return this.routes;
  }

  getByTag(tag: string): readonly RouteDefinition[] {
    return this.routes.filter(
      (r) => r.metadata.tags !== undefined && r.metadata.tags.includes(tag),
    );
  }

  toJSON(): readonly RouteDefinition[] {
    return this.routes;
  }

  clear(): void {
    this.routes.length = 0;
  }
}

export const routeRegistry = new RouteRegistry();
