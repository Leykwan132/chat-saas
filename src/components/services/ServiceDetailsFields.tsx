import { ServiceLocationField } from '@/components/services/ServiceLocationField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ServiceForm } from '@/lib/serviceForm';

export function ServiceDetailsFields({
  form,
  setForm,
  disabled = false,
}: {
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Name</span>
        <Input
          value={form.name}
          disabled={disabled}
          onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
          placeholder="e.g. Consultation"
          className="h-12 text-base"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Description</span>
        <Textarea
          value={form.description}
          disabled={disabled}
          onChange={(event) =>
            setForm((previous) => ({ ...previous, description: event.target.value }))
          }
          placeholder="Briefly describe what this appointment is for."
          rows={5}
          className="min-h-32 resize-y"
        />
      </label>
      <ServiceLocationField form={form} setForm={setForm} disabled={disabled} />
      {form.locationMode === 'in_person' ? (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Address (optional)</span>
          <Input
            value={form.location}
            disabled={disabled}
            onChange={(event) => setForm((previous) => ({ ...previous, location: event.target.value }))}
            placeholder="Optional meeting address"
          />
        </label>
      ) : null}
    </div>
  );
}
