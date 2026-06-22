import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { useQuery } from 'convex/react';
import { Building2, Check, Plus, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { handleCreateTeamGate } from '@/lib/teamCreationGate';
import { useUpgradeModal } from '@/components/UpgradeModal';
import { Spinner } from '@/components/ui/spinner';
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const teamMenuItemClassName =
  'focus:bg-transparent data-[highlighted]:bg-transparent data-[highlighted]:text-foreground';

export const accountMenuProfileRowClassName = 'flex items-center gap-3 px-2 py-2.5';

type TeamsAccountSubmenuProps = {
  settingsPath: string;
};

type TeamListItem = NonNullable<
  ReturnType<typeof useQuery<typeof api.teams.listForCurrentUser>>
>[number];

function getTeamInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || 'T';
}

function getTeamDisplayName(team: TeamListItem) {
  return team.type === 'personal' ? 'Personal' : team.name;
}

function formatTeamMeta(team: TeamListItem) {
  const label = team.type === 'personal' ? 'Free' : 'Teams';
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <span aria-hidden>·</span>
      <Users className="size-3" />
      {team.memberCount}
    </span>
  );
}

const teamAvatarSizeClassName = 'size-10 shrink-0';

function TeamAvatar({
  team,
  profilePictureUrl,
}: {
  team: TeamListItem;
  profilePictureUrl?: string | null;
}) {
  if (team.type === 'personal') {
    if (profilePictureUrl) {
      return (
        <img
          src={profilePictureUrl}
          alt={getTeamDisplayName(team)}
          className={cn(teamAvatarSizeClassName, 'rounded-full object-cover')}
        />
      );
    }

    return (
      <div
        className={cn(
          teamAvatarSizeClassName,
          'flex items-center justify-center rounded-full bg-[#d4a574] text-xs font-semibold text-white',
        )}
      >
        {getTeamInitials(getTeamDisplayName(team))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        teamAvatarSizeClassName,
        'flex items-center justify-center rounded-full bg-muted text-muted-foreground',
      )}
    >
      <Building2 className="size-4" />
    </div>
  );
}

export function TeamsAccountSubmenu({ settingsPath }: TeamsAccountSubmenuProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeTeam, isPersonal, switchTeam } = useActiveTeam();
  const teams = useQuery(api.teams.listForCurrentUser);
  const canInviteMembers = useQuery(api.teams.canInviteMembers);
  const canCreateOrgTeam = useQuery(api.teams.canCreateOrgTeam);
  const { openUpgradeModal } = useUpgradeModal();

  const [switchingTeamId, setSwitchingTeamId] = useState<string | null>(null);

  const handleSwitchToPersonal = async () => {
    const personalTeam = teams?.find((team: TeamListItem) => team.type === 'personal');
    if (!personalTeam || isPersonal || switchingTeamId !== null) return;

    setSwitchingTeamId('personal');
    try {
      await switchTeam({ teamId: personalTeam._id as Id<'teams'> });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not switch workspace');
    } finally {
      setSwitchingTeamId(null);
    }
  };

  const handleSwitchToOrg = async (
    workosOrgId: string,
    teamId: string,
    isActive: boolean,
  ) => {
    if (isActive || switchingTeamId !== null) return;
    setSwitchingTeamId(teamId);
    try {
      await switchTeam({ teamId: teamId as Id<'teams'>, workosOrgId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not switch workspace');
    } finally {
      setSwitchingTeamId(null);
    }
  };

  const handleCreateTeam = () => {
    handleCreateTeamGate(
      canCreateOrgTeam,
      () => {
        navigate(`/create-team?returnTo=${encodeURIComponent(`${settingsPath}?section=teams`)}`);
      },
      navigate,
      `${settingsPath}?section=plan`,
      openUpgradeModal,
    );
  };

  const handleInvitePeople = () => {
    if (isPersonal) {
      navigate(`${settingsPath}?section=teams`);
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
      <DropdownMenuSub>
        <DropdownMenuSubTrigger
          className={cn(accountMenuProfileRowClassName, teamMenuItemClassName, 'data-open:bg-transparent')}
          disabled={teams === undefined}
        >
          {teams === undefined || activeTeam === undefined || activeTeam === null ? (
            <>
              <Spinner className="size-4" />
              <span className="text-sm">Loading…</span>
            </>
          ) : (
            <>
              <TeamAvatar team={activeTeam} profilePictureUrl={user?.profilePictureUrl} />
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-sm font-semibold text-foreground">
                  {getTeamDisplayName(activeTeam)}
                </div>
                <div className="truncate text-xs font-normal text-muted-foreground">
                  {formatTeamMeta(activeTeam)}
                </div>
              </div>
            </>
          )}
        </DropdownMenuSubTrigger>

        <DropdownMenuSubContent className="w-72 duration-0 data-open:animate-none data-closed:animate-none">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Switch teams
          </DropdownMenuLabel>

          {teams === undefined ? (
            <DropdownMenuItem disabled>
              <Spinner className="size-4" />
              Loading teams…
            </DropdownMenuItem>
          ) : teams.length === 0 ? (
            <DropdownMenuItem disabled>No teams found</DropdownMenuItem>
          ) : (
            teams.map((team: TeamListItem) => {
              const isActiveTeam = team.isActive;
              const isPersonalTeam = team.type === 'personal';
              const isSwitching = isPersonalTeam
                ? switchingTeamId === 'personal'
                : switchingTeamId === team._id;

              return (
                <DropdownMenuItem
                  key={team._id}
                  onSelect={() => {
                    if (isPersonalTeam) {
                      void handleSwitchToPersonal();
                      return;
                    }
                    if (team.workosOrgId) {
                      void handleSwitchToOrg(team.workosOrgId, team._id, isActiveTeam);
                    }
                  }}
                  disabled={isSwitching}
                  className={cn(accountMenuProfileRowClassName, teamMenuItemClassName)}
                >
                  <TeamAvatar team={team} profilePictureUrl={user?.profilePictureUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {getTeamDisplayName(team)}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {formatTeamMeta(team)}
                    </div>
                  </div>
                  {isActiveTeam ? (
                    isSwitching ? (
                      <Spinner className="size-4 shrink-0" />
                    ) : (
                      <Check className="size-4 shrink-0 text-foreground" />
                    )
                  ) : null}
                </DropdownMenuItem>
              );
            })
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleCreateTeam} className={teamMenuItemClassName}>
            <Plus className="size-4" />
            Create a team
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleInvitePeople} className={teamMenuItemClassName}>
            <UserPlus className="size-4" />
            Invite people
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}
