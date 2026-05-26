import { useQuery } from 'convex/react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { TeamInvitationsPanel } from '@/components/TeamInvitationsPanel';
import { TeamMembersPanel } from '@/components/TeamMembersPanel';
import { TeamRolesAndPermissionsPanel } from '@/components/teams/TeamRolesAndPermissionsPanel';
import { TeamSectionHeader } from '@/components/teams/TeamSectionHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getTeamDisplayName } from '@/lib/teamDisplay';
import { TeamOrganizationActions } from '@/components/teams/TeamOrganizationActions';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../../shared/permissions';

type TeamDetailSectionProps = {
  teamId: Id<'teams'>;
  onBack: () => void;
};

function TeamDetailSkeleton() {
  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export function TeamDetailSection({ teamId, onBack }: TeamDetailSectionProps) {
  const team = useQuery(api.teams.getTeamDetail, { teamId });
  const canInviteMembers = useQuery(api.teams.canInviteMembers);
  const { can } = usePermissions();

  if (team === undefined) {
    return <TeamDetailSkeleton />;
  }

  if (team === null) {
    return (
      <div className="flex max-w-5xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Back to teams">
            <ArrowLeft className="size-4" />
          </Button>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Team not found</h2>
        </div>
        <p className="text-sm text-muted-foreground">This team could not be found.</p>
      </div>
    );
  }

  const isOrgTeam = team.type === 'organizational';
  const canManageTeamPermission = can(Permission.TEAM_MANAGE);
  const hasFullControl = can(Permission.FULL_CONTROL);
  // team:manage → invitations; full-control → roles & permissions.
  const canSeeInvitations = isOrgTeam && canManageTeamPermission;
  const canSeeRolesAndPermissions = isOrgTeam && hasFullControl;
  const canManageTeam = isOrgTeam && canManageTeamPermission && team.isActive;
  const manageDisabledReason = !can(Permission.TEAM_MANAGE)
    ? 'Only team admins can manage this section.'
    : !team.isActive
      ? 'Switch to this team to manage roles, permissions, and members.'
      : null;

  return (
    <div className="flex w-full max-w-5xl flex-col gap-8">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Back to teams">
          <ArrowLeft className="size-4" />
        </Button>
        <h2 className="min-w-0 flex-1 truncate text-3xl font-semibold tracking-tight text-foreground">
          {getTeamDisplayName(team)}
        </h2>
        {isOrgTeam && hasFullControl ? (
          <TeamOrganizationActions
            teamId={teamId}
            teamName={team.name}
            initialDomain={team.domain}
            onDeleted={onBack}
          />
        ) : null}
      </div>

      {isOrgTeam ? (
        <>
          {canSeeInvitations ? (
            team.isActive ? (
              <TeamInvitationsPanel
                teamId={teamId}
                canInvite={canInviteMembers?.allowed ?? false}
                canAssignOwner={team.isOwner}
                inviteDisabledReason={canInviteMembers?.reason}
              />
            ) : (
              <section className="flex flex-col gap-4">
                <TeamSectionHeader title="Invitations" />
                <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Switch to this team to manage invitations.
                </div>
              </section>
            )
          ) : null}

          {canSeeRolesAndPermissions ? (
            <TeamRolesAndPermissionsPanel
              teamId={teamId}
              canManage={canManageTeam}
              canManageAllRoles={hasFullControl}
              disabledReason={manageDisabledReason}
            />
          ) : null}

          <TeamMembersPanel
            teamId={teamId}
            canManage={canManageTeam}
            canAssignOwner={team.isOwner}
            disabledReason={manageDisabledReason}
          />
        </>
      ) : (
        <>
          <TeamMembersPanel
            teamId={teamId}
            canManage={canManageTeam}
            disabledReason={manageDisabledReason}
          />
        </>
      )}
    </div>
  );
}
