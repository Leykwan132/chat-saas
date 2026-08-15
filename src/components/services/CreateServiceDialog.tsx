import { useEffect, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { CreateServiceInfoStep } from '@/components/services/CreateServiceInfoStep';
import { CreateServiceTeamStep } from '@/components/services/CreateServiceTeamStep';
import {
  canCreateTeamService,
  getCreateServiceAssignmentDefaults,
  getCreateServicePrimaryAction,
  type CreateServiceAssignmentMode,
} from '@/components/services/createServiceDialogModel';
import { useUpgradeModal } from '@/components/upgradeModalContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  buildServiceMutationArgs,
  DEFAULT_SERVICE_FORM,
  validateServiceAssignment,
  type ServiceForm,
  type TeamUserOption,
} from '@/lib/serviceForm';
import type { PlanKey } from '../../../shared/planCatalog';

type CreateServiceDialogProps = {
  agentId: Id<'agents'>;
  teamUserOptions: TeamUserOption[];
  currentWorkosUserId: string;
  workspacePlan: PlanKey | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function initialForm(currentWorkosUserId: string): ServiceForm {
  return {
    ...DEFAULT_SERVICE_FORM,
    fields: DEFAULT_SERVICE_FORM.fields.map((field) => ({ ...field })),
    ...getCreateServiceAssignmentDefaults(currentWorkosUserId),
  };
}

export function CreateServiceDialog({
  agentId,
  teamUserOptions,
  currentWorkosUserId,
  workspacePlan,
  open,
  onOpenChange,
}: CreateServiceDialogProps) {
  const navigate = useNavigate();
  const createService = useMutation(api.appointmentBooking.services.createService);
  const updateService = useMutation(api.appointmentBooking.services.updateService);
  const { openUpgradeModal } = useUpgradeModal();
  const [form, setForm] = useState(() => initialForm(currentWorkosUserId));
  const [mode, setMode] = useState<CreateServiceAssignmentMode>('self');
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const wasOpen = useRef(false);
  const teamEnabled = canCreateTeamService(workspacePlan);

  const reset = () => {
    setForm(initialForm(currentWorkosUserId));
    setMode('self');
    setStep(1);
    setError(null);
    setSaving(false);
  };

  useEffect(() => {
    if (open && !wasOpen.current) reset();
    wasOpen.current = open;
  }, [open, currentWorkosUserId]);

  const closeDialog = () => {
    reset();
    onOpenChange(false);
  };

  const saveService = async () => {
    const name = form.name.trim();
    if (!name) {
      setError('Service name is required.');
      return;
    }
    if (mode === 'team' && step === 1) {
      setStep(2);
      return;
    }
    if (mode === 'team') {
      const assignmentError = validateServiceAssignment(form);
      if (assignmentError) {
        setError(assignmentError);
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const serviceId = await createService({ agentId, name });
      await updateService({
        serviceId,
        ...buildServiceMutationArgs({ ...form, name }),
      });
      toast.success(`"${name}" created successfully`);
      closeDialog();
      navigate(`/dashboard/${agentId}/services/${serviceId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create service.');
      setSaving(false);
    }
  };

  const primaryAction = step === 2 ? 'Create' : getCreateServicePrimaryAction(mode);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) closeDialog(); }}>
      <DialogContent showCloseButton={false} className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{step === 1 ? 'Create a service' : 'Assign your team'}</DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Set up the service your customers can book.' : 'Choose who can deliver this service.'}
          </DialogDescription>
        </DialogHeader>
        {error ? <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        {step === 1 ? <CreateServiceInfoStep form={form} setForm={setForm} mode={mode} teamEnabled={teamEnabled} onModeChange={setMode} onUpgrade={openUpgradeModal} /> : null}
        {step === 2 ? <CreateServiceTeamStep form={form} setForm={setForm} teamUserOptions={teamUserOptions} /> : null}
        <DialogFooter className="pt-2 sm:justify-between">
          <div>{step === 2 ? <Button type="button" variant="link" className="px-0" onClick={() => { setStep(1); setError(null); }}>Back</Button> : null}</div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="link" className="px-0 text-muted-foreground" onClick={closeDialog}>Close</Button>
            <Button type="button" disabled={saving || !form.name.trim()} onClick={() => void saveService()}>{saving ? 'Creating…' : primaryAction}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
