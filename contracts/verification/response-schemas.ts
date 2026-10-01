/**
 * Canonical response schemas derived from contracts/openapi/*.yaml.
 * Used by the conformance test runner to validate both Node.js and PHP responses.
 *
 * Each schema defines required/optional fields and their types.
 * The test runner validates actual HTTP responses against these schemas.
 */

// --- Field type validators ---

type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';

interface FieldSchema {
  type: FieldType | FieldType[];
  required?: boolean;
  items?: FieldSchema;
  properties?: Record<string, FieldSchema>;
  enum?: readonly string[];
}

type ResponseSchema = Record<string, FieldSchema>;

// --- Auth response schemas (flat style: {error, code}) ---

export const LoginSuccessResponse: ResponseSchema = {
  accessToken: { type: 'string', required: true },
  refreshToken: { type: 'string', required: true },
  expiresIn: { type: 'number', required: true },
};

export const MfaChallengeResponse: ResponseSchema = {
  requiresMfa: { type: 'boolean', required: true },
  challengeToken: { type: 'string', required: true },
  userId: { type: 'string', required: true },
};

export const RegisterResponse: ResponseSchema = {
  userId: { type: 'string', required: true },
  emailVerificationRequired: { type: 'boolean', required: true },
};

export const FlatErrorResponse: ResponseSchema = {
  error: { type: 'string', required: true },
  code: { type: 'string', required: false },
  violations: { type: 'array', required: false },
  retryAfterMs: { type: 'number', required: false },
};

export const SessionListResponse: ResponseSchema = {
  sessions: {
    type: 'array',
    required: true,
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },
        ipAddress: { type: 'string', required: true },
        userAgent: { type: 'string', required: true },
        createdAt: { type: 'string', required: true },
        lastUsedAt: { type: 'string', required: true },
      },
    },
  },
};

export const UserProfileResponse: ResponseSchema = {
  id: { type: 'string', required: true },
  email: { type: 'string', required: true },
  firstName: { type: 'string', required: true },
  lastName: { type: 'string', required: true },
  role: { type: 'string', required: true },
  accountStatus: { type: 'string', required: true },
  emailVerified: { type: 'boolean', required: true },
  mfaEnabled: { type: 'boolean', required: true },
};

// --- User response schemas (envelope style: {success, data, meta}) ---

export const UserListResponse: ResponseSchema = {
  success: { type: 'boolean', required: true },
  data: { type: 'array', required: true },
  meta: {
    type: 'object',
    required: true,
    properties: {
      page: { type: 'number', required: true },
      limit: { type: 'number', required: true },
      total: { type: 'number', required: true },
      totalPages: { type: 'number', required: true },
    },
  },
};

export const UserDetailResponse: ResponseSchema = {
  success: { type: 'boolean', required: true },
  data: {
    type: 'object',
    required: true,
    properties: UserProfileResponse,
  },
};

// --- RBAC response schemas (data wrapper style: {data: [...]}) ---

export const RoleListResponse: ResponseSchema = {
  data: {
    type: 'array',
    required: true,
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        slug: { type: 'string', required: true },
        description: { type: ['string', 'null'] },
        isSystem: { type: 'boolean', required: true },
        permissions: { type: 'array', required: true },
      },
    },
  },
};

export const ModuleTreeResponse: ResponseSchema = {
  data: {
    type: 'array',
    required: true,
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        slug: { type: 'string', required: true },
        parentId: { type: ['string', 'null'] },
        sortOrder: { type: 'number', required: true },
        isActive: { type: 'boolean', required: true },
        children: { type: 'array', required: true },
      },
    },
  },
};

// --- Health ---

export const HealthResponse: ResponseSchema = {
  status: { type: 'string', required: true },
  service: { type: 'string', required: true },
  timestamp: { type: 'string', required: true },
};

// --- Sensitive field blocklist ---

export const SENSITIVE_FIELDS = [
  'passwordHash',
  'password_hash',
  'mfaSecret',
  'mfa_secret',
  'mfaRecoveryCodes',
  'mfa_recovery_codes',
  'verificationToken',
  'verification_token',
  'passwordResetToken',
  'password_reset_token',
] as const;

// --- Error code enum (must match contracts/errors/error-codes.json) ---

export const ERROR_CODES = [
  'UNAUTHORIZED',
  'TOKEN_EXPIRED',
  'INVALID_CREDENTIALS',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'OPERATION_NOT_ALLOWED',
  'FEATURE_DISABLED',
  'ACCOUNT_DISABLED',
  'NOT_FOUND',
  'CONFLICT',
  'ALREADY_EXISTS',
  'DUPLICATE_EMAIL',
  'VALIDATION_FAILED',
  'INVALID_INPUT',
  'MISSING_FIELD',
  'RATE_LIMITED',
  'LIMIT_EXCEEDED',
  'ACCOUNT_LOCKED',
  'INTERNAL',
  'MFA_REQUIRED',
  'INVALID_OTP',
  'PASSWORD_POLICY',
  'ACCOUNT_PENDING_VERIFICATION',
] as const;
