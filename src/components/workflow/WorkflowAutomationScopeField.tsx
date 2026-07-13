import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { WorkflowAutomationActivationScope } from '../../../shared/workflowAutomations';

type WorkflowAutomationScopeFieldProps = {
  currentAndFutureDescription: string;
  currentAndFutureLabel: string;
  futureOnlyDescription: string;
  futureOnlyLabel: string;
  labelId: string;
  invalid: boolean;
  onChange: (scope: WorkflowAutomationActivationScope | undefined) => void;
  value?: WorkflowAutomationActivationScope;
};

export function WorkflowAutomationScopeField({
  currentAndFutureDescription,
  currentAndFutureLabel,
  futureOnlyDescription,
  futureOnlyLabel,
  labelId,
  invalid,
  onChange,
  value,
}: WorkflowAutomationScopeFieldProps) {
  const currentAndFutureId = `${labelId}-current-and-future`;
  const futureOnlyId = `${labelId}-future-only`;

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel id={labelId} className="sr-only">
        Apply to
      </FieldLabel>
      <RadioGroup
        value={value ?? ''}
        onValueChange={(nextValue) => {
          if (nextValue === 'currentAndFuture' || nextValue === 'futureOnly') {
            onChange(nextValue);
          }
        }}
        aria-labelledby={labelId}
        aria-invalid={invalid || undefined}
        className="nodrag nopan w-full gap-3"
      >
        <Field orientation="horizontal" className="gap-2">
          <RadioGroupItem
            value="currentAndFuture"
            id={currentAndFutureId}
            aria-invalid={invalid || undefined}
          />
          <FieldContent>
            <FieldLabel htmlFor={currentAndFutureId} className="text-xs font-medium">
              {currentAndFutureLabel}
            </FieldLabel>
            <FieldDescription className="text-[11px] leading-relaxed">
              {currentAndFutureDescription}
            </FieldDescription>
          </FieldContent>
        </Field>
        <Field orientation="horizontal" className="gap-2">
          <RadioGroupItem
            value="futureOnly"
            id={futureOnlyId}
            aria-invalid={invalid || undefined}
          />
          <FieldContent>
            <FieldLabel htmlFor={futureOnlyId} className="text-xs font-medium">
              {futureOnlyLabel}
            </FieldLabel>
            <FieldDescription className="text-[11px] leading-relaxed">
              {futureOnlyDescription}
            </FieldDescription>
          </FieldContent>
        </Field>
      </RadioGroup>
      {invalid && (
        <FieldDescription className="text-destructive">
          Choose what this automation should apply to first.
        </FieldDescription>
      )}
    </Field>
  );
}
