import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function CalendarDatePickerField({
  value,
  onChange,
  disabled = false,
  showLabel = true,
  label = 'Date',
  displayFormat = 'MMM d, yyyy',
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  showLabel?: boolean;
  label?: string;
  displayFormat?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = new Date(`${value}T00:00:00`);

  return (
    <div className="grid gap-2">
      {showLabel ? <Label>{label}</Label> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-between border-input bg-background text-left font-normal"
            disabled={disabled}
          >
            {format(selected, displayFormat)}
            <CalendarIcon className="size-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        {!disabled ? (
          <PopoverContent className="w-auto rounded-xl p-0" align="start">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(date) => {
                if (!date) return;
                onChange(format(date, 'yyyy-MM-dd'));
                setOpen(false);
              }}
              defaultMonth={selected}
              className="rounded-xl border-0 bg-card p-2"
            />
          </PopoverContent>
        ) : null}
      </Popover>
    </div>
  );
}
