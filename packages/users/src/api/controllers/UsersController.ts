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
  ChangePasswordUseCase,
  ResetPasswordUseCase,
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
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
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

  readonly changePassword: Controller = async ({ params, body, context }) => {
    const tenantId = requireTenant(context.tenantId);
    const payload = body as { newPassword?: string };
    await this.changePasswordUseCase.execute(
      tenantId,
      paramId(params),
      payload.newPassword,
      context.userId,
    );
    return ok({ success: true });
  };

  readonly resetPassword: Controller = async ({ body, context }) => {
    const tenantId = requireTenant(context.tenantId);
    const payload = body as { email?: string; newPassword?: string };
    await this.resetPasswordUseCase.execute(
      tenantId,
      payload.email ?? '',
      payload.newPassword,
      context.userId,
    );
    return ok({ success: true });
  };
}
