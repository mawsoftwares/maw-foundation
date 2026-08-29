export interface UserCreatedEvent {
  type: 'USER_CREATED';
  userId: string;
  tenantId: string;
  actorId?: string;
  timestamp: string;
}

export interface UserUpdatedEvent {
  type: 'USER_UPDATED';
  userId: string;
  tenantId: string;
  actorId?: string;
  timestamp: string;
}

export interface UserDeletedEvent {
  type: 'USER_DELETED';
  userId: string;
  tenantId: string;
  actorId?: string;
  timestamp: string;
}

export interface UserStatusChangedEvent {
  type: 'USER_STATUS_CHANGED';
  userId: string;
  tenantId: string;
  newStatus: string;
  actorId?: string;
  timestamp: string;
}

export type UserEvent =
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserDeletedEvent
  | UserStatusChangedEvent;
