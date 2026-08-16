import { UserRound, UsersRound } from 'lucide-react';
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { CreateServiceAssignmentMode } from '@/components/services/createServiceDialogModel';

type CreateServiceAssignmentCardsProps = {
  mode: CreateServiceAssignmentMode;
  teamEnabled: boolean;
  onModeChange: (mode: CreateServiceAssignmentMode) => void;
  onUpgrade: () => void;
};

type AssignmentCardProps = {
  value: CreateServiceAssignmentMode;
  title: string;
  description: string;
  selected: boolean;
  locked?: boolean;
  icon: React.ComponentType<{ className?: string }>;
};

function AssignmentCard({
  value,
  title,
  description,
  selected,
  locked = false,
  icon,
}: AssignmentCardProps) {
  const id = `service-assignment-${value}`;
  const Icon = icon;

  return (
    <FieldLabel
      htmlFor={id}
      className={cn(
        'group relative cursor-pointer has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border-foreground/70 has-[>[data-slot=field]]:transition-colors',
        selected ? 'has-[>[data-slot=field]]:bg-background has-[>[data-slot=field]]:shadow-sm' : 'has-[>[data-slot=field]]:border-border hover:has-[>[data-slot=field]]:border-foreground/30 hover:has-[>[data-slot=field]]:bg-accent/25',
      )}
    >
      <Field orientation="horizontal" className="relative flex-col items-start gap-3">
        <Icon className="size-5" />
        <FieldContent>
          <FieldTitle>{title}</FieldTitle>
          <FieldDescription className="text-xs leading-snug">{description}</FieldDescription>
        </FieldContent>
        <RadioGroupItem value={value} id={id} className="absolute top-4 right-4" />
      </Field>
      {locked ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-foreground/10 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background">Upgrade</span>
        </span>
      ) : null}
    </FieldLabel>
  );
}

export function CreateServiceAssignmentCards({
  mode,
  teamEnabled,
  onModeChange,
  onUpgrade,
}: CreateServiceAssignmentCardsProps) {
  const chooseMode = (value: string) => {
    if (value === 'team' && !teamEnabled) {
      onUpgrade();
      return;
    }
    onModeChange(value as CreateServiceAssignmentMode);
  };

  return (
    <RadioGroup value={mode} onValueChange={chooseMode} aria-label="Service assignment" className="grid gap-3 sm:grid-cols-2">
      <AssignmentCard
        value="self"
        title="For myself"
        description="Create a service only for you."
        selected={mode === 'self'}
        icon={UserRound}
      />
      <AssignmentCard
        value="team"
        title="For team"
        description="Let teammates deliver this service."
        selected={mode === 'team'}
        locked={!teamEnabled}
        icon={UsersRound}
      />
    </RadioGroup>
  );
}
