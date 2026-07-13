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
  const selectedDescription = value === 'currentAndFuture'
    ? currentAndFutureDescription
    : value === 'futureOnly'
      ? futureOnlyDescription
      : undefined;

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel id={labelId} className="sr-only">
        Apply to
      </FieldLabel>
      <ToggleGroup
        type="single"
        spacing={0}
        value={value ?? ''}
        onValueChange={(nextValue) => {
          if (nextValue === 'currentAndFuture' || nextValue === 'futureOnly') {
            onChange(nextValue);
          }
        }}
        aria-labelledby={labelId}
        aria-invalid={invalid || undefined}
        variant="outline"
        className="nodrag nopan grid w-full grid-cols-2 data-[spacing=0]:data-[variant=outline]:rounded-md"
      >
        <ToggleGroupItem
          value="currentAndFuture"
          className="h-9 w-full text-xs font-medium group-data-horizontal/toggle-group:data-[spacing=0]:first:rounded-l-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {currentAndFutureLabel}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="futureOnly"
          className="h-9 w-full text-xs font-medium group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-r-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {futureOnlyLabel}
        </ToggleGroupItem>
      </ToggleGroup>
      {selectedDescription && (
        <FieldDescription>{selectedDescription}</FieldDescription>
      )}
      {invalid && (
        <FieldDescription className="text-destructive">
          Choose what this automation should apply to first.
        </FieldDescription>
      )}
    </Field>
  );
}
