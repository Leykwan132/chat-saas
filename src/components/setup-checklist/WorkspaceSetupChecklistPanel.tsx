import { BadgeCheck, Circle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { WorkspaceSetupChecklistHoverIllustration } from './WorkspaceSetupChecklistHoverIllustration';
import type { WorkspaceSetupChecklistStepKey } from './workspaceSetupChecklistNavigation';
import { workspaceSetupChecklistAccentBorderStyle } from './workspaceSetupChecklistLayout';
import { workspaceSetupChecklistSteps } from './workspaceSetupChecklistSteps';

type WorkspaceSetupChecklistStep = {
  key: WorkspaceSetupChecklistStepKey;
  completed: boolean;
};

type WorkspaceSetupChecklistPanelProps = {
  steps: WorkspaceSetupChecklistStep[];
  completing: boolean;
  onStepClick: (stepKey: WorkspaceSetupChecklistStepKey) => void;
  onComplete: () => void;
  onClose: () => void;
};

function StepStatusIcon({ completed }: { completed: boolean }) {
  return completed ? (
    <BadgeCheck className="size-4 fill-emerald-500 text-white" />
  ) : (
    <Circle className="size-4 text-muted-foreground" />
  );
}

export function WorkspaceSetupChecklistPanel({
  steps,
  completing,
  onStepClick,
  onComplete,
  onClose,
}: WorkspaceSetupChecklistPanelProps) {
  const completionByKey = new Map(steps.map((step) => [step.key, step.completed]));

  return (
    <div
      style={workspaceSetupChecklistAccentBorderStyle}
      className="w-full rounded-lg border border-transparent p-3 text-left text-foreground shadow-lg shadow-black/5 backdrop-blur"
    >
      <div className="mb-2 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="m-0 text-sm font-medium">Starter Guide</p>
          <p className="m-0 truncate text-xs text-muted-foreground">Get your first agent ready.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={onClose}
          aria-label="Close Starter Guide"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        {workspaceSetupChecklistSteps.map((meta) => {
          const completed = completionByKey.get(meta.key) ?? false;

          return (
            <HoverCard key={meta.key} openDelay={150} closeDelay={100}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  onClick={() => onStepClick(meta.key)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    completed && 'text-muted-foreground',
                  )}
                >
                  <StepStatusIcon completed={completed} />
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-xs font-medium',
                      completed && 'line-through',
                    )}
                  >
                    {meta.title}
                  </span>
                </button>
              </HoverCardTrigger>
              <HoverCardContent side="right" align="start" sideOffset={12} className="w-64 rounded-lg">
                <div className="flex flex-col gap-3">
                  <WorkspaceSetupChecklistHoverIllustration stepKey={meta.key} />
                  <div className="flex flex-col gap-1">
                    <p className="m-0 text-sm font-medium">{meta.hoverTitle}</p>
                    <p className="m-0 text-xs leading-5 text-muted-foreground">{meta.hoverDescription}</p>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>

      <div className="mt-3 px-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full"
          disabled={completing}
          onClick={onComplete}
        >
          Mark all as completed
        </Button>
      </div>
    </div>
  );
}
