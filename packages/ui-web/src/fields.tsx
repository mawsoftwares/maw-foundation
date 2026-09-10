import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type ReactNode,
} from 'react';
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

// ---------------------------------------------------------------------------
// Masked text fields (generic + India presets)
// ---------------------------------------------------------------------------

const MASK_TOKENS: Record<string, RegExp> = {
  '9': /[0-9]/,
  A: /[a-zA-Z]/,
  '*': /[a-zA-Z0-9]/,
};

/**
 * Formats `raw` free-typed input against a `mask` template made of token
 * characters — `9` (digit), `A` (letter, auto-uppercased), `*`
 * (alphanumeric) — with every other mask character treated as a literal
 * that's inserted automatically (and skipped over if the user typed it
 * too, e.g. pasting an already-formatted value). Non-matching characters
 * are dropped; the result never exceeds the mask's length.
 */
export function applyMask(raw: string, mask: string): string {
  let out = '';
  let rawIndex = 0;
  let maskIndex = 0;
  while (maskIndex < mask.length && rawIndex < raw.length) {
    const maskChar = mask[maskIndex];
    if (maskChar === undefined) break;
    const tokenPattern = MASK_TOKENS[maskChar];
    if (!tokenPattern) {
      out += maskChar;
      if (raw[rawIndex] === maskChar) rawIndex++;
      maskIndex++;
      continue;
    }
    const rawChar = raw[rawIndex];
    rawIndex++;
    if (rawChar !== undefined && tokenPattern.test(rawChar)) {
      out += maskChar === 'A' ? rawChar.toUpperCase() : rawChar;
      maskIndex++;
    }
  }
  return out;
}

/** Strips a masked string down to just its significant (token) characters, in mask order. */
export function unmask(masked: string, mask: string): string {
  let out = '';
  for (let i = 0; i < masked.length && i < mask.length; i++) {
    const maskChar = mask[i];
    const maskedChar = masked[i];
    if (maskChar !== undefined && MASK_TOKENS[maskChar] && maskedChar !== undefined) out += maskedChar;
  }
  return out;
}

export interface MaskedFieldProps {
  readonly name?: string;
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Mask template — `9` digit, `A` letter (auto-uppercased), `*` alphanumeric, anything else a literal. */
  readonly mask: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly placeholder?: string;
  /** Extra validation run against the unmasked value once the field has been touched. */
  readonly validate?: (unmaskedValue: string) => string | undefined;
  readonly style?: CSSProperties;
}

/**
 * Free-typed text field that auto-formats against a mask template as the
 * user types (see `applyMask`). `value`/`onChange` carry the masked
 * (displayed) string — use `unmask` to recover just the significant
 * characters, e.g. for submitting a raw digit string to an API.
 */
export function MaskedField({
  name, label, value, onChange, mask, error, required, disabled, readOnly, placeholder, validate, style,
}: MaskedFieldProps): ReactNode {
  const validateFormatted = useCallback(
    (v: string) => requiredError(v, required) ?? (v.trim() !== '' ? validate?.(unmask(v, mask)) : undefined),
    [required, validate, mask],
  );
  const { internalError, onBlur } = useTouchedValidation(value, validateFormatted);
  return (
    <TextField
      name={name}
      label={label}
      value={value}
      onChange={(e) => onChange(applyMask(e.target.value, mask))}
      onBlur={onBlur}
      error={error ?? internalError}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      placeholder={placeholder ?? mask.replace(/[9A*]/g, '_')}
      style={style}
    />
  );
}

const AADHAAR_MASK = '9999 9999 9999';

export interface AadhaarFieldProps {
  readonly name?: string;
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly style?: CSSProperties;
}

/** Indian Aadhaar number field — formats as `9999 9999 9999` and validates 12 digits on blur. */
export function AadhaarField({
  name, label = 'Aadhaar number', value, onChange, error, required, disabled, style,
}: AadhaarFieldProps): ReactNode {
  const validate = useCallback(
    (digits: string) => (digits.length > 0 && digits.length !== 12 ? 'Aadhaar number must be 12 digits' : undefined),
    [],
  );
  return (
    <MaskedField
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      mask={AADHAAR_MASK}
      error={error}
      required={required}
      disabled={disabled}
      placeholder="0000 0000 0000"
      validate={validate}
      style={style}
    />
  );
}

const PAN_MASK = 'AAAAA9999A';
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export interface PanFieldProps {
  readonly name?: string;
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly style?: CSSProperties;
}

