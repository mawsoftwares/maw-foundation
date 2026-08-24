import { AppError, ErrorCode } from '../kernel/errors';

export class QueueError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.INTERNAL, message, 500, details);
    this.name = 'QueueError';
  }
}

export class JobError extends AppError {
  readonly jobId?: string;
  readonly jobType?: string;

  constructor(message: string, jobId?: string, jobType?: string, details?: Record<string, unknown>) {
    super(ErrorCode.INTERNAL, message, 500, { ...details, jobId, jobType });
    this.name = 'JobError';
    this.jobId = jobId;
    this.jobType = jobType;
  }
}

export class RetryableJobError extends AppError {
  readonly jobId?: string;

  constructor(message: string, jobId?: string) {
    super(ErrorCode.SERVICE_UNAVAILABLE, message, 503, { jobId, retryable: true });
    this.name = 'RetryableJobError';
    this.jobId = jobId;
  }
}

export class PermanentJobError extends AppError {
  readonly jobId?: string;

  constructor(message: string, jobId?: string) {
    super(ErrorCode.INTERNAL, message, 500, { jobId, retryable: false });
    this.name = 'PermanentJobError';
    this.jobId = jobId;
  }
}
