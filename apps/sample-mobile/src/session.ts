import type { Session } from '@maw/sdk/contracts/identity';
import { client } from './api';

interface MeResponse {
  readonly userId: string;
  readonly tenantId: string;
  readonly role: string;
  readonly audience?: string;
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
