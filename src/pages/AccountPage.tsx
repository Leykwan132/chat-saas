import { useCallback, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Building2, User, CreditCard, Plus, BarChart3, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanTab } from '@/components/PlanTab';
import { UsageTab } from '@/components/UsageTab';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreateOrganizationDialog } from '@/components/CreateOrganizationDialog';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { UsersManagement, OrganizationSwitcher } from '@workos-inc/widgets';
import { WorkOsWidgetsPanel } from '@/components/workos/WorkOsWidgetsPanel';

// ─── Types ────────────────────────────────────────────────────────

type AccountSection = 'profile' | 'organisations' | 'plan' | 'usage';

const NAV_ITEMS: { key: AccountSection; label: string; icon: React.ElementType }[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'organisations', label: 'Organisations', icon: Building2 },
  { key: 'plan', label: 'Plan', icon: CreditCard },
  { key: 'usage', label: 'Usage', icon: BarChart3 },
];

// ─── Field row ────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground">{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}

// ─── Profile skeleton ─────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-full shrink-0" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3.5 w-48" />
        </div>
      </div>
      <Separator />
      {/* Field rows */}
      {[100, 160, 120].map((w, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4" style={{ width: w }} />
        </div>
      ))}
    </div>
  );
}

// ─── Members skeleton ─────────────────────────────────────────────

function MembersSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Separator />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-1">
          <Skeleton className="size-8 rounded-full shrink-0" />
          <div className="flex flex-col gap-1.5 flex-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

// ─── Profile content ──────────────────────────────────────────────

