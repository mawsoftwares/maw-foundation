import { useCallback, useState, type CSSProperties, type ReactNode } from 'react';
import type { StoredFile } from '@mawsoftwares/sdk/contracts/IFileStorage';
import {
  TextField,
  TextArea,
  Select,
  MultiSelect,
  RadioGroup,
  Checkbox,
  Toggle,
  DatePicker,
  TimePicker,
  DateRangePicker,
  SearchableSelect,
  ProfileAvatarUpload,
  IconButton,
} from './components';
import type {
  RadioOption,
  MultiSelectOption,
  SearchableSelectOption,
  DateRange,
  ProfileAvatarUploadProps,
} from './components';
import { FormField } from './form';
import { FileUpload, type FileUploadProps } from './file-upload';

/**
 * Ready-made, drop-in form fields.
 *
 * Every field below is a small wrapper around an existing `ui-web` primitive
 * (`TextField`, `Select`, `DatePicker`, …) that already has the right HTML
 * input semantics (`type="email"`, `type="tel"`, …) wired in, plus — for the
 * fields where a format is well-defined (email, phone, URL, number ranges) —
 * built-in format validation that runs on blur. Pass `error` yourself for a
 * server-side/cross-field error; it always takes precedence over the field's
 * own validation.
 *
 * These are for ordinary hand-built forms. For schema-driven forms, use
 * `DynamicForm` (`dynamic-form.tsx`) instead — it wires the same underlying
 * primitives up from a `FormSchema`.
 */

// ---------------------------------------------------------------------------
// Shared validation helpers
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/;
// Permissive: 7-15 digits, optional leading +, spaces/hyphens/parens allowed as separators.
const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

export function isValidUrl(value: string): boolean {
  return URL_RE.test(value);
}

export function isValidPhone(value: string): boolean {
  return PHONE_RE.test(value.trim()) && value.replace(/\D/g, '').length >= 7;
}

/**
 * Runs `validate` against `value` only after the field has been touched
 * (blurred) at least once, so errors don't appear before the user has had a
 * chance to type anything. Returns the computed error plus an `onBlur` to
 * wire up.
 */
function useTouchedValidation<V>(
  value: V,
  validate: (value: V) => string | undefined,
): { readonly internalError: string | undefined; readonly onBlur: () => void } {
  const [touched, setTouched] = useState(false);
  const onBlur = useCallback(() => setTouched(true), []);
  return { internalError: touched ? validate(value) : undefined, onBlur };
}

function requiredError(value: unknown, required: boolean | undefined): string | undefined {
  if (!required) return undefined;
  if (value === undefined || value === null) return 'This field is required';
  if (typeof value === 'string' && value.trim() === '') return 'This field is required';
  if (Array.isArray(value) && value.length === 0) return 'This field is required';
  return undefined;
}

// ---------------------------------------------------------------------------
// Text-shaped fields with built-in format validation
// ---------------------------------------------------------------------------

export interface EmailFieldProps {
  readonly name?: string;
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly placeholder?: string;
  readonly style?: CSSProperties;
}

/** Email input — validates the address shape on blur. */
export function EmailField({
  name, label = 'Email', value, onChange, error, required, disabled, readOnly, placeholder, style,
}: EmailFieldProps): ReactNode {
  const validate = useCallback(
    (v: string) => requiredError(v, required) ?? (v.trim() !== '' && !isValidEmail(v) ? 'Invalid email address' : undefined),
    [required],
  );
  const { internalError, onBlur } = useTouchedValidation(value, validate);
  return (
    <TextField
      type="email"
      name={name}
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      error={error ?? internalError}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      placeholder={placeholder ?? 'email@example.com'}
      style={style}
    />
  );
}

export interface PasswordFieldProps {
  readonly name?: string;
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly minLength?: number;
  readonly placeholder?: string;
  /** Show a show/hide toggle button inside the field. Defaults to true. */
  readonly toggleVisibility?: boolean;
  readonly autoComplete?: string;
  readonly style?: CSSProperties;
}

