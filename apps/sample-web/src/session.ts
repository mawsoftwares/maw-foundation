import type { Session } from '@maw/sdk/contracts/identity';
import type { CatalogModule, DynamicAccessSnapshot } from '@maw/ui-web';
import { client } from './api';

export interface MeResponse {
  readonly userId: string;
  readonly tenantId: string;
  readonly role: string;
  readonly audience?: string;
  readonly permissions?: readonly string[];
}

export async function restoreSession(): Promise<Session | null> {
  if ((await client.currentAccessToken()) === null) return null;
  try {
    const me = await client.request<MeResponse>('/me');
    return {
      userId: me.userId,
      tenantId: me.tenantId,
      role: me.role,
      audience: me.audience,
      entitlements: [],
      capabilities: [],
    };
  } catch {
    return null;
  }
}

export async function loadDynamicAccess(): Promise<DynamicAccessSnapshot> {
  const [me, catalog] = await Promise.all([
    client.request<MeResponse>('/me'),
    client.request<{ modules: CatalogModule[] }>('/modules'),
  ]);
  return {
    permissions: me.permissions ?? [],
    modules: catalog.modules ?? [],
    role: me.role,
  };
}
