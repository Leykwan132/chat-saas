import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { WorkflowFollowupScheduleStepKey } from './workflowFollowupOptions';
import { useWorkflowFollowupScheduleField } from './workflowFollowupSummary';

const followupScheduleFields = {
  maxAttempts: {
    label: 'Maximum follow-ups per customer',
  },
  startAfter: {
    label: 'Start after',
  },
  interval: {
    label: 'Follow up every',
  },
} satisfies Record<WorkflowFollowupScheduleStepKey, { label: string }>;

function FollowupScheduleSelect({
  className,
  compact = false,
  stepKey,
}: {
  className?: string;
  compact?: boolean;
  stepKey: WorkflowFollowupScheduleStepKey;
}) {
  const field = followupScheduleFields[stepKey];
  const [open, setOpen] = useState(false);
  const { selectedOptionId, setSelectedOptionId, step } =
    useWorkflowFollowupScheduleField(stepKey);
  const selectedOption = step.options.find((option) => option.id === selectedOptionId);
  if (!selectedOption) {
    throw new Error(`Unknown follow-up schedule option: ${stepKey}.${selectedOptionId}`);
  }

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <Label className={cn(
        'font-semibold text-foreground',
        compact ? 'text-[11px]' : 'text-xs',
      )}
      >
        {field.label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded border border-neutral-300 bg-background font-semibold transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring dark:border-neutral-700',
              compact ? 'h-10 px-3 text-[11px]' : 'h-12 px-4 text-sm',
            )}
          >
            <span className="min-w-0 truncate text-left">{selectedOption.label}</span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[180px] rounded-md border border-border bg-popover p-0 shadow-lg"
          align="start"
        >
          <Command className="rounded-md bg-transparent">
            <CommandList className="max-h-64">
              <CommandGroup>
                {step.options.map((option) => {
                  const isSelected = option.id === selectedOptionId;
                  return (
                    <CommandItem
                      key={option.id}
                      value={option.id}
                      onSelect={() => {
                        setSelectedOptionId(option.id);
                        setOpen(false);
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-md py-1.5 pl-2.5 pr-2.5 text-[11px] data-[selected=true]:bg-muted"
                    >
                      <span className="min-w-0 truncate">{option.label}</span>
                      {isSelected && <Check className="size-3 shrink-0 text-foreground" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function WorkflowFollowupScheduleFields({
  compact = false,
}: {
  compact?: boolean;
}) {
  const maxAttempts = useWorkflowFollowupScheduleField('maxAttempts').selectedOption;
  const maxAttemptsCount = Number(maxAttempts.summaryLabel ?? maxAttempts.label);
  const hasRepeatAttempts = maxAttemptsCount > 1;

  if (compact) {
    return (
      <div
        className="nodrag nopan grid grid-cols-1 gap-4"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <FollowupScheduleSelect stepKey="maxAttempts" compact />
        <div className={cn(
          'grid grid-cols-1 gap-4',
          hasRepeatAttempts && 'sm:grid-cols-2',
        )}
        >
          <FollowupScheduleSelect stepKey="startAfter" compact />
          {hasRepeatAttempts && (
            <FollowupScheduleSelect stepKey="interval" compact />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid max-h-[calc(100vh-10rem)] grid-cols-1 items-start gap-8 overflow-y-auto px-8 py-8 lg:grid-cols-12 lg:gap-10">
      <section className="flex w-full flex-col gap-5 lg:col-span-4">
        <h3 className="text-base font-bold text-foreground">
          Follow-up limit
        </h3>
        <FollowupScheduleSelect stepKey="maxAttempts" />
      </section>
      <section className="flex w-full flex-col gap-5 border-t border-border pt-8 lg:col-span-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
        <h3 className="text-base font-bold text-foreground">
          Trigger schedule
        </h3>
        <div className={cn(
          'grid grid-cols-1 gap-6',
          hasRepeatAttempts && 'sm:grid-cols-[minmax(280px,1.35fr)_minmax(190px,1fr)]',
        )}
        >
          <FollowupScheduleSelect stepKey="startAfter" />
          {hasRepeatAttempts && (
            <FollowupScheduleSelect stepKey="interval" />
          )}
        </div>
      </section>
    </div>
  );
}
