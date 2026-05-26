type TeamLike = {
  type: 'personal' | 'organizational';
  name: string;
};

export function getTeamDisplayName(team: TeamLike) {
  return team.type === 'personal' ? 'Personal' : team.name;
}

export function formatTeamCreatedAt(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getTeamTypeLabel(team: TeamLike) {
  return team.type === 'personal' ? 'Personal' : 'Shared team';
}
