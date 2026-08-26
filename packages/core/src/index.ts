/**
 * @maw/core — Framework-independent primitives.
 *
 * Re-exports the kernel (Result, errors, identifiers, money, dates, pagination)
 * and contracts (ports) from @maw/sdk. New code should import from "@maw/core".
 *
 * Config, modules, and feature-flags have been extracted to their own packages:
 *   @maw/config, @maw/modules, @maw/feature-flags
 */

// Kernel
export {
  // IDs
  generateId, generateShortId, isValidId,
  type IdGenerator,
  // Result
  ok, err, isOk, isErr,
  type Result, type Ok, type Err,
  // Money
  type Money, type CurrencyCode,
  createMoney, addMoney, subtractMoney, multiplyMoney, formatMoney, isZero, isPositive,
  // Date/time
  type DateRange,
  formatDate, parseDate, isDateInRange, daysBetween,
  // String
  slugify, truncate, capitalize, camelToKebab,
  // Number
  clamp, roundTo, percentage,
  // Validate
  isEmail, isPhone, isUrl, isEmpty,
  // Errors
  AppError, NotFoundError, ValidationError, UnauthorizedError, ForbiddenError, ConflictError,
  type ErrorCode,
  // Logger
  type Logger, createConsoleLogger, LogLevel,
  // File
  type FileMetadata, formatFileSize, getFileExtension, isImageFile,
  // Constants (pagination, HTTP status, entity status, sort, limits, duration)
  HttpStatus, type HttpStatusCode,
  Pagination, type PaginationParams, type PaginatedResult, paginate,
  EntityStatus, type EntityStatusValue,
  type SortDirection, type SortParams,
  Limits, Duration,
} from '@maw/sdk';

// Contracts (ports)
export type {
  IAuthorization,
  AuthenticatedIdentity, AuthContext,
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
} from '@maw/sdk';

// Security types
export {
  type SecurityConfig,
  type SecurityEvent,
  type SecurityContext,
  type PasswordPolicy,
  type AccountStatusValue,
} from '@maw/sdk';
