import { useEffect, useState } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { useMutation, useQuery } from 'convex/react';
import { Plus } from 'lucide-react';
import { Navigate, Outlet, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { AgentsSidebar } from '@/components/workspace/AgentsSidebar';
import {
  AgentCard,
  AgentCardSkeleton,
  CreateAgentCard,
} from '@/components/workspace/AgentCards';
import { AgentCreationPermissionEmptyState } from '@/components/workspace/AgentCreationPermissionEmptyState';
import { ModeToggle } from '@/components/mode-toggle';
import { RequireOrganization } from '@/components/RequireOrganization';
import { TeamSwitcher } from '@/components/TeamSwitcher';
import { SupportHoverCard } from '@/components/SupportHoverCard';
import { WhatsNewDialog } from '@/components/WhatsNewDialog';
import { useUpgradeModal } from '@/components/upgradeModalContext';
import { UserProfileButton } from '@/components/UserProfileButton';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';

function WorkspaceShell() {
  return (
    <SidebarProvider>
      <AgentsSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 px-4 sticky top-0 z-10 bg-background border-b border-border/50">
          <Breadcrumb>
            <BreadcrumbList>
              <TeamSwitcher settingsPath="/workspace/settings" />
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-1 md:flex">
              <WhatsNewDialog />
              <SupportHoverCard />
              <ModeToggle />
            </div>
            <UserProfileButton settingsPath="/workspace/settings" />
          </div>
        </header>

        <main className="flex-1 overflow-auto px-14 py-8 md:px-12 lg:px-28">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AgentsIndex() {
  const navigate = useNavigate();
  const agents = useQuery(api.agents.list);
  const canCreateAgent = useQuery(api.agents.canCreate);
  const removeAgent = useMutation(api.agents.remove);
  const { can } = usePermissions();
  const { activeTeam } = useActiveTeam();
  const { openUpgradeModal } = useUpgradeModal();

  const [deletingId, setDeletingId] = useState<Id<'agents'> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleNewAgent = () => {
    if (canCreateAgent === undefined) return;

    if (!canCreateAgent.allowed) {
      openUpgradeModal();
      return;
    }

    navigate('/create-agent');
  };

  const handleDelete = async (agentId: Id<'agents'>, agentName: string) => {
    setDeletingId(agentId);
    setError(null);
    try {
      await removeAgent({ agentId });
      toast.success(`"${agentName}" deleted successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete agent');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-4">
      <div className="mb-9 flex items-center justify-between gap-4">
        {!activeTeam ? (
          <div className="h-9 w-48 rounded bg-muted/40 animate-pulse" />
        ) : (
          <h1 className="m-0 font-title text-3xl font-normal tracking-tight">
            {activeTeam.type === 'personal' ? 'Personal' : activeTeam.name}
          </h1>
        )}
        {can(Permission.AGENTS_CREATE) && (
          <Button type="button" size="lg" onClick={handleNewAgent}>
            <Plus data-icon="inline-start" />
            New AI agent
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-6 max-w-3xl rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {agents === undefined ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <AgentCardSkeleton />
          <AgentCardSkeleton />
          <AgentCardSkeleton />
        </div>
      ) : agents.length === 0 ? (
        can(Permission.AGENTS_CREATE) ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <CreateAgentCard onClick={handleNewAgent} />
          </div>
        ) : (
          <AgentCreationPermissionEmptyState />
        )
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {agents.map((agent: Doc<'agents'>) => (
            <AgentCard
              key={agent._id}
              agent={agent}
              deletingId={deletingId}
              onDelete={handleDelete}
              canDelete={can(Permission.AGENTS_MANAGE)}
            />
          ))}
          {can(Permission.AGENTS_CREATE) && (
            <CreateAgentCard onClick={handleNewAgent} />
          )}
        </div>
      )}
    </div>
  );
}

export default function WorkspacePage() {
  const { isLoading: workosLoading, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Payment successful. Your plan is being updated.');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (workosLoading) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <RequireOrganization>
      <WorkspaceShell />
    </RequireOrganization>
  );
}
