import {
  CreateUserUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  ActivateUserUseCase,
  DeactivateUserUseCase,
  ChangePasswordUseCase,
  ResetPasswordUseCase
} from '../../application/use-cases';
import { CreateUserDto, UpdateUserDto, ListUsersQueryDto } from '../../application/dto';

export interface HttpRequest {
  body: unknown;
  query: unknown;
  params: unknown;
  headers: unknown;
  context: {
    tenantId: string;
    actorId?: string;
  };
}

export interface HttpResponse {
  status: number;
  body: unknown;
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

  private success(data: unknown, meta?: unknown): HttpResponse {
    return {
      status: 200,
      body: {
        success: true,
        data,
        message: null,
        meta: meta ?? {},
      },
    };
  }

  private created(data: unknown): HttpResponse {
    return {
      status: 201,
      body: {
        success: true,
        data,
        message: null,
        meta: {},
      },
    };
  }

  private error(err: unknown): HttpResponse {
    // Basic error mapping. In a real app this uses a centralized error handler.
    const message = err.message || 'Internal Server Error';
    let status = 500;
    
    if (message.includes('Validation') || message.includes('ALREADY_EXISTS')) status = 400;
    if (message.includes('NOT_FOUND')) status = 404;

    return {
      status,
      body: {
        success: false,
        data: null,
        message,
        meta: {},
      },
    };
  }

  async createUser(req: HttpRequest): Promise<HttpResponse> {
    try {
      const input: CreateUserDto = {
        ...req.body,
        tenantId: req.context.tenantId,
      };
      const result = await this.createUserUseCase.execute(input, req.context.actorId);
      return this.created(result);
    } catch (e) {
      return this.error(e);
    }
  }

  async getUser(req: HttpRequest): Promise<HttpResponse> {
    try {
      const result = await this.getUserUseCase.execute(req.params.id, req.context.tenantId);
      return this.success(result);
    } catch (e) {
      return this.error(e);
    }
  }

  async listUsers(req: HttpRequest): Promise<HttpResponse> {
    try {
      const query: ListUsersQueryDto = {
        page: req.query.page ? parseInt(req.query.page, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
        search: req.query.search,
        status: req.query.status,
        role: req.query.role,
        createdFrom: req.query.createdFrom,
        createdTo: req.query.createdTo,
      };
      const result = await this.listUsersUseCase.execute(req.context.tenantId, query);
      return this.success(result);
    } catch (e) {
      return this.error(e);
    }
  }

  async updateUser(req: HttpRequest): Promise<HttpResponse> {
    try {
      const input: UpdateUserDto = req.body;
      const result = await this.updateUserUseCase.execute(req.params.id, req.context.tenantId, input, req.context.actorId);
      return this.success(result);
    } catch (e) {
      return this.error(e);
    }
  }

  async deleteUser(req: HttpRequest): Promise<HttpResponse> {
    try {
      await this.deleteUserUseCase.execute(req.params.id, req.context.tenantId, req.context.actorId);
      return this.success({ success: true });
    } catch (e) {
      return this.error(e);
    }
  }

  async activateUser(req: HttpRequest): Promise<HttpResponse> {
    try {
      await this.activateUserUseCase.execute(req.params.id, req.context.tenantId, req.context.actorId);
      return this.success({ success: true });
    } catch (e) {
      return this.error(e);
    }
  }

  async deactivateUser(req: HttpRequest): Promise<HttpResponse> {
    try {
      await this.deactivateUserUseCase.execute(req.params.id, req.context.tenantId, req.context.actorId);
      return this.success({ success: true });
    } catch (e) {
      return this.error(e);
    }
  }

  async changePassword(req: HttpRequest): Promise<HttpResponse> {
    try {
      await this.changePasswordUseCase.execute(
        req.params.id,
        req.body.currentPassword,
        req.body.newPassword,
        req.context.actorId
      );
      return this.success({ success: true });
    } catch (e) {
      return this.error(e);
    }
  }

  async resetPassword(req: HttpRequest): Promise<HttpResponse> {
    try {
      await this.resetPasswordUseCase.execute(
        req.body.token,
        req.body.newPassword,
        req.context.actorId
      );
      return this.success({ success: true });
    } catch (e) {
      return this.error(e);
    }
  }
}
