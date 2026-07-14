import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CALENDAR_TIME_OPTIONS, parseCalendarTimeLabel } from '@/lib/calendarTimeUtils';

export function EditableTimeCombobox({
  value,
  onChange,
  ariaLabel,
  invalid = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const normalizeValue = () => {
    const parsed = parseCalendarTimeLabel(value);
    if (parsed !== null) onChange(parsed.label);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <InputGroup className="h-10 rounded-md border-input bg-background">
          <InputGroupInput
            value={value}
            role="combobox"
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-invalid={invalid}
            placeholder="Time"
            disabled={disabled}
            className="min-w-0 px-2.5 text-sm"
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(event) => {
              onChange(event.target.value);
              setOpen(true);
            }}
            onBlur={normalizeValue}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                normalizeValue();
              }
              if (event.key === 'Escape') setOpen(false);
            }}
          />
          <InputGroupAddon align="inline-end">
            <ChevronDown aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-anchor-width)] rounded-xl p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <ScrollArea className="h-60">
          <div className="flex flex-col gap-0.5">
            {CALENDAR_TIME_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className="rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
