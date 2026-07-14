import { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/components/ui/searchable-select';
import { useWorkflowAutomationState } from './workflowAutomationContext';
import {
  createWorkflowReminderTimingOption,
  getWorkflowReminderTimingParts,
  workflowReminderTimingUnitOptions,
  type WorkflowReminderTimingUnit,
} from './workflowReminderOptions';
import { useWorkflowReminderTimingField } from './workflowReminderSummary';

const customReminderTimingValue = 'customReminderTiming';
const suggestedReminderTimingOptionId = 'threeHoursBeforeAppointment';
const suggestedReminderTimingTagClassName =
  'border-emerald-800 bg-emerald-800 text-white dark:border-emerald-900 dark:bg-emerald-900';
const reminderTimingUnitMinutes: Record<WorkflowReminderTimingUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
};

function getReminderTimingOption(
  option: ReturnType<typeof useWorkflowReminderTimingField>['options'][number],
) {
  if (option.id !== suggestedReminderTimingOptionId) {
    return {
      value: option.id,
      label: option.label,
      searchValue: option.summaryLabel,
    };
  }

  return {
    value: option.id,
    label: option.label,
    searchValue: `${option.label} ${option.summaryLabel ?? ''} suggested`,
    tag: 'Suggested',
    tagClassName: suggestedReminderTimingTagClassName,
  };
}

function getTimingSortValue(optionId: string) {
  const parts = getWorkflowReminderTimingParts(optionId);
  if (!parts) return Number.MAX_SAFE_INTEGER;

  return parts.amount * reminderTimingUnitMinutes[parts.unit];
}

function getReminderTimingSelectOptions(
  options: ReturnType<typeof useWorkflowReminderTimingField>['options'],
): SearchableSelectOption[] {
  const presetOptions = options.filter((option) => (
    !option.id.startsWith('customReminderTiming:')
  ));
  const sortedOptions = [...presetOptions]
    .sort(
      (firstOption, secondOption) =>
        getTimingSortValue(firstOption.id) - getTimingSortValue(secondOption.id),
    );
  const suggestedOption = sortedOptions.find(
    (option) => option.id === suggestedReminderTimingOptionId,
  );
  const regularOptions = sortedOptions.filter(
    (option) => option.id !== suggestedReminderTimingOptionId,
  );

  return [
    ...(suggestedOption ? [getReminderTimingOption(suggestedOption)] : []),
    ...regularOptions.map(getReminderTimingOption),
    {
      value: customReminderTimingValue,
      label: 'Custom',
      searchValue: 'custom',
    },
  ];
}

export function WorkflowReminderTimingRow({
  onUpdateOptionId,
  optionId,
}: {
  onUpdateOptionId: (optionId: string) => void;
  optionId: string;
}) {
  const { options } = useWorkflowReminderTimingField();
  const { setReminderCustomTimingOption } = useWorkflowAutomationState();
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('3');
  const [customUnit, setCustomUnit] =
    useState<WorkflowReminderTimingUnit>('hours');
  const selectValue =
    optionId.startsWith('customReminderTiming:')
      ? customReminderTimingValue
      : optionId;
  const selectedOption = options.find((option) => option.id === optionId);

  const openCustomDialog = () => {
    const currentParts = getWorkflowReminderTimingParts(optionId);
    setCustomAmount(String(currentParts?.amount ?? 3));
    setCustomUnit(currentParts?.unit ?? 'hours');
    setCustomDialogOpen(true);
  };

  const saveCustomTiming = () => {
    const amount = Number(customAmount);
    if (!Number.isInteger(amount) || amount < 1) {
      setCustomAmount('3');
      return;
    }
    const option = createWorkflowReminderTimingOption({
      amount,
      unit: customUnit,
    });
    setReminderCustomTimingOption(option);
    setCustomDialogOpen(false);
  };

  return (
    <>
      <SearchableSelect
        value={selectValue}
        placeholder="Select reminder time"
        emptyText="No reminder times found."
        options={getReminderTimingSelectOptions(options)}
        triggerLabel={selectedOption?.label}
        onChange={(nextValue) => {
          if (nextValue === customReminderTimingValue) {
            openCustomDialog();
            return;
          }
          onUpdateOptionId(nextValue);
        }}
        triggerClassName="h-10 rounded border-neutral-300 bg-background px-3 text-[11px] font-semibold dark:border-neutral-700"
        contentClassName="w-[var(--radix-popover-trigger-width)] rounded-xl"
        listClassName="p-1.5"
        optionClassName="rounded-md px-3 py-2"
        scrollAreaClassName="h-auto max-h-60"
        showSelectedTag={false}
        showSearch={false}
      />
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent
          className="gap-5 rounded-xl p-5 sm:max-w-[320px]"
          showCloseButton={false}
        >
          <DialogHeader className="gap-2">
            <DialogTitle>Custom reminder time</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-[88px_1fr] items-center gap-3">
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={customAmount}
              onChange={(event) => setCustomAmount(event.target.value)}
              className="h-9 rounded border-neutral-300 bg-background text-[12px] font-semibold dark:border-neutral-700"
              aria-label="Custom reminder amount"
            />
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full justify-between rounded border-neutral-300 bg-background px-3 text-[13px] font-semibold dark:border-neutral-700"
                  aria-label="Custom reminder unit"
                >
                  {customUnit}
                  <ChevronDownIcon
                    data-icon="inline-end"
                    className="text-muted-foreground"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl p-1.5"
              >
                <DropdownMenuRadioGroup
                  value={customUnit}
                  onValueChange={(unit) =>
                    setCustomUnit(unit as WorkflowReminderTimingUnit)
                  }
                >
                  {workflowReminderTimingUnitOptions.map((unitOption) => (
                    <DropdownMenuRadioItem
                      key={unitOption.value}
                      value={unitOption.value}
                      className="rounded-lg px-3 py-2 text-[13px]"
                    >
                      {unitOption.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <DialogFooter className="mt-1 flex-row justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 rounded px-3 text-muted-foreground hover:text-foreground"
              onClick={() => setCustomDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-full"
              onClick={saveCustomTiming}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
