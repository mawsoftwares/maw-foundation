import { Router, type Request, type Response, type RequestHandler } from 'express';
import type { ReportService } from '@mawsoftwares/reporting';
import type { DynamicAuthedRequest } from '@mawsoftwares/server-express';

export function createReportingRoutes(reportService: ReportService, requireAuth: RequestHandler): Router {
  const router = Router();

  router.get('/definitions', requireAuth, (_req: Request, res: Response) => {
    try {
      const metadata = reportService.getMetadata('orders-report');
      res.json({ definitions: [{ ...metadata, name: 'orders-report' }] });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list definitions' });
    }
  });

  router.get('/definitions/:name/metadata', requireAuth, (req: Request, res: Response) => {
    try {
      const metadata = reportService.getMetadata(req.params.name as string);
      res.json(metadata);
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Not found' });
    }
  });

  router.post('/preview', requireAuth, (req: Request, res: Response) => {
    void (async () => {
      try {
        const authed = req as DynamicAuthedRequest;
        const claims = authed.maw?.claims;
        if (!claims) { res.status(401).json({ error: 'not authenticated' }); return; }

        const { definitionName, ...request } = req.body as Record<string, unknown>;
        const result = await reportService.preview(
          definitionName as string,
          { definitionName: definitionName as string, ...request } as Parameters<ReportService['preview']>[1],
          { tenantId: claims.tenantId, userId: claims.userId },
        );
        res.json(result);
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Preview failed' });
      }
    })();
  });

  router.post('/run', requireAuth, (req: Request, res: Response) => {
    void (async () => {
      try {
        const authed = req as DynamicAuthedRequest;
        const claims = authed.maw?.claims;
        if (!claims) { res.status(401).json({ error: 'not authenticated' }); return; }

        const { definitionName, ...request } = req.body as Record<string, unknown>;
        const result = await reportService.run(
          definitionName as string,
          { definitionName: definitionName as string, ...request } as Parameters<ReportService['run']>[1],
          { tenantId: claims.tenantId, userId: claims.userId },
        );
        res.json(result);
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Run failed' });
      }
    })();
  });

  router.post('/save', requireAuth, (req: Request, res: Response) => {
    void (async () => {
      try {
        const authed = req as DynamicAuthedRequest;
        const claims = authed.maw?.claims;
        if (!claims) { res.status(401).json({ error: 'not authenticated' }); return; }

        const saved = await reportService.saveReport(req.body as Parameters<ReportService['saveReport']>[0]);
        res.status(201).json(saved);
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Save failed' });
      }
    })();
  });

  router.get('/saved', requireAuth, (req: Request, res: Response) => {
    void (async () => {
      try {
        const authed = req as DynamicAuthedRequest;
        const claims = authed.maw?.claims;
        if (!claims) { res.status(401).json({ error: 'not authenticated' }); return; }

        const saved = await reportService.listSavedReports(claims.tenantId);
        res.json({ saved });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'List failed' });
      }
    })();
  });

  return router;
}
