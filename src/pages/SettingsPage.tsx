import { useLocation, useSearchParams } from 'react-router';
import { useState } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { useAction, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { Building2, CreditCard, User, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanTab } from '@/components/PlanTab';
import { AccountUsageTab } from '@/components/AccountUsageTab';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { TeamDetailSection } from '@/components/teams/TeamDetailSection';
import { TeamsTableSection } from '@/components/teams/TeamsTableSection';
import type { Id } from '../../convex/_generated/dataModel';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { api } from '../../convex/_generated/api';

type AccountSection = 'profile' | 'teams' | 'usage' | 'plan';

const NAV_ITEMS: { key: AccountSection; label: string; icon: React.ElementType }[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'teams', label: 'Teams', icon: Building2 },
  { key: 'usage', label: 'Usage', icon: BarChart3 },
  { key: 'plan', label: 'Plan', icon: CreditCard },
];

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground">{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-full shrink-0" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3.5 w-48" />
        </div>
      </div>
      <Separator />
      {[100, 160, 120].map((w, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4" style={{ width: w }} />
        </div>
      ))}
    </div>
  );
}

function ProfileContent() {
  const { user, isLoading } = useAuth();
  const passwordResetAvailable = useQuery(
    api.whiteLabel.customerAccounts.hasCurrentPasswordAccount,
    user ? {} : 'skip',
  );
  const startPasswordReset = useAction(
    api.whiteLabel.customerAccountActions.startCurrentUserPasswordReset,
  );
  const [isStartingPasswordReset, setIsStartingPasswordReset] =
    useState(false);

  if (isLoading || !user) {
    return <ProfileSkeleton />;
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Account';

  const handlePasswordReset = async () => {
    setIsStartingPasswordReset(true);
    try {
      const result = await startPasswordReset({});
      window.location.assign(result.passwordResetUrl);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to start password reset.',
      );
      setIsStartingPasswordReset(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
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

      <FieldRow
        label="Full Name"
        value={[user.firstName, user.lastName].filter(Boolean).join(' ')}
      />
      <FieldRow label="Email" value={user.email} />
      <FieldRow label="Address" value={null} />
      {passwordResetAvailable ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Password
          </p>
          <Button
            className="w-fit"
            disabled={isStartingPasswordReset}
            variant="outline"
            onClick={() => void handlePasswordReset()}
          >
            {isStartingPasswordReset ? (
              <Spinner data-icon="inline-start" />
            ) : null}
            Reset password
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function TeamsContent({ settingsBasePath }: { settingsBasePath: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const teamId = searchParams.get('teamId') as Id<'teams'> | null;

  const openTeam = (nextTeamId: string) => {
    setSearchParams({ section: 'teams', teamId: nextTeamId }, { replace: false });
  };

  const goBackToTeams = () => {
    setSearchParams({ section: 'teams' }, { replace: false });
  };

  if (teamId) {
    return <TeamDetailSection teamId={teamId} onBack={goBackToTeams} />;
  }

  return <TeamsTableSection settingsBasePath={settingsBasePath} onOpenTeam={openTeam} />;
}

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const settingsBasePath = location.pathname;
  const teamId = searchParams.get('teamId');
  const { can, isLoading } = usePermissions();

  const rawSection = searchParams.get('section');
  let section: AccountSection =
    rawSection === 'teams' || rawSection === 'organisations' || rawSection === 'members'
      ? 'teams'
      : rawSection === 'usage'
      ? 'usage'
      : rawSection === 'plan'
      ? 'plan'
      : 'profile';

  if (section === 'plan' && !isLoading && !can(Permission.BILLING_READ)) {
    section = 'profile';
  }

  const setSection = (s: AccountSection) =>
    setSearchParams(s === 'profile' ? {} : { section: s }, {
      replace: true,
    });

  const sectionTitle =
    section === 'profile'
      ? 'Profile'
      : section === 'teams'
        ? teamId
          ? 'Team details'
          : 'Teams'
        : section === 'usage'
          ? 'Account usage'
          : section === 'plan'
            ? 'Plan'
            : 'Profile';

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.key === 'plan') {
      return can(Permission.BILLING_READ);
    }
    return true;
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <div>
          <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">Settings</h1>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-col gap-1">
          {visibleNavItems.map(({ key, label, icon: Icon }) => {
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

        <div className="flex flex-col gap-4 min-w-0">
          {section !== 'teams' && (
            <h2 className="text-3xl font-semibold tracking-tight">{sectionTitle}</h2>
          )}

           {section === 'profile' ? (
            <ProfileContent />
          ) : section === 'teams' ? (
            <TeamsContent settingsBasePath={settingsBasePath} />
          ) : section === 'usage' ? (
            <AccountUsageTab />
          ) : section === 'plan' ? (
            <PlanTab />
          ) : (
            <ProfileContent />
          )}
        </div>
      </div>
    </div>
  );
}

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
