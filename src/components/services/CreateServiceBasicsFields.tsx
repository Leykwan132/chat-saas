import { ServiceLocationField } from '@/components/services/ServiceLocationField';
import { WizardNumberField } from '@/components/services/serviceFormControls';
import { Input } from '@/components/ui/input';
import type { ServiceForm } from '@/lib/serviceForm';
import type { RefObject } from 'react';

export function CreateServiceBasicsFields({
  form,
  setForm,
  nameInputRef,
}: {
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  nameInputRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Name</span>
        <Input
          ref={nameInputRef}
          value={form.name}
          onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
          placeholder="e.g. Consultation"
          className="h-11 text-base"
        />
      </label>
      <ServiceLocationField form={form} setForm={setForm} />
      <WizardNumberField
        label="Duration"
        inputSuffix="Minutes"
        value={form.durationMinutes}
        onChange={(durationMinutes) => setForm((previous) => ({ ...previous, durationMinutes }))}
      />
    </div>
  );
}
