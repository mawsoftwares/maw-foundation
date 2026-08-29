import { Router, type Request, type Response, type RequestHandler } from 'express';
import type { ITenantRepository, CreateTenantInput, UpdateTenantInput } from '@mawsoftwares/tenancy';

export interface TenantRouteDeps {
  readonly tenantRepository: ITenantRepository;
  readonly requireAuth: RequestHandler;
}

export function createTenantRoutes(deps: TenantRouteDeps): Router {
  const router = Router();
  const repo = deps.tenantRepository;

  router.get('/', deps.requireAuth, async (_req: Request, res: Response) => {
    try {
      const tenants = await repo.findAll();
      res.json({ tenants });
    } catch (err) {
      res.status(500).json({ error: 'Failed to list tenants', detail: String(err) });
    }
  });

  router.get('/:id', deps.requireAuth, async (req: Request, res: Response) => {
    try {
      const tenant = await repo.findById(req.params.id as string);
      if (!tenant) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }
      res.json({ tenant });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get tenant', detail: String(err) });
    }
  });

  router.post('/', deps.requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, slug, domain, metadata } = req.body as CreateTenantInput;
      if (!name || !slug) {
        res.status(400).json({ error: 'name and slug are required' });
        return;
      }
      const tenant = await repo.create({ name, slug, domain, metadata });
      res.status(201).json({ tenant });
    } catch (err) {
      const message = String(err);
      if (message.includes('unique') || message.includes('duplicate')) {
        res.status(409).json({ error: 'Tenant with this slug or domain already exists' });
        return;
      }
      res.status(500).json({ error: 'Failed to create tenant', detail: message });
    }
  });

  router.patch('/:id', deps.requireAuth, async (req: Request, res: Response) => {
    try {
      const input = req.body as UpdateTenantInput;
      const tenant = await repo.update(req.params.id as string, input);
      res.json({ tenant });
    } catch (err) {
      const message = String(err);
      if (message.includes('not found')) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }
      res.status(500).json({ error: 'Failed to update tenant', detail: message });
    }
  });

  return router;
}
