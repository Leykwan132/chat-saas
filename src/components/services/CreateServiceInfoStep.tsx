import { ServiceDetailsFields } from '@/components/services/ServiceDetailsFields';
import { ServiceTimingFields } from '@/components/services/ServiceTimingFields';
import { CreateServiceAssignmentCards } from '@/components/services/CreateServiceAssignmentCards';
import type { CreateServiceAssignmentMode } from '@/components/services/createServiceDialogModel';
import type { ServiceForm } from '@/lib/serviceForm';

export function CreateServiceInfoStep({
  form,
  setForm,
  mode,
  teamEnabled,
  onModeChange,
  onUpgrade,
}: {
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  mode: CreateServiceAssignmentMode;
  teamEnabled: boolean;
  onModeChange: (mode: CreateServiceAssignmentMode) => void;
  onUpgrade: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ServiceDetailsFields form={form} setForm={setForm} />
      <ServiceTimingFields form={form} setForm={setForm} />
      <CreateServiceAssignmentCards
        mode={mode}
        teamEnabled={teamEnabled}
        onModeChange={onModeChange}
        onUpgrade={onUpgrade}
      />
    </div>
  );
}
