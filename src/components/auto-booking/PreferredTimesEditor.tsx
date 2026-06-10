import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Switch } from '@/components/ui/switch';
import { CALENDAR_TIME_OPTIONS } from '@/lib/calendarTimeUtils';
import { cn } from '@/lib/utils';

export function PreferredTimesEditor({
  enabled,
  times,
  onEnabledChange,
  onTimesChange,
  disabled = false,
  className,
}: {
  enabled: boolean;
  times: string[];
  onEnabledChange: (enabled: boolean) => void;
  onTimesChange: (times: string[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const availableTimeOptions = CALENDAR_TIME_OPTIONS.filter((time) => !times.includes(time)).map(
    (time) => ({ value: time, label: time }),
  );

  return (
    <div
      className={cn('w-full rounded-lg border border-border/80 bg-muted/30 p-3', className)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-foreground">
            Preferred Time <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
          </p>
          <p className="text-xs text-muted-foreground">
            The AI offers these times first when available, then other open slots.
          </p>
        </div>
        <Switch
          checked={enabled}
          disabled={disabled}
          onCheckedChange={onEnabledChange}
          className="shrink-0 data-[state=checked]:bg-emerald-600"
        />
      </div>

      {enabled ? (
        <div className="mt-3 flex flex-col gap-3">
          {times.length > 0 ? (
            <div className="flex flex-wrap justify-start gap-2">
              {times.map((time, index) => (
                <span
                  key={`${time}-${index}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-sm font-medium text-foreground"
                >
                  {time}
                  {!disabled ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${time}`}
                      onClick={() =>
                        onTimesChange(times.filter((_, itemIndex) => itemIndex !== index))
                      }
                    >
                      <X className="size-3.5" />
                    </Button>
                  ) : null}
                </span>
              ))}
            </div>
          ) : null}

          {!disabled ? (
            <SearchableSelect
              value={undefined}
              placeholder="Add time"
              searchPlaceholder="Search times..."
              emptyText={
                availableTimeOptions.length === 0 ? 'All times added.' : 'No times found.'
              }
              options={availableTimeOptions}
              triggerVariant="link"
              triggerClassName="h-auto w-fit gap-1.5 px-0 text-muted-foreground"
              triggerLabel={
                <>
                  <Plus className="size-4" />
                  Add time
                </>
              }
              hideChevron
              contentClassName="w-36"
              onChange={(value) => {
                if (value && !times.includes(value)) {
                  onTimesChange([...times, value]);
                }
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
