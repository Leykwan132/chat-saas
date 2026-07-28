export const TEAM_DELETION_PHASES = [
  "stopWork",
  "disconnectChannels",
  "externalData",
  "localData",
  "verify",
  "deleteOrganization",
  "finalize",
] as const;

export type TeamDeletionPhase = (typeof TEAM_DELETION_PHASES)[number];

export function isTeamDeleting(team: {
  deletionStatus?: "deleting";
}): boolean {
  return team.deletionStatus === "deleting";
}

export function nextTeamDeletionPhase(
  phase: TeamDeletionPhase,
): TeamDeletionPhase | null {
  const index = TEAM_DELETION_PHASES.indexOf(phase);
  return TEAM_DELETION_PHASES[index + 1] ?? null;
}
