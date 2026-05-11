import { useState } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { useAction } from 'convex/react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
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

type CreateOrganizationDialogProps = {
  trigger?: React.ReactNode;
};

// Dialog version of the onboarding form, used from the Account → Organisations
// tab once the user already belongs to ≥1 org. Calls the same Convex action
// as `OrganizationOnboarding`, then `switchToOrganization` so AuthKit mints a
// new access token whose `org_id` claim points at the freshly created org.
export function CreateOrganizationDialog({ trigger }: CreateOrganizationDialogProps) {
  const { switchToOrganization } = useAuth();
  const createOrganization = useAction(
    api.organizationsAdmin.createOrganizationForCurrentUser,
  );

  const [open, setOpen] = useState(false);
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
      setError('Please enter a name for your organization.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const trimmedDomain = domain.trim();
      const result = await createOrganization({
        name: trimmedName,
        domain: trimmedDomain.length > 0 ? trimmedDomain : undefined,
      });
      toast.success(`Created ${result.name}. Switching…`);
      await switchToOrganization({ organizationId: result.organizationId });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not create organization';
      setError(message);
      toast.error(message);
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button">
            <Plus className="size-4" />
            New organization
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
            <DialogDescription>
              Spin up a new workspace in WorkOS. You'll be added as an admin
              automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="create-org-name"
                className="text-xs font-medium text-muted-foreground"
              >
                Organization name
              </label>
              <Input
                id="create-org-name"
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
                htmlFor="create-org-domain"
                className="text-xs font-medium text-muted-foreground"
              >
                Domain{' '}
                <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <Input
                id="create-org-domain"
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
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={submitting || name.trim().length === 0}
            >
              {submitting ? (
                <>
                  <Spinner className="size-4" />
                  Creating…
                </>
              ) : (
                'Create organization'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
