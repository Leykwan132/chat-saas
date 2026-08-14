type AvailabilityWorkspace = { type: 'personal' | 'organizational' } | null | undefined;
type AvailabilityRole = 'owner' | 'admin' | 'member';

export function canViewAvailabilityRoster(
  activeTeam: AvailabilityWorkspace,
  role: AvailabilityRole,
) {
  return activeTeam?.type === 'organizational' && role === 'owner';
}

export function availabilityBackPath(agentId: string, showTeamRoster: boolean) {
  return showTeamRoster
    ? `/dashboard/${agentId}/availability`
    : `/dashboard/${agentId}`;
}
