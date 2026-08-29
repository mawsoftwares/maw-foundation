/**
 * CRUD Module Template — Domain Events
 *
 * REPLACE: Rename `Entity` to your domain noun.
 */

export interface EntityCreatedEvent {
  type: 'ENTITY_CREATED';
  entityId: string;
  tenantId: string;
  actorId?: string;
  timestamp: string;
}

export interface EntityUpdatedEvent {
  type: 'ENTITY_UPDATED';
  entityId: string;
  tenantId: string;
  actorId?: string;
  timestamp: string;
}

export interface EntityDeletedEvent {
  type: 'ENTITY_DELETED';
  entityId: string;
  tenantId: string;
  actorId?: string;
  timestamp: string;
}

export type EntityEvent = EntityCreatedEvent | EntityUpdatedEvent | EntityDeletedEvent;
