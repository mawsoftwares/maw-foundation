import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ITenantResolver, ITenantContextHolder, TenantResolutionInput } from '@mawsoftwares/tenancy';
import type { Logger } from '@mawsoftwares/sdk';

export interface TenantMiddlewareOptions {
  readonly resolver: ITenantResolver;
  readonly contextHolder: ITenantContextHolder;
  readonly logger?: Logger;
  readonly headerName?: string;
  readonly rejectOnMissing?: boolean;
}

export function createTenantMiddleware(options: TenantMiddlewareOptions): RequestHandler {
  const {
    resolver,
    contextHolder,
    logger,
    headerName = 'x-tenant-id',
    rejectOnMissing = true,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const input: TenantResolutionInput = {
      hostname: req.hostname,
      tenantHeader: req.headers[headerName] as string | undefined,
      pathSegment: req.params['tenantId'] as string | undefined,
    };

    resolver
      .resolve(input)
      .then((tenantCtx) => {
        if (!tenantCtx) {
          if (rejectOnMissing) {
            logger?.warn('Tenant resolution failed', { hostname: req.hostname, header: input.tenantHeader });
            res.status(403).json({ error: 'Tenant could not be resolved' });
            return;
          }
          next();
          return;
        }

        if (tenantCtx.tenantStatus && tenantCtx.tenantStatus !== 'active') {
          logger?.warn('Tenant not active', { tenantId: tenantCtx.tenantId, status: tenantCtx.tenantStatus });
          res.status(403).json({ error: 'Tenant is not active' });
          return;
        }

        contextHolder.run(tenantCtx, () => next());
      })
      .catch((err) => {
        logger?.error('Tenant resolution error', { error: String(err) });
        res.status(500).json({ error: 'Internal server error' });
      });
  };
}
