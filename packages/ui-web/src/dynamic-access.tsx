import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { matchesPermission } from './guards';
import { useAuth } from './access';

/** A module row from GET /modules (or the login payload). */
export interface CatalogModule {
  readonly key: string;
  readonly name: string;
  readonly audience: string;
}

export interface DynamicAccessSnapshot {
  readonly permissions: readonly string[];
  readonly modules: readonly CatalogModule[];
  readonly role: string;
}

export interface DynamicAccessValue {
  readonly permissions: readonly string[];
  readonly modules: readonly CatalogModule[];
  readonly isAdmin: boolean;
  readonly loading: boolean;
  can(permission: string): boolean;
  reload(): Promise<void>;
}

const DynamicAccessContext = createContext<DynamicAccessValue | null>(null);

export interface DynamicAccessProviderProps {
  /** Load the current user's permission list + module catalog (e.g. GET /me + GET /modules). */
  readonly load: () => Promise<DynamicAccessSnapshot>;
  /** Which session roles bypass every permission check. Default: owner / admin. */
  readonly isAdminRole?: (role: string) => boolean;
  readonly children: ReactNode;
}

const defaultIsAdmin = (role: string): boolean => {
  const lower = role.toLowerCase();
  return lower === 'owner' || lower === 'admin' || lower === 'super_admin' || lower === 'superadmin';
};

const EMPTY: DynamicAccessSnapshot = { permissions: [], modules: [], role: '' };

/**
 * Dynamic RBAC access for the UI — the same `Action_Module` list the server enforces.
 * Must sit inside `AuthProvider`. Reloads whenever the session appears (login / restore)
 * and clears on logout. Replaces module-level globals / localStorage.
 */
export function DynamicAccessProvider({
  load,
  isAdminRole = defaultIsAdmin,
  children,
}: DynamicAccessProviderProps): ReactNode {
  const { session, loading: authLoading } = useAuth();
  const [snapshot, setSnapshot] = useState<DynamicAccessSnapshot>(EMPTY);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (session === null) {
      setSnapshot(EMPTY);
      return;
    }
    setLoading(true);
    try {
      setSnapshot(await load());
    } catch {
      setSnapshot(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [load, session]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const isAdmin = session !== null && isAdminRole(session.role);

  const value = useMemo<DynamicAccessValue>(
    () => ({
      permissions: snapshot.permissions,
      modules: snapshot.modules,
      isAdmin,
      loading: authLoading || loading,
      can: (permission) => isAdmin || matchesPermission(snapshot.permissions, permission),
      reload,
    }),
    [snapshot, isAdmin, authLoading, loading, reload],
  );

  return <DynamicAccessContext.Provider value={value}>{children}</DynamicAccessContext.Provider>;
}

export function useDynamicAccess(): DynamicAccessValue {
  const ctx = useContext(DynamicAccessContext);
  if (ctx === null) throw new Error('useDynamicAccess must be used within <DynamicAccessProvider>');
  return ctx;
}
