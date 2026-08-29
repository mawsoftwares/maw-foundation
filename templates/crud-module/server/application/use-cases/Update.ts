import type { IEntityRepository } from '../../infrastructure/repositories/Repository';
import type { UpdateEntityDto, EntityResponseDto } from '../dto';
import { toEntityResponseDto } from './index';

export class UpdateEntityUseCase {
  constructor(
    private readonly repository: IEntityRepository,
    private readonly auditService?: { log: (event: string, data: Record<string, unknown>) => void },
  ) {}

  async execute(id: string, tenantId: string, updates: UpdateEntityDto, actorId?: string): Promise<EntityResponseDto> {
    const entity = await this.repository.findById(id, tenantId);
    if (entity === null) throw new Error('ENTITY_NOT_FOUND');

    const updated = await this.repository.update(id, tenantId, { ...updates, updatedBy: actorId });
    if (updated === null) throw new Error('ENTITY_NOT_FOUND');

    this.auditService?.log('ENTITY_UPDATED', {
      actor: actorId,
      target: id,
      metadata: { changes: Object.keys(updates) },
    });

    return toEntityResponseDto(updated);
  }
}
