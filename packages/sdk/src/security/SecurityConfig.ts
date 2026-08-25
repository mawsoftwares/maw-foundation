import type { PasswordPolicyConfig } from './PasswordPolicy';
import { DEFAULT_PASSWORD_POLICY } from './PasswordPolicy';

export interface RateLimitTier {
  readonly windowMs: number;
  readonly maxRequests: number;
}

export interface SecurityHeadersConfig {
  readonly hsts: boolean;
  readonly hstsMaxAge: number;
  readonly noSniff: boolean;
  readonly frameOptions: 'DENY' | 'SAMEORIGIN' | false;
  readonly referrerPolicy: string;
  readonly csp?: string;
  readonly permissionsPolicy?: string;
}

export interface CorsConfig {
  readonly allowedOrigins: readonly string[];
  readonly allowedMethods: readonly string[];
  readonly allowedHeaders: readonly string[];
  readonly exposedHeaders: readonly string[];
  readonly credentials: boolean;
  readonly maxAge: number;
}

export interface CsrfConfig {
  readonly enabled: boolean;
  readonly cookieName: string;
  readonly headerName: string;
}

export interface AuthSecurityConfig {
  readonly accessTtlSeconds: number;
  readonly refreshTtlDays: number;
  readonly issueJti: boolean;
  readonly audiences?: readonly string[];
}

export interface ValidationConfig {
  readonly sanitizeInput: boolean;
  readonly maxBodySizeBytes: number;
}

export interface AuditSecurityConfig {
  readonly enabled: boolean;
  readonly ignorePaths: readonly string[];
}

export interface LoginProtectionConfig {
  readonly maxAttempts: number;
  readonly lockoutDurationMs: number;
  readonly progressiveDelay: boolean;
}

export interface SessionConfig {
  readonly maxConcurrentSessions: number;
  readonly sessionTtlSeconds: number;
  readonly rememberMeTtlSeconds: number;
}

export interface OtpConfig {
  readonly issuer: string;
  readonly digits: number;
  readonly stepSeconds: number;
  readonly window: number;
}

export interface RegistrationConfig {
  readonly requireEmailVerification: boolean;
  readonly emailVerificationTtlSeconds: number;
  readonly defaultRole: string;
}

export interface PasswordResetConfig {
  readonly ttlSeconds: number;
  readonly maxAttempts: number;
}

export interface SecurityConfig {
  readonly auth: AuthSecurityConfig;
  readonly passwordPolicy: PasswordPolicyConfig;
  readonly loginProtection: LoginProtectionConfig;
  readonly session: SessionConfig;
  readonly otp: OtpConfig;
  readonly registration: RegistrationConfig;
  readonly passwordReset: PasswordResetConfig;
  readonly rateLimit: {
    readonly login: RateLimitTier;
    readonly api: RateLimitTier;
    readonly global: RateLimitTier;
  };
  readonly cors: CorsConfig;
  readonly csrf: CsrfConfig;
  readonly headers: SecurityHeadersConfig;
  readonly validation: ValidationConfig;
  readonly audit: AuditSecurityConfig;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  auth: {
    accessTtlSeconds: 900, // 15 minutes
    refreshTtlDays: 7,
    issueJti: true,
  },
  passwordPolicy: DEFAULT_PASSWORD_POLICY,
  loginProtection: {
    maxAttempts: 5,
    lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
    progressiveDelay: true,
  },
  session: {
    maxConcurrentSessions: 5,
    sessionTtlSeconds: 24 * 60 * 60, // 1 day
    rememberMeTtlSeconds: 30 * 24 * 60 * 60, // 30 days
  },
  otp: {
    issuer: 'MAW',
    digits: 6,
    stepSeconds: 30,
    window: 1,
  },
  registration: {
    requireEmailVerification: true,
    emailVerificationTtlSeconds: 24 * 60 * 60, // 24 hours
    defaultRole: 'viewer',
  },
  passwordReset: {
    ttlSeconds: 60 * 60, // 1 hour
    maxAttempts: 3,
  },
  rateLimit: {
    login: { windowMs: 60_000, maxRequests: 5 },
    api: { windowMs: 60_000, maxRequests: 100 },
    global: { windowMs: 60_000, maxRequests: 300 },
  },
  cors: {
    allowedOrigins: [],
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-request-id'],
    exposedHeaders: ['x-request-id'],
    credentials: true,
    maxAge: 86400,
  },
  csrf: {
    enabled: true,
    cookieName: 'maw_csrf',
    headerName: 'x-csrf-token',
  },
  headers: {
    hsts: true,
    hstsMaxAge: 31536000,
    noSniff: true,
    frameOptions: 'DENY',
    referrerPolicy: 'strict-origin-when-cross-origin',
  },
  validation: {
    sanitizeInput: true,
    maxBodySizeBytes: 1_048_576, // 1 MB
  },
  audit: {
    enabled: true,
    ignorePaths: ['/health', '/ready'],
  },
};
