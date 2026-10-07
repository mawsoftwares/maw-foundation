import { createApiRouter } from '@mawsoftwares/server-express';
import type { RequestHandler } from 'express';
import { ok } from '@mawsoftwares/api';
import { actorOf, createUserHierarchyGuards, type RoleSource } from './role-hierarchy-guard';
import {
  UsersController,
  CreateUserUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  ActivateUserUseCase,
  DeactivateUserUseCase,
  AdminResetPasswordUseCase,
  type HashPasswordFn,
} from './modules/users';
import type { IUsersRepository, ListUsersQueryDto } from './modules/users';

export function createUsersRouter(
  repo: IUsersRepository,
  deps: {
    requireAuth: RequestHandler;
    requirePermission: (perm: string) => RequestHandler;
    hashPassword: HashPasswordFn;
    /** Roles with their hierarchy level — drives who may see / manage whom. */
    roleSource: RoleSource;
  },
) {
  const createUc = new CreateUserUseCase(repo);
  const getUc = new GetUserUseCase(repo);
  const listUc = new ListUsersUseCase(repo);
  const updateUc = new UpdateUserUseCase(repo);
  const deleteUc = new DeleteUserUseCase(repo);
  const activateUc = new ActivateUserUseCase(repo);
  const deactivateUc = new DeactivateUserUseCase(repo);
  const resetPasswordUc = new AdminResetPasswordUseCase(repo, deps.hashPassword);

  const controller = new UsersController(
    createUc, getUc, listUc, updateUc, deleteUc,
    activateUc, deactivateUc, resetPasswordUc,
  );

  const { guardTarget, guardAssignedRole, visibleRoleCodes } = createUserHierarchyGuards(deps.roleSource, repo);

  const { router, get, post, patch, delete: destroy } = createApiRouter({
    version: 'v1',
    prefix: '/api/v1/users',
  });

  // Listing is scoped to users strictly below the caller's role (plus the caller). The scope is
  // computed here, server-side — it is never read from the query string.
  const scopedList: RequestHandler = async (req, res, next) => {
    try {
      const actor = actorOf(req);
      if (!actor) return void res.status(401).json({ error: 'Unauthenticated' });
      const q = (name: string): string | undefined => {
        const v = req.query[name];
        return Array.isArray(v) ? String(v[0]) : typeof v === 'string' ? v : undefined;
      };
      const page = q('page');
      const limit = q('limit');
      const result = await listUc.execute(actor.tenantId, {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        search: q('search'),
        status: q('status') as ListUsersQueryDto['status'],
        role: q('role'),
        createdFrom: q('createdFrom'),
        createdTo: q('createdTo'),
        sortBy: q('sortBy'),
        sortDir: q('sortDir') as 'asc' | 'desc' | undefined,
        visibleRoles: await visibleRoleCodes(actor.role),
        viewerId: actor.userId,
      });
      res.status(200).json(ok(result).body);
    } catch (err) {
      next(err);
    }
  };

  router.get('/', deps.requireAuth, deps.requirePermission('Read_Users'), scopedList);

  get('/:id', controller.getUser, {
    middleware: [deps.requireAuth, deps.requirePermission('Read_Users'), guardTarget],
    metadata: { summary: 'Get user by ID', tags: ['users'] },
  });

  post('/', controller.createUser, {
    middleware: [deps.requireAuth, deps.requirePermission('Create_Users'), guardAssignedRole],
    metadata: { summary: 'Create user', tags: ['users'] },
  });

  patch('/:id', controller.updateUser, {
    middleware: [deps.requireAuth, deps.requirePermission('Update_Users'), guardTarget, guardAssignedRole],
    metadata: { summary: 'Update user', tags: ['users'] },
  });

  destroy('/:id', controller.deleteUser, {
    middleware: [deps.requireAuth, deps.requirePermission('Delete_Users'), guardTarget],
    metadata: { summary: 'Delete user', tags: ['users'] },
  });

  post('/:id/activate', controller.activateUser, {
    middleware: [deps.requireAuth, deps.requirePermission('Update_Users'), guardTarget],
    metadata: { summary: 'Activate user', tags: ['users'] },
  });

  post('/:id/deactivate', controller.deactivateUser, {
    middleware: [deps.requireAuth, deps.requirePermission('Update_Users'), guardTarget],
    metadata: { summary: 'Deactivate user', tags: ['users'] },
  });

  post('/:id/reset-password', controller.resetPassword, {
    middleware: [deps.requireAuth, deps.requirePermission('Update_Users'), guardTarget],
    metadata: { summary: 'Admin-set a user\'s password directly', tags: ['users'] },
  });

  return router;
}
