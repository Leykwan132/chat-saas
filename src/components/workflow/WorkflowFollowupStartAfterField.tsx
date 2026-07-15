import { useState } from 'react';
import { Check, ChevronDown, ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  createWorkflowFollowupStartAfterOption,
  getWorkflowFollowupStartAfterParts,
  workflowFollowupStartAfterUnitOptions,
  type WorkflowFollowupStartAfterUnit,
} from './workflowFollowupStartAfterOptions';
import { useWorkflowFollowupStartAfterField } from './workflowFollowupSummary';

const customStartAfterValue = 'customFollowupStartAfter';

export function WorkflowFollowupStartAfterField({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('1');
  const [customUnit, setCustomUnit] =
    useState<WorkflowFollowupStartAfterUnit>('days');
  const [customAmountInvalid, setCustomAmountInvalid] = useState(false);
  const {
    options,
    selectedOption,
    selectedOptionId,
    setFollowupStartAfterOption,
    step,
  } = useWorkflowFollowupStartAfterField();
  const presetOptions = options.filter(
    (option) => !option.id.startsWith('customFollowupStartAfter:'),
  );
  const customSelected = selectedOptionId.startsWith('customFollowupStartAfter:');

  const openCustomDialog = () => {
    const currentParts = getWorkflowFollowupStartAfterParts(selectedOptionId);
    setCustomAmount(String(customSelected ? currentParts?.amount ?? 1 : 1));
    setCustomUnit(customSelected ? currentParts?.unit ?? 'days' : 'days');
    setCustomAmountInvalid(false);
    setOpen(false);
    setCustomDialogOpen(true);
  };

  const saveCustomStartAfter = () => {
    const amount = Number(customAmount);
    if (!Number.isInteger(amount) || amount < 1) {
      setCustomAmountInvalid(true);
      return;
    }
    const option = createWorkflowFollowupStartAfterOption({
      amount,
      unit: customUnit,
    });
    setFollowupStartAfterOption(option);
    setCustomDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <Label className={cn(
        'font-semibold text-foreground',
        compact ? 'text-[11px]' : 'text-xs',
      )}
      >
        Start after
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
              <CommandGroup heading={step.menuLabel}>
                {presetOptions.map((option) => {
                  const isSelected = option.id === selectedOptionId;
                  return (
                    <CommandItem
                      key={option.id}
                      value={option.id}
                      onSelect={() => {
                        const startAfterOption = option;
                        setFollowupStartAfterOption(startAfterOption);
                        setOpen(false);
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-md py-1.5 pl-2.5 pr-2.5 text-[11px] data-[selected=true]:bg-muted"
                    >
                      <span className="min-w-0 truncate">{option.label}</span>
                      {isSelected && <Check className="size-3 shrink-0 text-foreground" />}
                    </CommandItem>
                  );
                })}
                <CommandItem
                  value={customStartAfterValue}
                  onSelect={openCustomDialog}
                  className="flex cursor-pointer items-center justify-between rounded-md py-1.5 pl-2.5 pr-2.5 text-[11px] data-[selected=true]:bg-muted"
                >
                  <span>Custom</span>
                  {customSelected && <Check className="size-3 shrink-0 text-foreground" />}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent
          className="gap-5 rounded-xl p-5 sm:max-w-[320px]"
          showCloseButton={false}
        >
          <DialogHeader className="gap-2">
            <DialogTitle>Custom start delay</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-[88px_1fr] items-center gap-3">
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={customAmount}
              onChange={(event) => {
                setCustomAmount(event.target.value);
                setCustomAmountInvalid(false);
              }}
              aria-invalid={customAmountInvalid}
              aria-label="Custom start delay amount"
            />
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" aria-label="Custom start delay unit">
                  {customUnit}
                  <ChevronDownIcon data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuRadioGroup
                  value={customUnit}
                  onValueChange={(unit) =>
                    setCustomUnit(unit as WorkflowFollowupStartAfterUnit)
                  }
                >
                  {workflowFollowupStartAfterUnitOptions.map((unitOption) => (
                    <DropdownMenuRadioItem
                      key={unitOption.value}
                      value={unitOption.value}
                    >
                      {unitOption.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCustomDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={saveCustomStartAfter}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
