import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';
import type {
  FormSchema,
  FormAction,
  FieldRenderer,
  FieldRendererProps,
  IFieldRegistry,
} from '@maw/sdk';
import { useDynamicForm, evaluateCondition, type UseDynamicFormReturn, type UseDynamicFormOptions, type DynamicFieldState } from './dynamic-form-engine';
import { TextField } from './components';
import { TextArea, Select, Checkbox, Toggle, Spinner } from './ui-kit';
import { RadioGroup, MultiSelect, SearchableSelect, DatePicker, TimePicker } from './input-components';
import { FormField } from './form';
import { Tabs } from './ui-kit';
import { Wizard, type WizardStep } from './pattern-components';
import { useIsMobile } from './responsive';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Field Registry — registry/strategy pattern
// ---------------------------------------------------------------------------

class FieldRegistryImpl implements IFieldRegistry {
  private readonly renderers = new Map<string, FieldRenderer>();

  register(type: string, renderer: FieldRenderer): void {
    this.renderers.set(type, renderer);
  }

  get(type: string): FieldRenderer | undefined {
    return this.renderers.get(type);
  }

  has(type: string): boolean {
    return this.renderers.has(type);
  }
}

function createDefaultRegistry(): IFieldRegistry {
  const registry = new FieldRegistryImpl();

  registry.register('text', (props) => (
    <TextField
      name={props.field.name}
      value={String(props.value ?? '')}
      onChange={(e) => props.onChange((e as { target: { value: string } }).target.value)}
      onBlur={props.onBlur}
      placeholder={props.field.placeholder}
      disabled={props.disabled}
      readOnly={props.readOnly}
      type="text"
    />
  ));

  registry.register('email', (props) => (
    <TextField
      name={props.field.name}
      value={String(props.value ?? '')}
      onChange={(e) => props.onChange((e as { target: { value: string } }).target.value)}
      onBlur={props.onBlur}
      placeholder={props.field.placeholder ?? 'email@example.com'}
      disabled={props.disabled}
      readOnly={props.readOnly}
      type="email"
    />
  ));

  registry.register('password', (props) => (
    <TextField
      name={props.field.name}
      value={String(props.value ?? '')}
      onChange={(e) => props.onChange((e as { target: { value: string } }).target.value)}
      onBlur={props.onBlur}
      placeholder={props.field.placeholder}
      disabled={props.disabled}
      readOnly={props.readOnly}
      type="password"
    />
  ));

  registry.register('phone', (props) => (
    <TextField
      name={props.field.name}
      value={String(props.value ?? '')}
      onChange={(e) => props.onChange((e as { target: { value: string } }).target.value)}
      onBlur={props.onBlur}
      placeholder={props.field.placeholder ?? '+1234567890'}
      disabled={props.disabled}
      readOnly={props.readOnly}
      type="tel"
    />
  ));

  registry.register('number', (props) => {
    const field = props.field as { min?: number; max?: number; step?: number };
    return (
      <TextField
        name={props.field.name}
        value={String(props.value ?? '')}
        onChange={(e) => {
          const v = (e as { target: { value: string } }).target.value;
          props.onChange(v === '' ? '' : Number(v));
        }}
        onBlur={props.onBlur}
        placeholder={props.field.placeholder}
        disabled={props.disabled}
        readOnly={props.readOnly}
        type="number"
        min={field.min}
        max={field.max}
        step={field.step}
      />
    );
  });

  registry.register('currency', (props) => {
    const field = props.field as { currencyCode?: string };
    return (
      <div style={{ position: 'relative' }}>
        {field.currencyCode && (
          <span style={{
            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
            fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)', pointerEvents: 'none',
          }}>{field.currencyCode}</span>
        )}
        <TextField
          name={props.field.name}
          value={String(props.value ?? '')}
          onChange={(e) => {
            const v = (e as { target: { value: string } }).target.value;
            props.onChange(v === '' ? '' : Number(v));
          }}
          onBlur={props.onBlur}
          placeholder={props.field.placeholder ?? '0.00'}
          disabled={props.disabled}
          readOnly={props.readOnly}
          type="number"
          step="0.01"
          style={field.currencyCode ? { paddingLeft: 40 } : undefined}
        />
      </div>
    );
  });

  registry.register('textarea', (props) => {
    const field = props.field as { rows?: number };
    return (
      <TextArea
        name={props.field.name}
        value={String(props.value ?? '')}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
        placeholder={props.field.placeholder}
        disabled={props.disabled}
        readOnly={props.readOnly}
        rows={field.rows ?? 3}
      />
    );
  });

  registry.register('select', (props) => (
    <Select
      name={props.field.name}
      value={String(props.value ?? '')}
      onChange={(e) => props.onChange(e.target.value)}
      onBlur={props.onBlur}
      disabled={props.disabled}
      options={[
        { value: '', label: props.field.placeholder ?? 'Select…' },
        ...props.options!.map((o) => ({ value: o.value, label: o.label })),
      ]}
    />
  ));

  registry.register('multiselect', (props) => (
    <MultiSelect
      options={props.options!.map((o) => ({ value: o.value, label: o.label }))}
      value={Array.isArray(props.value) ? props.value as string[] : []}
      onChange={(vals) => props.onChange(vals)}
      placeholder={props.field.placeholder ?? 'Select…'}
      disabled={props.disabled}
    />
  ));

  registry.register('checkbox', (props) => (
    <Checkbox
      label=""
      checked={Boolean(props.value)}
      onChange={(val) => props.onChange(val)}
      disabled={props.disabled}
    />
  ));

  registry.register('radio', (props) => (
    <RadioGroup
      name={props.field.name}
      options={props.options!.map((o) => ({ value: o.value, label: o.label }))}
      value={String(props.value ?? '')}
      onChange={(val) => props.onChange(val)}
      disabled={props.disabled}
    />
  ));

  registry.register('switch', (props) => (
    <Toggle
      label=""
      checked={Boolean(props.value)}
      onChange={(val) => props.onChange(val)}
      disabled={props.disabled}
    />
  ));

  registry.register('date', (props) => (
    <DatePicker
      value={String(props.value ?? '')}
      onChange={(val) => props.onChange(val)}
      disabled={props.disabled}
      placeholder={props.field.placeholder}
    />
  ));

  registry.register('time', (props) => (
    <TimePicker
      value={String(props.value ?? '')}
      onChange={(val) => props.onChange(val)}
      disabled={props.disabled}
    />
  ));

  registry.register('datetime', (props) => (
    <div style={{ display: 'flex', gap: 'var(--maw-space-sm)' }}>
      <div style={{ flex: 1 }}>
        <DatePicker
          value={String(props.value ?? '').split('T')[0] ?? ''}
          onChange={(date) => {
            const time = String(props.value ?? '').split('T')[1] ?? '00:00';
            props.onChange(date ? `${date}T${time}` : '');
          }}
          disabled={props.disabled}
        />
      </div>
      <div style={{ flex: 1 }}>
        <TimePicker
          value={String(props.value ?? '').split('T')[1] ?? ''}
          onChange={(time) => {
            const date = String(props.value ?? '').split('T')[0] ?? '';
            props.onChange(date ? `${date}T${time}` : '');
          }}
          disabled={props.disabled}
        />
      </div>
    </div>
  ));

  registry.register('autocomplete', (props) => (
    <SearchableSelect
      options={props.options!.map((o) => ({ value: o.value, label: o.label }))}
      value={String(props.value ?? '')}
      onChange={(val) => props.onChange(val)}
      placeholder={props.field.placeholder ?? 'Search…'}
      disabled={props.disabled}
      loading={props.loading}
    />
  ));

  registry.register('file', (_props) => (
    <div style={{ fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)', padding: 'var(--maw-space-sm)', border: '1px dashed var(--maw-border)', borderRadius: 'var(--maw-radius-md)', textAlign: 'center' }}>
      File upload (connect via FileUpload component)
    </div>
  ));

  registry.register('image', (_props) => (
    <div style={{ fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)', padding: 'var(--maw-space-sm)', border: '1px dashed var(--maw-border)', borderRadius: 'var(--maw-radius-md)', textAlign: 'center' }}>
      Image upload (connect via FileUpload component)
    </div>
  ));

  registry.register('custom', (props) => {
    const field = props.field as { render?: (p: { value: unknown; onChange: (v: unknown) => void; error?: string; disabled?: boolean; readOnly?: boolean }) => ReactNode };
    if (field.render) {
      return field.render({ value: props.value, onChange: props.onChange, error: props.error, disabled: props.disabled, readOnly: props.readOnly });
    }
    return <span style={{ color: 'var(--maw-fgMuted)' }}>Custom field: {props.field.name}</span>;
  });

  return registry;
}

const defaultRegistry = createDefaultRegistry();

// ---------------------------------------------------------------------------
// Registry context — allows overriding/extending field renderers
// ---------------------------------------------------------------------------

const FieldRegistryContext = createContext<IFieldRegistry>(defaultRegistry);

export function FieldRegistryProvider({ registry, children }: { readonly registry: IFieldRegistry; readonly children: ReactNode }): ReactNode {
  return <FieldRegistryContext.Provider value={registry}>{children}</FieldRegistryContext.Provider>;
}

export function useFieldRegistry(): IFieldRegistry {
  return useContext(FieldRegistryContext);
}

export { FieldRegistryImpl as createFieldRegistry };

// ---------------------------------------------------------------------------
// DynamicForm context
// ---------------------------------------------------------------------------

const DynamicFormContext = createContext<UseDynamicFormReturn | null>(null);

export function useDynamicFormContext(): UseDynamicFormReturn {
  const ctx = useContext(DynamicFormContext);
  if (ctx === null) throw new Error('useDynamicFormContext must be used within <DynamicForm>');
  return ctx;
}

// ---------------------------------------------------------------------------
// DynamicForm props
// ---------------------------------------------------------------------------

export interface DynamicFormProps extends UseDynamicFormOptions {
  readonly style?: CSSProperties;
  readonly className?: string;
  readonly children?: ReactNode;
  readonly hideActions?: boolean;
  readonly submitLabel?: string;
  readonly cancelLabel?: string;
  readonly onCancel?: () => void;
  readonly header?: ReactNode;
  readonly footer?: ReactNode;
}

// ---------------------------------------------------------------------------
// DynamicForm component
// ---------------------------------------------------------------------------

export function DynamicForm({
  style,
  className,
  children,
  hideActions,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  onCancel,
  header,
  footer,
  ...engineOptions
}: DynamicFormProps): ReactNode {
  const engine = useDynamicForm(engineOptions);
  const registry = useFieldRegistry();
  const { schema } = engineOptions;
  const isMobile = useIsMobile();

  const layoutType = schema.layout?.type ?? 'single';
  const isReadOnly = engine.mode === 'readonly';

  return (
    <DynamicFormContext.Provider value={engine}>
      <form onSubmit={engine.handleSubmit} style={{ ...base, ...style }} className={className} noValidate>
        {/* Title / description */}
        {(schema.title || schema.description || header) && (
          <div style={{ marginBottom: 'var(--maw-space-lg)' }}>
            {header}
            {schema.title && <h2 style={{ ...base, margin: 0, fontSize: 'var(--maw-text-lg)', fontWeight: 600, color: 'var(--maw-fg)' }}>{schema.title}</h2>}
            {schema.description && <p style={{ ...base, margin: 'var(--maw-space-xs) 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>{schema.description}</p>}
          </div>
        )}

        {/* Form body */}
        {layoutType === 'tabs' && schema.sections ? (
          <TabsLayout schema={schema} engine={engine} registry={registry} />
        ) : layoutType === 'wizard' && schema.sections ? (
          <WizardLayout schema={schema} engine={engine} registry={registry} onSubmit={engine.handleSubmit} submitLabel={submitLabel} />
        ) : layoutType === 'sections' && schema.sections ? (
          <SectionsLayout schema={schema} engine={engine} registry={registry} isMobile={isMobile} />
        ) : (
          <GridLayout schema={schema} engine={engine} registry={registry} isMobile={isMobile} layoutType={layoutType} />
        )}

        {/* Custom children */}
        {children}

        {/* Actions */}
        {!hideActions && !isReadOnly && layoutType !== 'wizard' && (
          <FormActions
            schema={schema}
            engine={engine}
            submitLabel={submitLabel}
            cancelLabel={cancelLabel}
            onCancel={onCancel}
          />
        )}

        {footer}
      </form>
    </DynamicFormContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Layout renderers
// ---------------------------------------------------------------------------

function GridLayout({
  schema,
  engine,
  registry,
  isMobile,
  layoutType,
}: {
  readonly schema: FormSchema;
  readonly engine: UseDynamicFormReturn;
  readonly registry: IFieldRegistry;
  readonly isMobile: boolean;
  readonly layoutType: string;
}): ReactNode {
  const columns = layoutType === 'two-column' ? 2 : (schema.layout?.columns ?? 1);
  const effectiveColumns = isMobile ? 1 : columns;
  const gap = schema.layout?.gap ?? 'var(--maw-space-md)';

  return (
    <div style={{
      display: effectiveColumns > 1 ? 'grid' : 'block',
      gridTemplateColumns: effectiveColumns > 1 ? `repeat(${effectiveColumns}, 1fr)` : undefined,
      gap,
    }}>
      {engine.visibleFields.map((field) => {
        const state = engine.fieldStates.get(field.name);
        if (!state) return null;
        return (
          <div key={field.name} style={{ gridColumn: field.colSpan ? `span ${Math.min(field.colSpan, effectiveColumns)}` : undefined }}>
            <DynamicField state={state} registry={registry} engine={engine} />
          </div>
        );
      })}
    </div>
  );
}

function SectionsLayout({
  schema,
  engine,
  registry,
  isMobile,
}: {
  readonly schema: FormSchema;
  readonly engine: UseDynamicFormReturn;
  readonly registry: IFieldRegistry;
  readonly isMobile: boolean;
}): ReactNode {
  return (
    <div>
      {schema.sections!.map((section, idx) => {
        if (section.visibleWhen && !evaluateCondition(section.visibleWhen, engine.values)) {
          return null;
        }
        const sectionFields = section.fields
          .map((name) => engine.fieldStates.get(name))
          .filter((s): s is DynamicFieldState => s != null && s.visible);

        if (sectionFields.length === 0) return null;

        const columns = section.columns ?? schema.layout?.columns ?? 1;
        const effectiveColumns = isMobile ? 1 : columns;

        return (
          <div key={section.id} style={{ marginBottom: 'var(--maw-space-xl)' }}>
            {idx > 0 && <div style={{ borderTop: '1px solid var(--maw-border)', marginBottom: 'var(--maw-space-lg)' }} />}
            {section.title && (
              <h3 style={{ ...base, margin: '0 0 var(--maw-space-xs)', fontSize: 'var(--maw-text-md)', fontWeight: 600, color: 'var(--maw-fg)' }}>
                {section.title}
              </h3>
            )}
            {section.description && (
              <p style={{ ...base, margin: '0 0 var(--maw-space-md)', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
                {section.description}
              </p>
            )}
            <div style={{
              display: effectiveColumns > 1 ? 'grid' : 'block',
              gridTemplateColumns: effectiveColumns > 1 ? `repeat(${effectiveColumns}, 1fr)` : undefined,
              gap: schema.layout?.gap ?? 'var(--maw-space-md)',
            }}>
              {sectionFields.map((state) => (
                <div key={state.field.name} style={{ gridColumn: state.field.colSpan ? `span ${Math.min(state.field.colSpan, effectiveColumns)}` : undefined }}>
                  <DynamicField state={state} registry={registry} engine={engine} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TabsLayout({
  schema,
  engine,
  registry,
}: {
  readonly schema: FormSchema;
  readonly engine: UseDynamicFormReturn;
  readonly registry: IFieldRegistry;
}): ReactNode {
  const [activeTab, setActiveTab] = useState(schema.sections![0]?.id ?? '');

  const tabs = schema.sections!
    .filter((s) => {
      const sectionFields = s.fields.map((n) => engine.fieldStates.get(n)).filter((st): st is DynamicFieldState => st != null && st.visible);
      return sectionFields.length > 0;
    })
    .map((s) => {
      const hasError = s.fields.some((n) => engine.fieldStates.get(n)?.error);
      return {
        key: s.id,
        label: (s.title ?? s.id) + (hasError ? ' ●' : ''),
      };
    });

  const activeSection = schema.sections!.find((s) => s.id === activeTab);
  const activeFields = activeSection?.fields
    .map((n) => engine.fieldStates.get(n))
    .filter((s): s is DynamicFieldState => s != null && s.visible) ?? [];

  return (
    <div>
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} style={{ marginBottom: 'var(--maw-space-lg)' }} />
      <div>
        {activeFields.map((state) => (
          <DynamicField key={state.field.name} state={state} registry={registry} engine={engine} />
        ))}
      </div>
    </div>
  );
}

function WizardLayout({
  schema,
  engine,
  registry,
  onSubmit,
  submitLabel,
}: {
  readonly schema: FormSchema;
  readonly engine: UseDynamicFormReturn;
  readonly registry: IFieldRegistry;
  readonly onSubmit: (e?: { preventDefault?: () => void }) => void;
  readonly submitLabel: string;
}): ReactNode {
  const [step, setStep] = useState(0);

  const wizardSteps: WizardStep[] = schema.sections!.map((section) => {
    const sectionFields = section.fields
      .map((n) => engine.fieldStates.get(n))
      .filter((s): s is DynamicFieldState => s != null && s.visible);

    const isValid = sectionFields.every((s) => !s.error || !s.touched);

    return {
      key: section.id,
      title: section.title ?? section.id,
      isValid,
      content: (
        <div>
          {section.description && (
            <p style={{ ...base, margin: '0 0 var(--maw-space-md)', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
              {section.description}
            </p>
          )}
          {sectionFields.map((state) => (
            <DynamicField key={state.field.name} state={state} registry={registry} engine={engine} />
          ))}
        </div>
      ),
    };
  });

  return (
    <Wizard
      steps={wizardSteps}
      activeStep={step}
      onStepChange={setStep}
      onComplete={() => onSubmit()}
      completeLabel={submitLabel}
    />
  );
}

// ---------------------------------------------------------------------------
// DynamicField — renders a single field via registry
// ---------------------------------------------------------------------------

function DynamicField({
  state,
  registry,
  engine,
}: {
  readonly state: DynamicFieldState;
  readonly registry: IFieldRegistry;
  readonly engine: UseDynamicFormReturn;
}): ReactNode {
  const { field } = state;
  const renderer = registry.get(field.type);

  if (!renderer) {
    return (
      <FormField label={field.label} error={state.error} required={state.required}>
        <span style={{ color: 'var(--maw-danger)', fontSize: 'var(--maw-text-xs)' }}>
          Unknown field type: {field.type}
        </span>
      </FormField>
    );
  }

  const rendererProps: FieldRendererProps = {
    field,
    value: state.value,
    onChange: (val) => engine.setValue(field.name, val),
    onBlur: () => engine.touch(field.name),
    error: state.error,
    disabled: state.disabled,
    readOnly: state.readOnly,
    options: state.options,
    loading: state.optionsLoading,
  };

  if (engine.mode === 'readonly') {
    return (
      <FormField label={field.label}>
        <div style={{ ...base, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fg)', padding: 'var(--maw-space-sm) 0' }}>
          {formatReadOnlyValue(state)}
        </div>
      </FormField>
    );
  }

  return (
    <FormField
      label={field.label}
      error={state.error}
      required={state.required}
      hint={field.description}
    >
      {renderer(rendererProps)}
    </FormField>
  );
}

function formatReadOnlyValue(state: DynamicFieldState): ReactNode {
  const { field, value, options } = state;

  if (value == null || value === '') return <span style={{ color: 'var(--maw-fgMuted)' }}>—</span>;

  if (field.formatter) return field.formatter(value);

  if (field.type === 'checkbox' || field.type === 'switch') {
    return value ? 'Yes' : 'No';
  }

  if (field.type === 'select' || field.type === 'radio') {
    const opt = options.find((o) => o.value === value);
    return opt?.label ?? String(value);
  }

  if (field.type === 'multiselect') {
    if (!Array.isArray(value)) return String(value);
    return (value as string[]).map((v) => options.find((o) => o.value === v)?.label ?? v).join(', ');
  }

  return String(value);
}

// ---------------------------------------------------------------------------
// Form actions bar
// ---------------------------------------------------------------------------

function FormActions({
  schema,
  engine,
  submitLabel,
  cancelLabel,
  onCancel,
}: {
  readonly schema: FormSchema;
  readonly engine: UseDynamicFormReturn;
  readonly submitLabel: string;
  readonly cancelLabel: string;
  readonly onCancel?: () => void;
}): ReactNode {
  const customActions = schema.actions;

  if (customActions && customActions.length > 0) {
    return (
      <div style={{ display: 'flex', gap: 'var(--maw-space-sm)', justifyContent: 'flex-end', marginTop: 'var(--maw-space-xl)', paddingTop: 'var(--maw-space-lg)', borderTop: '1px solid var(--maw-border)' }}>
        {customActions.map((action) => (
          <ActionButton key={action.id} action={action} engine={engine} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--maw-space-sm)', justifyContent: 'flex-end', marginTop: 'var(--maw-space-xl)', paddingTop: 'var(--maw-space-lg)', borderTop: '1px solid var(--maw-border)' }}>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          style={{
            ...base,
            padding: 'var(--maw-space-sm) var(--maw-space-lg)',
            borderRadius: 'var(--maw-radius-md)',
            border: '1px solid var(--maw-border)',
            background: 'transparent',
            color: 'var(--maw-fg)',
            cursor: 'pointer',
            fontSize: 'var(--maw-text-sm)',
            fontWeight: 500,
          }}
        >{cancelLabel}</button>
      )}
      <button
        type="submit"
        disabled={engine.submitting}
        style={{
          ...base,
          padding: 'var(--maw-space-sm) var(--maw-space-lg)',
          borderRadius: 'var(--maw-radius-md)',
          border: 'none',
          background: engine.submitting ? 'var(--maw-bgSubtle)' : 'var(--maw-brand)',
          color: 'var(--maw-brandContrast)',
          cursor: engine.submitting ? 'not-allowed' : 'pointer',
          fontSize: 'var(--maw-text-sm)',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--maw-space-xs)',
        }}
      >
        {engine.submitting && <Spinner size={14} />}
        {submitLabel}
      </button>
    </div>
  );
}

function ActionButton({
  action,
  engine,
}: {
  readonly action: FormAction;
  readonly engine: UseDynamicFormReturn;
}): ReactNode {
  const isSubmit = action.type === 'submit';
  const isReset = action.type === 'reset';
  const disabled = action.disabled || (isSubmit && engine.submitting);

  const variantStyles: Record<string, CSSProperties> = {
    primary: { background: 'var(--maw-brand)', color: 'var(--maw-brandContrast)', border: 'none' },
    danger: { background: 'var(--maw-danger)', color: '#fff', border: 'none' },
    ghost: { background: 'transparent', color: 'var(--maw-fg)', border: 'none' },
    default: { background: 'transparent', color: 'var(--maw-fg)', border: '1px solid var(--maw-border)' },
  };

  const handleClick = () => {
    if (isReset) { engine.reset(); return; }
    if (action.handler) action.handler();
  };

  return (
    <button
      type={isSubmit ? 'submit' : 'button'}
      disabled={disabled}
      onClick={isSubmit ? undefined : handleClick}
      style={{
        ...base,
        padding: 'var(--maw-space-sm) var(--maw-space-lg)',
        borderRadius: 'var(--maw-radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 'var(--maw-text-sm)',
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
        ...variantStyles[action.variant ?? 'default'],
      }}
    >
      {isSubmit && engine.submitting && <Spinner size={14} />}
      {action.label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Utility: merge registries
// ---------------------------------------------------------------------------

export function mergeRegistry(base: IFieldRegistry, overrides: Record<string, FieldRenderer>): IFieldRegistry {
  const merged = new FieldRegistryImpl();
  for (const [type, renderer] of Object.entries(overrides)) {
    merged.register(type, renderer);
  }
  return {
    register: merged.register.bind(merged),
    get: (type: string) => merged.get(type) ?? base.get(type),
    has: (type: string) => merged.has(type) || base.has(type),
  };
}
