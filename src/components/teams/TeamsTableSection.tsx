import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from 'convex/react';
import { ChevronRight, Plus, Search } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatTeamCreatedAt,
  getTeamDisplayName,
  getTeamTypeLabel,
} from '@/lib/teamDisplay';
import { handleCreateTeamGate } from '@/lib/teamCreationGate';

type TeamsTableSectionProps = {
  settingsBasePath: string;
  onOpenTeam: (teamId: string) => void;
};

function TeamsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-b-0">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="ml-auto h-4 w-36" />
        </div>
      ))}
    </div>
  );
}

export function TeamsTableSection({ settingsBasePath, onOpenTeam }: TeamsTableSectionProps) {
  const navigate = useNavigate();
  const teams = useQuery(api.teams.listForCurrentUser);
  const canCreateOrgTeam = useQuery(api.teams.canCreateOrgTeam);
  const [search, setSearch] = useState('');

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    const query = search.trim().toLowerCase();
    if (!query) return teams;
    return teams.filter((team: any) => getTeamDisplayName(team).toLowerCase().includes(query));
  }, [search, teams]);

  const handleCreateTeam = () => {
    handleCreateTeamGate(
      canCreateOrgTeam,
      () => {
        navigate(
          `/create-team?returnTo=${encodeURIComponent(`${settingsBasePath}?section=teams`)}`,
        );
      },
      navigate,
      `${settingsBasePath}?section=plan`,
    );
  };

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">Teams</h2>
        <div className="flex items-center gap-4">
          <div className="relative min-w-0 max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="pl-9"
            />
          </div>
          <Button type="button" className="ml-auto shrink-0 gap-1.5" onClick={handleCreateTeam}>
            <Plus className="size-4" />
            Create team
          </Button>
        </div>
      </div>

      {teams === undefined ? (
        <TeamsTableSkeleton />
      ) : filteredTeams.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
          {teams.length === 0 ? 'No teams found.' : 'No teams match your search.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Users</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      Created
                      <span aria-hidden className="text-xs">↓</span>
                    </span>
                  </th>
                  <th className="w-10 px-2 py-3" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team: any) => (
                  <tr
                    key={team._id}
                    className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/30"
                    onClick={() => onOpenTeam(team._id)}
                  >
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      {getTeamDisplayName(team)}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{getTeamTypeLabel(team)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{team.memberCount}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {formatTeamCreatedAt(team.createdAt)}
                    </td>
                    <td className="px-2 py-3.5 text-right text-muted-foreground">
                      <ChevronRight className="inline size-4" aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
