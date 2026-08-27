import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  FormSchema,
  FormFieldDef,
  FormValidationRule,
  Condition,
  FieldCondition,
  ConditionGroup,
  FieldOption,
  OptionsSource,
  FormMode,
} from '@mawsoftwares/sdk';

// ---------------------------------------------------------------------------
// Condition evaluator
// ---------------------------------------------------------------------------

function evaluateFieldCondition(cond: FieldCondition, values: Record<string, unknown>): boolean {
  const val = values[cond.field];
  const str = String(val ?? '');

  switch (cond.operator) {
    case 'eq': return val === cond.value;
    case 'neq': return val !== cond.value;
    case 'in': return Array.isArray(cond.value) && (cond.value as unknown[]).includes(val);
    case 'not_in': return Array.isArray(cond.value) && !(cond.value as unknown[]).includes(val);
    case 'gt': return Number(val) > Number(cond.value);
    case 'lt': return Number(val) < Number(cond.value);
    case 'gte': return Number(val) >= Number(cond.value);
    case 'lte': return Number(val) <= Number(cond.value);
    case 'contains': return str.toLowerCase().includes(String(cond.value ?? '').toLowerCase());
    case 'is_empty': return val == null || str === '';
    case 'is_not_empty': return val != null && str !== '';
    default: return true;
  }
}

function isConditionGroup(c: Condition): c is ConditionGroup {
  return 'operator' in c && ('conditions' in c);
}

export function evaluateCondition(condition: Condition | undefined, values: Record<string, unknown>): boolean {
  if (!condition) return false;
  if (isConditionGroup(condition)) {
    const results = condition.conditions.map((c) => evaluateCondition(c, values));
    return condition.operator === 'and' ? results.every(Boolean) : results.some(Boolean);
  }
  return evaluateFieldCondition(condition, values);
}

// ---------------------------------------------------------------------------
// Validation runner
// ---------------------------------------------------------------------------

function runValidationRule(
  rule: FormValidationRule,
  value: unknown,
  values: Record<string, unknown>,
): string | undefined {
  const str = typeof value === 'string' ? value : '';
  const num = typeof value === 'number' ? value : Number(value);

  switch (rule.type) {
    case 'required':
      if (rule.value && (value == null || str.trim() === '')) {
        return rule.message ?? 'This field is required';
      }
      if (rule.value && Array.isArray(value) && value.length === 0) {
        return rule.message ?? 'This field is required';
      }
      return undefined;

    case 'minLength':
      if (str.length > 0 && str.length < rule.value) {
        return rule.message ?? `Must be at least ${rule.value} characters`;
      }
      return undefined;

    case 'maxLength':
      if (str.length > rule.value) {
        return rule.message ?? `Must be at most ${rule.value} characters`;
      }
      return undefined;

    case 'min':
      if (value != null && str !== '' && num < rule.value) {
        return rule.message ?? `Must be at least ${rule.value}`;
      }
      return undefined;

    case 'max':
      if (value != null && str !== '' && num > rule.value) {
        return rule.message ?? `Must be at most ${rule.value}`;
      }
      return undefined;

    case 'pattern': {
      const regex = new RegExp(rule.value);
      if (str.length > 0 && !regex.test(str)) {
        return rule.message ?? 'Invalid format';
      }
      return undefined;
    }

    case 'email': {
      if (str.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
        return rule.message ?? 'Invalid email address';
      }
      return undefined;
    }

    case 'url': {
      if (str.length > 0 && !/^https?:\/\/.+/.test(str)) {
        return rule.message ?? 'Invalid URL';
      }
      return undefined;
    }

    case 'fileSize':
      return undefined;

    case 'fileType':
      return undefined;

    case 'custom':
      return rule.validate(value, values);

    case 'async':
      return undefined;

    default:
      return undefined;
  }
}

