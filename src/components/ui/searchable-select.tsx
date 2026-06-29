import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export type SearchableSelectOption = {
  value: string;
  label: string;
  searchValue?: string;
  tag?: string;
  tagClassName?: string;
};

function SearchableSelectSearch({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="shrink-0 p-2">
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-9 pl-9"
        />
      </div>
    </div>
  );
}

function SearchableSelectList({
  options,
  selectedValue,
  emptyText,
  onSelect,
  listClassName,
  optionClassName,
}: {
  options: SearchableSelectOption[];
  selectedValue?: string;
  emptyText: string;
  onSelect: (value: string) => void;
  listClassName?: string;
  optionClassName?: string;
}) {
  return (
    <div className={cn('p-1', listClassName)}>
      {options.length === 0 ? (
        <div className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
              option.value === selectedValue && 'bg-muted text-foreground',
              optionClassName,
            )}
          >
            <span className="min-w-0 truncate">{option.label}</span>
            {option.tag ? (
              <Badge
                variant="outline"
                className={cn('shrink-0 font-normal', option.tagClassName)}
              >
                {option.tag}
              </Badge>
            ) : null}
          </button>
        ))
      )}
    </div>
  );
}

export function SearchableSelect({
  value,
  placeholder,
  searchPlaceholder,
  emptyText,
  options,
  onChange,
  disabled = false,
  triggerVariant = 'outline',
  triggerClassName,
  triggerLabel,
  hideChevron = false,
  contentClassName,
  listClassName,
  optionClassName,
  scrollAreaClassName,
  showSelectedTag = true,
  showSearch = true,
  triggerId,
  triggerAriaLabel,
}: {
  value?: string;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  triggerVariant?: 'outline' | 'link' | 'ghost';
  triggerClassName?: string;
  triggerLabel?: ReactNode;
  hideChevron?: boolean;
  contentClassName?: string;
  listClassName?: string;
  optionClassName?: string;
  scrollAreaClassName?: string;
  showSelectedTag?: boolean;
  showSearch?: boolean;
  triggerId?: string;
  triggerAriaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return options;

    return options.filter((option) =>
      `${option.label} ${option.searchValue ?? ''}`.toLowerCase().includes(query),
    );
  }, [options, searchQuery]);

  useEffect(() => {
    if (!open) setSearchQuery('');
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          role="combobox"
          id={triggerId}
          aria-label={triggerAriaLabel}
          aria-expanded={open}
          className={cn(
            triggerVariant === 'outline' &&
              'h-10 w-full justify-between border-input bg-background text-left font-normal',
            triggerClassName,
          )}
          disabled={disabled}
        >
          {triggerLabel ? (
            triggerLabel
          ) : (
            <span
              className={cn(
                'flex min-w-0 flex-1 items-center gap-2',
                !selectedOption && 'text-muted-foreground/50',
              )}
            >
              <span className="truncate">{selectedOption?.label ?? placeholder}</span>
              {showSelectedTag && selectedOption?.tag ? (
                <Badge
                  variant="outline"
                  className={cn('shrink-0 font-normal', selectedOption.tagClassName)}
                >
                  {selectedOption.tag}
                </Badge>
              ) : null}
            </span>
          )}
          {!hideChevron && triggerVariant === 'outline' ? (
            <ChevronRight className="size-4 rotate-90 text-muted-foreground" />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'flex flex-col gap-0 overflow-hidden rounded-xl p-0',
          contentClassName ?? 'w-[var(--radix-popover-trigger-width)]',
        )}
        align="start"
        onEscapeKeyDown={() => setOpen(false)}
        onPointerDownOutside={() => setOpen(false)}
        onWheel={(event) => event.stopPropagation()}
      >
        {showSearch ? (
          <SearchableSelectSearch
            value={searchQuery}
            placeholder={searchPlaceholder ?? placeholder}
            onChange={setSearchQuery}
          />
        ) : null}
        <ScrollArea className={cn('h-60 overflow-hidden', scrollAreaClassName)}>
          <SearchableSelectList
            options={filteredOptions}
            selectedValue={value}
            emptyText={emptyText}
            listClassName={listClassName}
            optionClassName={optionClassName}
            onSelect={(nextValue) => {
              onChange(nextValue);
              setOpen(false);
            }}
          />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
