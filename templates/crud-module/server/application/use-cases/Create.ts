import { randomUUID } from 'crypto';
import type { IEntityRepository } from '../../infrastructure/repositories/Repository';
import type { CreateEntityDto, EntityResponseDto } from '../dto';
import { toEntityResponseDto } from './index';

/**
 * CRUD Module Template — CreateEntity use case.
 *
 * REPLACE: `Entity` → your domain noun; add domain-specific validation.
 * EXTEND:  Inject @mawsoftwares/audit, @mawsoftwares/queue, event bus as needed.
 */
export class CreateEntityUseCase {
  constructor(
    private readonly repository: IEntityRepository,
    private readonly auditService?: { log: (event: string, data: Record<string, unknown>) => void },
    private readonly eventBus?: { emit: (name: string, payload: Record<string, unknown>) => void },
  ) {}

  async execute(input: CreateEntityDto, actorId?: string): Promise<EntityResponseDto> {
    // ── Validation ────────────────────────────────────────────────────────
    if (!input.name?.trim()) {
      throw new Error('ENTITY_NAME_REQUIRED');
    }

    // ── Duplicate check (add more checks as needed) ───────────────────────
    const existing = await this.repository.findByName(input.tenantId, input.name.trim());
    if (existing !== null) {
      throw new Error('ENTITY_NAME_ALREADY_EXISTS');
    }

    // ── Persist ───────────────────────────────────────────────────────────
    const id = randomUUID();
    const entity = await this.repository.create({
      id,
      tenantId: input.tenantId,
      name: input.name.trim(),
      description: input.description,
      status: 'active',
      createdBy: actorId,
      deletedAt: null,
    });

    // ── Side-effects ──────────────────────────────────────────────────────
    this.auditService?.log('ENTITY_CREATED', {
      actor: actorId,
      target: entity.id,
      metadata: { name: entity.name },
    });

    this.eventBus?.emit('EntityCreated', {
      type: 'ENTITY_CREATED',
      entityId: entity.id,
      tenantId: entity.tenantId,
      actorId,
      timestamp: new Date().toISOString(),
    });

    return toEntityResponseDto(entity);
  }
}
