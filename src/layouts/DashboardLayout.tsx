import { useState } from 'react';
import { Outlet, Navigate, useParams, useNavigate, useLocation } from 'react-router';
import { useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { Bot, ChevronDown } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppSidebar } from '@/components/app-sidebar';
import { RequireOrganization } from '@/components/RequireOrganization';
import { UserProfileButton } from '@/components/UserProfileButton';
import { TeamSwitcher } from '@/components/TeamSwitcher';
import { SupportHoverCard } from '@/components/SupportHoverCard';
import { WhatsNewDialog } from '@/components/WhatsNewDialog';
import { ModeToggle } from '@/components/mode-toggle';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '../../convex/_generated/api';
import type { Id, Doc } from '../../convex/_generated/dataModel';
import { cn } from '@/lib/utils';
import { WorkspaceUnavailable } from '@/components/WorkspaceUnavailable';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { toast } from 'sonner';

type DashboardHeaderProps = {
  agent: { _id: Id<'agents'>; name: string };
};

function DashboardHeader({ agent }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const allAgents = useQuery(api.agents.list);

  const subPath = location.pathname.replace(/^\/dashboard\/[^/]+\/?/, '') || 'inbox';
  const settingsPath = `/dashboard/${agent._id}/settings`;

  const handleTeamSwitch = () => {
    navigate('/workspace');
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/50 bg-background px-4">
      <Breadcrumb>
        <BreadcrumbList>
          <TeamSwitcher settingsPath={settingsPath} onTeamSwitch={handleTeamSwitch} />

          <BreadcrumbSeparator />

          {/* Current agent crumb + switcher dropdown */}
          <BreadcrumbItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors outline-none"
                  aria-label="Switch agent"
                >
                  <BreadcrumbPage>{agent.name}</BreadcrumbPage>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Your agents
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {allAgents === undefined ? (
                    <DropdownMenuItem disabled>
                      <Spinner className="mr-2 size-3.5" />
                      Loading…
                    </DropdownMenuItem>
                  ) : allAgents.length === 0 ? (
                    <DropdownMenuItem disabled>No agents found</DropdownMenuItem>
                  ) : (
                    allAgents.map((a: Doc<'agents'>) => (
                      <DropdownMenuItem
                        key={a._id}
                        onSelect={() => navigate(`/dashboard/${a._id}/${subPath}`)}
                        className={a._id === agent._id ? 'bg-accent' : ''}
                      >
                        <Bot className="mr-2 size-3.5" />
                        <span className="truncate">{a.name}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center gap-1 md:flex">
          <WhatsNewDialog />
          <SupportHoverCard />
          <ModeToggle />
        </div>
        <UserProfileButton settingsPath={settingsPath} />
      </div>
    </header>
  );
}

function DashboardContent() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { isPersonal, switchTeam } = useActiveTeam();
  const teams = useQuery(api.teams.listForCurrentUser);
  const [switchingToPersonal, setSwitchingToPersonal] = useState(false);
  const location = useLocation();
  const isInboxPage = /\/inbox\/?$/.test(location.pathname);
  const isCalendarPage = /\/calendar\/?$/.test(location.pathname);
  const isWorkflowPage = /\/workflow\/?$/.test(location.pathname);
  const isCreateServicesPage = /\/services\/new\/?$/.test(location.pathname);
  const isFullHeightPage = isInboxPage || isCalendarPage || isWorkflowPage;
  const agent = useQuery(
    api.agents.get,
    agentId ? { agentId: agentId as Id<'agents'> } : 'skip',
  );

  const handleBackToPersonal = async () => {
    const personalTeam = teams?.find((team) => team.type === 'personal');
    if (!personalTeam) {
      toast.error('Personal workspace is unavailable');
      return;
    }
    setSwitchingToPersonal(true);
    try {
      if (!isPersonal) {
        await switchTeam({ teamId: personalTeam._id as Id<'teams'> });
      }
      navigate('/workspace', { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not switch workspace',
      );
      setSwitchingToPersonal(false);
    }
  };

  if (!agentId) {
    return <Navigate to="/workspace" replace />;
  }

  if (agent === undefined) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (agent === null) {
    return (
      <WorkspaceUnavailable
        onBackToPersonal={handleBackToPersonal}
        loading={teams === undefined || switchingToPersonal}
      />
    );
  }

  if (isCreateServicesPage) {
    return (
      <TooltipProvider delayDuration={0}>
        <div className="flex min-h-[100svh] flex-col bg-background">
          <Outlet />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider
        className={cn(isFullHeightPage && 'h-svh max-h-svh min-h-0 overflow-hidden')}
      >
        <AppSidebar agent={agent} />

        <SidebarInset
          className={cn(
            isFullHeightPage && 'h-svh max-h-svh min-h-0 overflow-hidden',
          )}
        >
          {/* Top header with breadcrumb */}
          <DashboardHeader agent={agent} />

          {/* Page content */}
          <main
            className={
              isFullHeightPage
                ? 'flex min-h-0 flex-1 flex-col overflow-hidden p-0'
                : 'flex-1 overflow-auto px-14 py-8 md:px-12 lg:px-28'
            }
          >
            <div className={cn('animate-fade-in', isFullHeightPage && 'flex h-full min-h-0 flex-1 flex-col')}>
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

export default function DashboardLayout() {
  const { isLoading: workosLoading, user } = useAuth();

  // Wait for WorkOS to restore the session before deciding whether to
  // redirect. Without this, a brief unauthenticated window during token
  // hydration would bounce the user back to "/" on every page refresh.
  if (workosLoading) {
    return (
      <div className="flex items-center justify-center min-h-[100svh] bg-background">
        <Spinner className="w-8 h-8 text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <RequireOrganization>
      <DashboardContent />
    </RequireOrganization>
  );
}
