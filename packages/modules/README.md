# @mawsoftwares/modules

Module registry foundation for the MAW ecosystem.

## Features

- **BaseModuleRegistry** — Register, enable, disable, and configure modules with lifecycle hooks
- **Dependency validation** — Prevents enabling modules with unmet dependencies
- **Init ordering** — Topological sort for correct initialization order
- **Event bus** — Typed inter-module event system (`emit`, `on`, `once`, `off`)
- **Cross-platform definitions** — Describe domain entities, use cases, and platform-specific screens

## Usage

```ts
import { BaseModuleRegistry, type BaseModuleDefinition } from '@mawsoftwares/modules';

const registry = new BaseModuleRegistry();

registry.register({
  key: 'invoices',
  name: 'Invoices',
  version: '1.0.0',
  dependencies: [{ moduleKey: 'customers' }],
  menus: [{ label: 'Invoices', path: '/invoices', icon: 'receipt', sortOrder: 30 }],
});

await registry.enable('invoices');
```
