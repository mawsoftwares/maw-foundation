import { Router } from 'express';
import {
  UsersController,
  CreateUserUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  ActivateUserUseCase,
  DeactivateUserUseCase,
  ChangePasswordUseCase,
  ResetPasswordUseCase,
} from '@maw/users';
import { PgUserRepository } from '@maw/users';
import type { PgPool } from '@maw/database';
import { DynamicAuthedRequest } from '@maw/server-express';

export function createUsersRouter(pool: PgPool, requireAuth: any) {
  const router = Router();
  const repo = new PgUserRepository(pool);

  // Use Cases
  const createUc = new CreateUserUseCase(repo);
  const getUc = new GetUserUseCase(repo);
  const listUc = new ListUsersUseCase(repo);
  const updateUc = new UpdateUserUseCase(repo);
  const deleteUc = new DeleteUserUseCase(repo);
  const activateUc = new ActivateUserUseCase(repo);
  const deactivateUc = new DeactivateUserUseCase(repo);
  
  // Dummy password services since we don't have full auth setup mapped here
  const pwdChangeUc = new ChangePasswordUseCase({} as any);
  const pwdResetUc = new ResetPasswordUseCase({} as any);

  const controller = new UsersController(
    createUc, getUc, listUc, updateUc, deleteUc,
    activateUc, deactivateUc, pwdChangeUc, pwdResetUc
  );

  const makeReq = (req: any) => {
    const maw = req.maw;
    return {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
      context: {
        tenantId: maw?.claims.tenantId ?? 'tenant-1',
        actorId: maw?.claims.userId ?? 'system',
      },
    };
  };

  router.post('/', async (req, res) => {
    const result = await controller.createUser(makeReq(req));
    res.status(result.status).json(result.body);
  });

  router.get('/', async (req, res) => {
    const result = await controller.listUsers(makeReq(req));
    res.status(result.status).json(result.body);
  });

  router.get('/:id', async (req, res) => {
    const result = await controller.getUser(makeReq(req));
    res.status(result.status).json(result.body);
  });

  router.patch('/:id', async (req, res) => {
    const result = await controller.updateUser(makeReq(req));
    res.status(result.status).json(result.body);
  });

  router.delete('/:id', async (req, res) => {
    const result = await controller.deleteUser(makeReq(req));
    res.status(result.status).json(result.body);
  });

  router.post('/:id/activate', async (req, res) => {
    const result = await controller.activateUser(makeReq(req));
    res.status(result.status).json(result.body);
  });

  router.post('/:id/deactivate', async (req, res) => {
    const result = await controller.deactivateUser(makeReq(req));
    res.status(result.status).json(result.body);
  });

  return router;
}
