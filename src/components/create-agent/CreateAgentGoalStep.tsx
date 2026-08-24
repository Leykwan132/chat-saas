import { ArrowLeft, CalendarCheck, CornerDownLeft, Headphones } from 'lucide-react';
import type { AgentGoal } from '../../../shared/agentCreationGoals';
import { AGENT_GOAL_OPTIONS } from '../../../shared/agentCreationGoals';
import { Button } from '@/components/ui/button';
import { FieldDescription, FieldSet } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { getCreateAgentGoalActionLabel } from './createAgentWizardModel';

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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Set your goal
        </h1>
      </div>

      <FieldSet>
        <ToggleGroup
          type="single"
          value={goal ?? ''}
          onValueChange={(value) => onGoalChange((value as AgentGoal) || null)}
          variant="outline"
          spacing={5}
          className="grid w-full grid-cols-1 !items-stretch sm:grid-cols-2"
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
                className="!h-full min-h-48 items-start justify-start rounded-xl !p-8 text-left whitespace-normal data-[state=on]:!border-2 data-[state=on]:!border-foreground"
              >
                <span className="flex flex-col items-start gap-3">
                  <Icon data-icon="inline-start" />
                  <span id={`${goalKey}-goal-label`} className="text-lg font-semibold">
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
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
        <Button type="submit" disabled={!goal}>
          {getCreateAgentGoalActionLabel(goal)}
          <CornerDownLeft data-icon="inline-end" />
        </Button>
      </div>
    </form>
  );
}
