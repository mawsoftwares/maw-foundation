import type { IEntityRepository } from '../../infrastructure/repositories/Repository';
import type { EntityResponseDto } from '../dto';
import { toEntityResponseDto } from './index';

export class GetEntityUseCase {
  constructor(private readonly repository: IEntityRepository) {}

  async execute(id: string, tenantId: string): Promise<EntityResponseDto> {
    const entity = await this.repository.findById(id, tenantId);
    if (entity === null) throw new Error('ENTITY_NOT_FOUND');
    return toEntityResponseDto(entity);
  }
}
