import type { ReactNode } from 'react';
import * as Radio from '@radix-ui/react-radio-group';
import type { RadioGroupProps } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';

/**
 * Same props as the `RadioGroup` in @mawsoftwares/ui-web. Radix RadioGroup: roving focus, arrow-key selection,
 * `name` submitted with the surrounding form. Wrapped in a fieldset/legend like ui-web.
 */
export function RadioGroup({
  label,
  name,
  value,
  onChange,
  options,
  error,
  disabled,
  direction = 'column',
  required,
  style,
}: RadioGroupProps): ReactNode {
  return (
    <fieldset style={style} className="m-0 mb-4 box-border border-none p-0 font-sans">
      {label !== undefined && (
        <legend className="mb-2 p-0 text-sm font-medium text-fg-muted">
          {label}
          {required === true && (
            <span aria-hidden="true" className="ml-0.5 text-danger">
              *
            </span>
          )}
        </legend>
      )}
      <Radio.Root
        name={name}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        required={required}
        orientation={direction === 'row' ? 'horizontal' : 'vertical'}
        aria-invalid={error !== undefined || undefined}
        className={cn('flex', direction === 'row' ? 'flex-row gap-6' : 'flex-col gap-2')}
      >
        {options.map((opt) => {
          const isDisabled = disabled === true || opt.disabled === true;
          return (
            <label
              key={opt.value}
              className={cn(
                'flex items-center gap-2 text-base text-fg',
                isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              )}
            >
              <Radio.Item
                value={opt.value}
                disabled={isDisabled}
                className="flex size-[18px] shrink-0 items-center justify-center rounded-full border border-border bg-bg transition-colors outline-none focus-visible:ring-4 focus-visible:ring-brand/20 data-[state=checked]:border-brand"
              >
                <Radio.Indicator className="size-2 rounded-full bg-brand" />
              </Radio.Item>
              {opt.label}
            </label>
          );
        })}
      </Radio.Root>
      {error !== undefined && (
        <span role="alert" className="mt-1.5 block text-xs text-danger">
          {error}
        </span>
      )}
    </fieldset>
  );
}
