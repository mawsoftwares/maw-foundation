import { Router, type Request, Response, NextFunction, type RequestHandler } from 'express';
import {
  createRequestContext,
  type RequestContext,
  type Controller,
  type ControllerResult,
  type RouteMetadata,
  routeRegistry,
  type HttpMethod,
  withErrorTranslation,
} from '@maw/api';
import type { DynamicAuthedRequest } from './index';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestContext?: RequestContext;
    }
  }
}

export function populateRequestContext(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const maw = (req as DynamicAuthedRequest).maw;
    req.requestContext = createRequestContext({
      requestId: req.headers['x-request-id'] as string | undefined,
      correlationId: req.headers['x-correlation-id'] as string | undefined,
      userId: maw?.claims?.userId,
      tenantId: maw?.claims?.tenantId,
      locale: parseAcceptLanguage(req.headers['accept-language']),
      ipAddress: req.ip ?? (req.socket?.remoteAddress),
      userAgent: req.get('user-agent'),
    });
    next();
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
): RequestHandler {
  const safe = withErrorTranslation(controller);

  return (req: Request, res: Response, _next: NextFunction) => {
    const context = req.requestContext ?? createRequestContext({
      requestId: req.headers['x-request-id'] as string | undefined,
    });

    const promise = safe({
      body: req.body as TBody,
      params: req.params as unknown as TParams,
      query: req.query as unknown as TQuery,
      context,
    });

    void promise.then((result: ControllerResult<TResult>) => {
      if (result.headers !== undefined) {
        for (const [key, value] of Object.entries(result.headers)) {
          res.setHeader(key, value);
        }
      }

      if (result.statusCode === 204 || result.body === undefined) {
        res.status(result.statusCode).end();
        return;
      }

      res.status(result.statusCode).json(result.body);
    });
  };
}

export interface ApiRouteOptions {
  readonly middleware?: readonly RequestHandler[];
  readonly metadata?: RouteMetadata;
}

export interface ApiRouterOptions {
  readonly version?: string;
  readonly prefix?: string;
}

export function createApiRouter(options?: ApiRouterOptions): {
  router: Router;
  get: (path: string, controller: Controller, opts?: ApiRouteOptions) => void;
  post: (path: string, controller: Controller, opts?: ApiRouteOptions) => void;
  put: (path: string, controller: Controller, opts?: ApiRouteOptions) => void;
  patch: (path: string, controller: Controller, opts?: ApiRouteOptions) => void;
  delete: (path: string, controller: Controller, opts?: ApiRouteOptions) => void;
} {
  const router = Router();
  const version = options?.version;

  function register(
    method: HttpMethod,
    path: string,
    controller: Controller,
    opts?: ApiRouteOptions,
  ): void {
    const handlers: RequestHandler[] = [
      ...(opts?.middleware ?? []),
      executeController(controller),
    ];

    const routerMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
    router[routerMethod](path, ...handlers);

    if (opts?.metadata !== undefined) {
      const fullPath = options?.prefix
        ? `${options.prefix}${path}`
        : path;
      routeRegistry.register(method, fullPath, opts.metadata, version);
    }
  }

  return {
    router,
    get: (path, controller, opts?) => register('GET', path, controller, opts),
    post: (path, controller, opts?) => register('POST', path, controller, opts),
    put: (path, controller, opts?) => register('PUT', path, controller, opts),
    patch: (path, controller, opts?) => register('PATCH', path, controller, opts),
    delete: (path, controller, opts?) => register('DELETE', path, controller, opts),
  };
}
