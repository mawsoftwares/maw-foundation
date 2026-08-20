export { AuthProvider, useAuth, useCan, Can, type AuthProviderProps } from './access';
export { Button, TextField, Card } from './components';
export {
  PermissionRoute,
  AnyPermissionRoute,
  FeatureRoute,
  AccessRoute,
  matchesPermission,
  normalizePermissionCode,
  type PermissionRouteProps,
  type AnyPermissionRouteProps,
  type FeatureRouteProps,
  type AccessRouteProps,
} from './guards';
export { FeatureRegistry, type FeatureDefinition } from './feature-registry';
export {
  DynamicAccessProvider,
  useDynamicAccess,
  type CatalogModule,
  type DynamicAccessSnapshot,
  type DynamicAccessValue,
  type DynamicAccessProviderProps,
} from './dynamic-access';
export { FeatureHost, type FeatureHostProps } from './feature-host';
