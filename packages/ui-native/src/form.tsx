import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Text, View, type TextStyle } from 'react-native';
import { useNativeTheme } from './theme';

// ---------------------------------------------------------------------------
// Types (same API contract as ui-web/form.tsx)
// ---------------------------------------------------------------------------

export type FieldValidator<T = unknown> = (value: T, values: Record<string, unknown>) => string | undefined;

export interface FieldConfig {
  required?: boolean;
  validate?: FieldValidator;
}

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
  handleSubmit: () => void;
  reset: (values?: T) => void;
  getFieldProps: (field: keyof T) => {
    value: unknown;
    onChangeText: (text: string) => void;
    onBlur: () => void;
    error: string | undefined;
  };
}

// ---------------------------------------------------------------------------
// useForm hook (identical logic to ui-web, RN-adapted getFieldProps)
// ---------------------------------------------------------------------------

export function useForm<T extends Record<string, unknown>>(options: UseFormOptions<T>): UseFormReturn<T> {
  const { initialValues, fields = {}, onSubmit } = options;
  const initialRef = useRef(initialValues);
  const [values, setValuesState] = useState<T>({ ...initialValues });
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);

  const dirty = useMemo(() => {
    return Object.keys(values).some((k) => values[k] !== initialRef.current[k as keyof T]);
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
    return Object.keys(values).every((k) => !validateField(k as keyof T, values[k as keyof T]));
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

  const handleSubmit = useCallback(() => {
    const allTouched: Partial<Record<keyof T, boolean>> = {};
    for (const k of Object.keys(values)) allTouched[k as keyof T] = true;
    setTouched(allTouched);
    if (!validate()) return;
    setSubmitting(true);
    Promise.resolve(onSubmit(values)).finally(() => setSubmitting(false));
  }, [values, validate, onSubmit]);

  const reset = useCallback((newValues?: T) => {
    const v = newValues ?? initialRef.current;
    initialRef.current = v;
    setValuesState({ ...v });
    setErrors({});
    setTouched({});
    setSubmitting(false);
  }, []);

  const getFieldProps = useCallback(
    (field: keyof T) => ({
      value: values[field],
      onChangeText: (text: string) => setValue(field, text as T[keyof T]),
      onBlur: () => touch(field),
      error: touched[field] ? errors[field] : undefined,
    }),
    [values, errors, touched, setValue, touch],
  );

  return {
    values,
    errors,
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
// FormField component (RN version)
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
  const { styles: t } = useNativeTheme();

  return (
    <View style={{ marginBottom: t.spacing.md }}>
      {label != null && (
        <View style={{ flexDirection: 'row', marginBottom: t.spacing.xs }}>
          <Text style={{
            fontSize: t.typography.size.sm,
            color: t.colors.fgMuted,
            fontWeight: t.typography.weight.medium as TextStyle['fontWeight'],
            fontFamily: t.typography.fontFamily,
          }}>
            {label}
          </Text>
          {required && (
            <Text style={{ color: t.colors.danger, marginLeft: 2 }}>*</Text>
          )}
        </View>
      )}
      {children}
      {error != null && (
        <Text style={{
          marginTop: t.spacing.xs,
          fontSize: t.typography.size.xs,
          color: t.colors.danger,
          fontFamily: t.typography.fontFamily,
        }}>
          {error}
        </Text>
      )}
      {hint != null && error == null && (
        <Text style={{
          marginTop: t.spacing.xs,
          fontSize: t.typography.size.xs,
          color: t.colors.fgSubtle,
          fontFamily: t.typography.fontFamily,
        }}>
          {hint}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// FormContext
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
