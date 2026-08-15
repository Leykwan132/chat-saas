import { Circle, UserRound, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreateServiceAssignmentMode } from '@/components/services/createServiceDialogModel';

type CreateServiceAssignmentCardsProps = {
  mode: CreateServiceAssignmentMode;
  teamEnabled: boolean;
  onModeChange: (mode: CreateServiceAssignmentMode) => void;
  onUpgrade: () => void;
};

type AssignmentCardProps = {
  title: string;
  description: string;
  selected: boolean;
  locked?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
};

function StackedIcon({ Icon }: { Icon: AssignmentCardProps['icon'] }) {
  return (
    <span className="relative flex size-11 shrink-0 items-center justify-center">
      <span className="absolute inset-1.5 translate-x-1.5 translate-y-1.5 rounded-lg border border-border/70" />
      <span className="absolute inset-1.5 translate-x-0.5 translate-y-0.5 rounded-lg border border-border/80" />
      <span className="relative flex size-9 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
        <Icon className="size-4" />
      </span>
    </span>
  );
}

function AssignmentCard({
  title,
  description,
  selected,
  locked = false,
  icon,
  onClick,
}: AssignmentCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'group relative flex min-h-36 w-full overflow-hidden rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'border-foreground/60 bg-accent/40' : 'border-border hover:border-foreground/30 hover:bg-accent/25',
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-3">
        <StackedIcon Icon={icon} />
        <span className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className="text-xs leading-snug text-muted-foreground">{description}</span>
        </span>
      </span>
      <Circle className={cn('size-4 shrink-0', selected ? 'fill-foreground text-background' : 'text-muted-foreground/50')} />
      {locked ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-foreground/10 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background">Upgrade</span>
        </span>
      ) : null}
    </button>
  );
}

export function CreateServiceAssignmentCards({
  mode,
  teamEnabled,
  onModeChange,
  onUpgrade,
}: CreateServiceAssignmentCardsProps) {
  return (
    <div role="radiogroup" aria-label="Service assignment" className="grid gap-3 sm:grid-cols-2">
      <AssignmentCard
        title="For myself"
        description="Create an event on your personal profile."
        selected={mode === 'self'}
        icon={UserRound}
        onClick={() => onModeChange('self')}
      />
      <AssignmentCard
        title="For team"
        description="Let selected teammates take this service."
        selected={mode === 'team'}
        locked={!teamEnabled}
        icon={UsersRound}
        onClick={teamEnabled ? () => onModeChange('team') : onUpgrade}
      />
    </div>
  );
}
