import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@mawsoftwares/sdk/contracts/identity';
import type { AuthzContext } from '@mawsoftwares/sdk/contracts/IAuthorization';
import type { Credentials } from '@mawsoftwares/sdk/contracts/IAccountAuth';
import { resolveEffectiveAccess, type RbacConfig, type EffectiveAccess, type UserAccessContext } from '@mawsoftwares/rbac-core';
import { ApiClient } from '@mawsoftwares/api-client';

/** Build the resolver input from a server-issued session. */
function contextFromSession(session: Session): UserAccessContext {
  return {
    userId: session.userId,
    tenantId: session.tenantId,
    baseRole: session.role,
    grantedCapabilities: session.capabilities ?? [],
    enabledModules: session.entitlements,
    subscriptionActive: true,
    rolePermissions: session.rolePermissions,
    scope: session.scopeId != null ? { scopeId: session.scopeId } : undefined,
  };
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  can: (permission: string, context?: AuthzContext) => boolean;
  capabilities: readonly string[];
  login: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  readonly client: ApiClient;
  readonly rbac: RbacConfig;
  /** Restore an existing session on mount (e.g. GET /me). Optional. */
  readonly restore?: () => Promise<Session | null>;
  readonly children: ReactNode;
}

/**
 * Holds the session and derives an `EffectiveAccess` from it via the SAME
 * `resolveEffectiveAccess` the server enforces with — so the UI shows exactly what the
 * backend allows. Consolidates Sushmapet's AuthProvider + PermissionProvider into one.
 */
export function AuthProvider({ client, rbac, restore, children }: AuthProviderProps): ReactNode {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const restored = restore !== undefined ? await restore() : null;
        if (alive) setSession(restored);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [restore]);

  const access: EffectiveAccess | null = useMemo(
    () => (session === null ? null : resolveEffectiveAccess(contextFromSession(session), rbac)),
    [session, rbac],
  );

  const login = useCallback(
    async (credentials: Credentials) => {
      const result = await client.signIn(credentials);
      setSession(result.session);
    },
    [client],
  );

  const logout = useCallback(async () => {
    await client.logout();
    setSession(null);
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      capabilities: access?.capabilities ?? [],
      can: (permission, context) => access?.can(permission, context) ?? false,
      login,
      logout,
    }),
    [session, loading, access, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

/** Boolean permission hook — the web analogue of the RN `useCan`. */
export function useCan(permission: string, context?: AuthzContext): boolean {
  return useAuth().can(permission, context);
}

/** Render children only when the current user holds `permission` (RBAC render-guard). */
export function Can({
  permission,
  context,
  fallback = null,
  children,
}: {
  permission: string;
  context?: AuthzContext;
  fallback?: ReactNode;
  children: ReactNode;
}): ReactNode {
  return useCan(permission, context) ? <>{children}</> : <>{fallback}</>;
}
