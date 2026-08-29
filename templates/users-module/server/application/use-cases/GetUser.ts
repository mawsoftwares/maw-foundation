import type { IUsersRepository } from '../../infrastructure/repositories/UserRepository';
import type { UserResponseDto } from '../dto';
import { toUserResponseDto } from './index';

export class GetUserUseCase {
  constructor(private readonly userRepository: IUsersRepository) {}

  async execute(id: string, tenantId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id, tenantId);
    if (user === null) throw new Error('USER_NOT_FOUND');
    return toUserResponseDto(user);
  }
}
