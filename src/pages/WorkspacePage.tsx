import { useEffect, useState } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { useMutation, useQuery } from 'convex/react';
import { UserProfileButton } from '@/components/UserProfileButton';
import { CreditMeter } from '@/components/CreditMeter';
import { ModeToggle } from '@/components/mode-toggle';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Bot,
  Mail,
  Plus,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';
import { RequireOrganization } from '@/components/RequireOrganization';
import { TeamSwitcher } from '@/components/TeamSwitcher';
import { showAgentLimitToast } from '@/lib/agentCreationLimit';
import { usePendingTeamInvitations } from '@/hooks/usePendingTeamInvitations';

import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { useActiveTeam } from '@/hooks/useActiveTeam';

function AgentPreview() {
  return (
    <div className="relative h-50 overflow-hidden rounded-t-lg bg-[radial-gradient(circle_at_30%_20%,#60a5fa_0,#3b82f6_34%,#2563eb_62%,#1d4ed8_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.18),transparent_35%,rgba(255,255,255,0.2)_75%)]" />
      <div className="absolute left-1/2 top-5 w-56 -translate-x-1/2 overflow-hidden rounded-t-xl bg-white shadow-xl">
        <div className="h-10 bg-blue-500 px-3 py-2 text-[9px] font-medium text-white">
          agent-config.ts
        </div>
        <div className="h-35 px-3 py-3">
          <div className="h-7 w-28 rounded-full bg-zinc-100" />
          <div className="ml-auto mt-3 h-7 w-28 rounded-full bg-blue-500" />
        </div>
      </div>
    </div>
  );
}

