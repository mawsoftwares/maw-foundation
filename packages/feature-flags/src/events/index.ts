export enum FeatureEvent {
  CREATED = 'feature.created',
  UPDATED = 'feature.updated',
  DELETED = 'feature.deleted',
  ENABLED = 'feature.enabled',
  DISABLED = 'feature.disabled',
  OVERRIDE_CREATED = 'feature.override.created',
  OVERRIDE_UPDATED = 'feature.override.updated',
  OVERRIDE_DELETED = 'feature.override.deleted',
  ROLLOUT_UPDATED = 'feature.rollout.updated',
}

export interface FeatureEventPayload {
  flagKey: string;
  timestamp: number;
  actorId?: string;
  tenantId?: string;
  reason?: string;
  oldValue?: unknown;
  newValue?: unknown;
}
