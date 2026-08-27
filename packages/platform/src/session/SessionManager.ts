import type { IAccountAuth, AuthResult, Credentials, TokenPair } from '@mawsoftwares/sdk/contracts/IAccountAuth';
import type { ISecureStore } from '@mawsoftwares/sdk/contracts/ISecureStore';
import type { Session } from '@mawsoftwares/sdk/contracts/identity';

/** Secure-storage keys. Passwords are never among them. */
export const SESSION_KEYS = {
  access: 'maw:auth:accessToken',
  refresh: 'maw:auth:refreshToken',
  session: 'maw:auth:session',
} as const;

/** Parse a persisted session snapshot, or null if absent/malformed. */
function parseSession(raw: string | null): Session | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Partial<Session>;
    if (
      typeof value.userId !== 'string' ||
      typeof value.tenantId !== 'string' ||
      typeof value.role !== 'string' ||
      value.role.length === 0 ||
      !Array.isArray(value.entitlements)
    ) {
      return null;
    }
    return value as Session;
  } catch {
    return null;
  }
}

/** The `exp` (seconds) from a JWT, or null if it can't be read. */
export function decodeJwtExp(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[1] === undefined) return null;
  try {
    const seg = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const b64 = seg.padEnd(Math.ceil(seg.length / 4) * 4, '=');
    const json =
      typeof atob === 'function'
        ? atob(b64)
        : Buffer.from(b64, 'base64').toString('binary');
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Owns the session + token lifecycle: sign-in, silent restore (auto-login), proactive
 * refresh, and clearing. Tokens live in secure storage; the access token is refreshed
 * when missing or within 60s of expiry, so a warm start never carries a dead token into
 * the first API call. On any refresh failure the session is cleared.
 *
 * Adapted from Restaurant OS's SessionManager — generalized to the foundation's
 * throw-based `IAccountAuth` and free-string roles.
 */
export class SessionManager {
  private session: Session | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(
    private readonly auth: IAccountAuth,
    private readonly store: ISecureStore,
    private readonly options: { readonly now?: () => number } = {},
  ) {}

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  async signIn(credentials: Credentials): Promise<AuthResult> {
    const result = await this.auth.signIn(credentials);
    await this.persist(result.session, result.tokens);
    return result;
  }

  /** Silent restore on launch. Returns the session (refreshing if needed) or null. */
  async restore(): Promise<Session | null> {
    const [rawSession, access, refresh] = await Promise.all([
      this.store.get(SESSION_KEYS.session),
      this.store.get(SESSION_KEYS.access),
      this.store.get(SESSION_KEYS.refresh),
    ]);

    const session = parseSession(rawSession);
    if (session === null || refresh === null) {
      await this.clear();
      return null;
    }

    this.session = session;
    this.accessToken = access;
    this.refreshToken = refresh;

    if (this.needsRefresh() && !(await this.refresh())) return null;
    return this.session;
  }

  private needsRefresh(): boolean {
    if (this.accessToken === null) return true;
    const exp = decodeJwtExp(this.accessToken);
    if (exp === null) return false; // unreadable — let the 401 path handle it
    return exp * 1000 - this.now() < 60_000;
  }

  /** Rotate tokens using the stored refresh token. Clears the session on failure. */
  async refresh(): Promise<boolean> {
    if (this.refreshToken === null) {
      await this.clear();
      return false;
    }
    try {
      const result = await this.auth.refresh(this.refreshToken);
      this.session = result.session;
      this.accessToken = result.tokens.accessToken;
      this.refreshToken = result.tokens.refreshToken;
      await this.store.set(SESSION_KEYS.session, JSON.stringify(result.session));
      await this.store.set(SESSION_KEYS.access, result.tokens.accessToken);
      await this.store.set(SESSION_KEYS.refresh, result.tokens.refreshToken);
      return true;
    } catch {
      await this.clear();
      return false;
    }
  }

  async signOut(): Promise<void> {
    if (this.refreshToken !== null) {
      try {
        await this.auth.signOut(this.refreshToken);
      } catch {
        // best-effort server revoke; clear locally regardless
      }
    }
    await this.clear();
  }

  async clear(): Promise<void> {
    this.session = null;
    this.accessToken = null;
    this.refreshToken = null;
    await Promise.all([
      this.store.remove(SESSION_KEYS.session),
      this.store.remove(SESSION_KEYS.access),
      this.store.remove(SESSION_KEYS.refresh),
    ]);
  }

  private async persist(session: Session, tokens: TokenPair): Promise<void> {
    this.session = session;
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    await this.store.set(SESSION_KEYS.session, JSON.stringify(session));
    await this.store.set(SESSION_KEYS.access, tokens.accessToken);
    await this.store.set(SESSION_KEYS.refresh, tokens.refreshToken);
  }

  currentSession(): Session | null {
    return this.session;
  }

  currentAccessToken(): string | null {
    return this.accessToken;
  }

  currentRefreshToken(): string | null {
    return this.refreshToken;
  }

  /** Update the cached session's granted capabilities and re-persist. */
  async updateCapabilities(capabilities: readonly string[]): Promise<Session | null> {
    if (this.session === null) return null;
    this.session = { ...this.session, capabilities: [...capabilities] };
    await this.store.set(SESSION_KEYS.session, JSON.stringify(this.session));
    return this.session;
  }
}
