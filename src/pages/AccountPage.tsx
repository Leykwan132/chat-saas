import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { UsersManagement, OrganizationSwitcher } from '@workos-inc/widgets';
import { Building2, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { CreateOrganizationDialog } from '@/components/CreateOrganizationDialog';
import { WorkOsWidgetsPanel } from '@/components/workos/WorkOsWidgetsPanel';

// ─── Types ────────────────────────────────────────────────────────

type AccountSection = 'profile' | 'organisations';

const NAV_ITEMS: { key: AccountSection; label: string; icon: React.ElementType }[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'organisations', label: 'Organisations', icon: Building2 },
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
  onSignOut,
  isSigningOut,
}: {
  onSignOut: () => void;
  isSigningOut: boolean;
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

      <Button
        type="button"
        variant="destructive"
        className="w-fit"
        disabled={isSigningOut}
        onClick={onSignOut}
      >
        {isSigningOut ? (
          <Spinner className="size-4" />
        ) : (
          <LogOut className="size-4" />
        )}
        Sign out
      </Button>
    </div>
  );
}

// ─── Organisations content (token-gated) ─────────────────────────

function OrganisationsContent({
  organizationId,
  getAccessToken,
  switchToOrganization,
}: {
  organizationId: string | null;
  getAccessToken: () => Promise<string>;
  switchToOrganization: (opts: { organizationId: string }) => Promise<void>;
}) {
  const [token, setToken] = useState<string | null>(null);

  // Re-fetch the access token whenever the active org changes so the embedded
  // UsersManagement widget always sees a token whose `org_id` claim matches
  // the org the user is viewing.
  useEffect(() => {
    setToken(null);
    void getAccessToken().then(setToken);
  }, [getAccessToken, organizationId]);

  if (!organizationId) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
        <Building2 className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          You are not part of an organization yet.
        </p>
        <CreateOrganizationDialog />
      </div>
    );
  }

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

// ─── Page content (rendered inside DashboardLayout's <Outlet />) ──

export default function AccountPage() {
  const { organizationId, signOut, getAccessToken, switchToOrganization } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Accept the legacy ?section=members link in case anything still points at
  // the old name; the canonical value is `organisations`.
  const rawSection = searchParams.get('section');
  const section: AccountSection =
    rawSection === 'organisations' || rawSection === 'members'
      ? 'organisations'
      : 'profile';

  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = useCallback(() => {
    void (async () => {
      setIsSigningOut(true);
      try {
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
      } catch {
        setIsSigningOut(false);
      }
    })();
  }, [signOut]);

  const setSection = (s: AccountSection) =>
    setSearchParams(s === 'profile' ? {} : { section: 'organisations' }, {
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
              {section === 'profile' ? 'Profile' : 'Organisations'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {section === 'profile'
                ? 'View your personal information.'
                : 'Switch organisations, create new ones, and manage members.'}
            </p>
            <Separator className="mt-4" />
          </div>

          {section === 'profile' ? (
            <ProfileContent
              onSignOut={handleSignOut}
              isSigningOut={isSigningOut}
            />
          ) : (
            <OrganisationsContent
              organizationId={organizationId}
              getAccessToken={getAccessToken}
              switchToOrganization={switchToOrganization}
            />
          )}
        </div>
      </div>

      {/* Sign-out overlay */}
      {isSigningOut && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
          <Spinner className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Signing out…</p>
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
