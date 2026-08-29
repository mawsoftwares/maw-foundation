import { Router } from 'express';
import type { RequestHandler } from 'express';
import {
  CreateEntityUseCase,
  GetEntityUseCase,
  ListEntitiesUseCase,
  UpdateEntityUseCase,
  DeleteEntityUseCase,
} from '../application/use-cases';
import type { IEntityRepository } from '../infrastructure/repositories/Repository';
import type { CreateEntityDto, UpdateEntityDto, ListEntitiesQueryDto } from '../application/dto';

/**
 * CRUD Module Template — Express Router Factory
 *
 * REPLACE: `Entity` / `entity` / `entities` → your domain noun.
 * ADD: requirePermission guards matching the permissions in `module.ts`.
 */

interface RouterDeps {
  repository: IEntityRepository;
  requireAuth: RequestHandler;
  requirePermission: (perm: string) => RequestHandler;
  auditService?: { log: (event: string, data: Record<string, unknown>) => void };
}

function makeContext(req: { maw?: { claims: { tenantId: string; userId: string } } }) {
  return {
    tenantId: req.maw?.claims.tenantId ?? '',
    actorId: req.maw?.claims.userId,
  };
}

function errorStatus(message: string): number {
  if (message.includes('ALREADY_EXISTS') || message.includes('REQUIRED') || message.includes('Validation')) return 400;
  if (message.includes('NOT_FOUND')) return 404;
  if (message.includes('FORBIDDEN')) return 403;
  return 500;
}

export function createEntitiesRouter(deps: RouterDeps): Router {
  const { repository, requireAuth, requirePermission, auditService } = deps;

  const createUc  = new CreateEntityUseCase(repository, auditService);
  const getUc     = new GetEntityUseCase(repository);
  const listUc    = new ListEntitiesUseCase(repository);
  const updateUc  = new UpdateEntityUseCase(repository, auditService);
  const deleteUc  = new DeleteEntityUseCase(repository, auditService);

  const router = Router();
  router.use(requireAuth);

  // GET /entities
  router.get('/', requirePermission('Read_Entities'), (req, res) => {
    void (async () => {
      try {
        const ctx = makeContext(req as any);
        const q = req.query as Record<string, string>;
        const query: ListEntitiesQueryDto = {
          page: q['page'] ? Number(q['page']) : undefined,
          limit: q['limit'] ? Number(q['limit']) : undefined,
          search: q['search'],
          status: q['status'] as 'active' | 'inactive' | undefined,
        };
        const result = await listUc.execute(ctx.tenantId, query);
        res.json({ success: true, data: result });
      } catch (err) {
        const msg = (err as Error).message;
        res.status(errorStatus(msg)).json({ success: false, error: msg });
      }
    })();
  });

  // GET /entities/:id
  router.get('/:id', requirePermission('Read_Entities'), (req, res) => {
    void (async () => {
      try {
        const ctx = makeContext(req as any);
        const result = await getUc.execute(req.params['id']!, ctx.tenantId);
        res.json({ success: true, data: result });
      } catch (err) {
        const msg = (err as Error).message;
        res.status(errorStatus(msg)).json({ success: false, error: msg });
      }
    })();
  });

  // POST /entities
  router.post('/', requirePermission('Create_Entities'), (req, res) => {
    void (async () => {
      try {
        const ctx = makeContext(req as any);
        const input: CreateEntityDto = { ...(req.body as object), tenantId: ctx.tenantId };
        const result = await createUc.execute(input, ctx.actorId);
        res.status(201).json({ success: true, data: result });
      } catch (err) {
        const msg = (err as Error).message;
        res.status(errorStatus(msg)).json({ success: false, error: msg });
      }
    })();
  });

  // PATCH /entities/:id
  router.patch('/:id', requirePermission('Update_Entities'), (req, res) => {
    void (async () => {
      try {
        const ctx = makeContext(req as any);
        const result = await updateUc.execute(req.params['id']!, ctx.tenantId, req.body as UpdateEntityDto, ctx.actorId);
        res.json({ success: true, data: result });
      } catch (err) {
        const msg = (err as Error).message;
        res.status(errorStatus(msg)).json({ success: false, error: msg });
      }
    })();
  });

  // DELETE /entities/:id
  router.delete('/:id', requirePermission('Delete_Entities'), (req, res) => {
    void (async () => {
      try {
        const ctx = makeContext(req as any);
        await deleteUc.execute(req.params['id']!, ctx.tenantId, ctx.actorId);
        res.json({ success: true, data: { deleted: true } });
      } catch (err) {
        const msg = (err as Error).message;
        res.status(errorStatus(msg)).json({ success: false, error: msg });
      }
    })();
  });

  return router;
}
