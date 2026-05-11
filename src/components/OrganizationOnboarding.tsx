import { useState } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { useAction } from 'convex/react';
import { Building2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export function OrganizationOnboarding() {
  const { user, switchToOrganization, signOut } = useAuth();
  const createOrganization = useAction(
    api.organizationsAdmin.createOrganizationForCurrentUser,
  );

  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      toast.success(`Welcome to ${result.name}!`);

      // Mint a new access token whose `org_id` claim points at the new org.
      // AuthKit's `switchToOrganization` triggers the standard sign-in flow with
      // the organizationId pre-selected, then redirects back to the app — our
      // onRedirectCallback in main.tsx handles the final navigation.
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
    <div className="flex min-h-[100svh] items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-md flex-col items-center rounded-xl border border-border bg-card px-8 py-10 text-center shadow-sm">
        <div className="mb-5 flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="size-6" />
        </div>
        <h1 className="m-0 text-xl font-semibold tracking-tight">
          Set up your organization
        </h1>
        <p className="m-0 mt-2 text-sm text-muted-foreground">
          {user?.firstName ? `Hey ${user.firstName}, one` : 'One'} more step.
          Create an organization to invite teammates and connect your
          messaging channels.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 flex w-full flex-col gap-4 text-left"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="org-onboarding-name"
              className="text-xs font-medium text-muted-foreground"
            >
              Organization name
            </label>
            <Input
              id="org-onboarding-name"
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
              htmlFor="org-onboarding-domain"
              className="text-xs font-medium text-muted-foreground"
            >
              Domain <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <Input
              id="org-onboarding-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="acme.com"
              disabled={submitting}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="m-0 text-xs text-muted-foreground/80">
              Used to auto-route teammates who sign in with this email domain.
              You can verify it later.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={submitting || name.trim().length === 0}
            className="mt-1"
          >
            {submitting ? (
              <>
                <Spinner className="size-4" />
                Creating organization…
              </>
            ) : (
              'Create organization'
            )}
          </Button>
        </form>

        <Button
          type="button"
          variant="destructive"
          disabled={submitting}
          className="mt-6"
          onClick={() => signOut()}
        >
          <LogOut className="size-3.5" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
