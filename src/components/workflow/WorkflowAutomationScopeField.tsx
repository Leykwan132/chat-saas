import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel id={labelId} className="sr-only">
        Apply to
      </FieldLabel>
      <ToggleGroup
        type="single"
        orientation="vertical"
        value={value ?? ''}
        onValueChange={(nextValue) => onChange(
          nextValue === 'currentAndFuture' || nextValue === 'futureOnly'
            ? nextValue
            : undefined,
        )}
        aria-labelledby={labelId}
        aria-invalid={invalid || undefined}
        variant="outline"
        className="nodrag nopan w-full items-stretch"
      >
        <ToggleGroupItem
          value="currentAndFuture"
          className="h-auto w-full flex-col items-start gap-1 whitespace-normal px-3 py-3 text-left"
        >
          <span className="font-semibold">{currentAndFutureLabel}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {currentAndFutureDescription}
          </span>
        </ToggleGroupItem>
        <ToggleGroupItem
          value="futureOnly"
          className="h-auto w-full flex-col items-start gap-1 whitespace-normal px-3 py-3 text-left"
        >
          <span className="font-semibold">{futureOnlyLabel}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {futureOnlyDescription}
          </span>
        </ToggleGroupItem>
      </ToggleGroup>
      {invalid && (
        <FieldDescription className="text-destructive">
          Choose what this automation should apply to first.
        </FieldDescription>
      )}
    </Field>
  );
}
