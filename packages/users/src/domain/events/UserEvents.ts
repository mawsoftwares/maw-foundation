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
  changes: string[]; // array of changed field names
}

export interface UserDeletedEvent {
  type: 'USER_DELETED';
  userId: string;
  tenantId: string;
  actorId?: string;
  timestamp: string;
}

export interface UserActivatedEvent {
  type: 'USER_ACTIVATED';
  userId: string;
  tenantId: string;
  actorId?: string;
  timestamp: string;
}

export interface UserDeactivatedEvent {
  type: 'USER_DEACTIVATED';
  userId: string;
  tenantId: string;
  actorId?: string;
  timestamp: string;
}

export interface PasswordChangedEvent {
  type: 'PASSWORD_CHANGED';
  userId: string;
  tenantId: string;
  actorId?: string;
  timestamp: string;
}

export interface PasswordResetEvent {
  type: 'PASSWORD_RESET';
  userId: string;
  tenantId: string;
  actorId?: string;
  timestamp: string;
}

export interface UserRoleAssignedEvent {
  type: 'USER_ROLE_ASSIGNED';
  userId: string;
  tenantId: string;
  roleId: string;
  actorId?: string;
  timestamp: string;
}

export interface UserRoleRemovedEvent {
  type: 'USER_ROLE_REMOVED';
  userId: string;
  tenantId: string;
  roleId: string;
  actorId?: string;
  timestamp: string;
}

export type UserEvent =
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserDeletedEvent
  | UserActivatedEvent
  | UserDeactivatedEvent
  | PasswordChangedEvent
  | PasswordResetEvent
  | UserRoleAssignedEvent
  | UserRoleRemovedEvent;
