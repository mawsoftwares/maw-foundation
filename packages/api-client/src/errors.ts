/** Thrown for non-2xx responses so callers can branch on `status`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    override readonly message: string,
    readonly body?: unknown,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiErrorField {
  readonly field: string;
  readonly message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function envelopeError(data: unknown): Record<string, unknown> | undefined {
  if (!isRecord(data) || !('error' in data)) return undefined;
  const err = data['error'];
  if (typeof err === 'string') return { message: err };
  if (isRecord(err)) return err;
  return undefined;
}

/** Parse the standard `{ success: false, error: { code, message, details } }` envelope. */
export function parseApiErrorPayload(
  data: unknown,
  fallback: string,
): { message: string; code?: string } {
  const err = envelopeError(data);
  if (err !== undefined) {
    const message = typeof err['message'] === 'string' && err['message'].length > 0
      ? err['message']
      : fallback;
    const code = typeof err['code'] === 'string' ? err['code'] : undefined;
    return { message, code };
  }

  if (isRecord(data) && typeof data['message'] === 'string' && data['message'].length > 0) {
    return { message: data['message'] };
  }

  return { message: fallback };
}

export function getApiErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (error instanceof ApiError) {
    return error.message.length > 0 ? error.message : fallback;
  }
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}

export function getApiErrorFields(error: unknown): readonly ApiErrorField[] {
  const body = error instanceof ApiError ? error.body : error;
  const err = envelopeError(body);
  if (err === undefined) return [];

  const details = err['details'];
  if (!isRecord(details) && !Array.isArray(details)) return [];

  if (Array.isArray(details)) {
    return details.flatMap((item) => fieldFromUnknown(item));
  }

  const nested = details['fields'];
  if (Array.isArray(nested)) {
    return nested.flatMap((item) => fieldFromUnknown(item));
  }

  if (typeof details['field'] === 'string') {
    const message = typeof err['message'] === 'string' ? err['message'] : 'Invalid value';
    return [{ field: details['field'], message }];
  }

  return [];
}

function fieldFromUnknown(item: unknown): ApiErrorField[] {
  if (!isRecord(item) || typeof item['field'] !== 'string') return [];
  const message = typeof item['message'] === 'string'
    ? item['message']
    : typeof item['error'] === 'string'
      ? item['error']
      : 'Invalid value';
  return [{ field: item['field'], message }];
}
