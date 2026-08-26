import type { IUsersRepository } from '../../infrastructure/repositories/UserRepository';
import { UserResponseDto } from '../dto';
import { toUserResponseDto } from './CreateUser';

export class GetUserUseCase {
  constructor(private readonly userRepository: IUsersRepository) {}

  async execute(id: string, tenantId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id, tenantId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }
    
    // Default: don't return soft-deleted users
    if (user.deletedAt) {
      throw new Error('USER_NOT_FOUND');
    }

    return toUserResponseDto(user);
  }
}
