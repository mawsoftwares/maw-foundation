import type { IEntityRepository } from '../../infrastructure/repositories/Repository';
import type { ListEntitiesQueryDto, ListEntitiesResponseDto } from '../dto';
import { toEntityResponseDto } from './index';

export class ListEntitiesUseCase {
  constructor(private readonly repository: IEntityRepository) {}

  async execute(tenantId: string, query: ListEntitiesQueryDto): Promise<ListEntitiesResponseDto> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.repository.search(tenantId, query, { limit, offset }),
      this.repository.count(tenantId, query),
    ]);

    return {
      items: items.map(toEntityResponseDto),
      total,
      page,
      pageSize: limit,
    };
  }
}
