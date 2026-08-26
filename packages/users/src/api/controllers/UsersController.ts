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

  private error(err: unknown, defaultStatus = 500): HttpResponse {
    const e = err as any;
    const message = e.message || 'Internal Server Error';
    let status = defaultStatus;
    
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
        ...(req.body as any),
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
      const p = req.params as any;
      const result = await this.getUserUseCase.execute(p.id, req.context.tenantId);
      return this.success(result);
    } catch (e) {
      return this.error(e);
    }
  }

  async listUsers(req: HttpRequest): Promise<HttpResponse> {
    try {
      const q = req.query as any;
      const query: ListUsersQueryDto = {
        page: q.page ? parseInt(q.page, 10) : undefined,
        limit: q.limit ? parseInt(q.limit, 10) : undefined,
        search: q.search,
        status: q.status,
        role: q.role,
        createdFrom: q.createdFrom,
        createdTo: q.createdTo,
      };
      const result = await this.listUsersUseCase.execute(req.context.tenantId, query);
      return this.success(result);
    } catch (e) {
      return this.error(e);
    }
  }

  async updateUser(req: HttpRequest): Promise<HttpResponse> {
    try {
      const p = req.params as any;
      const result = await this.updateUserUseCase.execute(
        p.id,
        req.context.tenantId,
        req.body as UpdateUserDto,
        req.context.actorId
      );
      return this.success(result);
    } catch (e) {
      return this.error(e);
    }
  }

  async deleteUser(req: HttpRequest): Promise<HttpResponse> {
    try {
      const p = req.params as any;
      await this.deleteUserUseCase.execute(p.id, req.context.tenantId, req.context.actorId);
      return this.success({ success: true });
    } catch (e) {
      return this.error(e);
    }
  }

  async activateUser(req: HttpRequest): Promise<HttpResponse> {
    try {
      const p = req.params as any;
      await this.activateUserUseCase.execute(p.id, req.context.tenantId, req.context.actorId);
      return this.success({ success: true });
    } catch (e) {
      return this.error(e);
    }
  }

  async deactivateUser(req: HttpRequest): Promise<HttpResponse> {
    try {
      const p = req.params as any;
      await this.deactivateUserUseCase.execute(p.id, req.context.tenantId, req.context.actorId);
      return this.success({ success: true });
    } catch (e) {
      return this.error(e);
    }
  }

  async changePassword(req: HttpRequest): Promise<HttpResponse> {
    try {
      const p = req.params as any;
      const b = req.body as any;
      await this.changePasswordUseCase.execute(
        p.id,
        b.currentPassword,
        b.newPassword,
        req.context.actorId
      );
      return this.success({ success: true });
    } catch (e) {
      return this.error(e);
    }
  }

  async resetPassword(req: HttpRequest): Promise<HttpResponse> {
    try {
      const b = req.body as any;
      await this.resetPasswordUseCase.execute(
        req.context.tenantId,
        b.email,
        b.newPassword,
        req.context.actorId
      );
      return this.success({ success: true });
    } catch (e) {
      return this.error(e);
    }
  }
}
