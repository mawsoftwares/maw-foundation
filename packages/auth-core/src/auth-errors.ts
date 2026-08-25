import { AppError, ErrorCode, type ErrorCodeValue } from '@maw/sdk';

export class AuthError extends AppError {
  constructor(code: ErrorCodeValue, message: string, status = 401) {
    super(code, message, status);
    this.name = 'AuthError';
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor(message = 'Invalid credentials') {
    super(ErrorCode.INVALID_CREDENTIALS, message);
  }
}

export class AccountLockedError extends AuthError {
  constructor(readonly retryAfterMs?: number) {
    super(ErrorCode.ACCOUNT_LOCKED, 'Account temporarily locked', 423);
  }
}

export class AccountDisabledError extends AuthError {
  constructor(message = 'Account is disabled') {
    super(ErrorCode.ACCOUNT_DISABLED, message, 403);
  }
}

export class AccountPendingVerificationError extends AuthError {
  constructor() {
    super(ErrorCode.ACCOUNT_PENDING_VERIFICATION, 'Email verification required', 403);
  }
}

export class TokenExpiredError extends AuthError {
  constructor(message = 'Token has expired') {
    super(ErrorCode.TOKEN_EXPIRED, message, 400);
  }
}

export class TokenAlreadyUsedError extends AuthError {
  constructor() {
    super(ErrorCode.TOKEN_ALREADY_USED, 'Token has already been used', 400);
  }
}

export class PasswordPolicyError extends AuthError {
  constructor(readonly violations: readonly string[]) {
    super(ErrorCode.PASSWORD_POLICY_VIOLATION, 'Password does not meet policy requirements', 400);
  }
}

export class DuplicateEmailError extends AuthError {
  constructor() {
    super(ErrorCode.DUPLICATE_EMAIL, 'An account with this email already exists', 409);
  }
}

export class MfaRequiredError extends AuthError {
  constructor(readonly mfaToken?: string) {
    super(ErrorCode.MFA_REQUIRED, 'Multi-factor authentication required', 401);
  }
}

export class InvalidOtpError extends AuthError {
  constructor() {
    super(ErrorCode.INVALID_OTP, 'Invalid verification code', 401);
  }
}
