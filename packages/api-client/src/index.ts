import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
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
import { prehashPassword, PREHASH_HEADER } from '@mawsoftwares/sdk/security/password-prehash';
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
// Retry config
// ---------------------------------------------------------------------------

export interface RetryOptions {
  /** Number of retry attempts after the initial try. 0 (default) disables retries entirely. */
  attempts?: number;
  /** Base delay in ms used for exponential backoff. Defaults to 300. */
  backoffMs?: number;
  /** Cap on the computed backoff delay in ms. Defaults to 5000. */
  maxBackoffMs?: number;
  /** Allow retrying mutating methods (POST/PUT/PATCH/DELETE). Defaults to false. */
  retryMutations?: boolean;
}

interface ResolvedRetryOptions {
  attempts: number;
  backoffMs: number;
  maxBackoffMs: number;
  retryMutations: boolean;
}

const DEFAULT_RETRY: ResolvedRetryOptions = {
  attempts: 0,
  backoffMs: 300,
  maxBackoffMs: 5000,
  retryMutations: false,
};

function resolveRetry(
  base: RetryOptions | undefined,
  override: RetryOptions | undefined,
): ResolvedRetryOptions {
  const merged = { ...base, ...override };
  return {
    attempts: merged.attempts ?? DEFAULT_RETRY.attempts,
    backoffMs: merged.backoffMs ?? DEFAULT_RETRY.backoffMs,
    maxBackoffMs: merged.maxBackoffMs ?? DEFAULT_RETRY.maxBackoffMs,
    retryMutations: merged.retryMutations ?? DEFAULT_RETRY.retryMutations,
  };
}

const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Exponential backoff with full jitter: `min(base * 2^attempt, max) * (0.5 + rand()*0.5)`.
 * Exported as a pure function so it can be unit tested and reused.
 */
export function computeBackoffMs(attempt: number, backoffMs: number, maxBackoffMs: number): number {
  const raw = Math.min(backoffMs * 2 ** attempt, maxBackoffMs);
  return Math.round(raw * (0.5 + Math.random() * 0.5));
}

/**
 * True when `err` represents a genuine connectivity failure — no response was
 * received at all (network down, timeout, DNS failure) — as opposed to a real
 * HTTP error response from the server (e.g. 400-499/500-599), which should
 * propagate normally rather than be treated as "offline".
 *
 * `ApiClient` surfaces connectivity failures as `ApiError` with `status === 0`;
 * this also treats any non-`ApiError`/non-`CancelledError` thrown value (e.g. a
 * raw `TypeError` from an environment not going through `ApiClient`) as a
 * connectivity failure, since it carries no HTTP status to branch on.
 */
export function isConnectivityFailure(err: unknown): boolean {
  if (err instanceof CancelledError) return false;
  if (err instanceof ApiError) return err.status === 0;
  return true;
}

