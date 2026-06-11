import { Globe } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';

type TimeZoneOption = {
  value: string;
  label: string;
};

export function TimeZoneSelect({
  value,
  options,
  onChange,
  disabled = false,
  showGlobe = false,
  triggerId,
  triggerAriaLabel,
  triggerClassName,
  contentClassName = 'w-72',
}: {
  value: string;
  options: readonly TimeZoneOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  showGlobe?: boolean;
  triggerId?: string;
  triggerAriaLabel?: string;
  triggerClassName?: string;
  contentClassName?: string;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <SearchableSelect
      value={value}
      placeholder="Time zone"
      searchPlaceholder="Search time zones..."
      emptyText="No time zones found."
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
        searchValue: option.value.replace(/_/g, ' '),
      }))}
      onChange={onChange}
      disabled={disabled}
      triggerVariant="outline"
      triggerId={triggerId}
      triggerAriaLabel={triggerAriaLabel}
      contentClassName={contentClassName}
      triggerClassName={cn(
        'h-8 justify-between gap-1.5 text-sm font-normal shadow-none',
        triggerClassName,
      )}
      triggerLabel={
        showGlobe ? (
          <>
            <Globe className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{selectedOption?.label ?? 'Time zone'}</span>
          </>
        ) : undefined
      }
    />
  );
}
