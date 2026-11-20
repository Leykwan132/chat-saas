import { HostBrandMark } from "@/components/HostBrandMark";
import { useHostBrand } from "@/hooks/useHostBranding";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InboxFocusUnavailable } from "@/components/inbox/InboxFocusUnavailable";
import { useEffect, useState } from "react";
import { InboxFocusSettings } from "@/components/inbox/InboxFocusSettings";
import { Outlet, useLocation, useNavigate, useParams } from "react-router";
import { useQuery } from "convex/react";
import { ChevronDown, Copy, LogOut, Settings, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/partnerAuth/AppAuthProvider";
import { RequireOrganization } from "@/components/RequireOrganization";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  INBOX_FOCUS_RETURN_KEY,
  inboxFocusPath,
  validInboxFocusReturnPath,
} from "@/lib/inboxFocusPath";

function InboxFocusSignIn() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const target = validInboxFocusReturnPath(
      location.pathname + location.search,
    );
    if (!target) throw new Error("Invalid focused Inbox path");
    sessionStorage.setItem(INBOX_FOCUS_RETURN_KEY, target);
    navigate("/sign-in", { replace: true });
  }, [location.pathname, location.search, navigate]);
  return <Spinner className="size-6" />;
}

function FocusedInbox() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { agentId } = useParams();
  const { signOut } = useAuth();
  const brand = useHostBrand();
  const agent = useQuery(
    api.agents.get,
    agentId ? { agentId: agentId as Id<"agents"> } : "skip",
  );
  useEffect(() => {
    if (agent !== undefined) sessionStorage.removeItem(INBOX_FOCUS_RETURN_KEY);
  }, [agent]);
  const copyLink = async () => {
    if (!agentId) return;
    try {
      await navigator.clipboard.writeText(
        window.location.origin + inboxFocusPath(agentId),
      );
      toast.success("Inbox link copied");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not copy inbox link",
      );
    }
  };
  if (!agentId || agent === null) {
    return (
      <InboxFocusUnavailable
        onSignOut={() => void signOut({ returnTo: window.location.origin })}
      />
    );
  }
  if (agent === undefined)
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
        <HostBrandMark brand={brand} className="size-6 shrink-0" />
        <h1 className="text-base font-semibold">Inbox</h1>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {agent.name}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => void copyLink()}
          className="size-11 md:size-8"
          aria-label="Copy inbox link"
        >
          <Copy className="size-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-11 min-w-11 gap-1 px-2 md:h-8"
              aria-label="Account menu"
            >
              <UserRound className="size-4" />
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="min-h-11 md:min-h-0"
              onSelect={() => setSettingsOpen(true)}
            >
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11 md:min-h-0"
              onSelect={() =>
                void signOut({ returnTo: window.location.origin })
              }
            >
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <InboxFocusSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </>
  );
}

export default function InboxFocusLayout() {
  const { isLoading, user } = useAuth();
  return (
    <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      {isLoading ? (
        <Spinner className="m-auto size-6" />
      ) : !user ? (
        <InboxFocusSignIn />
      ) : (
        <RequireOrganization>
          <FocusedInbox />
        </RequireOrganization>
      )}
    </div>
  );
}
