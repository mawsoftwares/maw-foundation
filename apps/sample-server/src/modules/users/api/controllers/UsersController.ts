import type { Controller } from '@mawsoftwares/api';
import { created, ok } from '@mawsoftwares/api';
import { UnauthorizedError } from '@mawsoftwares/sdk/kernel/errors';
import {
  CreateUserUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  ActivateUserUseCase,
  DeactivateUserUseCase,
  AdminResetPasswordUseCase,
} from '../../application/use-cases';
import type { CreateUserDto, UpdateUserDto, ListUsersQueryDto } from '../../application/dto';

function requireTenant(tenantId: string | undefined): string {
  if (tenantId === undefined || tenantId.length === 0) {
    throw new UnauthorizedError('Tenant context required');
  }
  return tenantId;
}

function firstQuery(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function paramId(params: Record<string, string>): string {
  return params['id'] ?? '';
}

export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly activateUserUseCase: ActivateUserUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
    private readonly resetPasswordUseCase: AdminResetPasswordUseCase,
  ) {}

  readonly createUser: Controller = async ({ body, context }) => {
    const tenantId = requireTenant(context.tenantId);
    const result = await this.createUserUseCase.execute(
      { ...(body as CreateUserDto), tenantId },
      context.userId,
    );
    return created(result);
  };

  readonly getUser: Controller = async ({ params, context }) => {
    const tenantId = requireTenant(context.tenantId);
    const result = await this.getUserUseCase.execute(paramId(params), tenantId);
    return ok(result);
  };

  readonly listUsers: Controller = async ({ query, context }) => {
    const tenantId = requireTenant(context.tenantId);
    const page = firstQuery(query['page']);
    const limit = firstQuery(query['limit']);
    const result = await this.listUsersUseCase.execute(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search: firstQuery(query['search']),
      status: firstQuery(query['status']) as ListUsersQueryDto['status'],
      role: firstQuery(query['role']),
      createdFrom: firstQuery(query['createdFrom']),
      createdTo: firstQuery(query['createdTo']),
    });
    return ok(result);
  };

  readonly updateUser: Controller = async ({ params, body, context }) => {
    const tenantId = requireTenant(context.tenantId);
    const result = await this.updateUserUseCase.execute(
      paramId(params),
      tenantId,
      body as UpdateUserDto,
      context.userId,
    );
    return ok(result);
  };

  readonly deleteUser: Controller = async ({ params, context }) => {
    const tenantId = requireTenant(context.tenantId);
    await this.deleteUserUseCase.execute(paramId(params), tenantId, context.userId);
    return ok({ deleted: true });
  };

  readonly activateUser: Controller = async ({ params, context }) => {
    const tenantId = requireTenant(context.tenantId);
    await this.activateUserUseCase.execute(paramId(params), tenantId, context.userId);
    return ok({ success: true });
  };

  readonly deactivateUser: Controller = async ({ params, context }) => {
    const tenantId = requireTenant(context.tenantId);
    await this.deactivateUserUseCase.execute(paramId(params), tenantId, context.userId);
    return ok({ success: true });
  };

  readonly resetPassword: Controller = async ({ params, body, context }) => {
    const tenantId = requireTenant(context.tenantId);
    const payload = body as { newPassword?: string };
    if (!payload.newPassword) {
      throw new Error('newPassword is required');
    }
    await this.resetPasswordUseCase.execute(tenantId, paramId(params), payload.newPassword);
    return ok({ success: true });
  };
}
