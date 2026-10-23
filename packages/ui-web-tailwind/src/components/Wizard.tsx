import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { WizardProps } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';
import { Button } from './Button';

/**
 * Same props and behaviour as the `Wizard` in @mawsoftwares/ui-web: only completed steps are clickable, "Next" is
 * disabled while the current step has `isValid === false`, the last step shows the complete label. The stepper is a
 * real ordered list with `aria-current="step"`, and Back/Next are the kit's own Buttons.
 */
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
    <div style={style} className="box-border font-sans">
      <ol className="m-0 mb-6 flex list-none items-center gap-1 p-0">
        {steps.map((step, i) => {
          const isActive = i === activeStep;
          const isCompleted = i < activeStep;
          const marker = (
            <>
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                  isActive && 'border-transparent bg-brand text-brand-contrast',
                  isCompleted && 'border-transparent bg-success text-white',
                  !isActive && !isCompleted && 'border-border bg-bg-subtle text-fg-muted',
                )}
              >
                {isCompleted ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn('whitespace-nowrap text-xs', isActive ? 'font-semibold text-fg' : 'text-fg-muted')}>
                {step.title}
              </span>
            </>
          );
          return (
            <li
              key={step.key}
              aria-current={isActive ? 'step' : undefined}
              className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}
            >
              {isCompleted ? (
                <button
                  type="button"
                  onClick={() => onStepChange(i)}
                  className="flex cursor-pointer items-center gap-2 rounded-md outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
                >
                  {marker}
                </button>
              ) : (
                <div className="flex items-center gap-2">{marker}</div>
              )}
              {i < steps.length - 1 && (
                <span aria-hidden="true" className={cn('mx-2 h-0.5 flex-1', isCompleted ? 'bg-success' : 'bg-border')} />
              )}
            </li>
          );
        })}
      </ol>

      <div className="mb-6">{current?.content}</div>

      <div className="flex justify-between border-t border-border pt-4">
        <Button variant="ghost" onClick={() => onStepChange(activeStep - 1)} disabled={isFirst}>
          {backLabel}
        </Button>
        <Button onClick={() => (isLast ? onComplete?.() : onStepChange(activeStep + 1))} disabled={!canNext}>
          {isLast ? completeLabel : nextLabel}
        </Button>
      </div>
    </div>
  );
}
