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
  // Storage: provider secrets and internal object keys must never appear in a response
  'secretAccessKey',
  'accessKeyId',
  'encryptedCredentials',
  'encrypted_credentials',
  'objectKey',
  'object_key',
] as const;

// --- Storage response schemas (envelope style: {success, data, meta?}) — see contracts/openapi/storage.yaml ---

export const STORAGE_FILE_STATUSES = ['pending', 'uploading', 'uploaded', 'failed', 'deleted'] as const;

export const StorageFileSchema: ResponseSchema = {
  id: { type: 'string', required: true },
  name: { type: 'string', required: true },
  mimeType: { type: 'string', required: true },
  size: { type: 'number', required: true },
  folderId: { type: ['string', 'null'], required: true },
  status: { type: 'string', required: true, enum: STORAGE_FILE_STATUSES },
  createdAt: { type: 'string', required: true },
  updatedAt: { type: 'string', required: true },
};

export const StorageFolderSchema: ResponseSchema = {
  id: { type: 'string', required: true },
  parentId: { type: ['string', 'null'], required: true },
  name: { type: 'string', required: true },
  path: { type: 'string', required: true },
  storageConfigId: { type: 'string', required: true },
  createdAt: { type: 'string', required: true },
  updatedAt: { type: 'string', required: true },
};

export const StorageConfigurationSchema: ResponseSchema = {
  id: { type: 'string', required: true },
  provider: { type: 'string', required: true },
  name: { type: 'string', required: true },
  bucket: { type: ['string', 'null'], required: true },
  region: { type: ['string', 'null'], required: true },
  endpoint: { type: ['string', 'null'], required: true },
  basePath: { type: 'string', required: true },
  hasCredentials: { type: 'boolean', required: true },
  isDefault: { type: 'boolean', required: true },
  isActive: { type: 'boolean', required: true },
  createdAt: { type: 'string', required: true },
  updatedAt: { type: 'string', required: true },
};

const envelopeOf = (properties: ResponseSchema): ResponseSchema => ({
  success: { type: 'boolean', required: true },
  data: { type: 'object', required: true, properties },
});

const pageOf = (properties: ResponseSchema): ResponseSchema => ({
  success: { type: 'boolean', required: true },
  data: { type: 'array', required: true, items: { type: 'object', properties } },
  meta: {
    type: 'object',
    required: true,
    properties: {
      pagination: {
        type: 'object',
        required: true,
        properties: {
          page: { type: 'number', required: true },
          pageSize: { type: 'number', required: true },
          total: { type: 'number', required: true },
          totalPages: { type: 'number', required: true },
        },
      },
    },
  },
});

export const StorageFileResponse = envelopeOf(StorageFileSchema);
export const StorageFolderResponse = envelopeOf(StorageFolderSchema);
export const StorageConfigurationResponse = envelopeOf(StorageConfigurationSchema);
export const StorageFilePageResponse = pageOf(StorageFileSchema);
export const StorageFolderPageResponse = pageOf(StorageFolderSchema);

export const StorageUploadResponse = envelopeOf({
  fileId: { type: 'string', required: true },
  uploadUrl: { type: 'string', required: true },
  method: { type: 'string', required: true, enum: ['PUT'] },
  headers: { type: 'object', required: true },
  expiresIn: { type: 'number', required: true },
});

export const StorageDownloadUrlResponse = envelopeOf({
  url: { type: 'string', required: true },
  expiresIn: { type: 'number', required: true },
});

export const STORAGE_ERROR_REASONS = [
  'STORAGE_PROVIDER_NOT_FOUND',
  'STORAGE_CONFIGURATION_NOT_FOUND',
  'STORAGE_FOLDER_NOT_FOUND',
  'STORAGE_FILE_NOT_FOUND',
  'STORAGE_ACCESS_DENIED',
  'STORAGE_UPLOAD_FAILED',
  'STORAGE_UPLOAD_NOT_COMPLETED',
  'STORAGE_OBJECT_NOT_FOUND',
  'STORAGE_PROVIDER_ERROR',
  'STORAGE_INVALID_FILE',
  'STORAGE_INVALID_INPUT',
  'STORAGE_CONFLICT',
] as const;

export const StorageErrorResponse: ResponseSchema = {
  success: { type: 'boolean', required: true },
  error: {
    type: 'object',
    required: true,
    properties: {
      code: { type: 'string', required: true },
      message: { type: 'string', required: true },
      details: {
        type: 'object',
        properties: { reason: { type: 'string', enum: STORAGE_ERROR_REASONS } },
      },
    },
  },
};

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
  'SERVICE_UNAVAILABLE',
  'MFA_REQUIRED',
  'INVALID_OTP',
  'PASSWORD_POLICY',
  'ACCOUNT_PENDING_VERIFICATION',
] as const;
