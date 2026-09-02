import type { IUsersRepository } from '../../infrastructure/repositories/UserRepository';
import { UserResponseDto } from '../dto';
import { toUserResponseDto } from './CreateUser';
import { userNotFound } from '../../errors';

export class GetUserUseCase {
  constructor(private readonly userRepository: IUsersRepository) {}

  async execute(id: string, tenantId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id, tenantId);
    if (!user || user.deletedAt) {
      throw userNotFound(id);
    }

    return toUserResponseDto(user);
  }
}
