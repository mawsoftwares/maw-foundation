import type { IEntityRepository } from '../../infrastructure/repositories/Repository';

export class DeleteEntityUseCase {
  constructor(
    private readonly repository: IEntityRepository,
    private readonly auditService?: { log: (event: string, data: Record<string, unknown>) => void },
  ) {}

  async execute(id: string, tenantId: string, actorId?: string): Promise<void> {
    const entity = await this.repository.findById(id, tenantId);
    if (entity === null) throw new Error('ENTITY_NOT_FOUND');

    const deleted = await this.repository.softDelete(id, tenantId);
    if (!deleted) throw new Error('ENTITY_NOT_FOUND');

    this.auditService?.log('ENTITY_DELETED', { actor: actorId, target: id });
  }
}
