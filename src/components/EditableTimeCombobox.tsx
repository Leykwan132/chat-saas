import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
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
  const parsedValue = parseCalendarTimeLabel(value);
  const normalizedValue = parsedValue?.label ?? null;
  const items =
    normalizedValue && !CALENDAR_TIME_OPTIONS.includes(normalizedValue)
      ? [normalizedValue, ...CALENDAR_TIME_OPTIONS]
      : CALENDAR_TIME_OPTIONS;

  const normalizeValue = () => {
    if (parsedValue !== null) onChange(parsedValue.label);
  };

  return (
    <Combobox
      items={items}
      value={normalizedValue}
      inputValue={value}
      onInputValueChange={onChange}
      onValueChange={(nextValue) => {
        if (nextValue !== null) onChange(nextValue);
      }}
      filter={null}
      disabled={disabled}
    >
      <ComboboxInput
        aria-label={ariaLabel}
        aria-invalid={invalid}
        placeholder="Time"
        className="h-10 w-full rounded-md border-input bg-background"
        onBlur={normalizeValue}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            normalizeValue();
          }
        }}
      />
      <ComboboxContent className="rounded-xl">
        <ComboboxEmpty>Enter a valid time</ComboboxEmpty>
        <ComboboxList className="max-h-60">
          {(option) => (
            <ComboboxItem key={option} value={option} className="rounded-lg font-normal">
              {option}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
