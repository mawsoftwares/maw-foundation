import type { ISecureStore } from '@maw/sdk/contracts/ISecureStore';
import type {
  IAccountAuth,
  AuthResult,
  Credentials,
  TokenPair,
} from '@maw/sdk/contracts/IAccountAuth';
import type { Session } from '@maw/sdk/contracts/identity';

const KEYS = {
  access: 'maw:auth:accessToken',
  refresh: 'maw:auth:refreshToken',
} as const;

export interface ApiClientOptions {
  readonly baseUrl: string;
  /** Token persistence: localStorage-backed on web, expo-secure-store on native. */
  readonly store: ISecureStore;
  /** `token` (default) sends a bearer header; `cookie` relies on httpOnly cookies + CSRF. */
  readonly mode?: 'token' | 'cookie';
  /** Reads the CSRF token to echo in the `x-csrf-token` header (cookie mode only). */
  readonly getCsrfToken?: () => string | undefined;
}

/** Thrown for non-2xx responses so callers can branch on `status`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    override readonly message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Universal API client for web AND React Native (both have global `fetch`). Persists
 * tokens via `ISecureStore`, attaches the bearer header, and on a 401 tries a single
 * refresh-then-retry before giving up. Interceptor behavior ported from Sushmapet's axios
 * client (`shared/api/client.ts`), made transport-neutral.
 */
export class ApiClient implements IAccountAuth {
  private readonly baseUrl: string;
  private readonly store: ISecureStore;
  private readonly mode: 'token' | 'cookie';
  private readonly getCsrfToken?: () => string | undefined;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.store = options.store;
    this.mode = options.mode ?? 'token';
    this.getCsrfToken = options.getCsrfToken;
  }

  async signIn(credentials: Credentials): Promise<AuthResult> {
    const result = await this.postJson<AuthResult>('/auth/login', credentials);
    await this.persistTokens(result.tokens);
    return result;
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const result = await this.postJson<AuthResult>('/auth/refresh', { refreshToken });
    await this.persistTokens(result.tokens);
    return result;
  }

  async signOut(refreshToken: string): Promise<void> {
    try {
      await this.postJson('/auth/logout', { refreshToken });
    } finally {
      await this.store.remove(KEYS.access);
      await this.store.remove(KEYS.refresh);
    }
  }

  /** Sign out using the currently stored refresh token (convenience for UI logout). */
  async logout(): Promise<void> {
    const refreshToken = await this.store.get(KEYS.refresh);
    if (refreshToken !== null) {
      await this.signOut(refreshToken);
    } else {
      await this.store.remove(KEYS.access);
    }
  }

  /** The persisted access token, if any (e.g. to seed a SessionManager). */
  async currentAccessToken(): Promise<string | null> {
    return this.store.get(KEYS.access);
  }

  /** Authenticated request with one automatic refresh-and-retry on 401. */
  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const first = await this.rawRequest(path, init);
    if (first.status !== 401) return this.parse<T>(first);

    // Stale access token — try to refresh once, then retry.
    const refreshToken = await this.store.get(KEYS.refresh);
    if (refreshToken === null) throw new ApiError(401, 'not authenticated');
    try {
      await this.refresh(refreshToken);
    } catch {
      await this.store.remove(KEYS.access);
      await this.store.remove(KEYS.refresh);
      throw new ApiError(401, 'session expired');
    }
    return this.parse<T>(await this.rawRequest(path, init));
  }

  currentSessionFrom(result: AuthResult): Session {
    return result.session;
  }

  private async rawRequest(path: string, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers);
    const method = (init.method ?? 'GET').toUpperCase();

    if (this.mode === 'token') {
      const access = await this.store.get(KEYS.access);
      if (access !== null) headers.set('Authorization', `Bearer ${access}`);
    } else if (UNSAFE.has(method)) {
      const csrf = this.getCsrfToken?.();
      if (csrf !== undefined) headers.set('x-csrf-token', csrf);
    }
    if (init.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      method,
      headers,
      credentials: this.mode === 'cookie' ? 'include' : 'same-origin',
    });
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    return this.parse<T>(
      await this.rawRequest(path, { method: 'POST', body: JSON.stringify(body) }),
    );
  }

  private async parse<T>(res: Response): Promise<T> {
    const text = await res.text();
    const data = text.length > 0 ? (JSON.parse(text) as unknown) : undefined;
    if (!res.ok) {
      const message =
        typeof data === 'object' && data !== null && 'error' in data
          ? String((data as { error: unknown }).error)
          : res.statusText;
      throw new ApiError(res.status, message, data);
    }
    return data as T;
  }

  private async persistTokens(tokens: TokenPair): Promise<void> {
    await this.store.set(KEYS.access, tokens.accessToken);
    await this.store.set(KEYS.refresh, tokens.refreshToken);
  }
}

/** Browser/RN-friendly `ISecureStore` over any `Storage`-like object (localStorage). */
export function webSecureStore(storage: {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}): ISecureStore {
  return {
    async get(key) {
      return storage.getItem(key);
    },
    async set(key, value) {
      storage.setItem(key, value);
    },
    async remove(key) {
      storage.removeItem(key);
    },
  };
}
