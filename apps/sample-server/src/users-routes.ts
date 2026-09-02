import { createApiRouter } from '@mawsoftwares/server-express';
import type { RequestHandler } from 'express';
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
} from '@mawsoftwares/users';
import type { IUsersRepository } from '@mawsoftwares/users';

export function createUsersRouter(
  repo: IUsersRepository,
  deps: {
    requireAuth: RequestHandler;
    requirePermission: (perm: string) => RequestHandler;
  },
) {
  const createUc = new CreateUserUseCase(repo);
  const getUc = new GetUserUseCase(repo);
  const listUc = new ListUsersUseCase(repo);
  const updateUc = new UpdateUserUseCase(repo);
  const deleteUc = new DeleteUserUseCase(repo);
  const activateUc = new ActivateUserUseCase(repo);
  const deactivateUc = new DeactivateUserUseCase(repo);
  const pwdChangeUc = new ChangePasswordUseCase({});
  const pwdResetUc = new ResetPasswordUseCase({});

  const controller = new UsersController(
    createUc, getUc, listUc, updateUc, deleteUc,
    activateUc, deactivateUc, pwdChangeUc, pwdResetUc,
  );

  const { router, get, post, patch, delete: destroy } = createApiRouter({
    version: 'v1',
    prefix: '/api/v1/users',
  });

  get('/', controller.listUsers, {
    middleware: [deps.requireAuth, deps.requirePermission('Read_Users')],
    metadata: { summary: 'List users', tags: ['users'] },
  });

  get('/:id', controller.getUser, {
    middleware: [deps.requireAuth, deps.requirePermission('Read_Users')],
    metadata: { summary: 'Get user by ID', tags: ['users'] },
  });

  post('/', controller.createUser, {
    middleware: [deps.requireAuth, deps.requirePermission('Create_Users')],
    metadata: { summary: 'Create user', tags: ['users'] },
  });

  patch('/:id', controller.updateUser, {
    middleware: [deps.requireAuth, deps.requirePermission('Update_Users')],
    metadata: { summary: 'Update user', tags: ['users'] },
  });

  destroy('/:id', controller.deleteUser, {
    middleware: [deps.requireAuth, deps.requirePermission('Delete_Users')],
    metadata: { summary: 'Delete user', tags: ['users'] },
  });

  post('/:id/activate', controller.activateUser, {
    middleware: [deps.requireAuth, deps.requirePermission('Update_Users')],
    metadata: { summary: 'Activate user', tags: ['users'] },
  });

  post('/:id/deactivate', controller.deactivateUser, {
    middleware: [deps.requireAuth, deps.requirePermission('Update_Users')],
    metadata: { summary: 'Deactivate user', tags: ['users'] },
  });

  return router;
}
