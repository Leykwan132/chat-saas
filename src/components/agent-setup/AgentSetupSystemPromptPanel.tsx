import { List } from 'lucide-react';
import { Link } from 'react-router';
import type { AgentGoal } from '../../../shared/agentCreationGoals';
import { AGENT_GOAL_OPTIONS } from '../../../shared/agentCreationGoals';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { templateOptions } from '@/components/agent-setup/agentSetupOptions';

type AgentSetupSystemPromptPanelProps = {
  value: string;
  onChange: (value: string) => void;
  onApplyTemplate: (goal: AgentGoal) => void;
  workflowHref: string;
};

export function AgentSetupSystemPromptPanel({
  value,
  onChange,
  onApplyTemplate,
  workflowHref,
}: AgentSetupSystemPromptPanelProps) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-lg font-semibold tracking-tight text-foreground">
          System Prompt
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="h-8 gap-1.5 px-3 text-[13px] has-data-[icon=inline-start]:pl-2.5"
            >
              <List data-icon="inline-start" />
              Template Library
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-1.5">
            {templateOptions.map(({ goal, icon: Icon }) => {
              const template = AGENT_GOAL_OPTIONS[goal];
              return (
                <DropdownMenuItem
                  key={goal}
                  onSelect={() => onApplyTemplate(goal)}
                  className="flex cursor-pointer flex-col items-start gap-1 p-2.5"
                >
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                    <Icon />
                    <span>{template.label}</span>
                  </div>
                  <span className="text-[11px] leading-normal text-muted-foreground">
                    {template.description}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Describe the agent's core purpose, style of response, and guidelines..."
        className="min-h-72 resize-y overflow-y-auto border-border bg-input/35 text-sm leading-6 field-sizing-content"
      />
      <p className="m-0 text-xs leading-5 text-muted-foreground">
        Use the system prompt for answering style, high-level goals, and general guardrails. For reliable conditional actions like sending an image or video, booking an appointment, or triggering a handoff, set them up in{' '}
        <Link
          to={workflowHref}
          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Workflow
        </Link>
        .
      </p>
    </section>
  );
}
