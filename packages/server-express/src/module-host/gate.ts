import type { RequestHandler } from 'express';
import type { ModuleRegistry } from '@mawsoftwares/rbac-core';

/**
 * Express middleware that answers 404 while module `key` is not enabled in `registry`. For routes an app
 * mounts itself (not through `MawModule.registerRoutes`): `app.use('/api/v1/tasks', requireModuleEnabled(registry, 'tasks'), router)`.
 * The status is read on every request, so enabling or disabling a module takes effect without remounting.
 */
export function requireModuleEnabled(registry: Pick<ModuleRegistry, 'isRegistered' | 'getStatus'>, key: string): RequestHandler {
  return (_req, res, next) => {
    if (registry.isRegistered(key) && registry.getStatus(key) === 'disabled') {
      res.status(404).json({ error: { code: 'MODULE_DISABLED', message: `Module "${key}" is disabled` } });
      return;
    }
    next();
  };
}
