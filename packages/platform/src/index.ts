export { SessionManager, SESSION_KEYS, decodeJwtExp } from './session/SessionManager';
export { MemorySecureStore } from './storage/MemorySecureStore';
export { LocalFileStorage, type LocalFileStorageOptions } from './storage/LocalFileStorage';
export { PgFileMetadataStore, type FileMetadataRecord } from './storage/PgFileMetadataStore';

// Offline
export { MemoryOfflineStorage } from './offline/MemoryOfflineStorage';
export { IndexedDbOfflineStorage, type IndexedDbOfflineStorageOptions } from './offline/IndexedDbOfflineStorage';
export { BrowserNetworkManager, type BrowserNetworkManagerOptions } from './offline/BrowserNetworkManager';
export { DefaultConflictResolver } from './offline/DefaultConflictResolver';
export { OfflineModuleRegistry } from './offline/OfflineModuleRegistry';
export { offlineModule } from './offline/module';

// Security (browser-safe only — AesEncryptionService and EnvSecretProvider use
// node:crypto / process.env and live in @mawsoftwares/platform/security for server consumers)
export { MemoryRateLimiter } from './security/MemoryRateLimiter';
export { isPasswordAllowed, type PasswordCheckResult } from './security/PasswordPolicyValidator';
export { redact } from './security/LogRedactor';