/** Indian PAN card number field — enforces the `AAAAA9999A` shape (5 letters, 4 digits, 1 letter), auto-uppercased. */
export function PanField({
  name, label = 'PAN number', value, onChange, error, required, disabled, style,
}: PanFieldProps): ReactNode {
  const validate = useCallback(
    (v: string) => (v.length > 0 && !PAN_RE.test(v) ? 'Invalid PAN format, e.g. ABCDE1234F' : undefined),
    [],
  );
  return (
    <MaskedField
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      mask={PAN_MASK}
      error={error}
      required={required}
      disabled={disabled}
      placeholder="ABCDE1234F"
      validate={validate}
      style={style}
    />
  );
}

// ---------------------------------------------------------------------------
// Specialized input fields: OTP, tags, rating, slider, color
// ---------------------------------------------------------------------------

export interface OTPFieldProps {
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly length?: number;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly autoFocus?: boolean;
  readonly style?: CSSProperties;
}

/**
 * One-time-passcode entry: `length` single-digit boxes with auto-advance on
 * type, backspace-to-previous on an empty box, and paste support (pasting a
 * full code fills every box and focuses the last one filled).
 */
export function OTPField({
  label, value, onChange, length = 6, error, required, disabled, autoFocus, style,
}: OTPFieldProps): ReactNode {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const setDigit = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(''));
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    setDigit(index, digit);
    if (digit !== '' && index < length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && digits[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ReactClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted.length <= 1) return;
    e.preventDefault();
    onChange(pasted);
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div style={style}>
      <FormField label={label} error={error} required={required}>
        <div style={{ display: 'flex', gap: 'var(--maw-space-sm)' }}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              autoFocus={autoFocus && index === 0}
              value={digit}
              disabled={disabled}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              maxLength={1}
              aria-label={`Digit ${index + 1} of ${length}`}
              style={{
                width: 40,
                height: 48,
                textAlign: 'center',
                fontSize: 'var(--maw-text-lg)',
                fontWeight: 600,
                border: `1px solid ${error ? 'var(--maw-danger)' : 'var(--maw-border)'}`,
                borderRadius: 'var(--maw-radius-md)',
                background: disabled ? 'var(--maw-bgMuted)' : 'var(--maw-bg)',
                color: 'var(--maw-fg)',
                outline: 'none',
              }}
            />
          ))}
        </div>
      </FormField>
    </div>
  );
}

export interface TagInputFieldProps {
  readonly label?: string;
  readonly value: readonly string[];
  readonly onChange: (tags: readonly string[]) => void;
  readonly placeholder?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly maxTags?: number;
  /** Validates a tag before it's added; return an error message to reject it. */
  readonly validateTag?: (tag: string, existing: readonly string[]) => string | undefined;
  readonly style?: CSSProperties;
}

/**
 * Free-text tag/chip entry. Type and press Enter or `,` to add a tag;
 * Backspace on an empty input removes the last tag.
 */
