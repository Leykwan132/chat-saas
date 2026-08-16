import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { ServiceForm } from '@/components/ServiceForm';
import { DetailPageActionFooter } from '@/components/automation/DetailPageActionFooter';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { usePermissions } from '@/hooks/usePermissions';
import {
  buildServiceMutationArgs,
  DEFAULT_SERVICE_FORM,
  serviceFormsEqual,
  serviceToForm,
  validateServiceAssignment,
  teamMemberRoleLabel,
  type ServiceForm as ServiceFormValues,
  type ServiceRow,
  type TeamMemberRole,
  type TeamUserOption,
} from '@/lib/serviceForm';
import { Permission } from '../../shared/permissions';

type TeamUser = Doc<'users'> & { isAdmin: boolean; role: TeamMemberRole };

function memberLabel(user: { firstName?: string; lastName?: string; email: string }) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return fullName || user.email;
}

export default function ServicePage() {
  const { agentId, serviceId } = useParams();
  const navigate = useNavigate();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const typedServiceId = serviceId as Id<'appointmentServices'> | undefined;
  const isEditMode = Boolean(typedServiceId);
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canRead = can(Permission.AUTOMATION_READ) || can(Permission.CALENDAR_READ);
  const canManage = can(Permission.AUTOMATION_MANAGE) || can(Permission.CALENDAR_MANAGE);

  const overview = useQuery(
    api.appointmentBooking.services.getOverview,
    typedAgentId && canRead ? { agentId: typedAgentId } : 'skip',
  );
  const teamUsers = useQuery(api.users.getUsers, {});
  const updateService = useMutation(api.appointmentBooking.services.updateService);
  const archiveService = useMutation(api.appointmentBooking.services.archiveService);

  const [form, setForm] = useState<ServiceFormValues>(DEFAULT_SERVICE_FORM);
  const [savedForm, setSavedForm] = useState<ServiceFormValues>(DEFAULT_SERVICE_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [formInitialized, setFormInitialized] = useState(!isEditMode);

  const services = useMemo(() => (overview?.services ?? []) as ServiceRow[], [overview?.services]);
  const editingService = useMemo(
    () => (typedServiceId ? services.find((service) => service._id === typedServiceId) : undefined),
    [services, typedServiceId],
  );
  const teamUserOptions = useMemo(
    (): TeamUserOption[] =>
      ((teamUsers ?? []) as TeamUser[]).map((user) => ({
        value: user.workosUserId,
        name: memberLabel(user),
        roleLabel: teamMemberRoleLabel(user.role),
      })),
    [teamUsers],
  );

  useEffect(() => {
    if (!isEditMode || !editingService || formInitialized) return;
    const nextForm = serviceToForm(editingService, teamUserOptions.map((user) => user.value));
    setForm(nextForm);
    setSavedForm(nextForm);
    setFormInitialized(true);
  }, [editingService, formInitialized, isEditMode, teamUserOptions]);

  const isDirty = useMemo(
    () => formInitialized && !serviceFormsEqual(form, savedForm),
    [form, savedForm, formInitialized],
  );

  if (!typedAgentId) return null;

  if (!permissionsLoading && !canRead) {
    return <Navigate to={`/dashboard/${typedAgentId}`} replace />;
  }

  if (!permissionsLoading && !isEditMode && !canManage) {
    return <Navigate to={`/dashboard/${typedAgentId}/services`} replace />;
  }

  const isLoading =
    permissionsLoading ||
    teamUsers === undefined ||
    (isEditMode &&
      (overview === undefined ||
        !formInitialized ||
        !editingService));

  if (!isEditMode) {
    return <Navigate to={`/dashboard/${typedAgentId}/services?create=1`} replace />;
  }

  if (isLoading) return <EditServiceSkeleton />;

  if (isEditMode && !editingService) {
    return <Navigate to={`/dashboard/${typedAgentId}/services`} replace />;
  }

  const backHref = `/dashboard/${typedAgentId}/services`;

  const handleCancel = () => {
    setForm(savedForm);
  };

  const handleSave = async () => {
    if (!canManage || !typedServiceId) return;

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      toast.error('Service name is required');
      return;
    }
    const assignmentError = validateServiceAssignment(form);
    if (assignmentError) {
      toast.error(assignmentError);
      return;
    }

    setSaving(true);
    try {
      const nextForm = { ...form, name: trimmedName };
      await updateService({
        serviceId: typedServiceId,
        ...buildServiceMutationArgs(nextForm),
      });
      setForm(nextForm);
      setSavedForm(nextForm);
      toast.success('Service saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!typedServiceId || !canManage) return;
    setDeleting(true);
    try {
      await archiveService({ serviceId: typedServiceId });
      toast.success('Service deleted');
      setConfirmDeleteOpen(false);
      navigate(backHref);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete service');
    } finally {
      setDeleting(false);
    }
  };

  const showSaveFooter = canManage && isDirty;

  return (
    <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-8"
        style={showSaveFooter ? { paddingBottom: '4.5rem' } : undefined}
      >
      <header className="flex flex-col gap-4">
        <Button
          asChild
          variant="ghost"
          className="w-fit gap-2 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground dark:hover:bg-transparent"
        >
          <Link to={backHref}>
            <ArrowLeft className="size-4" />
            Back to Services
          </Link>
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <h1 className="m-0 truncate font-title text-3xl font-normal tracking-tight text-foreground">
              {form.name.trim() || 'Edit service'}
            </h1>
          </div>

          {canManage ? (
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {form.isActive ? 'Active' : 'Inactive'}
              </span>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
                className="data-[state=checked]:bg-emerald-600"
                aria-label={`${form.isActive ? 'Turn off' : 'Turn on'} ${form.name.trim() || 'service'}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                aria-label="Delete service"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <ServiceForm
        form={form}
        setForm={setForm}
        teamUserOptions={teamUserOptions}
        canManage={canManage}
      />

      {showSaveFooter ? (
        <DetailPageActionFooter>
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            disabled={saving}
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </DetailPageActionFooter>
      ) : null}

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {form.name.trim() || 'this service'}?</DialogTitle>
            <DialogDescription>
              This removes the service from Services. Existing appointments will not be changed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? 'Deleting...' : 'Delete service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function EditServiceSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-4 h-9 w-56" />
        <Skeleton className="mt-3 h-4 w-96" />
      </div>
      <Skeleton className="h-[640px] rounded-xl" />
    </div>
  );
}
