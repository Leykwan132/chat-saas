import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from 'convex/react';
import { Check, ChevronDown, Plus, UserPlus, Building2, User } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { usePartnerManagedWorkspace } from '@/hooks/usePartnerManagedWorkspace';

type TeamType = {
  _id: string;
  type: 'personal' | 'organizational';
  name: string;
  workosOrgId?: string | null;
  isActive: boolean;
};
import { handleCreateTeamGate } from '@/lib/teamCreationGate';
import { useUpgradeModal } from '@/components/upgradeModalContext';
import { Spinner } from '@/components/ui/spinner';
import {
  BreadcrumbItem,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const teamMenuItemClassName =
  'focus:bg-transparent data-[highlighted]:bg-transparent data-[highlighted]:text-foreground';

type TeamSwitcherProps = {
  settingsPath?: string;
  onTeamSwitch?: () => void;
  onTeamSwitchStart?: () => void;
  onTeamSwitchFailed?: () => void;
};

export function TeamSwitcher({
  settingsPath,
  onTeamSwitch,
  onTeamSwitchStart,
  onTeamSwitchFailed,
}: TeamSwitcherProps) {
  const navigate = useNavigate();
  const { activeTeam, isPersonal, switchTeam } = useActiveTeam();
  const teams = useQuery(api.teams.listForCurrentUser);
  const canInviteMembers = useQuery(api.teams.canInviteMembers);
  const canCreateOrgTeam = useQuery(api.teams.canCreateOrgTeam);
  const isPartnerManagedWorkspace = usePartnerManagedWorkspace();
  const { openUpgradeModal } = useUpgradeModal();

  const [switchingTeamId, setSwitchingTeamId] = useState<string | null>(null);

  const orgTeams = teams?.filter((team: TeamType) => team.type === 'organizational') ?? [];
  const personalTeam = teams?.find((team: TeamType) => team.type === 'personal');

  const handleSwitchToPersonal = async () => {
    if (!personalTeam || isPersonal || switchingTeamId !== null) return;

    setSwitchingTeamId('personal');
    onTeamSwitchStart?.();
    try {
      await switchTeam({ teamId: personalTeam._id as Id<'teams'> });
      onTeamSwitch?.();
      if (!onTeamSwitch) {
        setSwitchingTeamId(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not switch workspace');
      onTeamSwitchFailed?.();
      setSwitchingTeamId(null);
    }
  };

  const handleSwitchToOrg = async (team: TeamType) => {
    if (team.isActive || switchingTeamId !== null || !team.workosOrgId) return;

    setSwitchingTeamId(team._id);
    onTeamSwitchStart?.();
    try {
      await switchTeam({
        teamId: team._id as Id<'teams'>,
        workosOrgId: team.workosOrgId,
      });
      onTeamSwitch?.();
      if (!onTeamSwitch) {
        setSwitchingTeamId(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not switch workspace');
      onTeamSwitchFailed?.();
      setSwitchingTeamId(null);
    }
  };

  const handleCreateTeam = () => {
    handleCreateTeamGate(
      canCreateOrgTeam,
      () => {
        if (!settingsPath) {
          navigate('/create-team');
          return;
        }
        navigate(`/create-team?returnTo=${encodeURIComponent(`${settingsPath}?section=teams`)}`);
      },
      navigate,
      settingsPath ? `${settingsPath}?section=plan` : undefined,
      openUpgradeModal,
    );
  };

  const handleInvitePeople = () => {
    if (isPersonal) {
      if (settingsPath) {
        navigate(`${settingsPath}?section=teams`);
      } else {
        toast.message('Switch to a shared team to invite people.');
      }
      return;
    }

    if (!settingsPath) {
      toast.message(
        canInviteMembers?.reason ?? 'Upgrade this team&apos;s plan to invite people.',
      );
      return;
    }

    if (canInviteMembers?.allowed) {
      navigate(`${settingsPath}?section=teams`);
      return;
    }

    if (canInviteMembers?.requiresPlanUpgrade) {
      openUpgradeModal();
      return;
    }

    navigate(`${settingsPath}?section=teams`);
  };

  return (
    <>
      <BreadcrumbItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors outline-none"
              aria-label="Workspace menu"
            >
              {!activeTeam ? (
                <span className="inline-block h-4 w-4 rounded-full bg-muted/40 animate-pulse shrink-0" />
              ) : activeTeam.type === 'personal' ? (
                <User className="size-4 text-muted-foreground shrink-0" />
              ) : (
                <Building2 className="size-4 text-muted-foreground shrink-0" />
              )}
              <BreadcrumbPage>
                {!activeTeam ? (
                  <span className="inline-block h-4 w-20 rounded bg-muted/40 animate-pulse" />
                ) : (
                  activeTeam.type === 'personal' ? 'Personal' : activeTeam.name
                )}
              </BreadcrumbPage>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-56">
            {personalTeam ? (
              <DropdownMenuItem
                onSelect={() => void handleSwitchToPersonal()}
                disabled={switchingTeamId === 'personal'}
                className={teamMenuItemClassName}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <User className="size-4 text-muted-foreground shrink-0" />
                  <span className="truncate text-sm">Personal</span>
                  {isPersonal ? (
                    switchingTeamId === 'personal' ? (
                      <Spinner className="size-4 shrink-0 ml-auto" />
                    ) : (
                      <Check className="size-4 shrink-0 text-primary ml-auto" />
                    )
                  ) : null}
                </div>
              </DropdownMenuItem>
            ) : null}

            {orgTeams.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Shared teams
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {teams === undefined ? (
                    <DropdownMenuItem disabled>
                      <Spinner className="mr-2 size-3.5" />
                      Loading…
                    </DropdownMenuItem>
                  ) : (
                    orgTeams.map((team: TeamType) => (
                      <DropdownMenuItem
                        key={team._id}
                        onSelect={() => void handleSwitchToOrg(team)}
                        disabled={switchingTeamId === team._id}
                        className={teamMenuItemClassName}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <Building2 className="size-4 text-muted-foreground shrink-0" />
                          <span className="truncate text-sm font-medium">{team.name}</span>
                          {team.isActive ? (
                            switchingTeamId === team._id ? (
                              <Spinner className="ml-auto size-4 shrink-0" />
                            ) : (
                              <Check className="ml-auto size-4 shrink-0 text-primary" />
                            )
                          ) : null}
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuGroup>
              </>
            )}

            {isPartnerManagedWorkspace === false ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleCreateTeam} className={teamMenuItemClassName}>
                  <Plus className="mr-2 size-4" />
                  Create a team
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleInvitePeople} className={teamMenuItemClassName}>
                  <UserPlus className="mr-2 size-4" />
                  Invite people
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </BreadcrumbItem>

      {switchingTeamId !== null && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-4">
            <Spinner className="h-8 w-8 text-zinc-500" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300 animate-pulse">
              Switching workspace...
            </p>
          </div>
        </div>
      )}
    </>
  );
}