function isRetryableError(err: unknown, method: string, retry: ResolvedRetryOptions): boolean {
  const methodRetryable = RETRYABLE_METHODS.has(method) || retry.retryMutations;
  if (!methodRetryable) return false;

  if (err instanceof ApiError) {
    // Never retry 4xx. Only 5xx (or status 0, meaning no response / network failure).
    return err.status === 0 || err.status >= 500;
  }
  // Timeouts / network errors (not ApiError, not cancellation) are retryable.
  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

/**
 * Best-effort, non-cryptographic check of whether a JWT's `exp` claim has passed.
 * This is a proactive heuristic only — never a security check. Any decode failure
 * or missing `exp` claim fails open (returns `false`, i.e. "not expired").
 */
export function isJwtExpired(token: string | null | undefined): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return false;
    const payloadSegment = parts[1];
    if (payloadSegment === undefined) return false;
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    let json: string;
    if (typeof atob === 'function') {
      json = atob(padded);
    } else {
      json = Buffer.from(padded, 'base64').toString('utf-8');
    }

    const payload = JSON.parse(json) as { exp?: unknown };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RequestLogEntry {
  method: string;
  url: string;
  status?: number;
  durationMs: number;
  error?: unknown;
}

export type RequestLogger = (entry: RequestLogEntry) => void;

export interface ApiClientOptions {
  readonly baseUrl: string;
  readonly store: ISecureStore;
  readonly mode?: 'token' | 'cookie';
  readonly getCsrfToken?: () => string | undefined;
  readonly timeout?: number;
  /** Opt-in retry/backoff for network errors, timeouts, and 5xx responses. Off by default. */
  readonly retry?: RetryOptions;
  /**
   * Opt-in structured request logging. `false` (default) disables it, `true` uses a
   * built-in console logger, or pass your own `(entry: RequestLogEntry) => void`.
   */
  readonly logging?: boolean | RequestLogger;
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
const PREHASH_HEADERS: Record<string, string> = { [PREHASH_HEADER]: 'sha256' };

/** Per-call request options: standard `RequestInit` plus this package's own additions. */
export type ApiRequestInit = RequestInit & { signal?: AbortSignal; retry?: RetryOptions };

export class ApiClient implements IAccountAuth {
  private readonly baseUrl: string;
  private readonly store: ISecureStore;
  private readonly mode: 'token' | 'cookie';
  private readonly getCsrfToken?: () => string | undefined;
  private readonly defaultTimeout: number;
  private readonly defaultRetry: RetryOptions | undefined;
  private readonly http: AxiosInstance;

  private requestInterceptors: Array<{ id: number; fn: RequestInterceptor }> = [];
  private responseInterceptors: Array<{ id: number; fn: ResponseInterceptor }> = [];
  private errorInterceptors: Array<{ id: number; fn: ErrorInterceptor }> = [];
  private interceptorId = 0;
  /** Shared in-flight refresh so applyAuth → refresh → applyAuth cannot recurse. */
  private refreshLock: Promise<AuthResult> | null = null;
  private inRefresh = false;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.store = options.store;
    this.mode = options.mode ?? 'token';
    this.getCsrfToken = options.getCsrfToken;
    this.defaultTimeout = options.timeout ?? 30_000;
    this.defaultRetry = options.retry;

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: this.defaultTimeout,
      withCredentials: this.mode === 'cookie',
      // We do our own status handling below (mirrors the old `fetch` behavior of
      // resolving on any status and branching on `res.ok`).
      validateStatus: () => true,
    });

    if (options.logging) {
      this.installLogging(options.logging === true ? undefined : options.logging);
    }
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
  // Built-in structured logging (dogfoods our own onRequest/onResponse/onError)
  // -------------------------------------------------------------------------

  private installLogging(custom: RequestLogger | undefined): void {
    const log: RequestLogger = custom ?? ((entry) => {
      const line = `[api-client] ${entry.method} ${entry.url} ${entry.status ?? 'ERR'} (${entry.durationMs}ms)`;
      if (entry.error) {
        console.error(line, entry.error);
      } else {
        console.log(line);
      }
    });

    // ResponseContext doesn't carry the originating RequestContext, so start
    // times are correlated best-effort via a per "METHOD url" FIFO queue —
    // fine for logging purposes (not used for anything correctness-critical).
    const pending = new Map<string, number[]>();
    const key = (method: string, url: string): string => `${method} ${url}`;

    const takeStart = (method: string, url: string): number | undefined => {
      const queue = pending.get(key(method, url));
      if (!queue || queue.length === 0) return undefined;
      const start = queue.shift();
      if (queue.length === 0) pending.delete(key(method, url));
      return start;
    };

    this.onRequest((ctx) => {
      const k = key(ctx.method, ctx.url);
      const queue = pending.get(k) ?? [];
      queue.push(Date.now());
      pending.set(k, queue);
      return ctx;
    });

    this.onResponse((ctx) => {
      const start = takeStart(ctx.method, ctx.url);
      const durationMs = start !== undefined ? Date.now() - start : 0;
      log({ method: ctx.method, url: ctx.url, status: ctx.status, durationMs });
      return ctx;
    });

    this.onError((err, ctx) => {
      const start = takeStart(ctx.method, ctx.url);
      const durationMs = start !== undefined ? Date.now() - start : 0;
      log({ method: ctx.method, url: ctx.url, status: err.status, durationMs, error: err });
      throw err;
    });
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
    if (this.refreshLock !== null) return this.refreshLock;

    // Set before the first await so nested applyAuth (via postJson) cannot
    // start another refresh while this one is in flight.
    this.inRefresh = true;
    const pending = this.postJson<AuthResult>('/auth/refresh', { refreshToken })
      .then(async (result) => {
        await this.persistTokens(result.tokens);
        return result;
      })
      .finally(() => {
        this.inRefresh = false;
        this.refreshLock = null;
      });
    this.refreshLock = pending;
    return pending;
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

  request<T>(path: string, init: ApiRequestInit = {}): CancellablePromise<T> {
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
    init: ApiRequestInit,
    controller: AbortController,
  ): Promise<T> {
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    const retry = resolveRetry(this.defaultRetry, init.retry);

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
      let attempt = 0;
      for (;;) {
        try {
          const first = await this.doFetch(ctx);
          if (first.status !== 401) return await this.parseWithInterceptors<T>(first, ctx);

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
          return await this.parseWithInterceptors<T>(await this.doFetch(ctx), ctx);
        } catch (err) {
          if (controller.signal.aborted) throw err;
          if (attempt < retry.attempts && isRetryableError(err, method, retry)) {
            await delay(computeBackoffMs(attempt, retry.backoffMs, retry.maxBackoffMs));
            attempt += 1;
            continue;
          }
          throw err;
        }
      }
    } catch (err) {
      if (this.isAbort(err, controller)) {
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
      const res = await this.doAxiosCall(ctx, {
        onUploadProgress: options.onProgress
          ? (event) => {
              const total = event.total ?? 0;
              options.onProgress?.({
                loaded: event.loaded,
                total,
                percent: total > 0 ? Math.round((event.loaded / total) * 100) : 0,
              });
            }
          : undefined,
      });
      return await this.parseWithInterceptors<T>(this.axiosResponseToFetchLike(res), ctx);
    } catch (err) {
      if (this.isAbort(err, controller)) {
        throw new CancelledError(controller.signal.reason as string | undefined);
      }
      throw err;
    }
  }

  private isAbort(err: unknown, controller: AbortController): boolean {
    if (controller.signal.aborted) return true;
    if (err instanceof DOMException && err.name === 'AbortError') return true;
    if (axios.isCancel(err)) return true;
    if (err instanceof AxiosError && err.code === 'ERR_CANCELED') return true;
    return false;
  }

  private async applyAuth(headers: Headers, method: string): Promise<void> {
    if (this.mode === 'token') {
      let access = await this.store.get(KEYS.access);
      // Skip nested refresh: refresh() itself posts via postJson → applyAuth.
      if (access !== null && isJwtExpired(access) && !this.inRefresh) {
        // Proactively refresh before attaching an already-expired token.
        const refreshToken = await this.store.get(KEYS.refresh);
        if (refreshToken !== null) {
          try {
            await this.refresh(refreshToken);
            access = await this.store.get(KEYS.access);
          } catch {
            // Fall through with the (expired) token; the normal 401 → refresh
            // → retry-once path below will handle it if this also fails.
          }
        }
      }
      if (access !== null) headers.set('Authorization', `Bearer ${access}`);
    } else if (UNSAFE.has(method)) {
      const csrf = this.getCsrfToken?.();
      if (csrf !== undefined) headers.set('x-csrf-token', csrf);
    }
  }

  /** Represents a fetched response in the shape our internal pipeline expects. */
  private async doFetch(ctx: RequestContext): Promise<Response> {
    return this.axiosResponseToFetchLike(await this.doAxiosCall(ctx));
  }

  private async doAxiosCall(
    ctx: RequestContext,
    extra: Pick<AxiosRequestConfig, 'onUploadProgress'> = {},
  ): Promise<AxiosResponse> {
    const headers: Record<string, string> = {};
    ctx.headers.forEach((value, key) => { headers[key] = value; });

    // `ctx.body` mirrors fetch's `BodyInit` and is already caller-serialized
    // (e.g. a JSON string) or a FormData instance — pass it through untouched
    // rather than letting axios re-transform it.
    try {
      return await this.http.request({
        url: ctx.url,
        baseURL: '', // ctx.url is already absolute (this.baseUrl + path)
        method: ctx.method,
        headers,
        data: ctx.body,
        signal: ctx.signal,
        responseType: 'text',
        transformResponse: (res) => res,
        transformRequest: (d) => d,
        ...extra,
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.code === 'ERR_CANCELED' || axios.isCancel(err)) throw err;
        // Network error / timeout / no response received at all.
        throw new ApiError(0, err.code === 'ECONNABORTED' ? 'Request timed out' : (err.message || 'Network error'));
      }
      throw err;
    }
  }

  private axiosResponseToFetchLike(res: AxiosResponse): Response {
    const headers = new Headers();
    for (const [key, value] of Object.entries(res.headers ?? {})) {
      if (typeof value === 'string') headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(', '));
    }
    const status = res.status;
    const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? '');
    return {
      status,
      statusText: res.statusText,
      ok: status >= 200 && status < 300,
      headers,
      text: async () => text,
    } as unknown as Response;
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

    const res = await this.doFetch({
      url: `${this.baseUrl}${path}`,
      method: 'POST',
      headers,
      body: JSON.stringify(body),
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
