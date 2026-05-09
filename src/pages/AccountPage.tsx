import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { WorkOsWidgets, UsersManagement } from '@workos-inc/widgets';
import { User, Users, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────

type AccountSection = 'profile' | 'members';

const NAV_ITEMS: { key: AccountSection; label: string; icon: React.ElementType }[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'members', label: 'Members', icon: Users },
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

function ProfileContent() {
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
    </div>
  );
}

// ─── Members content (token-gated) ───────────────────────────────

function MembersContent({
  organizationId,
  getAccessToken,
}: {
  organizationId: string | null;
  getAccessToken: () => Promise<string>;
}) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(null);
    void getAccessToken().then(setToken);
  }, [getAccessToken]);

  if (!organizationId) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
        <Users className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          You are not part of an organization.
        </p>
      </div>
    );
  }

  if (!token) return <MembersSkeleton />;

  const resolvedToken = token;
  return (
    <WorkOsWidgets>
      <UsersManagement authToken={() => Promise.resolve(resolvedToken)} />
    </WorkOsWidgets>
  );
}

// ─── Page content (rendered inside DashboardLayout's <Outlet />) ──

export default function AccountPage() {
  const { organizationId, signOut, getAccessToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawSection = searchParams.get('section') as AccountSection | null;
  const section: AccountSection = rawSection === 'members' ? 'members' : 'profile';

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
    setSearchParams(s === 'profile' ? {} : { section: s }, { replace: true });

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Page header — mirrors KnowledgeBasePage header exactly */}
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight">Account</h1>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            Manage your profile and organization settings.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={isSigningOut}
          onClick={handleSignOut}
        >
          {isSigningOut ? (
            <Spinner className="size-4" />
          ) : (
            <LogOut className="size-4" />
          )}
          Sign out
        </Button>
      </header>

      {/* Two-column grid — mirrors KnowledgeBasePage grid */}
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* LEFT: nav */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            if (key === 'members' && !organizationId) return null;
            const isActive = section === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left w-full',
                  isActive
                    ? 'bg-foreground text-background'
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
              {section === 'profile' ? 'Profile' : 'Members'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {section === 'profile'
                ? 'View your personal information.'
                : 'Manage members in your organization.'}
            </p>
            <Separator className="mt-4" />
          </div>

          {section === 'profile' ? (
            <ProfileContent />
          ) : (
            <MembersContent
              organizationId={organizationId}
              getAccessToken={getAccessToken}
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
