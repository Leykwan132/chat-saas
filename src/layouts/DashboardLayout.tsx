import { Link, Outlet, Navigate, useParams, useNavigate, useLocation } from 'react-router';
import { Authenticated, Unauthenticated, AuthLoading, useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { Bot, ChevronDown } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppSidebar } from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
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

type DashboardHeaderProps = {
  agent: { _id: Id<'agents'>; name: string };
};

function DashboardHeader({ agent }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { organizationId } = useAuth();
  const activeOrgId = organizationId ?? null;
  const allAgents = useQuery(api.agents.list, { orgId: activeOrgId });

  // Determine sub-path so switching agents keeps you on the same section
  // e.g. /dashboard/<id>/agents  →  "agents"
  const subPath = location.pathname.replace(/^\/dashboard\/[^/]+\/?/, '') || 'chats';

  return (
    <header className="flex h-14 items-center gap-2 px-4 sticky top-0 z-10 bg-background border-b border-border/50">
      <SidebarTrigger className="-ml-1" />

      <Breadcrumb>
        <BreadcrumbList>
          {/* Workspace crumb */}
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/workspace" className="text-sm">Workspace</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

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
    </header>
  );
}

function DashboardContent() {
  const { agentId } = useParams();
  const agent = useQuery(
    api.agents.get,
    agentId ? { agentId: agentId as Id<'agents'> } : 'skip',
  );

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
      <div className="flex min-h-[100svh] items-center justify-center bg-background px-6">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-lg border border-border bg-card">
            <Bot className="size-6 text-muted-foreground" />
          </div>
          <h1 className="m-0 text-lg font-semibold">Agent not found</h1>
          <p className="m-0 mt-2 text-sm leading-6 text-muted-foreground">
            This dashboard is not available for the current workspace.
          </p>
          <Button asChild className="mt-5">
            <Link to="/workspace">Back to agents</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <AppSidebar agent={agent} />

        <SidebarInset>
          {/* Top header with breadcrumb */}
          <DashboardHeader agent={agent} />

          {/* Page content */}
          <main className="flex-1 px-14 py-8 md:px-12 lg:px-28 overflow-auto">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

export default function DashboardLayout() {
  return (
    <>
      <AuthLoading>
        <div className="flex items-center justify-center min-h-[100svh] bg-background">
          <Spinner className="w-8 h-8 text-muted-foreground" />
        </div>
      </AuthLoading>

      <Unauthenticated>
        <Navigate to="/" replace />
      </Unauthenticated>

      <Authenticated>
        <DashboardContent />
      </Authenticated>
    </>
  );
}
