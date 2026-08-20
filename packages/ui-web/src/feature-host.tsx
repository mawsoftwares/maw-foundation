import type { ReactNode } from 'react';
import { AnyPermissionRoute } from './guards';
import { useDynamicAccess } from './dynamic-access';
import type { FeatureRegistry } from './feature-registry';

export interface FeatureHostProps {
  readonly registry: FeatureRegistry;
  /** Shown when the user lacks every permission listed on the feature. */
  readonly fallback?: (featureName: string) => ReactNode;
}

/**
 * Renders every registered feature panel, gated with the same permission codes
 * the server middleware uses. Features with no `permissions` list always render.
 */
export function FeatureHost({ registry, fallback }: FeatureHostProps): ReactNode {
  const { permissions, isAdmin } = useDynamicAccess();

  return (
    <>
      {registry.getAll().map((feature) => {
        const required = feature.permissions ?? [];
        const Panel = feature.Panel;
        if (required.length === 0) {
          return <Panel key={feature.key} />;
        }
        return (
          <AnyPermissionRoute
            key={feature.key}
            permissions={required}
            userPermissions={permissions}
            isAdmin={isAdmin}
            fallback={fallback?.(feature.name) ?? null}
          >
            <Panel />
          </AnyPermissionRoute>
        );
      })}
    </>
  );
}
