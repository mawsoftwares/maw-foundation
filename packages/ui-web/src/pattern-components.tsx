import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Wizard — multi-step form/process
// ---------------------------------------------------------------------------

export interface WizardStep {
  readonly key: string;
  readonly title: string;
  readonly content: ReactNode;
  readonly isValid?: boolean;
}

export interface WizardProps {
  readonly steps: readonly WizardStep[];
  readonly activeStep: number;
  readonly onStepChange: (step: number) => void;
  readonly onComplete?: () => void;
  readonly completeLabel?: string;
  readonly nextLabel?: string;
  readonly backLabel?: string;
  readonly style?: CSSProperties;
}

export function Wizard({
  steps,
  activeStep,
  onStepChange,
  onComplete,
  completeLabel = 'Complete',
  nextLabel = 'Next',
  backLabel = 'Back',
  style,
}: WizardProps): ReactNode {
  const current = steps[activeStep];
  const isLast = activeStep === steps.length - 1;
  const isFirst = activeStep === 0;
  const canNext = current?.isValid !== false;

  return (
    <div style={{ ...base, ...style }}>
      {/* Step indicators */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: 'var(--maw-space-xl)',
        gap: 'var(--maw-space-xs)',
      }}>
        {steps.map((step, i) => {
          const isActive = i === activeStep;
          const isCompleted = i < activeStep;
          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : undefined }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--maw-space-sm)',
                cursor: isCompleted ? 'pointer' : 'default',
              }} onClick={() => isCompleted && onStepChange(i)}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--maw-text-xs)',
                  fontWeight: 600,
                  flexShrink: 0,
                  background: isActive ? 'var(--maw-primary)' : isCompleted ? 'var(--maw-success)' : 'var(--maw-bgSubtle)',
                  color: isActive || isCompleted ? '#fff' : 'var(--maw-fgMuted)',
                  border: isActive ? 'none' : '1px solid var(--maw-border)',
                }}>
                  {isCompleted ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: 'var(--maw-text-xs)',
                  color: isActive ? 'var(--maw-fg)' : 'var(--maw-fgMuted)',
                  fontWeight: isActive ? 600 : 400,
                  whiteSpace: 'nowrap',
                }}>{step.title}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1,
                  height: 2,
                  background: isCompleted ? 'var(--maw-success)' : 'var(--maw-border)',
                  marginLeft: 'var(--maw-space-sm)',
                  marginRight: 'var(--maw-space-sm)',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div style={{ marginBottom: 'var(--maw-space-xl)' }}>
        {current?.content}
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--maw-border)',
        paddingTop: 'var(--maw-space-lg)',
      }}>
        <button
          onClick={() => onStepChange(activeStep - 1)}
          disabled={isFirst}
          style={{
            ...base,
            padding: 'var(--maw-space-sm) var(--maw-space-lg)',
            borderRadius: 'var(--maw-radius-md)',
            border: '1px solid var(--maw-border)',
            background: 'transparent',
            color: isFirst ? 'var(--maw-fgMuted)' : 'var(--maw-fg)',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontSize: 'var(--maw-text-sm)',
            fontWeight: 500,
            opacity: isFirst ? 0.5 : 1,
          }}
        >{backLabel}</button>
        <button
          onClick={() => isLast ? onComplete?.() : onStepChange(activeStep + 1)}
          disabled={!canNext}
          style={{
            ...base,
            padding: 'var(--maw-space-sm) var(--maw-space-lg)',
            borderRadius: 'var(--maw-radius-md)',
            border: 'none',
            background: canNext ? 'var(--maw-primary)' : 'var(--maw-bgSubtle)',
            color: canNext ? '#fff' : 'var(--maw-fgMuted)',
            cursor: canNext ? 'pointer' : 'not-allowed',
            fontSize: 'var(--maw-text-sm)',
            fontWeight: 500,
          }}
        >{isLast ? completeLabel : nextLabel}</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SettingsLayout — two-column settings page (label/description + control)
// ---------------------------------------------------------------------------

export interface SettingsGroup {
  readonly key: string;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

export interface SettingsLayoutProps {
  readonly groups: readonly SettingsGroup[];
  readonly style?: CSSProperties;
}

export function SettingsLayout({
  groups,
  style,
}: SettingsLayoutProps): ReactNode {
  return (
    <div style={{ ...base, ...style }}>
      {groups.map((group, i) => (
        <div key={group.key}>
          {i > 0 && <div style={{ borderTop: '1px solid var(--maw-border)', margin: 'var(--maw-space-lg) 0' }} />}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--maw-space-xl)',
            alignItems: 'start',
          }}>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: 'var(--maw-text-sm)',
                fontWeight: 600,
                color: 'var(--maw-fg)',
              }}>{group.title}</h3>
              {group.description && (
                <p style={{
                  margin: 'var(--maw-space-xs) 0 0',
                  fontSize: 'var(--maw-text-xs)',
                  color: 'var(--maw-fgMuted)',
                  lineHeight: 1.5,
                }}>{group.description}</p>
              )}
            </div>
            <div>{group.children}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchBar — search input with debounce and clear
// ---------------------------------------------------------------------------

export interface SearchBarProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly debounceMs?: number;
  readonly onSearch?: (query: string) => void;
  readonly loading?: boolean;
  readonly style?: CSSProperties;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  debounceMs = 300,
  onSearch,
  loading = false,
  style,
}: SearchBarProps): ReactNode {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleChange = useCallback((newValue: string) => {
    onChange(newValue);
    if (onSearch) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onSearch(newValue), debounceMs);
    }
  }, [onChange, onSearch, debounceMs]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  return (
    <div style={{
      ...base,
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      ...style,
    }}>
      <span style={{
        position: 'absolute',
        left: 'var(--maw-space-sm)',
        color: 'var(--maw-fgMuted)',
        fontSize: 'var(--maw-text-sm)',
        pointerEvents: 'none',
      }}>🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        style={{
          ...base,
          width: '100%',
          padding: 'var(--maw-space-sm) var(--maw-space-lg)',
          paddingLeft: 'calc(var(--maw-space-sm) + 24px)',
          paddingRight: value ? 'calc(var(--maw-space-sm) + 24px)' : 'var(--maw-space-lg)',
          borderRadius: 'var(--maw-radius-md)',
          border: '1px solid var(--maw-border)',
          background: 'var(--maw-bg)',
          color: 'var(--maw-fg)',
          fontSize: 'var(--maw-text-sm)',
          outline: 'none',
        }}
      />
      {loading && (
        <span style={{
          position: 'absolute',
          right: value ? '32px' : 'var(--maw-space-sm)',
          color: 'var(--maw-fgMuted)',
          fontSize: 'var(--maw-text-xs)',
        }}>⏳</span>
      )}
      {value && (
        <button
          onClick={() => { onChange(''); onSearch?.(''); }}
          aria-label="Clear search"
          style={{
            ...base,
            position: 'absolute',
            right: 'var(--maw-space-xs)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--maw-fgMuted)',
            padding: 'var(--maw-space-xs)',
            fontSize: 'var(--maw-text-sm)',
          }}
        >✕</button>
      )}
    </div>
  );
}
