import { useState } from 'react';
import { useAction } from 'convex/react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type TeamOrganizationActionsProps = {
  teamId: Id<'teams'>;
  teamName: string;
  initialDomain?: string | null;
  onUpdated?: () => void;
  onDeleted?: () => void;
};

export function TeamOrganizationActions({
  teamId,
  teamName,
  initialDomain,
  onUpdated,
  onDeleted,
}: TeamOrganizationActionsProps) {
  const getOrganization = useAction(api.organizationsAdmin.getOrganizationForTeam);
  const updateOrganization = useAction(api.organizationsAdmin.updateOrganizationForTeam);
  const deleteOrganization = useAction(api.workosOrganizationActions.deleteOrganizationForTeam);

  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(teamName);
  const [domain, setDomain] = useState(initialDomain ?? '');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpdateOpenChange = (open: boolean) => {
    setUpdateOpen(open);
    if (!open) {
      setName(teamName);
      setDomain(initialDomain ?? '');
      return;
    }

    setLoadingDetails(true);
    void (async () => {
      try {
        const details = await getOrganization({ teamId });
        setName(details.name);
        setDomain(details.domain);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not load organization details');
        setUpdateOpen(false);
      } finally {
        setLoadingDetails(false);
      }
    })();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrganization({
        teamId,
        name,
        domain: domain.trim().length > 0 ? domain : undefined,
      });
      toast.success('Organization updated');
      setUpdateOpen(false);
      onUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteOrganization({ teamId });
      toast.success('Organization deleted');
      setDeleteOpen(false);
      onDeleted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete organization');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label={`Organization actions for ${teamName}`}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]" onClick={(event) => event.stopPropagation()}>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onSelect={() => handleUpdateOpenChange(true)}
          >
            <Pencil className="size-4" />
            Update
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-red-600 focus:text-red-600"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={updateOpen} onOpenChange={handleUpdateOpenChange}>
        <DialogContent onClick={(event) => event.stopPropagation()} className="sm:max-w-md">
          <DialogHeader className="gap-4">
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              Update Organization
            </DialogTitle>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="size-5 text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`org-name-${teamId}`}>Name</Label>
                <Input
                  id={`org-name-${teamId}`}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Acme Inc."
                  maxLength={80}
                  disabled={saving}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`org-domain-${teamId}`}>Domain</Label>
                <Input
                  id={`org-domain-${teamId}`}
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  placeholder="acme.com"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={saving}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setUpdateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || loadingDetails || name.trim().length === 0}
              onClick={() => void handleSave()}
            >
              {saving ? <Spinner className="size-4" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent onClick={(event) => event.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete organization?</DialogTitle>
            <DialogDescription>
              {teamName} and all of its team data will be permanently removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={deleting} onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700 hover:text-white"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? <Spinner className="size-4" /> : 'Delete organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
