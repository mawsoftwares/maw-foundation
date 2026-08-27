/**
 * @mawsoftwares/core — Framework-independent primitives.
 *
 * Re-exports the kernel (Result, errors, identifiers, money, dates, pagination)
 * and contracts (ports) from @mawsoftwares/sdk. New code should import from "@mawsoftwares/core".
 *
 * Config, modules, and feature-flags have been extracted to their own packages:
 *   @mawsoftwares/config, @mawsoftwares/modules, @mawsoftwares/feature-flags
 */

// Kernel
export {
  // Result
  ok, err, isOk, isErr,
  type Result, type Ok, type Err,
  // Money
  type Money,
  multiplyMoney, formatMoney,
  // Date/time
  formatDate,
  // String
  slugify, truncate, capitalize,
  // Number
  clamp, roundTo, percentage,
  // Validate
  required, minLength, maxLength, minValue, maxValue, pattern, numeric, alphanumeric, validateFields,
  type ValidationResult, type Validator, type FieldValidators, type FieldError,
  // Errors
  AppError, NotFoundError, ValidationError, UnauthorizedError, ForbiddenError, ConflictError,
  type ErrorCode,
  // Logger
  type Logger, LogLevel,
  // File
  removeExtension, getFilename, getDirectory, joinPath, normalizePath, getMimeType, isVideoFile, isAudioFile, parseFileSize, isAllowedExtension, sanitizeFilename,
  // Constants (pagination, HTTP status, entity status, sort, limits, duration)
  HttpStatus, type HttpStatusCode,
  Pagination, type PaginationParams, type PaginatedResult, paginate,
  EntityStatus, type EntityStatusValue,
  type SortDirection, type SortParams,
  Limits, Duration,
} from '@mawsoftwares/sdk';

// Import concrete functions from sdk to wrap/rename them for compatibility:
import {
  newId,
  email as sdkEmail,
  phone as sdkPhone,
  url as sdkUrl,
  isValid as sdkIsValid,
  getExtension as sdkGetExtension,
  isImageFile as sdkIsImageFile,
  formatFileSize as sdkFormatFileSize,
  diffDays as sdkDiffDays,
} from '@mawsoftwares/sdk';

export type ID = string;
export const generateId = (prefix?: string): string => newId(prefix);
export const generateShortId = (): string => newId();
export const isValidId = (id: string): boolean => typeof id === 'string' && id.length > 0;
export const isEmail = (val: string): boolean => sdkEmail(val).valid;
export const isPhone = (val: string): boolean => sdkPhone(val).valid;
export const isUrl = (val: string): boolean => sdkUrl(val).valid;
export const getFileExtension = (filename: string): string => sdkGetExtension(filename);
export const isImageFile = (filename: string): boolean => sdkIsImageFile(filename);
export const formatFileSize = (bytes: number, decimals?: number): string => sdkFormatFileSize(bytes, decimals);

export const parseDate = (date: string | Date): Date => {
  if (date instanceof Date) return date;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) throw new Error(`Invalid date: "${date}"`);
  return parsed;
};

export const isDateInRange = (date: Date, start: Date, end: Date): boolean => {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
};

export const daysBetween = (start: Date, end: Date): number => {
  return Math.abs(sdkDiffDays(start, end));
};

export const createMoney = (amount: number, _currency?: string): number => {
  return Math.round(amount * 100);
};

export const addMoney = (a: number, b: number): number => {
  return a + b;
};

export const subtractMoney = (a: number, b: number): number => {
  return a - b;
};

// Contracts (ports)
export type {
  IAuthorization,
  Permission,
  AuthzContext,
  PermissionGrant,
  RolePolicy,
  IHasher,
  ISecureStore,
  IAccountAuth,
  IFileStorage,
  IOfflineStorage,
  INetworkManager,
  ISyncEngine,
  IConflictResolver,
  IOfflineRepository,
  IEncryptionService,
  IRateLimiter,
  ISecretProvider,
  IUserRepository,
} from '@mawsoftwares/sdk';

// Identity / Session types
export {
  type Role,
  type Audience,
  type DeviceInfo,
  type Session,
  DEFAULT_TENANT_ID,
  type ITenantContext,
} from '@mawsoftwares/sdk';

// Security types
export {
  type SecurityConfig,
  type SecurityContext,
} from '@mawsoftwares/sdk';
