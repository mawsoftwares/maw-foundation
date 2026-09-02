import type { IUsersRepository } from '../../infrastructure/repositories/UserRepository';
import { userNotFound, userOperationFailed } from '../../errors';

export class DeleteUserUseCase {
  constructor(
    private readonly userRepository: IUsersRepository,
    private readonly auditService?: any,
    private readonly eventBus?: any,
  ) {}

  async execute(id: string, tenantId: string, actorId?: string): Promise<void> {
    const user = await this.userRepository.findById(id, tenantId);
    if (!user || user.deletedAt) {
      throw userNotFound(id);
    }

    // Protection logic for system users could go here.

    const success = await this.userRepository.softDelete(id, tenantId);
    if (!success) {
      throw userOperationFailed('delete');
    }

    if (this.eventBus) {
      this.eventBus.emit('UserDeleted', {
        type: 'USER_DELETED',
        userId: id,
        tenantId,
        actorId,
        timestamp: new Date().toISOString(),
      });
    }

    if (this.auditService) {
      this.auditService.log('USER_DELETED', { actor: actorId, target: id });
    }
  }
}
