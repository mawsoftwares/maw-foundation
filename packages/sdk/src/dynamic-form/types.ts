import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Field types
// ---------------------------------------------------------------------------

export const FormFieldType = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  CURRENCY: 'currency',
  EMAIL: 'email',
  PASSWORD: 'password',
  PHONE: 'phone',
  SELECT: 'select',
  MULTISELECT: 'multiselect',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  SWITCH: 'switch',
  DATE: 'date',
  TIME: 'time',
  DATETIME: 'datetime',
  FILE: 'file',
  IMAGE: 'image',
  AUTOCOMPLETE: 'autocomplete',
  CUSTOM: 'custom',
} as const;

export type FormFieldTypeValue = (typeof FormFieldType)[keyof typeof FormFieldType];

// ---------------------------------------------------------------------------
// Validation rules
// ---------------------------------------------------------------------------

export interface ValidationRule {
  readonly message?: string;
}

export interface RequiredRule extends ValidationRule {
  readonly type: 'required';
  readonly value: boolean;
}

export interface MinLengthRule extends ValidationRule {
  readonly type: 'minLength';
  readonly value: number;
}

export interface MaxLengthRule extends ValidationRule {
  readonly type: 'maxLength';
  readonly value: number;
}

export interface MinRule extends ValidationRule {
  readonly type: 'min';
  readonly value: number;
}

export interface MaxRule extends ValidationRule {
  readonly type: 'max';
  readonly value: number;
}

export interface PatternRule extends ValidationRule {
  readonly type: 'pattern';
  readonly value: string;
}

export interface EmailRule extends ValidationRule {
  readonly type: 'email';
}

export interface UrlRule extends ValidationRule {
  readonly type: 'url';
}

export interface FileSizeRule extends ValidationRule {
  readonly type: 'fileSize';
  readonly value: number;
}

export interface FileTypeRule extends ValidationRule {
  readonly type: 'fileType';
  readonly value: readonly string[];
}

export interface CustomRule extends ValidationRule {
  readonly type: 'custom';
  readonly validate: (value: unknown, values: Record<string, unknown>) => string | undefined;
}

export interface AsyncRule extends ValidationRule {
  readonly type: 'async';
  readonly validate: (value: unknown, values: Record<string, unknown>) => Promise<string | undefined>;
}

export type FormValidationRule =
  | RequiredRule
  | MinLengthRule
  | MaxLengthRule
  | MinRule
  | MaxRule
  | PatternRule
  | EmailRule
  | UrlRule
  | FileSizeRule
  | FileTypeRule
  | CustomRule
  | AsyncRule;

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

export interface FieldCondition {
  readonly field: string;
  readonly operator: 'eq' | 'neq' | 'in' | 'not_in' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'is_empty' | 'is_not_empty';
  readonly value?: unknown;
}

export interface ConditionGroup {
  readonly operator: 'and' | 'or';
  readonly conditions: readonly (FieldCondition | ConditionGroup)[];
}

export type Condition = FieldCondition | ConditionGroup;

// ---------------------------------------------------------------------------
// Options (for select, radio, multiselect, autocomplete)
// ---------------------------------------------------------------------------

export interface FieldOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface StaticOptionsSource {
  readonly type: 'static';
  readonly options: readonly FieldOption[];
}

export interface RemoteOptionsSource {
  readonly type: 'remote';
  readonly fetchFn: (query?: string) => Promise<readonly FieldOption[]>;
  readonly debounceMs?: number;
}

export interface DependentOptionsSource {
  readonly type: 'dependent';
  readonly dependsOn: string;
  readonly fetchFn: (parentValue: unknown, query?: string) => Promise<readonly FieldOption[]>;
  readonly debounceMs?: number;
}

export type OptionsSource = StaticOptionsSource | RemoteOptionsSource | DependentOptionsSource;

// ---------------------------------------------------------------------------
// Field definition — base and type-specific extensions
// ---------------------------------------------------------------------------

export interface FormFieldBase {
  readonly name: string;
  readonly type: FormFieldTypeValue;
  readonly label: string;
  readonly description?: string;
  readonly placeholder?: string;
  readonly defaultValue?: unknown;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly hidden?: boolean;
  readonly validation?: readonly FormValidationRule[];
  readonly visibleWhen?: Condition;
  readonly hiddenWhen?: Condition;
  readonly disabledWhen?: Condition;
  readonly requiredWhen?: Condition;
  readonly permission?: string;
  readonly featureFlag?: string;
  readonly colSpan?: number;
  readonly className?: string;
  readonly formatter?: (value: unknown) => string;
  readonly parser?: (input: string) => unknown;
}

export interface TextFieldDef extends FormFieldBase {
  readonly type: 'text';
  readonly minLength?: number;
  readonly maxLength?: number;
}

export interface TextareaFieldDef extends FormFieldBase {
  readonly type: 'textarea';
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly rows?: number;
}

export interface NumberFieldDef extends FormFieldBase {
  readonly type: 'number';
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}

export interface CurrencyFieldDef extends FormFieldBase {
  readonly type: 'currency';
  readonly currencyCode?: string;
  readonly min?: number;
  readonly max?: number;
}

export interface EmailFieldDef extends FormFieldBase {
  readonly type: 'email';
}

export interface PasswordFieldDef extends FormFieldBase {
  readonly type: 'password';
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly showStrength?: boolean;
}

export interface PhoneFieldDef extends FormFieldBase {
  readonly type: 'phone';
}

