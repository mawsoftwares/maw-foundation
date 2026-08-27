/**
 * @mawsoftwares/feature-flags
 *
 * Production-ready, reusable, multi-tenant Feature Flag Foundation.
 */

// Core Domain
export * from './domain/index.js';

// Cache
export * from './cache/index.js';

// Registry
export * from './registry/index.js';

// Evaluators
export * from './evaluators/index.js';

// Repositories
export * from './repositories/index.js';

// Services
export * from './services/index.js';

// Events
export * from './events/index.js';

// Guards
export * from './guards/index.js';

// API
export * from './api/index.js';

// Re-export SDK flag store for backwards compatibility if needed
export { createFlagStore, isRolledOut, type FlagStore, type FlagChangeListener } from '@mawsoftwares/sdk';