function ProfileContent({
  onDeleteAccount,
  isDeletingAccount,
}: {
  onDeleteAccount: () => void;
  isDeletingAccount: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return <ProfileSkeleton />;
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Account';

  return (
    <div className="flex flex-col gap-6">
      {/* Avatar + display name */}
      <div className="flex items-center gap-4">
        {user.profilePictureUrl ? (
          <img
            src={user.profilePictureUrl}
            alt="avatar"
            className="size-12 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0">
            {getInitials(user.firstName, user.lastName, user.email)}
          </div>
        )}
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>

      <Separator />

      {/* Field rows */}
      <FieldRow
        label="Full Name"
        value={[user.firstName, user.lastName].filter(Boolean).join(' ')}
      />
      <FieldRow label="Email" value={user.email} />
      <FieldRow label="Address" value={null} />

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="size-4" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
            <p className="text-sm text-muted-foreground">
              Delete your account and remove all personal data from this app. This
              action is permanent.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-destructive/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            Once deleted, you will lose access immediately and cannot recover your data.
          </p>
          <Button
            type="button"
            disabled={isDeletingAccount}
            onClick={onDeleteAccount}
            className="w-full shrink-0 sm:w-auto bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600/30 dark:bg-red-600 dark:hover:bg-red-700"
          >
            Delete account
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Organisations content (token-gated) ─────────────────────────

function OrganisationsContent() {
  const { organizationId, getAccessToken, switchToOrganization } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  // Re-fetch the access token whenever the active org changes so the embedded
  // UsersManagement widget always sees a token whose `org_id` claim matches
  useEffect(() => {
    if (!organizationId) return;
    setToken(null);
    void getAccessToken().then(setToken);
  }, [organizationId, getAccessToken]);

  if (organizationId) {
    return (
      <WorkOsWidgetsPanel>
        <OrganizationSwitcher
          authToken={getAccessToken}
          switchToOrganization={switchToOrganization}
        />
        {!token ? (
          <MembersSkeleton />
        ) : (
          <UsersManagement authToken={() => Promise.resolve(token)} />
        )}
      </WorkOsWidgetsPanel>
    );
  }

  return (
    <Empty className="max-w-2xl border bg-muted/20">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Building2 />
        </EmptyMedia>
        <EmptyTitle>Create Organization</EmptyTitle>
        <EmptyDescription>
          Don&apos;t scale alone—build the team your customers deserve.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <CreateOrganizationDialog
          trigger={
            <Button type="button" className="gap-1.5 bg-black hover:bg-black/90 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black border-0 font-medium">
              <Plus className="size-4" />
              Create
            </Button>
          }
        />
      </EmptyContent>
    </Empty>
  );
}

// ─── Page content (rendered inside DashboardLayout's <Outlet />) ──

export default function AccountPage() {
  const { user, signOut } = useAuth();
  const deleteAccount = useAction(api.accountDeletion.deleteAccount);
  const [searchParams, setSearchParams] = useSearchParams();

  // Accept the legacy ?section=members link in case anything still points at
  // the old name; the canonical value is `organisations`.
  const rawSection = searchParams.get('section');
  const section: AccountSection =
    rawSection === 'organisations' || rawSection === 'members'
      ? 'organisations'
      : rawSection === 'plan'
      ? 'plan'
      : rawSection === 'usage'
      ? 'usage'
      : 'profile';

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = useCallback(() => {
    void (async () => {
      setDeleteError(null);
      setIsDeletingAccount(true);
      try {
        await deleteAccount({ confirmation: 'DELETE' });
        const result = signOut({
          returnTo: `${window.location.origin}/`,
          navigate: false,
        });
        if (
          result !== undefined &&
          typeof (result as Promise<void>).then === 'function'
        ) {
          await (result as Promise<void>);
        }
        window.location.replace('/');
      } catch (err) {
        setIsDeletingAccount(false);
        setDeleteError(
          err instanceof Error ? err.message : 'Failed to delete account',
        );
      }
    })();
  }, [deleteAccount, signOut]);

  const setSection = (s: AccountSection) =>
    setSearchParams(s === 'profile' ? {} : { section: s }, {
      replace: true,
    });

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Page header — mirrors KnowledgeBasePage header exactly */}
      <header className="border-b border-border pb-6">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight">Account</h1>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            Manage your profile and organization settings.
          </p>
        </div>
      </header>

      {/* Two-column grid — mirrors KnowledgeBasePage grid */}
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* LEFT: nav */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const isActive = section === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left w-full',
                  isActive
                    ? 'bg-secondary text-secondary-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* RIGHT: content */}
        <div className="flex flex-col gap-4 min-w-0">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {section === 'profile'
                ? 'Profile'
                : section === 'organisations'
                ? 'Organisations'
                : section === 'plan'
                ? 'Plan'
                : 'Usage'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {section === 'profile'
                ? 'View your personal information.'
                : section === 'organisations'
                ? 'Switch organisations, create new ones, and manage members.'
                : section === 'plan'
                ? 'Manage subscription plans, billing, and add-ons.'
                : 'Track credit balance and usage across your agents.'}
            </p>
            <Separator className="mt-4" />
          </div>

          {section === 'profile' ? (
            <ProfileContent
              onDeleteAccount={() => {
                setDeleteConfirmation('');
                setDeleteError(null);
                setDeleteDialogOpen(true);
              }}
              isDeletingAccount={isDeletingAccount}
            />
          ) : section === 'organisations' ? (
            <OrganisationsContent />
          ) : section === 'plan' ? (
            <PlanTab />
          ) : (
            <UsageTab />
          )}
        </div>
      </div>

      {/* Delete account confirmation */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeletingAccount) {
            setDeleteDialogOpen(open);
            if (!open) {
              setDeleteConfirmation('');
              setDeleteError(null);
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently removes your account and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 text-sm">
            <p className="text-muted-foreground">
              You are deleting the account linked to{' '}
              <span className="font-medium text-foreground">{user?.email ?? 'your email'}</span>.
            </p>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-2 font-medium text-foreground">The following will be deleted</p>
              <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                <li>Your login profile (WorkOS)</li>
                <li>Personal workspace data: agents, knowledge base, playground chats, and credit usage</li>
                <li>Personal Stripe subscription and billing customer</li>
                <li>Organizations where you are the only member, including their agents, channels, conversations, and billing</li>
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-2 font-medium text-foreground">The following will be kept</p>
              <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                <li>Shared organizations you belong to — your membership is removed, but the org and its data remain for other members</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="delete-confirmation" className="text-sm text-muted-foreground">
                Type{' '}
                <span className="font-mono font-semibold text-foreground">DELETE</span>{' '}
                to confirm you understand this is irreversible.
              </label>
              <Input
                id="delete-confirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
                disabled={isDeletingAccount}
                autoComplete="off"
              />
              {deleteError && (
                <p className="text-sm text-destructive">{deleteError}</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeletingAccount}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isDeletingAccount || deleteConfirmation !== 'DELETE'}
              onClick={() => void handleDeleteAccount()}
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600/30 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {isDeletingAccount ? <Spinner className="size-4" /> : 'Permanently delete account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isDeletingAccount && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
          <Spinner className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Deleting account…</p>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function getInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string | null | undefined,
) {
  const f = (firstName ?? '').trim().charAt(0);
  const l = (lastName ?? '').trim().charAt(0);
  const initials = `${f}${l}`.toUpperCase();
  if (initials) return initials;
  return (email ?? '').trim().charAt(0).toUpperCase() || '•';
}
