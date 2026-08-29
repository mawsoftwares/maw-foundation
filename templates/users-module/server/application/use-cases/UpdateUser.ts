import type { IUsersRepository } from '../../infrastructure/repositories/UserRepository';
import type { UpdateUserDto, UserResponseDto } from '../dto';
import { toUserResponseDto } from './index';

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: IUsersRepository,
    private readonly auditService?: { log: (event: string, data: Record<string, unknown>) => void },
  ) {}

  async execute(id: string, tenantId: string, updates: UpdateUserDto, actorId?: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id, tenantId);
    if (user === null) throw new Error('USER_NOT_FOUND');

    const updated = await this.userRepository.updateUser(id, tenantId, { ...updates, updatedBy: actorId });
    if (updated === null) throw new Error('USER_NOT_FOUND');

    this.auditService?.log('USER_UPDATED', {
      actor: actorId, target: id,
      metadata: { fields: Object.keys(updates) },
    });

    return toUserResponseDto(updated);
  }
}
