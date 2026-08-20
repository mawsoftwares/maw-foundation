import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldValidator<T = unknown> = (value: T, values: Record<string, unknown>) => string | undefined;

export interface FieldConfig {
  required?: boolean;
  validate?: FieldValidator;
}

export interface FormFieldState {
  value: unknown;
  error: string | undefined;
  touched: boolean;
  dirty: boolean;
}

export interface FormState {
  values: Record<string, unknown>;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  dirty: boolean;
  valid: boolean;
  submitting: boolean;
}

// ---------------------------------------------------------------------------
// useForm hook
// ---------------------------------------------------------------------------

export interface UseFormOptions<T extends Record<string, unknown>> {
  initialValues: T;
  fields?: Record<string, FieldConfig>;
  onSubmit: (values: T) => void | Promise<void>;
}

export interface UseFormReturn<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  dirty: boolean;
  valid: boolean;
  submitting: boolean;
  getValue: <K extends keyof T>(field: K) => T[K];
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setValues: (partial: Partial<T>) => void;
  getError: (field: keyof T) => string | undefined;
  setError: (field: keyof T, error: string | undefined) => void;
  isTouched: (field: keyof T) => boolean;
  touch: (field: keyof T) => void;
  validate: () => boolean;
  handleSubmit: (e?: FormEvent) => void;
  reset: (values?: T) => void;
  getFieldProps: (field: keyof T) => {
    value: unknown;
    onChange: (e: { target: { value: unknown } } | unknown) => void;
    onBlur: () => void;
    error: string | undefined;
  };
}

export function useForm<T extends Record<string, unknown>>(options: UseFormOptions<T>): UseFormReturn<T> {
  const { initialValues, fields = {}, onSubmit } = options;
  const initialRef = useRef(initialValues);
  const [values, setValuesState] = useState<T>({ ...initialValues });
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);

  const dirty = useMemo(() => {
    return Object.keys(values).some(
      (k) => values[k] !== initialRef.current[k as keyof T],
    );
  }, [values]);

  const validateField = useCallback(
    (field: keyof T, val: unknown): string | undefined => {
      const cfg = fields[field as string] as FieldConfig | undefined;
      if (!cfg) return undefined;
      if (cfg.required && (val === undefined || val === null || val === '')) {
        return 'This field is required';
      }
      if (cfg.validate) return cfg.validate(val, values as Record<string, unknown>);
      return undefined;
    },
    [fields, values],
  );

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let valid = true;
    for (const key of Object.keys(values) as (keyof T)[]) {
      const err = validateField(key, values[key]);
      if (err) {
        newErrors[key] = err;
        valid = false;
      }
    }
    setErrors(newErrors);
    return valid;
  }, [values, validateField]);

  const valid = useMemo(() => {
    return Object.keys(values).every(
      (k) => !validateField(k as keyof T, values[k as keyof T]),
    );
  }, [values, validateField]);

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  }, []);

  const setValuesBatch = useCallback((partial: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...partial }));
  }, []);

  const touch = useCallback((field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setValuesState((prev) => {
      const err = validateField(field, prev[field]);
      if (err) setErrors((e) => ({ ...e, [field]: err }));
      return prev;
    });
  }, [validateField]);

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      const allTouched: Partial<Record<keyof T, boolean>> = {};
      for (const k of Object.keys(values)) allTouched[k as keyof T] = true;
      setTouched(allTouched);
      if (!validate()) return;
      setSubmitting(true);
      Promise.resolve(onSubmit(values)).finally(() => setSubmitting(false));
    },
    [values, validate, onSubmit],
  );

  const reset = useCallback(
    (newValues?: T) => {
      const v = newValues ?? initialRef.current;
      initialRef.current = v;
      setValuesState({ ...v });
      setErrors({});
      setTouched({});
      setSubmitting(false);
    },
    [],
  );

  const getFieldProps = useCallback(
    (field: keyof T) => ({
      value: values[field],
      onChange: (e: { target: { value: unknown } } | unknown) => {
        const val = typeof e === 'object' && e !== null && 'target' in (e as Record<string, unknown>)
          ? ((e as { target: { value: unknown } }).target.value as T[keyof T])
          : (e as T[keyof T]);
        setValue(field, val);
      },
      onBlur: () => touch(field),
      error: touched[field] ? errors[field] : undefined,
    }),
    [values, errors, touched, setValue, touch],
  );

  return {
    values,
    errors: errors as Partial<Record<keyof T, string>>,
    touched,
    dirty,
    valid,
    submitting,
    getValue: (field) => values[field],
    setValue,
    setValues: setValuesBatch,
    getError: (field) => errors[field],
    setError: (field, error) => setErrors((prev) => ({ ...prev, [field]: error })),
    isTouched: (field) => touched[field] === true,
    touch,
    validate,
    handleSubmit,
    reset,
    getFieldProps,
  };
}

// ---------------------------------------------------------------------------
// FormField component
// ---------------------------------------------------------------------------

export function FormField({
  label,
  error,
  required,
  hint,
  children,
}: {
  label?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}): ReactNode {
  return (
    <div style={{ fontFamily: 'var(--maw-font-family)', marginBottom: 'var(--maw-space-md)' }}>
      {label !== undefined && (
        <div style={{ marginBottom: 'var(--maw-space-xs)', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)', fontWeight: 500 }}>
          {label}
          {required && <span style={{ color: 'var(--maw-danger)', marginLeft: 2 }}>*</span>}
        </div>
      )}
      {children}
      {error !== undefined && (
        <div style={{ marginTop: 'var(--maw-space-xs)', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-danger)' }}>
          {error}
        </div>
      )}
      {hint !== undefined && error === undefined && (
        <div style={{ marginTop: 'var(--maw-space-xs)', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgSubtle)' }}>
          {hint}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FormContext (for nested form access)
// ---------------------------------------------------------------------------

const FormContext = createContext<UseFormReturn<Record<string, unknown>> | null>(null);

export function FormProvider<T extends Record<string, unknown>>({
  form,
  children,
}: {
  form: UseFormReturn<T>;
  children: ReactNode;
}): ReactNode {
  return (
    <FormContext.Provider value={form as unknown as UseFormReturn<Record<string, unknown>>}>
      {children}
    </FormContext.Provider>
  );
}

export function useFormContext(): UseFormReturn<Record<string, unknown>> {
  const ctx = useContext(FormContext);
  if (ctx === null) throw new Error('useFormContext must be used within <FormProvider>');
  return ctx;
}
