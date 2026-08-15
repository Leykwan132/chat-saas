import { CreateServiceBasicsFields } from '@/components/services/CreateServiceBasicsFields';
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
    <div className="flex flex-col gap-5">
      <CreateServiceBasicsFields form={form} setForm={setForm} />
      <CreateServiceAssignmentCards
        mode={mode}
        teamEnabled={teamEnabled}
        onModeChange={onModeChange}
        onUpgrade={onUpgrade}
      />
    </div>
  );
}
