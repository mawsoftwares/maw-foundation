import type { Entity } from '../../domain/entities/Entity';
import type { EntityResponseDto } from '../dto';

export { CreateEntityUseCase } from './Create';
export { GetEntityUseCase } from './Get';
export { ListEntitiesUseCase } from './List';
export { UpdateEntityUseCase } from './Update';
export { DeleteEntityUseCase } from './Delete';

/** Maps a persisted Entity row to the API response DTO. */
export function toEntityResponseDto(entity: Entity): EntityResponseDto {
  return {
    id: entity.id,
    tenantId: entity.tenantId,
    name: entity.name,
    description: entity.description,
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
