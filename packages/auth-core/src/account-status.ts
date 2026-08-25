import { AccountStatus, type AccountStatusValue } from '@maw/sdk';
import { AppError, ErrorCode } from '@maw/sdk';

export const AccountEvent = {
  VERIFY_EMAIL: 'VERIFY_EMAIL',
  SUSPEND: 'SUSPEND',
  UNSUSPEND: 'UNSUSPEND',
  LOCK: 'LOCK',
  UNLOCK: 'UNLOCK',
  DISABLE: 'DISABLE',
} as const;

export type AccountEventValue = (typeof AccountEvent)[keyof typeof AccountEvent];

const VALID_TRANSITIONS: ReadonlyMap<AccountStatusValue, ReadonlyMap<AccountEventValue, AccountStatusValue>> = new Map([
  [AccountStatus.PENDING_VERIFICATION, new Map<AccountEventValue, AccountStatusValue>([
    [AccountEvent.VERIFY_EMAIL, AccountStatus.ACTIVE],
    [AccountEvent.DISABLE, AccountStatus.DISABLED],
  ])],
  [AccountStatus.ACTIVE, new Map<AccountEventValue, AccountStatusValue>([
    [AccountEvent.SUSPEND, AccountStatus.SUSPENDED],
    [AccountEvent.LOCK, AccountStatus.LOCKED],
    [AccountEvent.DISABLE, AccountStatus.DISABLED],
  ])],
  [AccountStatus.SUSPENDED, new Map<AccountEventValue, AccountStatusValue>([
    [AccountEvent.UNSUSPEND, AccountStatus.ACTIVE],
    [AccountEvent.DISABLE, AccountStatus.DISABLED],
  ])],
  [AccountStatus.LOCKED, new Map<AccountEventValue, AccountStatusValue>([
    [AccountEvent.UNLOCK, AccountStatus.ACTIVE],
    [AccountEvent.DISABLE, AccountStatus.DISABLED],
  ])],
  [AccountStatus.DISABLED, new Map<AccountEventValue, AccountStatusValue>([])],
]);

export function transitionAccount(current: AccountStatusValue, event: AccountEventValue): AccountStatusValue {
  const transitions = VALID_TRANSITIONS.get(current);
  const next = transitions?.get(event);
  if (next === undefined) {
    throw new AppError(
      ErrorCode.OPERATION_NOT_ALLOWED,
      `Cannot apply "${event}" to account in "${current}" state`,
      400,
    );
  }
  return next;
}

export function canApplyEvent(current: AccountStatusValue, event: AccountEventValue): boolean {
  return VALID_TRANSITIONS.get(current)?.has(event) === true;
}
