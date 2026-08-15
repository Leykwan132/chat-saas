import { useEffect, useRef, useState } from 'react';
import { calendarTimeLabelToMinutes } from '@/lib/calendarTimeUtils';
import { formatMinutesCalLabel } from '@/lib/scheduleUtils';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';

type TimeOption = { value: string; label: string };

export function ScheduleTimeCombobox({ value, options, maxValue, ariaLabel, onChange }: { value: number; options: TimeOption[]; maxValue: number; ariaLabel: string; onChange: (value: number) => void }) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState(formatMinutesCalLabel(value));
  const selectedOption = options.find((option) => Number(option.value) === value) ?? null;

  useEffect(() => setInputValue(formatMinutesCalLabel(value)), [value]);

  const commitInput = () => {
    const minutes = calendarTimeLabelToMinutes(inputValue);
    if (minutes === null || minutes > maxValue) return;
    onChange(minutes);
    setInputValue(formatMinutesCalLabel(minutes));
  };

  return (
    <Combobox<TimeOption> items={options} value={selectedOption} inputValue={inputValue} onInputValueChange={setInputValue} onValueChange={(option) => { if (option) { onChange(Number(option.value)); setInputValue(option.label); } }} itemToStringLabel={(option) => option.label} itemToStringValue={(option) => option.value} isItemEqualToValue={(option, selected) => option.value === selected.value} filter={null}>
      <div ref={anchorRef} className="w-[6.75rem]"><ComboboxInput aria-label={ariaLabel} className="h-8 w-full text-base" onBlur={commitInput} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitInput(); } }} /></div>
      <ComboboxContent anchor={anchorRef} className="w-(--anchor-width) min-w-(--anchor-width) rounded-xl"><ComboboxEmpty>Enter a valid time</ComboboxEmpty><ComboboxList className="max-h-60">{(option) => <ComboboxItem key={option.value} value={option} className="rounded-lg px-3 py-2.5 font-normal">{option.label}</ComboboxItem>}</ComboboxList></ComboboxContent>
    </Combobox>
  );
}
