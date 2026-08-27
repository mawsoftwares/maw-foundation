import { Hono, type Context, type MiddlewareHandler } from 'hono';
import {
  createRequestContext,
  type RequestContext,
  type Controller,
  type ControllerResult,
  type RouteMetadata,
  routeRegistry,
  type HttpMethod,
  withErrorTranslation,
} from '@mawsoftwares/api';
import type { AuthClaims } from '@mawsoftwares/auth-core';

export function populateRequestContext(): MiddlewareHandler {
  return async (c, next) => {
    const claims = c.get('mawClaims') as AuthClaims | undefined;
    const ctx = createRequestContext({
      requestId: c.req.header('x-request-id'),
      correlationId: c.req.header('x-correlation-id') ?? (c.get('correlationId') as string | undefined),
      userId: claims?.userId,
      tenantId: claims?.tenantId,
      locale: parseAcceptLanguage(c.req.header('accept-language')),
      ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: c.req.header('user-agent'),
    });
    c.set('requestContext', ctx);
    await next();
  };
}

function parseAcceptLanguage(header: string | undefined): string | undefined {
  if (header === undefined) return undefined;
  const first = header.split(',')[0];
  return first?.split(';')[0]?.trim() || undefined;
}

export function executeController<
  TBody = unknown,
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[] | undefined>,
  TResult = unknown,
>(
  controller: Controller<TBody, TParams, TQuery, TResult>,
): MiddlewareHandler {
  const safe = withErrorTranslation(controller);

  return async (c) => {
    const context = (c.get('requestContext') as RequestContext | undefined) ?? createRequestContext({
      requestId: c.req.header('x-request-id'),
    });

    let body: TBody | undefined;
    if (c.req.method !== 'GET' && c.req.method !== 'DELETE') {
      try {
        body = await c.req.json<TBody>();
      } catch {
        body = undefined;
      }
    }

    const result: ControllerResult<TResult> = await safe({
      body: body as TBody,
      params: c.req.param() as unknown as TParams,
      query: c.req.query() as unknown as TQuery,
      context,
    });

    if (result.headers !== undefined) {
      for (const [key, value] of Object.entries(result.headers)) {
        c.header(key, value);
      }
    }

    if (result.statusCode === 204 || result.body === undefined) {
      return c.body(null, 204);
    }

    return c.json(result.body, result.statusCode as 200);
  };
}

export interface ApiRouteOptions {
  readonly middleware?: readonly MiddlewareHandler[];
  readonly metadata?: RouteMetadata;
}

export interface ApiRouterOptions {
  readonly version?: string;
  readonly prefix?: string;
}

export function createApiRouter(options?: ApiRouterOptions): {
  app: Hono;
  get: (path: string, controller: Controller, opts?: ApiRouteOptions) => void;
  post: (path: string, controller: Controller, opts?: ApiRouteOptions) => void;
  put: (path: string, controller: Controller, opts?: ApiRouteOptions) => void;
  patch: (path: string, controller: Controller, opts?: ApiRouteOptions) => void;
  delete: (path: string, controller: Controller, opts?: ApiRouteOptions) => void;
} {
  const app = new Hono();
  const version = options?.version;

  function register(
    method: HttpMethod,
    path: string,
    controller: Controller,
    opts?: ApiRouteOptions,
  ): void {
    const middleware = opts?.middleware ?? [];
    const handler = executeController(controller);
    const routerMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';

    if (middleware.length > 0) {
      for (const mw of middleware) {
        app.use(path, mw);
      }
    }
    app[routerMethod](path, handler);

    if (opts?.metadata !== undefined) {
      const fullPath = options?.prefix
        ? `${options.prefix}${path}`
        : path;
      routeRegistry.register(method, fullPath, opts.metadata, version);
    }
  }

  return {
    app,
    get: (path, controller, opts?) => register('GET', path, controller, opts),
    post: (path, controller, opts?) => register('POST', path, controller, opts),
    put: (path, controller, opts?) => register('PUT', path, controller, opts),
    patch: (path, controller, opts?) => register('PATCH', path, controller, opts),
    delete: (path, controller, opts?) => register('DELETE', path, controller, opts),
  };
}
