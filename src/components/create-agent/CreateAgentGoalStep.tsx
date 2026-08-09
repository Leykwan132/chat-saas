import { ArrowLeft, CalendarCheck, CornerDownLeft, Headphones } from 'lucide-react';
import type { AgentGoal } from '../../../shared/agentCreationGoals';
import { AGENT_GOAL_OPTIONS } from '../../../shared/agentCreationGoals';
import { Button } from '@/components/ui/button';
import { FieldDescription, FieldLegend, FieldSet } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type CreateAgentGoalStepProps = {
  goal: AgentGoal | null;
  onGoalChange: (goal: AgentGoal | null) => void;
  onBack: () => void;
  onCreate: () => void;
};

const GOAL_ICONS = {
  support: Headphones,
  bookService: CalendarCheck,
} satisfies Record<AgentGoal, typeof Headphones>;

export function CreateAgentGoalStep({
  goal,
  onGoalChange,
  onBack,
  onCreate,
}: CreateAgentGoalStepProps) {
  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (goal) onCreate();
      }}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Choose your agent&apos;s goal
        </h1>
        <p className="text-sm text-muted-foreground">
          This prepares the starting instructions for your agent.
        </p>
      </div>

      <FieldSet>
        <FieldLegend variant="label">Goal</FieldLegend>
        <ToggleGroup
          type="single"
          value={goal ?? ''}
          onValueChange={(value) => onGoalChange((value as AgentGoal) || null)}
          variant="outline"
          className="grid w-full grid-cols-1 sm:grid-cols-2"
        >
          {(Object.keys(AGENT_GOAL_OPTIONS) as AgentGoal[]).map((goalKey) => {
            const option = AGENT_GOAL_OPTIONS[goalKey];
            const Icon = GOAL_ICONS[goalKey];
            return (
              <ToggleGroupItem
                key={goalKey}
                value={goalKey}
                aria-labelledby={`${goalKey}-goal-label`}
                aria-describedby={`${goalKey}-goal-description`}
                className="h-auto min-h-36 items-start justify-start whitespace-normal p-4 text-left"
              >
                <span className="flex flex-col items-start gap-3">
                  <Icon data-icon="inline-start" />
                  <span id={`${goalKey}-goal-label`} className="font-semibold">
                    {option.label}
                  </span>
                  <FieldDescription id={`${goalKey}-goal-description`}>
                    {option.description}
                  </FieldDescription>
                </span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </FieldSet>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
        <Button type="submit" disabled={!goal}>
          Create agent
          <CornerDownLeft data-icon="inline-end" />
        </Button>
      </div>
    </form>
  );
}