/** Password input with an optional show/hide toggle and a minimum-length check. */
export function PasswordField({
  name, label = 'Password', value, onChange, error, required, disabled, minLength, placeholder,
  toggleVisibility = true, autoComplete = 'current-password', style,
}: PasswordFieldProps): ReactNode {
  const [visible, setVisible] = useState(false);
  const validate = useCallback(
    (v: string) => requiredError(v, required) ?? (minLength !== undefined && v.length > 0 && v.length < minLength
      ? `Must be at least ${minLength} characters`
      : undefined),
    [required, minLength],
  );
  const { internalError, onBlur } = useTouchedValidation(value, validate);
  return (
    <div style={{ position: 'relative', ...style }}>
      <TextField
        type={visible ? 'text' : 'password'}
        name={name}
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        error={error ?? internalError}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={toggleVisibility ? { paddingRight: 40 } : undefined}
      />
      {toggleVisibility && (
        <div style={{ position: 'absolute', right: 4, top: label ? 22 : -2 }}>
          <IconButton
            type="button"
            label={visible ? 'Hide password' : 'Show password'}
            onClick={() => setVisible((v) => !v)}
            disabled={disabled}
            style={{ width: 32, height: 32 }}
          >
            {visible ? '🙈' : '👁'}
          </IconButton>
        </div>
      )}
    </div>
  );
}

export interface PhoneFieldProps {
  readonly name?: string;
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly style?: CSSProperties;
}

/** Phone input (`type="tel"`) — validates a loose international shape on blur. */
export function PhoneField({
  name, label = 'Phone', value, onChange, error, required, disabled, placeholder, style,
}: PhoneFieldProps): ReactNode {
  const validate = useCallback(
    (v: string) => requiredError(v, required) ?? (v.trim() !== '' && !isValidPhone(v) ? 'Invalid phone number' : undefined),
    [required],
  );
  const { internalError, onBlur } = useTouchedValidation(value, validate);
  return (
    <TextField
      type="tel"
      name={name}
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      error={error ?? internalError}
      required={required}
      disabled={disabled}
      placeholder={placeholder ?? '+1 234 567 8900'}
      style={style}
    />
  );
}

export interface UrlFieldProps {
  readonly name?: string;
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly style?: CSSProperties;
}

/** URL input — validates `https?://…` shape on blur. */
export function UrlField({
  name, label = 'URL', value, onChange, error, required, disabled, placeholder, style,
}: UrlFieldProps): ReactNode {
  const validate = useCallback(
    (v: string) => requiredError(v, required) ?? (v.trim() !== '' && !isValidUrl(v) ? 'Invalid URL (must start with http:// or https://)' : undefined),
    [required],
  );
  const { internalError, onBlur } = useTouchedValidation(value, validate);
  return (
    <TextField
      type="url"
      name={name}
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      error={error ?? internalError}
      required={required}
      disabled={disabled}
      placeholder={placeholder ?? 'https://example.com'}
      style={style}
    />
  );
}

export interface NumberFieldProps {
  readonly name?: string;
  readonly label?: string;
  readonly value: number | '';
  readonly onChange: (value: number | '') => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly placeholder?: string;
  readonly style?: CSSProperties;
}

/** Numeric input — validates `min`/`max` on blur. */
export function NumberField({
  name, label, value, onChange, error, required, disabled, min, max, step, placeholder, style,
}: NumberFieldProps): ReactNode {
  const validate = useCallback(
    (v: number | '') => {
      const req = requiredError(v === '' ? '' : String(v), required);
      if (req) return req;
      if (v === '') return undefined;
      if (min !== undefined && v < min) return `Must be at least ${min}`;
      if (max !== undefined && v > max) return `Must be at most ${max}`;
      return undefined;
    },
    [required, min, max],
  );
  const { internalError, onBlur } = useTouchedValidation(value, validate);
  return (
    <TextField
      type="number"
      name={name}
      label={label}
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === '' ? '' : Number(raw));
      }}
      onBlur={onBlur}
      error={error ?? internalError}
      required={required}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      style={style}
    />
  );
}

export interface CurrencyFieldProps {
  readonly name?: string;
  readonly label?: string;
  readonly value: number | '';
  readonly onChange: (value: number | '') => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly min?: number;
  readonly currencyCode?: string;
  readonly placeholder?: string;
  readonly style?: CSSProperties;
}

