import { ArrowLeft, CornerDownLeft } from 'lucide-react';
import { WizardNumberField } from '@/components/services/serviceFormControls';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

type CreateAgentServiceStepProps = {
  name: string;
  durationMinutes: number;
  appointmentBookingEnabled: boolean;
  onNameChange: (name: string) => void;
  onDurationChange: (durationMinutes: number) => void;
  onAppointmentBookingEnabledChange: (enabled: boolean) => void;
  onBack: () => void;
  onCreate: () => void;
  onSkip: () => void;
};

export function CreateAgentServiceStep({
  name,
  durationMinutes,
  appointmentBookingEnabled,
  onNameChange,
  onDurationChange,
  onAppointmentBookingEnabledChange,
  onBack,
  onCreate,
  onSkip,
}: CreateAgentServiceStepProps) {
  const canCreate = Boolean(name.trim());

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (canCreate) onCreate();
      }}
    >
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Create a service</h1>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="service-name">Service name</FieldLabel>
          <Input
            id="service-name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="e.g. Consultation"
            autoFocus
          />
        </Field>
        <WizardNumberField
          label="Duration"
          inputSuffix="Minutes"
          value={durationMinutes}
          onChange={onDurationChange}
        />
        <Field orientation="horizontal" className="justify-between rounded-xl border p-4">
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="appointment-booking-enabled">Enable AI appointment scheduling</FieldLabel>
            <p className="text-sm text-muted-foreground">You can add or edit your services later.</p>
          </div>
          <Switch
            id="appointment-booking-enabled"
            checked={appointmentBookingEnabled}
            onCheckedChange={onAppointmentBookingEnabledChange}
          />
        </Field>
      </FieldGroup>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" onClick={onSkip}>Skip for now</Button>
          <Button type="submit" disabled={!canCreate}>
            Create Agent
            <CornerDownLeft data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </form>
  );
}