export interface SelectFieldDef extends FormFieldBase {
  readonly type: 'select';
  readonly options?: readonly FieldOption[];
  readonly optionsSource?: OptionsSource;
}

export interface MultiSelectFieldDef extends FormFieldBase {
  readonly type: 'multiselect';
  readonly options?: readonly FieldOption[];
  readonly optionsSource?: OptionsSource;
  readonly maxItems?: number;
}

export interface CheckboxFieldDef extends FormFieldBase {
  readonly type: 'checkbox';
}

export interface RadioFieldDef extends FormFieldBase {
  readonly type: 'radio';
  readonly options: readonly FieldOption[];
}

export interface SwitchFieldDef extends FormFieldBase {
  readonly type: 'switch';
}

export interface DateFieldDef extends FormFieldBase {
  readonly type: 'date';
  readonly minDate?: string;
  readonly maxDate?: string;
}

export interface TimeFieldDef extends FormFieldBase {
  readonly type: 'time';
  readonly use24Hour?: boolean;
}

export interface DateTimeFieldDef extends FormFieldBase {
  readonly type: 'datetime';
  readonly minDate?: string;
  readonly maxDate?: string;
}

export interface FileFieldDef extends FormFieldBase {
  readonly type: 'file';
  readonly accept?: readonly string[];
  readonly maxSize?: number;
  readonly maxFiles?: number;
  readonly multiple?: boolean;
}

export interface ImageFieldDef extends FormFieldBase {
  readonly type: 'image';
  readonly accept?: readonly string[];
  readonly maxSize?: number;
  readonly maxFiles?: number;
  readonly multiple?: boolean;
}

export interface AutocompleteFieldDef extends FormFieldBase {
  readonly type: 'autocomplete';
  readonly options?: readonly FieldOption[];
  readonly optionsSource?: OptionsSource;
  readonly debounceMs?: number;
}

export interface CustomFieldDef extends FormFieldBase {
  readonly type: 'custom';
  readonly render: (props: {
    value: unknown;
    onChange: (value: unknown) => void;
    error?: string;
    disabled?: boolean;
    readOnly?: boolean;
  }) => ReactNode;
}

export type FormFieldDef =
  | TextFieldDef
  | TextareaFieldDef
  | NumberFieldDef
  | CurrencyFieldDef
  | EmailFieldDef
  | PasswordFieldDef
  | PhoneFieldDef
  | SelectFieldDef
  | MultiSelectFieldDef
  | CheckboxFieldDef
  | RadioFieldDef
  | SwitchFieldDef
  | DateFieldDef
  | TimeFieldDef
  | DateTimeFieldDef
  | FileFieldDef
  | ImageFieldDef
  | AutocompleteFieldDef
  | CustomFieldDef;

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export interface FormSection {
  readonly id: string;
  readonly title?: string;
  readonly description?: string;
  readonly fields: readonly string[];
  readonly permission?: string;
  readonly visibleWhen?: Condition;
  readonly columns?: number;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export type FormLayoutType = 'single' | 'two-column' | 'grid' | 'sections' | 'tabs' | 'wizard';

export interface FormLayout {
  readonly type: FormLayoutType;
  readonly columns?: number;
  readonly gap?: string;
  readonly responsive?: boolean;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface FormAction {
  readonly id: string;
  readonly type: 'submit' | 'reset' | 'cancel' | 'custom';
  readonly label: string;
  readonly variant?: 'primary' | 'default' | 'danger' | 'ghost';
  readonly permission?: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly handler?: () => void;
}

// ---------------------------------------------------------------------------
// Form mode
// ---------------------------------------------------------------------------

export type FormMode = 'create' | 'edit' | 'readonly' | 'duplicate';

// ---------------------------------------------------------------------------
// Transform / Parse
// ---------------------------------------------------------------------------

export interface FormTransformConfig {
  readonly toApi?: (values: Record<string, unknown>) => Record<string, unknown>;
  readonly fromApi?: (data: Record<string, unknown>) => Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Draft / Autosave
// ---------------------------------------------------------------------------

export interface FormDraftConfig {
  readonly enabled: boolean;
  readonly key: string;
  readonly autoSaveMs?: number;
  readonly onSaveDraft?: (values: Record<string, unknown>) => void | Promise<void>;
  readonly onLoadDraft?: () => Record<string, unknown> | null | Promise<Record<string, unknown> | null>;
}

// ---------------------------------------------------------------------------
// Master schema
// ---------------------------------------------------------------------------

export interface FormSchema<TValues extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string;
  readonly version?: number;
  readonly title?: string;
  readonly description?: string;
  readonly fields: readonly FormFieldDef[];
  readonly sections?: readonly FormSection[];
  readonly layout?: FormLayout;
  readonly actions?: readonly FormAction[];
  readonly mode?: FormMode;
  readonly transform?: FormTransformConfig;
  readonly draft?: FormDraftConfig;
  readonly permission?: string;
  readonly warnOnUnsavedChanges?: boolean;
  readonly focusFirstError?: boolean;
  readonly _valuesType?: TValues;
}

// ---------------------------------------------------------------------------
// Field registry contract
// ---------------------------------------------------------------------------

export interface FieldRendererProps {
  readonly field: FormFieldDef;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  readonly onBlur: () => void;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly options?: readonly FieldOption[];
  readonly loading?: boolean;
}

export type FieldRenderer = (props: FieldRendererProps) => ReactNode;

export interface IFieldRegistry {
  register(type: string, renderer: FieldRenderer): void;
  get(type: string): FieldRenderer | undefined;
  has(type: string): boolean;
}
