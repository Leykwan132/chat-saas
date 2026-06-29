import type { ReactNode } from 'react';
import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  type WorkflowAutomationStep,
} from './workflowTriggerOptions';

type WorkflowTriggerAddMenuProps = {
  step: WorkflowAutomationStep;
  selectedOptionId?: string;
  onSelect: (optionId: string) => void;
  children?: ReactNode;
};

export function WorkflowTriggerAddMenu({
  step,
  selectedOptionId,
  onSelect,
  children,
}: WorkflowTriggerAddMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children ?? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="cursor-pointer rounded-xl border-black bg-black text-white hover:bg-black hover:text-white active:bg-black active:text-white aria-expanded:bg-black aria-expanded:text-white focus-visible:border-black focus-visible:ring-0"
            aria-label={step.emptyLabel}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <Plus data-icon="inline-start" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        side="bottom"
        sideOffset={14}
        className="w-72 rounded-xl"
      >
        <DropdownMenuLabel>{step.menuLabel}</DropdownMenuLabel>
        <DropdownMenuGroup>
          {step.options.map(({ id, label, description, Icon }) => {
            const isSelected = selectedOptionId === id;
            return (
              <DropdownMenuItem
                key={id}
                disabled={isSelected}
                className="items-start gap-3"
                onClick={(event) => event.stopPropagation()}
                onSelect={(event) => {
                  event.stopPropagation();
                  if (!isSelected) onSelect(id);
                }}
              >
                <Icon className="mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{label}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {description}
                  </span>
                </span>
                {isSelected ? <Check className="mt-0.5 text-emerald-600" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