/** Currency amount input — two-decimal step, optional currency-code prefix, non-negative by default. */
export function CurrencyField({
  name, label, value, onChange, error, required, disabled, min = 0, currencyCode, placeholder = '0.00', style,
}: CurrencyFieldProps): ReactNode {
  const validate = useCallback(
    (v: number | '') => {
      const req = requiredError(v === '' ? '' : String(v), required);
      if (req) return req;
      if (v === '') return undefined;
      if (min !== undefined && v < min) return `Must be at least ${min}`;
      return undefined;
    },
    [required, min],
  );
  const { internalError, onBlur } = useTouchedValidation(value, validate);
  return (
    <div style={{ position: 'relative', ...style }}>
      {currencyCode !== undefined && (
        <span
          style={{
            position: 'absolute',
            left: 8,
            top: label ? 42 : 12,
            fontSize: 'var(--maw-text-sm)',
            color: 'var(--maw-fgMuted)',
            pointerEvents: 'none',
          }}
        >
          {currencyCode}
        </span>
      )}
      <TextField
        type="number"
        name={name}
        label={label}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === '' ? '' : Number(raw));
        }}
        onBlur={onBlur}
        error={error ?? internalError}
        required={required}
        disabled={disabled}
        step="0.01"
        min={min}
        placeholder={placeholder}
        style={currencyCode !== undefined ? { paddingLeft: 40 } : undefined}
      />
    </div>
  );
}

export interface TextAreaFieldProps {
  readonly name?: string;
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly rows?: number;
  readonly maxLength?: number;
  readonly placeholder?: string;
  readonly style?: CSSProperties;
}

