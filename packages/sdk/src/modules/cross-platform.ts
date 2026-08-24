import type { BaseModuleDefinition } from './types';

export interface CrossPlatformDomainDescriptor {
  readonly entities?: readonly string[];
  readonly useCases?: readonly string[];
  readonly validationSchemas?: readonly string[];
  readonly formSchemas?: readonly string[];
  readonly gridSchemas?: readonly string[];
}

export interface PlatformScreenDescriptor {
  readonly screens?: readonly string[];
}

export interface CrossPlatformModuleDefinition extends BaseModuleDefinition {
  readonly domain?: CrossPlatformDomainDescriptor;
  readonly platforms?: {
    readonly web?: PlatformScreenDescriptor;
    readonly native?: PlatformScreenDescriptor;
    readonly desktop?: PlatformScreenDescriptor;
  };
}