function validateFieldValue(
  field: FormFieldDef,
  value: unknown,
  values: Record<string, unknown>,
  isConditionallyRequired: boolean,
): string | undefined {
  if (field.required || isConditionallyRequired) {
    const isEmpty = value == null || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);
    if (isEmpty) return 'This field is required';
  }

  if (field.validation) {
    for (const rule of field.validation) {
      const error = runValidationRule(rule, value, values);
      if (error) return error;
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Dynamic options loader
// ---------------------------------------------------------------------------

interface OptionsState {
  readonly options: readonly FieldOption[];
  readonly loading: boolean;
}

// ---------------------------------------------------------------------------
// useDynamicForm — core engine hook
// ---------------------------------------------------------------------------

export interface UseDynamicFormOptions {
  readonly schema: FormSchema;
  readonly initialValues?: Record<string, unknown>;
  readonly mode?: FormMode;
  readonly onSubmit?: (values: Record<string, unknown>) => void | Promise<void>;
  readonly permissions?: ReadonlySet<string>;
  readonly featureFlags?: ReadonlySet<string>;
  readonly t?: (key: string) => string;
}

export interface DynamicFieldState {
  readonly field: FormFieldDef;
  readonly value: unknown;
  readonly error?: string;
  readonly touched: boolean;
  readonly dirty: boolean;
  readonly visible: boolean;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly required: boolean;
  readonly options: readonly FieldOption[];
  readonly optionsLoading: boolean;
}

export interface UseDynamicFormReturn {
  readonly values: Record<string, unknown>;
  readonly errors: Record<string, string | undefined>;
  readonly touched: Record<string, boolean>;
  readonly dirty: boolean;
  readonly valid: boolean;
  readonly submitting: boolean;
  readonly mode: FormMode;

  readonly fieldStates: ReadonlyMap<string, DynamicFieldState>;
  readonly visibleFields: readonly FormFieldDef[];

  readonly getValue: (name: string) => unknown;
  readonly setValue: (name: string, value: unknown) => void;
  readonly setValues: (partial: Record<string, unknown>) => void;
  readonly getError: (name: string) => string | undefined;
  readonly setError: (name: string, error: string | undefined) => void;
  readonly touch: (name: string) => void;

  readonly validate: () => boolean;
  readonly handleSubmit: (e?: { preventDefault?: () => void }) => void;
  readonly reset: (values?: Record<string, unknown>) => void;
  readonly resetField: (name: string) => void;
}

export function useDynamicForm(options: UseDynamicFormOptions): UseDynamicFormReturn {
  const { schema, onSubmit, permissions, featureFlags } = options;
  const mode = options.mode ?? schema.mode ?? 'create';
  const isReadOnly = mode === 'readonly';

  const buildDefaults = useCallback((): Record<string, unknown> => {
    const defaults: Record<string, unknown> = {};
    for (const field of schema.fields) {
      defaults[field.name] = field.defaultValue ?? '';
    }
    return defaults;
  }, [schema.fields]);

  const computeInitial = useCallback((): Record<string, unknown> => {
    const defaults = buildDefaults();
    const initial = options.initialValues ?? {};
    if (schema.transform?.fromApi && Object.keys(initial).length > 0) {
      return { ...defaults, ...schema.transform.fromApi(initial) };
    }
    return { ...defaults, ...initial };
  }, [buildDefaults, options.initialValues, schema.transform]);

  const initialRef = useRef(computeInitial());
  const [values, setValuesState] = useState<Record<string, unknown>>(() => ({ ...initialRef.current }));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, OptionsState>>({});

  const hasPermission = useCallback((code: string | undefined) => {
    if (!code) return true;
    if (!permissions) return true;
    return permissions.has(code);
  }, [permissions]);

  const hasFeature = useCallback((flag: string | undefined) => {
    if (!flag) return true;
    if (!featureFlags) return true;
    return featureFlags.has(flag);
  }, [featureFlags]);

  const isFieldVisible = useCallback((field: FormFieldDef): boolean => {
    if (field.hidden) return false;
    if (!hasPermission(field.permission)) return false;
    if (!hasFeature(field.featureFlag)) return false;
    if (field.visibleWhen && !evaluateCondition(field.visibleWhen, values)) return false;
    if (field.hiddenWhen && evaluateCondition(field.hiddenWhen, values)) return false;
    return true;
  }, [values, hasPermission, hasFeature]);

  const isFieldDisabled = useCallback((field: FormFieldDef): boolean => {
    if (isReadOnly) return true;
    if (field.disabled) return true;
    if (field.disabledWhen && evaluateCondition(field.disabledWhen, values)) return true;
    return false;
  }, [values, isReadOnly]);

  const isFieldRequired = useCallback((field: FormFieldDef): boolean => {
    if (field.required) return true;
    if (field.requiredWhen && evaluateCondition(field.requiredWhen, values)) return true;
    return false;
  }, [values]);

  const visibleFields = useMemo(() => schema.fields.filter(isFieldVisible), [schema.fields, isFieldVisible]);

  const dirty = useMemo(() => {
    return Object.keys(values).some((k) => values[k] !== initialRef.current[k]);
  }, [values]);

  const validateField = useCallback((field: FormFieldDef, val: unknown): string | undefined => {
    if (!isFieldVisible(field)) return undefined;
    return validateFieldValue(field, val, values, isFieldRequired(field));
  }, [values, isFieldVisible, isFieldRequired]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string | undefined> = {};
    let valid = true;
    for (const field of schema.fields) {
      const error = validateField(field, values[field.name]);
      if (error) {
        newErrors[field.name] = error;
        valid = false;
      }
    }
    setErrors(newErrors);
    return valid;
  }, [schema.fields, values, validateField]);

  const valid = useMemo(() => {
    return visibleFields.every((f) => !validateField(f, values[f.name]));
  }, [visibleFields, values, validateField]);

  const setValue = useCallback((name: string, value: unknown) => {
    setValuesState((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  }, []);

  const setValuesBatch = useCallback((partial: Record<string, unknown>) => {
    setValuesState((prev) => ({ ...prev, ...partial }));
  }, []);

  const touchField = useCallback((name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const field = schema.fields.find((f) => f.name === name);
    if (field) {
      setValuesState((prev) => {
        const error = validateField(field, prev[name]);
        if (error) setErrors((e) => ({ ...e, [name]: error }));
        return prev;
      });
    }
  }, [schema.fields, validateField]);

  const handleSubmit = useCallback((e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    const allTouched: Record<string, boolean> = {};
    for (const f of schema.fields) allTouched[f.name] = true;
    setTouched(allTouched);

    if (!validate()) {
      if (schema.focusFirstError) {
        const firstError = schema.fields.find((f) => {
          const err = validateField(f, values[f.name]);
          return err != null;
        });
        if (firstError) {
          const el = document.querySelector<HTMLElement>(`[name="${firstError.name}"]`);
          el?.focus();
        }
      }
      return;
    }

    if (!onSubmit) return;

    const submitValues = schema.transform?.toApi ? schema.transform.toApi(values) : values;
    setSubmitting(true);
    Promise.resolve(onSubmit(submitValues)).finally(() => setSubmitting(false));
  }, [schema, values, validate, validateField, onSubmit]);

  const reset = useCallback((newValues?: Record<string, unknown>) => {
    const v = newValues ? { ...buildDefaults(), ...newValues } : { ...initialRef.current };
    if (newValues) initialRef.current = v;
    setValuesState(v);
    setErrors({});
    setTouched({});
    setSubmitting(false);
  }, [buildDefaults]);

  const resetField = useCallback((name: string) => {
    setValuesState((prev) => ({ ...prev, [name]: initialRef.current[name] ?? '' }));
    setErrors((prev) => { const c = { ...prev }; delete c[name]; return c; });
    setTouched((prev) => { const c = { ...prev }; delete c[name]; return c; });
  }, []);

  // Load dynamic options for fields with optionsSource
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    for (const field of schema.fields) {
      if (!('optionsSource' in field)) continue;
      const src = (field as { optionsSource?: OptionsSource }).optionsSource;
      if (!src) continue;

      if (src.type === 'remote') {
        setDynamicOptions((prev) => ({ ...prev, [field.name]: { options: prev[field.name]?.options ?? [], loading: true } }));
        src.fetchFn().then((opts) => {
          setDynamicOptions((prev) => ({ ...prev, [field.name]: { options: opts, loading: false } }));
        });
      }

      if (src.type === 'dependent') {
        const parentVal = values[src.dependsOn];
        if (parentVal == null || parentVal === '') {
          setDynamicOptions((prev) => ({ ...prev, [field.name]: { options: [], loading: false } }));
          continue;
        }
        const key = field.name;
        if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
        setDynamicOptions((prev) => ({ ...prev, [key]: { options: prev[key]?.options ?? [], loading: true } }));
        const timer = setTimeout(() => {
          src.fetchFn(parentVal).then((opts) => {
            setDynamicOptions((prev) => ({ ...prev, [key]: { options: opts, loading: false } }));
          });
        }, src.debounceMs ?? 0);
        debounceTimers.current[key] = timer;
      }
    }
  }, [schema.fields, values]);

  const getFieldOptions = useCallback((field: FormFieldDef): readonly FieldOption[] => {
    if ('options' in field && (field as { options?: readonly FieldOption[] }).options) {
      return (field as { options: readonly FieldOption[] }).options;
    }
    return dynamicOptions[field.name]?.options ?? [];
  }, [dynamicOptions]);

  const fieldStates = useMemo(() => {
    const map = new Map<string, DynamicFieldState>();
    for (const field of schema.fields) {
      const visible = isFieldVisible(field);
      map.set(field.name, {
        field,
        value: values[field.name],
        error: touched[field.name] ? errors[field.name] : undefined,
        touched: touched[field.name] ?? false,
        dirty: values[field.name] !== initialRef.current[field.name],
        visible,
        disabled: isFieldDisabled(field),
        readOnly: isReadOnly || (field.readOnly ?? false),
        required: isFieldRequired(field),
        options: getFieldOptions(field),
        optionsLoading: dynamicOptions[field.name]?.loading ?? false,
      });
    }
    return map;
  }, [schema.fields, values, errors, touched, isFieldVisible, isFieldDisabled, isFieldRequired, isReadOnly, getFieldOptions, dynamicOptions]);

  // Draft autosave
  useEffect(() => {
    if (!schema.draft?.enabled || !schema.draft.autoSaveMs || !schema.draft.onSaveDraft) return;
    const timer = setInterval(() => {
      if (dirty) schema.draft!.onSaveDraft!(values);
    }, schema.draft.autoSaveMs);
    return () => clearInterval(timer);
  }, [schema.draft, values, dirty]);

  return {
    values,
    errors,
    touched,
    dirty,
    valid,
    submitting,
    mode,
    fieldStates,
    visibleFields,
    getValue: (name) => values[name],
    setValue,
    setValues: setValuesBatch,
    getError: (name) => errors[name],
    setError: (name, error) => setErrors((prev) => ({ ...prev, [name]: error })),
    touch: touchField,
    validate,
    handleSubmit,
    reset,
    resetField,
  };
}

