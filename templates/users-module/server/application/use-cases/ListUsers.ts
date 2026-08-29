import type { IUsersRepository } from '../../infrastructure/repositories/UserRepository';
import type { ListUsersQueryDto, ListUsersResponseDto } from '../dto';
import { toUserResponseDto } from './index';

export class ListUsersUseCase {
  constructor(private readonly userRepository: IUsersRepository) {}

  async execute(tenantId: string, query: ListUsersQueryDto): Promise<ListUsersResponseDto> {
    const page  = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const users = await this.userRepository.searchUsers(tenantId, query, { limit, offset });
    const total = await this.userRepository.count(tenantId, query);

    return {
      items: users.map(toUserResponseDto),
      total,
      page,
      pageSize: limit,
    };
  }
}
