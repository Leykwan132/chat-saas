import { useAuth } from '@workos-inc/authkit-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

type SwitchTeamArgs = {
  teamId: Id<'teams'>;
  workosOrgId?: string | null;
};

export function useActiveTeam() {
  const { switchToOrganization, getAccessToken } = useAuth();
  const activeTeam = useQuery(api.teams.getActiveTeam);
  const switchActiveTeam = useMutation(api.teams.switchActiveTeam);

  const switchTeam = async ({ teamId }: SwitchTeamArgs) => {
    const result = await switchActiveTeam({ teamId });

    // Only call switchToOrganization when switching to an organizational team
    // that has a valid WorkOS org ID. For personal teams (workosOrgId is null),
    // we skip the WorkOS org switch entirely — calling it with an empty string
    // causes the WorkOS SDK to fail the session refresh and redirect to the
    // login page.
    if (result.workosOrgId) {
      try {
        await switchToOrganization({
          organizationId: result.workosOrgId,
        });
      } catch (err) {
        console.warn('WorkOS org switch failed, refreshing token instead:', err);
        try {
          await getAccessToken({ forceRefresh: true });
        } catch {
          // Token refresh failed too — the user's session may be expired.
        }
      }
    } else {
      // Personal team: just refresh the token to update the Convex auth state
      try {
        await getAccessToken({ forceRefresh: true });
      } catch {
        // Ignore — if the token can't be refreshed, the auth guard handles it
      }
    }

    return result;
  };

  return {
    activeTeam,
    isPersonal: activeTeam?.type === 'personal',
    workosOrgId: activeTeam?.workosOrgId ?? null,
    switchTeam,
  };
}
