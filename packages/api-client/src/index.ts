import type { ISecureStore } from '@mawsoftwares/sdk/contracts/ISecureStore';
import type {
  IAccountAuth,
  AuthResult,
  Credentials,
  TokenPair,
  RegistrationInput,
  SessionInfo,
} from '@mawsoftwares/sdk/contracts/IAccountAuth';
import type { Session } from '@mawsoftwares/sdk/contracts/identity';
import { prehashPassword } from '@mawsoftwares/sdk/security/password-prehash';
import { ApiError, parseApiErrorPayload } from './errors';

export {
  ApiError,
  parseApiErrorPayload,
  getApiErrorMessage,
  getApiErrorFields,
  type ApiErrorField,
} from './errors';

const KEYS = {
  access: 'maw:auth:accessToken',
  refresh: 'maw:auth:refreshToken',
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiClientOptions {
  readonly baseUrl: string;
  readonly store: ISecureStore;
  readonly mode?: 'token' | 'cookie';
  readonly getCsrfToken?: () => string | undefined;
  readonly timeout?: number;
}

/** Thrown when a request is cancelled via AbortController. */
export class CancelledError extends Error {
  constructor(readonly reason?: string) {
    super(reason ?? 'Request cancelled');
    this.name = 'CancelledError';
  }
}

// ---------------------------------------------------------------------------
// Interceptors
// ---------------------------------------------------------------------------

export interface RequestContext {
  url: string;
  method: string;
  headers: Headers;
  body: BodyInit | null | undefined;
  signal?: AbortSignal;
}

export interface ResponseContext {
  url: string;
  method: string;
  status: number;
  headers: Headers;
  data: unknown;
}

export type RequestInterceptor = (ctx: RequestContext) => RequestContext | Promise<RequestContext>;
export type ResponseInterceptor = (ctx: ResponseContext) => ResponseContext | Promise<ResponseContext>;
export type ErrorInterceptor = (error: ApiError, ctx: RequestContext) => Promise<never> | never;

export interface InterceptorHandle {
  remove(): void;
}

// ---------------------------------------------------------------------------
// Upload types
// ---------------------------------------------------------------------------

export interface UploadOptions {
  onProgress?: (event: UploadProgressEvent) => void;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percent: number;
}

// ---------------------------------------------------------------------------
// Cancellation helpers
// ---------------------------------------------------------------------------

export interface CancellablePromise<T> extends Promise<T> {
  cancel(reason?: string): void;
}

function makeCancellable<T>(
  promise: Promise<T>,
  controller: AbortController,
): CancellablePromise<T> {
  const p = promise as CancellablePromise<T>;
  p.cancel = (reason?: string) => controller.abort(reason);
  return p;
}

// ---------------------------------------------------------------------------
// ApiClient
// ---------------------------------------------------------------------------

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PREHASH_HEADERS: Record<string, string> = { 'x-password-prehashed': 'sha256' };

export class ApiClient implements IAccountAuth {
  private readonly baseUrl: string;
  private readonly store: ISecureStore;
  private readonly mode: 'token' | 'cookie';
  private readonly getCsrfToken?: () => string | undefined;
  private readonly defaultTimeout: number;

  private requestInterceptors: Array<{ id: number; fn: RequestInterceptor }> = [];
  private responseInterceptors: Array<{ id: number; fn: ResponseInterceptor }> = [];
  private errorInterceptors: Array<{ id: number; fn: ErrorInterceptor }> = [];
  private interceptorId = 0;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.store = options.store;
    this.mode = options.mode ?? 'token';
    this.getCsrfToken = options.getCsrfToken;
    this.defaultTimeout = options.timeout ?? 30_000;
  }

  // -------------------------------------------------------------------------
  // Interceptor registration
  // -------------------------------------------------------------------------

  onRequest(fn: RequestInterceptor): InterceptorHandle {
    const id = ++this.interceptorId;
    this.requestInterceptors.push({ id, fn });
    return { remove: () => { this.requestInterceptors = this.requestInterceptors.filter((i) => i.id !== id); } };
  }

  onResponse(fn: ResponseInterceptor): InterceptorHandle {
    const id = ++this.interceptorId;
    this.responseInterceptors.push({ id, fn });
    return { remove: () => { this.responseInterceptors = this.responseInterceptors.filter((i) => i.id !== id); } };
  }

  onError(fn: ErrorInterceptor): InterceptorHandle {
    const id = ++this.interceptorId;
    this.errorInterceptors.push({ id, fn });
    return { remove: () => { this.errorInterceptors = this.errorInterceptors.filter((i) => i.id !== id); } };
  }

  // -------------------------------------------------------------------------
  // Auth (IAccountAuth)
  // -------------------------------------------------------------------------

  async signIn(credentials: Credentials): Promise<AuthResult> {
    const prehashed = await prehashPassword(credentials.password);
    const body = { ...credentials, password: prehashed };
    const result = await this.postJson<AuthResult>('/auth/login', body, PREHASH_HEADERS);
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

  async logout(): Promise<void> {
    const refreshToken = await this.store.get(KEYS.refresh);
    if (refreshToken !== null) {
      await this.signOut(refreshToken);
    } else {
      await this.store.remove(KEYS.access);
    }
  }

  async currentAccessToken(): Promise<string | null> {
    return this.store.get(KEYS.access);
  }

  currentSessionFrom(result: AuthResult): Session {
    return result.session;
  }

  async register(input: RegistrationInput): Promise<{ userId: string; emailVerificationRequired: boolean }> {
    const prehashed = await prehashPassword(input.password);
    return this.postJson('/auth/register', { ...input, password: prehashed }, PREHASH_HEADERS);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const prehashed = await prehashPassword(newPassword);
    await this.postJson('/auth/reset-password', { token, newPassword: prehashed }, PREHASH_HEADERS);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const prehashedCurrent = await prehashPassword(currentPassword);
    const prehashedNew = await prehashPassword(newPassword);
    await this.postJson('/auth/change-password', {
      currentPassword: prehashedCurrent,
      newPassword: prehashedNew,
    }, PREHASH_HEADERS);
  }

  async listSessions(): Promise<readonly SessionInfo[]> {
    return this.request<readonly SessionInfo[]>('/auth/sessions');
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.request<void>(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
  }

  async revokeAllSessions(exceptCurrent?: string): Promise<void> {
    const query = exceptCurrent ? `?except=${exceptCurrent}` : '';
    await this.request<void>(`/auth/sessions${query}`, { method: 'DELETE' });
  }

  // -------------------------------------------------------------------------
  // Core request — cancellable, with interceptors + auto-refresh
  // -------------------------------------------------------------------------

  request<T>(path: string, init: RequestInit & { signal?: AbortSignal } = {}): CancellablePromise<T> {
    const controller = new AbortController();
    const externalSignal = init.signal;

    if (externalSignal?.aborted) {
      controller.abort(externalSignal.reason);
    } else if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason), { once: true });
    }

    const promise = this.executeRequest<T>(path, init, controller);
    return makeCancellable(promise, controller);
  }

  // -------------------------------------------------------------------------
  // Upload — multipart with progress
  // -------------------------------------------------------------------------

  upload<T = unknown>(
    path: string,
    formData: FormData,
    options: UploadOptions = {},
  ): CancellablePromise<T> {
    const controller = new AbortController();
    const externalSignal = options.signal;

    if (externalSignal?.aborted) {
      controller.abort(externalSignal.reason);
    } else if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason), { once: true });
    }

    const promise = this.executeUpload<T>(path, formData, options, controller);
    return makeCancellable(promise, controller);
  }

  // -------------------------------------------------------------------------
  // Implementation
  // -------------------------------------------------------------------------

  private async executeRequest<T>(
    path: string,
    init: RequestInit,
    controller: AbortController,
  ): Promise<T> {
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = new Headers(init.headers);

    await this.applyAuth(headers, method);

    if (init.body !== undefined && init.body !== null && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    let ctx: RequestContext = {
      url: `${this.baseUrl}${path}`,
      method,
      headers,
      body: init.body,
      signal: controller.signal,
    };

    for (const interceptor of this.requestInterceptors) {
      ctx = await interceptor.fn(ctx);
    }

    const timeoutId = this.defaultTimeout > 0
      ? setTimeout(() => controller.abort('timeout'), this.defaultTimeout)
      : undefined;

    try {
      const first = await this.doFetch(ctx);
      if (first.status !== 401) return this.parseWithInterceptors(first, ctx);

      const refreshToken = await this.store.get(KEYS.refresh);
      if (refreshToken === null) throw new ApiError(401, 'not authenticated');

      try {
        await this.refresh(refreshToken);
      } catch {
        await this.store.remove(KEYS.access);
        await this.store.remove(KEYS.refresh);
        throw new ApiError(401, 'session expired');
      }

      await this.applyAuth(ctx.headers, ctx.method);
      return this.parseWithInterceptors(await this.doFetch(ctx), ctx);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new CancelledError(controller.signal.reason as string | undefined);
      }
      if (err instanceof ApiError) {
        for (const interceptor of this.errorInterceptors) {
          await interceptor.fn(err, ctx);
        }
      }
      throw err;
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }

  private async executeUpload<T>(
    path: string,
    formData: FormData,
    options: UploadOptions,
    controller: AbortController,
  ): Promise<T> {
    const headers = new Headers(options.headers);
    await this.applyAuth(headers, 'POST');

    const url = `${this.baseUrl}${path}`;

    if (options.onProgress && typeof XMLHttpRequest !== 'undefined') {
      return this.uploadWithXHR<T>(url, formData, headers, options.onProgress, controller);
    }

    let ctx: RequestContext = {
      url,
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    };

    for (const interceptor of this.requestInterceptors) {
      ctx = await interceptor.fn(ctx);
    }

    try {
      return await this.parseWithInterceptors(await this.doFetch(ctx), ctx);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new CancelledError(controller.signal.reason as string | undefined);
      }
      throw err;
    }
  }

  private uploadWithXHR<T>(
    url: string,
    formData: FormData,
    headers: Headers,
    onProgress: (event: UploadProgressEvent) => void,
    controller: AbortController,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      controller.signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new CancelledError(controller.signal.reason as string | undefined));
      }, { once: true });

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percent: Math.round((e.loaded / e.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as T);
          } catch {
            resolve(xhr.responseText as unknown as T);
          }
        } else {
          const body = xhr.responseText;
          let parsed: unknown = body;
          try {
            parsed = JSON.parse(body) as unknown;
          } catch { /* keep raw text */ }
          const { message, code } = parseApiErrorPayload(parsed, xhr.statusText);
          reject(new ApiError(xhr.status, message, parsed, code));
        }
      });

      xhr.addEventListener('error', () => reject(new ApiError(0, 'Network error')));

      xhr.open('POST', url);
      headers.forEach((value, key) => xhr.setRequestHeader(key, value));
      xhr.send(formData);
    });
  }

  private async applyAuth(headers: Headers, method: string): Promise<void> {
    if (this.mode === 'token') {
      const access = await this.store.get(KEYS.access);
      if (access !== null) headers.set('Authorization', `Bearer ${access}`);
    } else if (UNSAFE.has(method)) {
      const csrf = this.getCsrfToken?.();
      if (csrf !== undefined) headers.set('x-csrf-token', csrf);
    }
  }

  private async doFetch(ctx: RequestContext): Promise<Response> {
    return fetch(ctx.url, {
      method: ctx.method,
      headers: ctx.headers,
      body: ctx.body,
      signal: ctx.signal,
      credentials: this.mode === 'cookie' ? 'include' : 'same-origin',
    });
  }

  private async parseWithInterceptors<T>(res: Response, ctx: RequestContext): Promise<T> {
    const data = await this.parse<T>(res);

    let responseCtx: ResponseContext = {
      url: ctx.url,
      method: ctx.method,
      status: res.status,
      headers: res.headers,
      data,
    };

    for (const interceptor of this.responseInterceptors) {
      responseCtx = await interceptor.fn(responseCtx);
    }

    return responseCtx.data as T;
  }

  private async postJson<T>(path: string, body: unknown, extraHeaders?: Record<string, string>): Promise<T> {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (extraHeaders) {
      for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, v);
    }
    await this.applyAuth(headers, 'POST');

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: this.mode === 'cookie' ? 'include' : 'same-origin',
    });
    return this.parse<T>(res);
  }

  private async parse<T>(res: Response): Promise<T> {
    const text = await res.text();
    const ct = res.headers.get('content-type') ?? '';
    const looksJson = ct.includes('application/json') || (text.startsWith('{') || text.startsWith('['));
    let data: unknown;
    if (text.length > 0 && looksJson) {
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        data = text;
      }
    } else {
      data = text.length > 0 ? text : undefined;
    }
    if (!res.ok) {
      const { message, code } = parseApiErrorPayload(data, res.statusText);
      throw new ApiError(res.status, message, data, code);
    }
    return data as T;
  }

  private async persistTokens(tokens: TokenPair): Promise<void> {
    await this.store.set(KEYS.access, tokens.accessToken);
    await this.store.set(KEYS.refresh, tokens.refreshToken);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// Offline
export { OnlineOnlyRepository } from './offline/OnlineOnlyRepository';
export { OfflineRepository, type OfflineRepositoryOptions } from './offline/OfflineRepository';
export { SyncEngine, type SyncEngineOptions } from './offline/SyncEngine';
export { createOfflineRepository, type OfflineDependencies } from './offline/createOfflineRepository';
export { installOfflineInterceptor, type OfflineInterceptorOptions, type OfflineInterceptorHandle } from './offline/installOfflineInterceptor';

/** Create a shared AbortController for a group of requests. */
export function createRequestGroup(): { signal: AbortSignal; cancelAll(reason?: string): void } {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancelAll: (reason?: string) => controller.abort(reason),
  };
}
