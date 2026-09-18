import type { IUsersRepository } from '../../infrastructure/repositories/UserRepository';
import { ListUsersQueryDto, PaginatedUserResponse } from '../dto';
import { toUserResponseDto } from './CreateUser';
import { QueryBuilder } from '@mawsoftwares/database';

export class ListUsersUseCase {
  constructor(private readonly userRepository: IUsersRepository) {}

  async execute(tenantId: string, query: ListUsersQueryDto): Promise<PaginatedUserResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 && query.limit <= 100 ? query.limit : 20;
    
    // Pass the query directly to the repository so it can handle filtering, sorting, and pagination
    const result = await this.userRepository.searchUsers(tenantId, query);

    return {
      items: result.items.map(toUserResponseDto),
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    };
  }
}
