import { ReportStatus, type ReportStatusValue } from './types';
import { ReportStateTransitionError } from './errors';

const VALID_TRANSITIONS: Record<string, readonly string[]> = {
  [ReportStatus.PENDING]: [ReportStatus.VALIDATING, ReportStatus.CANCELLED],
  [ReportStatus.VALIDATING]: [ReportStatus.QUEUED, ReportStatus.PROCESSING, ReportStatus.FAILED],
  [ReportStatus.QUEUED]: [ReportStatus.PROCESSING, ReportStatus.CANCELLED],
  [ReportStatus.PROCESSING]: [ReportStatus.COMPLETED, ReportStatus.FAILED, ReportStatus.CANCELLED],
  [ReportStatus.COMPLETED]: [],
  [ReportStatus.FAILED]: [],
  [ReportStatus.CANCELLED]: [],
};

export function validateTransition(from: ReportStatusValue, to: ReportStatusValue): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new ReportStateTransitionError(from, to);
  }
}

export function canTransition(from: ReportStatusValue, to: ReportStatusValue): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}
