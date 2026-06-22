import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { getClientTimeZone } from '@/lib/calendarTimeUtils';
import { useUpgradeModal } from '@/components/UpgradeModal';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

type CreateTeamDialogProps = {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CreateTeamDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
}: CreateTeamDialogProps) {
  const { switchTeam } = useActiveTeam();
  const createTeam = useAction(api.organizationsAdmin.createTeamForCurrentUser);
  const canCreateOrgTeam = useQuery(api.teams.canCreateOrgTeam);
  const { openUpgradeModal } = useUpgradeModal();

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setDomain('');
    setError(null);
    setSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    setOpen(next);
    if (!next) reset();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError('Please enter a name for your team.');
      return;
    }

    if (canCreateOrgTeam && !canCreateOrgTeam.allowed) {
      if (canCreateOrgTeam.requiresPlanUpgrade) {
        openUpgradeModal();
        return;
      }
      setError(canCreateOrgTeam.reason ?? 'You cannot create a team right now.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const trimmedDomain = domain.trim();
      const result = await createTeam({
        name: trimmedName,
        domain: trimmedDomain.length > 0 ? trimmedDomain : undefined,
        timeZone: getClientTimeZone(),
      });
      toast.success(`Created ${result.name}. Switching…`);
      await switchTeam({
        teamId: result.teamId as Id<'teams'>,
        workosOrgId: result.organizationId,
      });
      handleOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create team';
      setError(message);
      toast.error(message);
      setSubmitting(false);
    }
  };

  const dialog = (
    <DialogContent>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Create a team</DialogTitle>
          <DialogDescription>
            Name your team to start collaborating. You&apos;ll be added as an admin automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="create-team-name"
              className="text-xs font-medium text-muted-foreground"
            >
              Team name
            </label>
            <Input
              id="create-team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
              autoFocus
              required
              disabled={submitting}
              maxLength={80}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="create-team-domain"
              className="text-xs font-medium text-muted-foreground"
            >
              Domain{' '}
              <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <Input
              id="create-team-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="acme.com"
              disabled={submitting}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" disabled={submitting || name.trim().length === 0}>
            {submitting ? (
              <>
                <Spinner className="size-4" />
                Creating…
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );

  if (trigger !== undefined || controlledOpen === undefined) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger !== undefined ? (
          <DialogTrigger asChild>{trigger}</DialogTrigger>
        ) : null}
        {dialog}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {dialog}
    </Dialog>
  );
}

export function CreateOrganizationDialog(props: CreateTeamDialogProps) {
  return <CreateTeamDialog {...props} trigger={props.trigger ?? (
    <Button type="button">
      <Plus className="size-4" />
      New team
    </Button>
  )} />;
}
