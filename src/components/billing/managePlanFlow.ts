export type ManagePlanStep = 'open_portal' | 'warn_team';
export type TeamWarningAction = 'continue' | 'go_back';
export type TeamWarningResult = 'close_warning' | 'open_portal';

export function resolveManagePlanStep(isTeam: boolean): ManagePlanStep {
  return isTeam ? 'warn_team' : 'open_portal';
}

export function resolveTeamWarningAction(
  action: TeamWarningAction,
): TeamWarningResult {
  return action === 'continue' ? 'open_portal' : 'close_warning';
}

export function buildManagePlanReturnPath(
  pathname: string,
  search: string,
): string {
  return `${pathname}${search}`;
}