/** Multi-line text input, with an optional character counter when `maxLength` is set. */
export function TextAreaField({
  name, label, value, onChange, error, required, disabled, rows = 3, maxLength, placeholder, style,
}: TextAreaFieldProps): ReactNode {
  const validate = useCallback((v: string) => requiredError(v, required), [required]);
  const { internalError, onBlur } = useTouchedValidation(value, validate);
  return (
    <div style={style}>
      <TextArea
        name={name}
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        error={error ?? internalError}
        required={required}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
      />
      {maxLength !== undefined && (
        <div style={{ textAlign: 'right', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgSubtle)', marginTop: -8 }}>
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Choice fields (thin, named wrappers around existing primitives)
// ---------------------------------------------------------------------------

export interface SelectFieldProps {
  readonly name?: string;
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly { value: string; label: string }[];
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly style?: CSSProperties;
}

/** Single-choice dropdown. */
export function SelectField({
  name, label, value, onChange, options, error, required, disabled, placeholder, style,
}: SelectFieldProps): ReactNode {
  const validate = useCallback((v: string) => requiredError(v, required), [required]);
  const { internalError, onBlur } = useTouchedValidation(value, validate);
  return (
    <Select
      name={name}
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      options={options}
      error={error ?? internalError}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      style={style}
    />
  );
}

export interface MultiSelectFieldProps {
  readonly label?: string;
  readonly value: readonly string[];
  readonly onChange: (value: readonly string[]) => void;
  readonly options: readonly MultiSelectOption[];
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly maxSelections?: number;
  readonly style?: CSSProperties;
}

/** Multi-choice dropdown with search and chip removal. */
export function MultiSelectField({
  label, value, onChange, options, error, required, disabled, placeholder, maxSelections, style,
}: MultiSelectFieldProps): ReactNode {
  const validate = useCallback((v: readonly string[]) => requiredError(v, required), [required]);
  const { internalError } = useTouchedValidation(value, validate);
  return (
    <MultiSelect
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      error={error ?? (value.length > 0 ? undefined : internalError)}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      maxSelections={maxSelections}
      style={style}
    />
  );
}

export interface RadioFieldProps {
  readonly name: string;
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly RadioOption[];
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly direction?: 'row' | 'column';
  readonly style?: CSSProperties;
}

/** Radio-button group. */
export function RadioField({
  name, label, value, onChange, options, error, required, disabled, direction, style,
}: RadioFieldProps): ReactNode {
  return (
    <RadioGroup
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      error={error}
      required={required}
      disabled={disabled}
      direction={direction}
      style={style}
    />
  );
}

export interface CheckboxFieldProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly hint?: string;
  readonly style?: CSSProperties;
}

/**
 * Single checkbox. Unlike `Checkbox`, this renders through `FormField` so it
 * gets error/required/hint text — `Checkbox` itself has no error slot.
 */
export function CheckboxField({
  label, checked, onChange, error, required, disabled, hint, style,
}: CheckboxFieldProps): ReactNode {
  return (
    <div style={style}>
      <FormField error={error} hint={hint}>
        <Checkbox label={`${label}${required ? ' *' : ''}`} checked={checked} onChange={onChange} disabled={disabled} />
      </FormField>
    </div>
  );
}

export interface SwitchFieldProps {
  readonly label?: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly hint?: string;
  readonly style?: CSSProperties;
}

/** On/off toggle switch, rendered through `FormField` for error/hint text. */
export function SwitchField({
  label, checked, onChange, error, disabled, hint, style,
}: SwitchFieldProps): ReactNode {
  return (
    <div style={style}>
      <FormField error={error} hint={hint}>
        <Toggle label={label} checked={checked} onChange={onChange} disabled={disabled} />
      </FormField>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date / time fields
// ---------------------------------------------------------------------------

export interface DateFieldProps {
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly min?: string;
  readonly max?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly style?: CSSProperties;
}

/** Date picker (ISO `YYYY-MM-DD` value). */
export function DateField(props: DateFieldProps): ReactNode {
  return <DatePicker {...props} />;
}

export interface TimeFieldProps {
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly use24Hour?: boolean;
  readonly style?: CSSProperties;
}

/** Time picker (`HH:mm` value). */
export function TimeField(props: TimeFieldProps): ReactNode {
  return <TimePicker {...props} />;
}

export interface DateTimeFieldProps {
  readonly label?: string;
  /** ISO datetime, e.g. `2026-09-10T14:30`. */
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly style?: CSSProperties;
}

/** Combined date + time picker, stored as a single ISO `date T time` string. */
export function DateTimeField({
  label, value, onChange, error, required, disabled, style,
}: DateTimeFieldProps): ReactNode {
  const [datePart, timePart] = value.split('T');
  return (
    <div style={{ display: 'flex', gap: 'var(--maw-space-sm)', ...style }}>
      <div style={{ flex: 1 }}>
        <DatePicker
          label={label}
          value={datePart ?? ''}
          onChange={(date) => onChange(date ? `${date}T${timePart ?? '00:00'}` : '')}
          error={error}
          required={required}
          disabled={disabled}
        />
      </div>
      <div style={{ flex: 1 }}>
        <TimePicker
          label={label ? ' ' : undefined}
          value={timePart ?? ''}
          onChange={(time) => onChange(datePart ? `${datePart}T${time}` : '')}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export interface DateRangeFieldProps {
  readonly label?: string;
  readonly value: DateRange;
  readonly onChange: (value: DateRange) => void;
  readonly min?: string;
  readonly max?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly style?: CSSProperties;
}

/** Date-range picker (`{ start, end }` ISO dates). */
export function DateRangeField(props: DateRangeFieldProps): ReactNode {
  return <DateRangePicker {...props} />;
}

export interface AutocompleteFieldProps {
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options?: readonly SearchableSelectOption[];
  readonly loadOptions?: (query: string) => Promise<readonly SearchableSelectOption[]>;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly placeholder?: string;
  readonly style?: CSSProperties;
}

/** Searchable single-select — pass `options` for a static list or `loadOptions` for async search. */
export function AutocompleteField(props: AutocompleteFieldProps): ReactNode {
  return <SearchableSelect {...props} />;
}

// ---------------------------------------------------------------------------
// File fields
// ---------------------------------------------------------------------------

/**
 * Same shape as `FileUploadProps` — requires an `upload` implementation (e.g.
 * calling `@mawsoftwares/api-client`'s `upload()`), since there's no default
 * endpoint; that's always app-specific.
 */
export type FileFieldProps = FileUploadProps;

/**
 * File upload field with drag-and-drop, per-file progress, and retry.
 * Requires an `upload` implementation — there's no default endpoint, since
 * that's always app-specific.
 */
export function FileField(props: FileFieldProps): ReactNode {
  return <FileUpload {...props} />;
}

export interface ImageFieldProps extends Omit<FileFieldProps, 'accept'> {
  readonly accept?: string[];
}

/** `FileField` preset for images (accepts `image/*` by default). */
export function ImageField({ accept = ['image/*'], ...rest }: ImageFieldProps): ReactNode {
  return <FileUpload accept={accept} {...rest} />;
}

export type AvatarFieldProps = ProfileAvatarUploadProps;

/** Circular profile-photo upload field (named alias of `ProfileAvatarUpload` for API consistency with the other `*Field` components). */
export function AvatarField(props: AvatarFieldProps): ReactNode {
  return <ProfileAvatarUpload {...props} />;
}

export type { StoredFile };
