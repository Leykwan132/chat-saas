import { PreferredTimesEditor } from '@/components/services/PreferredTimesEditor';
import { WizardNumberField } from '@/components/services/serviceFormControls';
import type { ServiceForm } from '@/lib/serviceForm';

export function ServiceTimingFields({
  form,
  setForm,
  disabled = false,
}: {
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  disabled?: boolean;
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <WizardNumberField
        label="Duration"
        inputSuffix="Minutes"
        hint="How long each appointment lasts."
        value={form.durationMinutes}
        disabled={disabled}
        onChange={(value) => setForm((previous) => ({ ...previous, durationMinutes: value }))}
      />
      <WizardNumberField
        label="Gap"
        inputSuffix="Minutes"
        hint="Minutes blocked after each appointment. 0 = back-to-back."
        value={form.bufferMinutes}
        disabled={disabled}
        onChange={(value) => setForm((previous) => ({ ...previous, bufferMinutes: value }))}
      />
      <PreferredTimesEditor
        enabled={form.preferredTimeEnabled}
        times={form.preferredTimes}
        disabled={disabled}
        onEnabledChange={(checked) =>
          setForm((previous) => ({ ...previous, preferredTimeEnabled: checked }))
        }
        onTimesChange={(times) => setForm((previous) => ({ ...previous, preferredTimes: times }))}
      />
    </div>
  );
}
