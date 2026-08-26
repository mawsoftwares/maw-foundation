import type { IUsersRepository } from '../../infrastructure/repositories/UserRepository';

export class DeleteUserUseCase {
  constructor(
    private readonly userRepository: IUsersRepository,
    private readonly auditService?: any,
    private readonly eventBus?: any,
  ) {}

  async execute(id: string, tenantId: string, actorId?: string): Promise<void> {
    const user = await this.userRepository.findById(id, tenantId);
    if (!user || user.deletedAt) {
      throw new Error('USER_NOT_FOUND');
    }

    // Protection logic for system users could go here.
    // e.g., if (user.isSystemAdmin) throw new Error('USER_CANNOT_BE_DELETED');

    const success = await this.userRepository.softDelete(id, tenantId);
    if (!success) {
      throw new Error('USER_DELETE_FAILED');
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