function AgentCardSkeleton() {
  return (
    <div className="w-full max-w-[456px] overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative h-50 overflow-hidden bg-muted/40 animate-pulse">
        <div className="absolute left-1/2 top-5 w-56 -translate-x-1/2 overflow-hidden rounded-t-xl bg-muted/20 border border-muted/30">
          <div className="h-10 bg-muted/30" />
          <div className="h-35 px-3 py-3 space-y-3">
            <div className="h-7 w-28 rounded-full bg-muted/20 animate-pulse" />
            <div className="ml-auto h-7 w-28 rounded-full bg-muted/30 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="flex items-start justify-between border-t border-border px-6 py-6">
        <div className="flex-1 space-y-2">
          <div className="h-5 w-2/3 rounded-md bg-muted/40 animate-pulse" />
          <div className="h-4 w-1/2 rounded-md bg-muted/20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function AgentsSidebar() {
  const { pathname } = useLocation();
  const isAgentsRoute = pathname === '/workspace';
  const isInvitationsRoute = pathname === '/workspace/invitations';
  const { state, toggleSidebar } = useSidebar();
  const { count: pendingInvitationCount } = usePendingTeamInvitations();
  const { can } = usePermissions();

  return (
    <Sidebar collapsible="icon">
      {/* Logo / Toggle */}
      {state === 'collapsed' ? (
        <SidebarHeader className="flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="group/logo-toggle relative size-[1.8rem] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Expand sidebar"
          >
            <img
              src="/icon.svg"
              alt=""
              className={cn(
                'size-[1.35rem] dark:invert transition-opacity duration-150',
                'group-hover/logo-toggle:opacity-0',
              )}
            />
            <PanelLeftOpen
              className={cn(
                'absolute size-[1.125rem] opacity-0 transition-opacity duration-150',
                'group-hover/logo-toggle:opacity-100',
              )}
            />
            <span className="sr-only">Expand Sidebar</span>
          </Button>
        </SidebarHeader>
      ) : (
        <SidebarHeader className="flex flex-row items-center justify-between px-4 py-3.5">
          <Link to="/workspace" className="flex items-center gap-3">
            <img src="/icon.svg" className="size-6 dark:invert" />
            <div className="flex min-w-0 flex-col leading-none">
              <span className="font-semibold text-[16px] tracking-normal font-title">Kilobot</span>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="size-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <PanelLeftClose className="size-5" />
            <span className="sr-only">Collapse Sidebar</span>
          </Button>
        </SidebarHeader>
      )}

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isAgentsRoute} tooltip="Agents">
                  <Link to="/workspace">
                    <Bot />
                    <span>Agents</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {can(Permission.TEAM_MANAGE) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isInvitationsRoute} tooltip="Invitations">
                    <Link to="/workspace/invitations">
                      <Mail />
                      <span>Invitations</span>
                    </Link>
                  </SidebarMenuButton>
                  {pendingInvitationCount > 0 ? (
                    <SidebarMenuBadge className="bg-red-600 text-white peer-data-active/menu-button:!text-white">
                      {pendingInvitationCount}
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <CreditMeter />
      </SidebarFooter>
    </Sidebar>
  );
}

function AgentCard({
  agent,
  deletingId,
  onDelete,
  canDelete,
}: {
  agent: Doc<'agents'>;
  deletingId: Id<'agents'> | null;
  onDelete: (agentId: Id<'agents'>, agentName: string) => void;
  canDelete: boolean;
}) {
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.target as Node)) {
      return;
    }
    navigate(`/dashboard/${agent._id}`);
  };

  return (
    <article
      className="group w-full max-w-[456px] cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/30"
      onClick={handleCardClick}
    >
      <AgentPreview />
      <div className="flex items-start justify-between gap-4 border-t border-border px-6 py-6 transition-colors group-hover:bg-muted/20">
        <div className="min-w-0">
          <span className="block truncate text-lg font-semibold tracking-tight text-foreground">
            {agent.name}
          </span>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            Last trained {new Date(agent.updatedAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>

        {canDelete && (
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete ${agent.name}`}
                  disabled={deletingId === agent._id}
                  onClick={(e) => e.stopPropagation()}
                >
                  {deletingId === agent._id ? (
                    <Spinner className="size-4" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent onClick={(e) => e.stopPropagation()}>
                <DialogHeader className="gap-2">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    Delete {agent.name}?
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed">
                    This permanently removes the agent. You can&apos;t undo this action.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => onDelete(agent._id, agent.name)}
                    >
                      Delete
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Shell layout (sidebar + inset, renders child routes via Outlet) ──

function WorkspaceShell() {
  return (
    <SidebarProvider>
      <AgentsSidebar />
      <SidebarInset>
        {/* Top header with breadcrumb */}
        <header className="flex h-14 items-center gap-2 px-4 sticky top-0 z-10 bg-background border-b border-border/50">
          <Breadcrumb>
            <BreadcrumbList>
              <TeamSwitcher settingsPath="/workspace/settings" />
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:block">
              <ModeToggle />
            </div>
            <UserProfileButton settingsPath="/workspace/settings" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto px-14 py-8 md:px-12 lg:px-28">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

// ─── Agents index content ─────────────────────────────────────────

export function AgentsIndex() {
  const navigate = useNavigate();
  const agents = useQuery(api.agents.list);
  const canCreateAgent = useQuery(api.agents.canCreate);
  const removeAgent = useMutation(api.agents.remove);
  const { can } = usePermissions();
  const { activeTeam } = useActiveTeam();

  const [deletingId, setDeletingId] = useState<Id<'agents'> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleNewAgent = () => {
    if (canCreateAgent === undefined) return;

    if (!canCreateAgent.allowed) {
      showAgentLimitToast(navigate);
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
          <h1 className="m-0 text-3xl font-semibold tracking-tight">
            {activeTeam.type === 'personal' ? 'Personal' : activeTeam.name}
          </h1>
        )}
        {can(Permission.AGENTS_CREATE) && (
          <Button type="button" size="lg" onClick={handleNewAgent}>
            <Plus className="size-4" />
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
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
          <AgentCardSkeleton />
          <AgentCardSkeleton />
          <AgentCardSkeleton />
        </div>
      ) : agents.length === 0 ? (
        <div className="flex h-72 max-w-xl flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-center">
          <Bot className="mb-3 size-8 text-muted-foreground" />
          <h2 className="m-0 text-base font-semibold">No agents yet</h2>
          <p className="m-0 mt-2 max-w-sm text-sm text-muted-foreground">
            Create an AI agent for a specific use case, then open its dashboard.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
          {agents.map((agent: Doc<'agents'>) => (
            <AgentCard
              key={agent._id}
              agent={agent}
              deletingId={deletingId}
              onDelete={handleDelete}
              canDelete={can(Permission.AGENTS_MANAGE)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Route component (auth guard + shell) ────────────────────────

export default function WorkspacePage() {
  const { isLoading: workosLoading, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const authUser = useQuery(
    api.users.getAuthUser,
    workosLoading ? 'skip' : {},
  );

  useEffect(() => {
    if (workosLoading) return;
  }, [workosLoading, user, authUser]);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Payment successful. Your plan is being updated.');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  // Keep showing a spinner while WorkOS is restoring the session (e.g. after
  // a page refresh). Without this guard the Convex <Unauthenticated> block
  // could fire before AuthKit has had a chance to validate the stored tokens,
  // bouncing the user back to the home page unnecessarily.
  if (workosLoading) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  // if (!user) {
  //   return <Navigate to="/" replace />;
  // }

  return (
    <RequireOrganization>
      <WorkspaceShell />
    </RequireOrganization>
  );
}
