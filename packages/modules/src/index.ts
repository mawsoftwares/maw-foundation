/**
 * @mawsoftwares/modules — Module registry foundation.
 *
 * Re-exports the module types, registry, event bus, and cross-platform
 * module definitions from @mawsoftwares/sdk where they were originally implemented.
 * New consumers should import from "@mawsoftwares/modules".
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
} from '@mawsoftwares/sdk';

// Registry
export {
  BaseModuleRegistry,
  RegistryEvent,
  type RegistryEventPayload,
} from '@mawsoftwares/sdk';

// Event bus
export {
  createEventBus,
  type EventBus,
  type EventHandler,
} from '@mawsoftwares/sdk';

// Cross-platform module definitions
export {
  type CrossPlatformDomainDescriptor,
  type PlatformScreenDescriptor,
  type CrossPlatformModuleDefinition,
} from '@mawsoftwares/sdk';
