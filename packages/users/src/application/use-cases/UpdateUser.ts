import type { IUsersRepository } from '../../infrastructure/repositories/UserRepository';
import { UpdateUserDto, UpdateUserSchema, UserResponseDto } from '../dto';
import { toUserResponseDto } from './CreateUser';
import { validateFields } from '@maw/sdk/kernel/validate';

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: IUsersRepository,
    private readonly auditService?: unknown,
    private readonly eventBus?: unknown,
  ) {}

  async execute(id: string, tenantId: string, input: UpdateUserDto, actorId?: string): Promise<UserResponseDto> {
    const errors = validateFields(input as unknown as Record<string, unknown>, UpdateUserSchema as unknown);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
    }

    const user = await this.userRepository.findById(id, tenantId);
    if (!user || user.deletedAt) {
      throw new Error('USER_NOT_FOUND');
    }

    if (input.email && input.email !== user.email) {
      const emailExists = await this.userRepository.existsByEmail(tenantId, input.email);
      if (emailExists) {
        throw new Error('USER_EMAIL_ALREADY_EXISTS');
      }
    }

    if (input.phone && input.phone !== user.phone) {
      const phoneExists = await this.userRepository.existsByPhone(tenantId, input.phone);
      if (phoneExists) {
        throw new Error('USER_PHONE_ALREADY_EXISTS');
      }
    }

    const updatedUser = await this.userRepository.updateUser(id, tenantId, {
      ...input,
      updatedBy: actorId,
    });

    if (!updatedUser) {
      throw new Error('USER_UPDATE_FAILED');
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
