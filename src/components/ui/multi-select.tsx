import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

export type MultiSelectOption = {
  value: string;
  label: React.ReactNode;
  /** Shown in the trigger when selected; falls back to `label`. */
  selectedLabel?: React.ReactNode;
  searchValue?: string;
};

export type MultiSelectGroup = {
  label: string;
  options: MultiSelectOption[];
};

type MultiSelectProps = {
  value: string[];
  onValueChange: (value: string[]) => void;
  groups: MultiSelectGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
  emptyLabel?: string;
  disabled?: boolean;
};

function MultiSelect({
  value,
  onValueChange,
  groups,
  placeholder = 'Select options',
  searchPlaceholder = 'Search...',
  className,
  triggerClassName,
  emptyLabel = 'No options found.',
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const optionByValue = React.useMemo(() => {
    const map = new Map<string, MultiSelectOption>();
    for (const group of groups) {
      for (const option of group.options) {
        map.set(option.value, option);
      }
    }
    return map;
  }, [groups]);

  const toggleValue = (nextValue: string) => {
    onValueChange(
      value.includes(nextValue)
        ? value.filter((item) => item !== nextValue)
        : [...value, nextValue],
    );
  };

  const clearValue = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onValueChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'flex min-h-10 w-full items-center justify-between gap-2 rounded border border-neutral-300 bg-background px-4 py-2 text-left text-sm font-semibold transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700',
            triggerClassName,
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {value.length === 0 ? (
              <span className="text-muted-foreground font-normal">{placeholder}</span>
            ) : (
              value.map((item) => (
                <span
                  key={item}
                  className="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-muted/70 px-2 py-0.5 text-xs font-semibold text-foreground"
                >
                  {optionByValue.get(item)?.selectedLabel ?? optionByValue.get(item)?.label ?? item}
                </span>
              ))
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {value.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={clearValue}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onValueChange([]);
                  }
                }}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear selection"
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[280px] rounded-md border border-border bg-popover p-0 shadow-lg"
        align="start"
      >
        <Command className="rounded-md bg-transparent">
          <CommandInput placeholder={searchPlaceholder} className="text-xs" />
          <CommandList className="max-h-64">
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {groups.map((group, groupIndex) => (
              <React.Fragment key={group.label}>
                {groupIndex > 0 && <CommandSeparator />}
                <CommandGroup heading={group.label}>
                  {group.options.map((option) => {
                    const isSelected = value.includes(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.searchValue ?? option.value}
                        onSelect={() => toggleValue(option.value)}
                        className="flex cursor-pointer items-center justify-between rounded-md py-1.5 pl-2.5 pr-2.5 text-[11px] data-[selected=true]:bg-muted"
                      >
                        <span className="flex min-w-0 items-center gap-2">{option.label}</span>
                        {isSelected && <Check className="size-3 shrink-0 text-foreground" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { MultiSelect };
