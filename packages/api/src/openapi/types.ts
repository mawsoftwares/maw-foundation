export interface SchemaRef {
  readonly type: string;
  readonly description?: string;
  readonly properties?: Readonly<Record<string, SchemaRef>>;
  readonly required?: readonly string[];
  readonly items?: SchemaRef;
  readonly enum?: readonly string[];
  readonly format?: string;
  readonly nullable?: boolean;
}

export interface RouteMetadata {
  readonly summary: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly deprecated?: boolean;
  readonly operationId?: string;
  readonly requestBody?: SchemaRef;
  readonly responses?: Readonly<Record<number, { description: string; schema?: SchemaRef }>>;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RouteDefinition {
  readonly method: HttpMethod;
  readonly path: string;
  readonly metadata: RouteMetadata;
  readonly version?: string;
}
