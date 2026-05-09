import { useState } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from 'convex/react';
import { AccountDialog } from '@/components/AccountDialog';
import { Navigate, Outlet, useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  Bot,
  Plus,
  Trash2,
  Sparkles,
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';

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

function AgentsSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/agents">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Sparkles className="size-4" />
                </div>
                <div className="flex min-w-0 flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-[15px] tracking-tight">ChatSaaS</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">Workspace</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive tooltip="Agents">
                  <Bot />
                  <span>Agents</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <AccountDialog accountPath="/workspace/account" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AgentCard({
  agent,
  deletingId,
  onDelete,
}: {
  agent: Doc<'agents'>;
  deletingId: Id<'agents'> | null;
  onDelete: (agentId: Id<'agents'>, agentName: string) => void;
}) {
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.target as Node)) {
      return;
    }
    navigate(`/dashboard/${agent._id}/chats`);
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
              <DialogHeader>
                <DialogTitle>Delete Agent</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete "{agent.name}"? This action cannot be undone.
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
        <main className="flex-1 overflow-auto px-14 py-8 md:px-12 lg:px-28">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

// ─── Agents index content ─────────────────────────────────────────

export function AgentsIndex() {
  const navigate = useNavigate();
  const { organizationId } = useAuth();
  const activeOrgId = organizationId ?? null;
  const agents = useQuery(api.agents.list, { orgId: activeOrgId });
  const removeAgent = useMutation(api.agents.remove);

  const [deletingId, setDeletingId] = useState<Id<'agents'> | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        <h1 className="m-0 text-2xl font-bold tracking-tight">Agents</h1>
        <Button type="button" size="lg" onClick={() => navigate('/create-agent')}>
          <Plus className="size-4" />
          New AI agent
        </Button>
      </div>

      {error && (
        <div className="mb-6 max-w-3xl rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {agents === undefined ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Spinner className="size-6" />
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
          {agents.map((agent) => (
            <AgentCard
              key={agent._id}
              agent={agent}
              deletingId={deletingId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Route component (auth guard + shell) ────────────────────────

export default function WorkspacePage() {
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-[100svh] items-center justify-center bg-background">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      </AuthLoading>

      <Unauthenticated>
        <Navigate to="/" replace />
      </Unauthenticated>

      <Authenticated>
        <WorkspaceShell />
      </Authenticated>
    </>
  );
}
