export const AccountStatus = {
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  LOCKED: 'LOCKED',
  DISABLED: 'DISABLED',
} as const;

export type AccountStatusValue = (typeof AccountStatus)[keyof typeof AccountStatus];

export function isActiveAccount(status: AccountStatusValue): boolean {
  return status === AccountStatus.ACTIVE;
}

export function canAuthenticate(status: AccountStatusValue): boolean {
  return status === AccountStatus.ACTIVE;
}
