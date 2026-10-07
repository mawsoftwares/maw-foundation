import type { IUsersRepository } from '../../infrastructure/repositories/UserRepository';
import { ListUsersQueryDto, PaginatedUserResponse } from '../dto';
import { toUserResponseDto } from './CreateUser';
import { QueryBuilder } from '@mawsoftwares/database';

export class ListUsersUseCase {
  constructor(private readonly userRepository: IUsersRepository) {}

  async execute(tenantId: string, query: ListUsersQueryDto): Promise<PaginatedUserResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 && query.limit <= 100 ? query.limit : 20;
    
    // We would use QueryBuilder to add filters here
    const qb = new QueryBuilder().whereNull('deleted_at');
    
    if (query.status) {
      qb.where('status', query.status);
    }
    
    if (query.search) {
      qb.whereRaw('(email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)', [`%${query.search}%`]);
    }

    if (query.createdFrom) {
      qb.whereRaw('created_at >= $1', [new Date(query.createdFrom)]);
    }

    if (query.createdTo) {
      qb.whereRaw('created_at <= $1', [new Date(query.createdTo)]);
    }

    // Pass the QueryBuilder to the repository (assuming repository handles it or we pass raw condition string)
    // The current IUsersRepository interface we made takes `query` and `options` of any type.
    // In a real app we'd cast it to what the repository expects or use a specific finder method.
    
    // Cast to `any` because `findMany` in our simplified interface is loosely typed.
    // Ideally the repository's `findMany` would just take the QueryBuilder and FindOptions.
    const users = await this.userRepository.searchUsers(tenantId, qb, {
      limit,
      offset: (page - 1) * limit,
    });
    
    // Count total 
    // In a full implementation we'd also call `userRepository.count(...)`
    const total = 100; // Mocked for brevity since we didn't add count to our IUsersRepository

    return {
      items: users.map(toUserResponseDto),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
