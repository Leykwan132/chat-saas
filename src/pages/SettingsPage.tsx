import { useLocation, useSearchParams } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { Building2, CreditCard, BarChart3, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanTab } from '@/components/PlanTab';
import { UsageTab } from '@/components/UsageTab';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { TeamDetailSection } from '@/components/teams/TeamDetailSection';
import { TeamsTableSection } from '@/components/teams/TeamsTableSection';
import type { Id } from '../../convex/_generated/dataModel';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';

type AccountSection = 'profile' | 'teams' | 'plan' | 'usage';

const NAV_ITEMS: { key: AccountSection; label: string; icon: React.ElementType }[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'teams', label: 'Teams', icon: Building2 },
  { key: 'plan', label: 'Plan', icon: CreditCard },
  { key: 'usage', label: 'Usage', icon: BarChart3 },
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

  if (isLoading || !user) {
    return <ProfileSkeleton />;
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Account';

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
      : rawSection === 'plan'
      ? 'plan'
      : rawSection === 'usage'
      ? 'usage'
      : 'profile';

  if ((section === 'plan' || section === 'usage') && !isLoading && !can(Permission.BILLING_READ)) {
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
        : section === 'plan'
          ? 'Plan'
          : 'Usage';

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.key === 'plan' || item.key === 'usage') {
      return can(Permission.BILLING_READ);
    }
    return true;
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="border-b border-border pb-6">
        <div>
          <h1 className="m-0 text-4xl font-semibold tracking-tight text-foreground">Settings</h1>
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
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">{sectionTitle}</h2>
              <Separator className="mt-4" />
            </div>
          )}

          {section === 'profile' ? (
            <ProfileContent />
          ) : section === 'teams' ? (
            <TeamsContent settingsBasePath={settingsBasePath} />
          ) : section === 'plan' ? (
            <PlanTab />
          ) : (
            <UsageTab />
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
