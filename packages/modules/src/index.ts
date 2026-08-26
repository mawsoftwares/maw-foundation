/**
 * @maw/modules — Module registry foundation.
 *
 * Re-exports the module types, registry, event bus, and cross-platform
 * module definitions from @maw/sdk where they were originally implemented.
 * New consumers should import from "@maw/modules".
 */

// Module types
export {
  type ModuleLevel,
  type ModuleMetadata,
  type ModuleConfigField,
  type ModuleConfigSchema,
  type ModuleDependency,
  type ModuleMenuItem,
  type ModuleRoute,
  type ModuleEventDeclaration,
  type ModuleMigration,
  type ModuleLifecycle,
  type BaseModuleDefinition,
  type ModuleStatus,
  type ModuleState,
} from '@maw/sdk';

// Registry
export {
  BaseModuleRegistry,
  RegistryEvent,
  type RegistryEventPayload,
} from '@maw/sdk';

// Event bus
export {
  createEventBus,
  type EventBus,
  type EventHandler,
} from '@maw/sdk';

// Cross-platform module definitions
export {
  type CrossPlatformDomainDescriptor,
  type PlatformScreenDescriptor,
  type CrossPlatformModuleDefinition,
} from '@maw/sdk';
