import { List } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AGENT_TEMPLATES, type AgentTemplateKey } from '@/lib/agentTemplates';
import { templateOptions } from '@/components/agent-setup/agentSetupOptions';

type AgentSetupSystemPromptPanelProps = {
  value: string;
  onChange: (value: string) => void;
  onApplyTemplate: (key: AgentTemplateKey) => void;
};

export function AgentSetupSystemPromptPanel({
  value,
  onChange,
  onApplyTemplate,
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
            {templateOptions.map(({ key, icon: Icon, description }) => {
              const template = AGENT_TEMPLATES[key];
              return (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => onApplyTemplate(key)}
                  className="flex cursor-pointer flex-col items-start gap-1 p-2.5"
                >
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                    <Icon />
                    <span>{template.label}</span>
                  </div>
                  <span className="text-[11px] leading-normal text-muted-foreground">
                    {description}
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
    </section>
  );
}
