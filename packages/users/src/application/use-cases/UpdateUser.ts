import type { IUsersRepository } from '../../infrastructure/repositories/UserRepository';
import { UpdateUserDto, UpdateUserSchema, UserResponseDto } from '../dto';
import { toUserResponseDto } from './CreateUser';
import { validateFields } from '@mawsoftwares/sdk/kernel/validate';
import { userEmailExists, userNotFound, userPhoneExists, userOperationFailed, userValidationFailed } from '../../errors';

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: IUsersRepository,
    private readonly auditService?: any,
    private readonly eventBus?: any,
  ) {}

  async execute(id: string, tenantId: string, input: UpdateUserDto, actorId?: string): Promise<UserResponseDto> {
    const errors = validateFields(input as unknown as Record<string, unknown>, UpdateUserSchema as never);
    if (errors.length > 0) {
      throw userValidationFailed(errors);
    }

    const user = await this.userRepository.findById(id, tenantId);
    if (!user || user.deletedAt) {
      throw userNotFound(id);
    }

    if (input.email && input.email !== user.email) {
      const emailExists = await this.userRepository.existsByEmail(tenantId, input.email);
      if (emailExists) {
        throw userEmailExists();
      }
    }

    if (input.phone && input.phone !== user.phone) {
      const phoneExists = await this.userRepository.existsByPhone(tenantId, input.phone);
      if (phoneExists) {
        throw userPhoneExists();
      }
    }

    const updatedUser = await this.userRepository.updateUser(id, tenantId, {
      ...input,
      updatedBy: actorId,
    });

    if (!updatedUser) {
      throw userOperationFailed('update');
    }

    const changes = Object.keys(input);

    if (this.eventBus) {
      this.eventBus.emit('UserUpdated', {
        type: 'USER_UPDATED',
        userId: id,
        tenantId,
        actorId,
        timestamp: new Date().toISOString(),
        changes,
      });
    }

    if (this.auditService) {
      this.auditService.log('USER_UPDATED', { actor: actorId, target: id, metadata: { changes } });
    }

    return toUserResponseDto(updatedUser);
  }
}
