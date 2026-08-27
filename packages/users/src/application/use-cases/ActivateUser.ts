import type { IUsersRepository } from '../../infrastructure/repositories/UserRepository';
import { AccountStatus } from '@mawsoftwares/sdk/security/AccountStatus';

export class ActivateUserUseCase {
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

    if (user.status === AccountStatus.ACTIVE) {
      return; // Idempotent
    }

    await this.userRepository.updateUser(id, tenantId, {
      status: AccountStatus.ACTIVE,
      updatedBy: actorId,
    });

    if (this.eventBus) {
      this.eventBus.emit('UserActivated', {
        type: 'USER_ACTIVATED',
        userId: id,
        tenantId,
        actorId,
        timestamp: new Date().toISOString(),
      });
    }

    if (this.auditService) {
      this.auditService.log('USER_ACTIVATED', { actor: actorId, target: id });
    }
  }
}

export class DeactivateUserUseCase {
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

    if (user.status === AccountStatus.DISABLED) {
      return; // Idempotent
    }

    await this.userRepository.updateUser(id, tenantId, {
      status: AccountStatus.DISABLED,
      updatedBy: actorId,
    });

    if (this.eventBus) {
      this.eventBus.emit('UserDeactivated', {
        type: 'USER_DEACTIVATED',
        userId: id,
        tenantId,
        actorId,
        timestamp: new Date().toISOString(),
      });
    }

    if (this.auditService) {
      this.auditService.log('USER_DEACTIVATED', { actor: actorId, target: id });
    }
  }
}
