import { ImportStatus, type ImportStatusValue } from '../types';
import { InvalidStateTransitionError } from '../errors';

const VALID_TRANSITIONS: Record<string, readonly string[]> = {
  [ImportStatus.UPLOADED]: [ImportStatus.PARSING, ImportStatus.CANCELLED],
  [ImportStatus.PARSING]: [ImportStatus.PREVIEW_READY, ImportStatus.FAILED, ImportStatus.CANCELLED],
  [ImportStatus.PREVIEW_READY]: [ImportStatus.PROCESSING, ImportStatus.CANCELLED],
  [ImportStatus.PROCESSING]: [
    ImportStatus.COMPLETED,
    ImportStatus.COMPLETED_WITH_ERRORS,
    ImportStatus.FAILED,
    ImportStatus.CANCELLED,
  ],
  [ImportStatus.COMPLETED]: [],
  [ImportStatus.COMPLETED_WITH_ERRORS]: [],
  [ImportStatus.FAILED]: [],
  [ImportStatus.CANCELLED]: [],
};

export function validateTransition(from: ImportStatusValue, to: ImportStatusValue): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}

export function canTransition(from: ImportStatusValue, to: ImportStatusValue): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}
