import { ArrowLeft, CornerDownLeft } from 'lucide-react';
import { WeeklyAvailabilityEditor, type ShiftDraft } from '@/components/WeeklyAvailabilityEditor';
import { Button } from '@/components/ui/button';
import { SCHEDULE_TIME_OPTIONS } from '@/lib/scheduleUtils';

type CreateAgentAvailabilityStepProps = {
  shiftDrafts: ShiftDraft[];
  timezone: string;
  onShiftDraftsChange: (drafts: ShiftDraft[]) => void;
  onTimezoneChange: (timezone: string) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function CreateAgentAvailabilityStep({
  shiftDrafts,
  timezone,
  onShiftDraftsChange,
  onTimezoneChange,
  onBack,
  onContinue,
}: CreateAgentAvailabilityStepProps) {
  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Set your availability</h1>
      </div>

      <WeeklyAvailabilityEditor
        shiftDrafts={shiftDrafts}
        onShiftDraftsChange={onShiftDraftsChange}
        timezone={timezone}
        onTimezoneChange={onTimezoneChange}
        timeOptions={SCHEDULE_TIME_OPTIONS}
      />
      <p className="text-sm text-muted-foreground">You can edit it later.</p>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
        <Button type="submit">
          Continue
          <CornerDownLeft data-icon="inline-end" />
        </Button>
      </div>
    </form>
  );
}
