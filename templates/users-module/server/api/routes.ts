import { Router } from 'express';
import type { RequestHandler } from 'express';
import {
  CreateUserUseCase, GetUserUseCase, ListUsersUseCase,
  UpdateUserUseCase, DeleteUserUseCase,
} from '../application/use-cases';
import type { IUsersRepository } from '../infrastructure/repositories/UserRepository';
import type { CreateUserDto, UpdateUserDto, ListUsersQueryDto } from '../application/dto';

interface RouterDeps {
  repository: IUsersRepository;
  requireAuth: RequestHandler;
  requirePermission: (perm: string) => RequestHandler;
  auditService?: { log: (event: string, data: Record<string, unknown>) => void };
  eventBus?: { emit: (name: string, payload: Record<string, unknown>) => void };
}

function ctx(req: { maw?: { claims: { tenantId: string; userId: string } } }) {
  return { tenantId: req.maw?.claims.tenantId ?? '', actorId: req.maw?.claims.userId };
}

function errStatus(msg: string) {
  if (msg.includes('ALREADY_EXISTS') || msg.includes('REQUIRED')) return 400;
  if (msg.includes('NOT_FOUND')) return 404;
  if (msg.includes('FORBIDDEN')) return 403;
  return 500;
}

export function createUsersRouter(deps: RouterDeps): Router {
  const { repository, requireAuth, requirePermission, auditService, eventBus } = deps;

  const createUc = new CreateUserUseCase(repository, auditService, eventBus);
  const getUc    = new GetUserUseCase(repository);
  const listUc   = new ListUsersUseCase(repository);
  const updateUc = new UpdateUserUseCase(repository, auditService);
  const deleteUc = new DeleteUserUseCase(repository, auditService);

  const router = Router();
  router.use(requireAuth);

  router.get('/', requirePermission('Read_Users'), (req, res) => {
    void (async () => {
      try {
        const { tenantId } = ctx(req as any);
        const q = req.query as Record<string, string>;
        const query: ListUsersQueryDto = {
          page:   q['page']  ? Number(q['page'])  : undefined,
          limit:  q['limit'] ? Number(q['limit']) : undefined,
          search: q['search'],
          status: q['status'] as ListUsersQueryDto['status'],
          role:   q['role'],
        };
        res.json({ success: true, data: await listUc.execute(tenantId, query) });
      } catch (err) {
        const msg = (err as Error).message;
        res.status(errStatus(msg)).json({ success: false, error: msg });
      }
    })();
  });

  router.get('/:id', requirePermission('Read_Users'), (req, res) => {
    void (async () => {
      try {
        const { tenantId } = ctx(req as any);
        res.json({ success: true, data: await getUc.execute(req.params['id']!, tenantId) });
      } catch (err) {
        const msg = (err as Error).message;
        res.status(errStatus(msg)).json({ success: false, error: msg });
      }
    })();
  });

  router.post('/', requirePermission('Create_Users'), (req, res) => {
    void (async () => {
      try {
        const { tenantId, actorId } = ctx(req as any);
        const input: CreateUserDto = { ...(req.body as object), tenantId };
        res.status(201).json({ success: true, data: await createUc.execute(input, actorId) });
      } catch (err) {
        const msg = (err as Error).message;
        res.status(errStatus(msg)).json({ success: false, error: msg });
      }
    })();
  });

  router.patch('/:id', requirePermission('Update_Users'), (req, res) => {
    void (async () => {
      try {
        const { tenantId, actorId } = ctx(req as any);
        res.json({ success: true, data: await updateUc.execute(req.params['id']!, tenantId, req.body as UpdateUserDto, actorId) });
      } catch (err) {
        const msg = (err as Error).message;
        res.status(errStatus(msg)).json({ success: false, error: msg });
      }
    })();
  });

  router.delete('/:id', requirePermission('Delete_Users'), (req, res) => {
    void (async () => {
      try {
        const { tenantId, actorId } = ctx(req as any);
        await deleteUc.execute(req.params['id']!, tenantId, actorId);
        res.json({ success: true, data: { deleted: true } });
      } catch (err) {
        const msg = (err as Error).message;
        res.status(errStatus(msg)).json({ success: false, error: msg });
      }
    })();
  });

  return router;
}
