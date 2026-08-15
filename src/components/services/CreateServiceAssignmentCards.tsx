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

function StackedIcon({ Icon }: { Icon: AssignmentCardProps['icon'] }) {
  return (
    <span className="relative flex size-11 shrink-0 items-center justify-center">
      <span className="pointer-events-none absolute bottom-px left-0 flex size-9 origin-bottom-left -translate-x-0.5 -rotate-10 scale-[.84] items-center justify-center rounded-md border bg-card shadow-none" />
      <span className="pointer-events-none absolute right-0 bottom-px flex size-9 origin-bottom-right translate-x-0.5 rotate-10 scale-[.84] items-center justify-center rounded-md border bg-card shadow-none" />
      <span className="relative flex size-9 items-center justify-center rounded-md border bg-card shadow-sm">
        <Icon className="size-4" />
      </span>
    </span>
  );
}

function AssignmentCard({
  value,
  title,
  description,
  selected,
  locked = false,
  icon,
}: AssignmentCardProps) {
  const id = `service-assignment-${value}`;

  return (
    <FieldLabel
      htmlFor={id}
      className={cn(
        'group relative cursor-pointer has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border-foreground/70 has-[>[data-slot=field]]:transition-colors',
        selected ? 'has-[>[data-slot=field]]:bg-background has-[>[data-slot=field]]:shadow-sm' : 'has-[>[data-slot=field]]:border-border hover:has-[>[data-slot=field]]:border-foreground/30 hover:has-[>[data-slot=field]]:bg-accent/25',
      )}
    >
      <Field orientation="horizontal" className="min-h-32 items-start gap-3">
        <StackedIcon Icon={icon} />
        <FieldContent className="pt-0.5">
          <FieldTitle>{title}</FieldTitle>
          <FieldDescription className="text-xs leading-snug">{description}</FieldDescription>
        </FieldContent>
        <RadioGroupItem value={value} id={id} />
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
