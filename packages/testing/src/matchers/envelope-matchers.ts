
interface SuccessEnvelope {
  success: true;
  data: unknown;
}

interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string };
}

function isSuccessEnvelope(v: unknown): v is SuccessEnvelope {
  return typeof v === 'object' && v !== null && 'success' in v && (v as SuccessEnvelope).success === true && 'data' in v;
}

function isErrorEnvelope(v: unknown): v is ErrorEnvelope {
  return (
    typeof v === 'object' &&
    v !== null &&
    'success' in v &&
    (v as ErrorEnvelope).success === false &&
    'error' in v &&
    typeof (v as ErrorEnvelope).error === 'object' &&
    (v as ErrorEnvelope).error !== null &&
    'code' in (v as ErrorEnvelope).error &&
    'message' in (v as ErrorEnvelope).error
  );
}

export function toBeSuccessEnvelope(received: unknown): { pass: boolean; message: () => string } {
  const pass = isSuccessEnvelope(received);
  return {
    pass,
    message: () =>
      pass
        ? 'expected value NOT to be a success envelope'
        : `expected a success envelope { success: true, data: ... } but got ${JSON.stringify(received)}`,
  };
}

export function toBeErrorEnvelope(received: unknown, expectedCode?: string): { pass: boolean; message: () => string } {
  const isEnv = isErrorEnvelope(received);
  const pass = isEnv && (expectedCode === undefined || received.error.code === expectedCode);
  return {
    pass,
    message: () =>
      pass
        ? `expected value NOT to be an error envelope${expectedCode ? ` with code "${expectedCode}"` : ''}`
        : isEnv
          ? `expected error envelope with code "${expectedCode}" but got code "${received.error.code}"`
          : `expected an error envelope { success: false, error: { code, message } } but got ${JSON.stringify(received)}`,
  };
}
