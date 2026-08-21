const DEFAULT_SENSITIVE_KEYS = new Set([
  'password', 'secret', 'token', 'accesstoken', 'refreshtoken',
  'authorization', 'cookie', 'creditcard', 'cardnumber', 'cvv',
  'ssn', 'apikey', 'api_key', 'privatekey', 'private_key',
  'encryptionkey', 'encryption_key', 'jwtsecret', 'jwt_secret',
]);

const REDACTED = '[REDACTED]';

export function redact<T>(
  obj: T,
  additionalKeys?: readonly string[],
): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;

  const sensitiveKeys = additionalKeys
    ? new Set([...DEFAULT_SENSITIVE_KEYS, ...additionalKeys.map((k) => k.toLowerCase())])
    : DEFAULT_SENSITIVE_KEYS;

  return redactDeep(obj, sensitiveKeys) as T;
}

function redactDeep(value: unknown, sensitiveKeys: ReadonlySet<string>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => redactDeep(item, sensitiveKeys));
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (sensitiveKeys.has(key.toLowerCase())) {
      result[key] = REDACTED;
    } else if (typeof val === 'object' && val !== null) {
      result[key] = redactDeep(val, sensitiveKeys);
    } else {
      result[key] = val;
    }
  }
  return result;
}
