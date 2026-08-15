import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CALENDAR_TIME_OPTIONS, parseCalendarTimeLabel } from '@/lib/calendarTimeUtils';

const TIME_SELECT_OPTIONS = CALENDAR_TIME_OPTIONS.map((time) => ({ value: time, label: time }));

export function TimeSelectInput({
  label,
  value,
  onChange,
  disabled = false,
  hideLabel = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hideLabel?: boolean;
}) {
  const parsedValue = parseCalendarTimeLabel(value);
  const normalizedValue = parsedValue?.label ?? value;
  const options =
    parsedValue && !CALENDAR_TIME_OPTIONS.includes(normalizedValue)
      ? [{ value: normalizedValue, label: normalizedValue }, ...TIME_SELECT_OPTIONS]
      : TIME_SELECT_OPTIONS;

  return (
    <div className="grid gap-2">
      {hideLabel || !label ? null : <Label>{label}</Label>}
      <SearchableSelect
        value={normalizedValue}
        placeholder="Select time"
        searchPlaceholder="Search times..."
        emptyText="No times found."
        options={options}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