export function TagInputField({
  label, value, onChange, placeholder, error, required, disabled, maxTags, validateTag, style,
}: TagInputFieldProps): ReactNode {
  const [draft, setDraft] = useState('');
  const [internalError, setInternalError] = useState<string | undefined>(undefined);

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (value.includes(tag)) {
      setInternalError('Tag already added');
      return;
    }
    if (maxTags !== undefined && value.length >= maxTags) {
      setInternalError(`Maximum ${maxTags} tags`);
      return;
    }
    const validationError = validateTag?.(tag, value);
    if (validationError) {
      setInternalError(validationError);
      return;
    }
    setInternalError(undefined);
    onChange([...value, tag]);
    setDraft('');
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  return (
    <div style={style}>
      <FormField label={label} error={error ?? internalError} required={required}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--maw-space-xs)',
            alignItems: 'center',
            padding: 'var(--maw-space-xs)',
            border: '1px solid var(--maw-border)',
            borderRadius: 'var(--maw-radius-sm)',
            background: disabled ? 'var(--maw-bgMuted)' : 'var(--maw-bg)',
          }}
        >
          {value.map((tag, index) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 'var(--maw-radius-pill)',
                background: 'var(--maw-bgMuted)',
                color: 'var(--maw-fg)',
                fontSize: 'var(--maw-text-xs)',
              }}
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  aria-label={`Remove ${tag}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    lineHeight: 1,
                    color: 'var(--maw-fgMuted)',
                    fontSize: 'var(--maw-text-sm)',
                  }}
                >
                  ×
                </button>
              )}
            </span>
          ))}
          <input
            type="text"
            value={draft}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addTag(draft)}
            placeholder={value.length === 0 ? placeholder : undefined}
            style={{
              flex: 1,
              minWidth: 80,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 'var(--maw-text-sm)',
              color: 'var(--maw-fg)',
            }}
          />
        </div>
      </FormField>
    </div>
  );
}

export interface RatingFieldProps {
  readonly label?: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly max?: number;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly style?: CSSProperties;
}

/** Star rating picker — click a star to set the rating; hover previews the value. */
export function RatingField({
  label, value, onChange, max = 5, error, required, disabled, style,
}: RatingFieldProps): ReactNode {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;
  return (
    <div style={style}>
      <FormField label={label} error={error} required={required}>
        <div role="radiogroup" aria-label={label} style={{ display: 'flex', gap: 'var(--maw-space-xs)' }}>
          {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(null)}
              aria-label={`${star} star${star === 1 ? '' : 's'}`}
              aria-pressed={value === star}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: disabled ? 'default' : 'pointer',
                fontSize: 'var(--maw-text-xl)',
                lineHeight: 1,
                color: star <= display ? 'var(--maw-brand)' : 'var(--maw-border)',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              ★
            </button>
          ))}
        </div>
      </FormField>
    </div>
  );
}

export interface SliderFieldProps {
  readonly label?: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  /** Show the current value next to the label. Defaults to true. */
  readonly showValue?: boolean;
  readonly formatValue?: (value: number) => string;
  readonly style?: CSSProperties;
}

/** Range slider with the current value shown next to the label. */
export function SliderField({
  label, value, onChange, min = 0, max = 100, step = 1, error, required, disabled, showValue = true, formatValue, style,
}: SliderFieldProps): ReactNode {
  const displayValue = formatValue ? formatValue(value) : String(value);
  const fieldLabel = label !== undefined ? `${label}${showValue ? ` (${displayValue})` : ''}` : undefined;
  return (
    <div style={style}>
      <FormField label={fieldLabel} error={error} required={required}>
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          aria-valuetext={displayValue}
          style={{ width: '100%', accentColor: 'var(--maw-brand)' }}
        />
      </FormField>
    </div>
  );
}

export interface ColorFieldProps {
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  /** Optional swatches rendered next to the picker for quick selection. */
  readonly presets?: readonly string[];
  readonly style?: CSSProperties;
}

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Color picker with a synced hex text input and optional preset swatches. */
export function ColorField({
  label, value, onChange, error, required, disabled, presets, style,
}: ColorFieldProps): ReactNode {
  const validate = useCallback(
    (v: string) => requiredError(v, required) ?? (v.trim() !== '' && !HEX_COLOR_RE.test(v) ? 'Enter a valid hex color, e.g. #3366ff' : undefined),
    [required],
  );
  const { internalError, onBlur } = useTouchedValidation(value, validate);
  return (
    <div style={style}>
      <FormField label={label} error={error ?? internalError} required={required}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--maw-space-sm)' }}>
          <input
            type="color"
            value={HEX_COLOR_RE.test(value) ? value : '#000000'}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label ? `${label} swatch picker` : 'Color swatch picker'}
            style={{
              width: 36,
              height: 36,
              padding: 0,
              border: '1px solid var(--maw-border)',
              borderRadius: 'var(--maw-radius-sm)',
              cursor: disabled ? 'default' : 'pointer',
            }}
          />
          <input
            type="text"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder="#000000"
            style={{
              flex: 1,
              padding: 'var(--maw-space-xs) var(--maw-space-sm)',
              border: '1px solid var(--maw-border)',
              borderRadius: 'var(--maw-radius-sm)',
              fontSize: 'var(--maw-text-sm)',
              background: 'var(--maw-bg)',
              color: 'var(--maw-fg)',
            }}
          />
          {presets !== undefined && presets.length > 0 && (
            <div style={{ display: 'flex', gap: 4 }}>
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(preset)}
                  aria-label={preset}
                  style={{
                    width: 20,
                    height: 20,
                    padding: 0,
                    borderRadius: 'var(--maw-radius-sm)',
                    border: value === preset ? '2px solid var(--maw-brand)' : '1px solid var(--maw-border)',
                    background: preset,
                    cursor: disabled ? 'default' : 'pointer',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </FormField>
    </div>
  );
}

export type { StoredFile };
