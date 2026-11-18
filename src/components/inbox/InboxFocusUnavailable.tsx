import { useState } from "react";
import { useLocation } from "react-router";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useActiveTeam } from "@/hooks/useActiveTeam";
import {
  INBOX_FOCUS_RETURN_KEY,
  validInboxFocusReturnPath,
} from "@/lib/inboxFocusPath";

export function InboxFocusUnavailable({
  onSignOut,
}: {
  onSignOut: () => void;
}) {
  const teams = useQuery(api.teams.listForCurrentUser);
  const { activeTeam, switchTeam } = useActiveTeam();
  const location = useLocation();
  const [switching, setSwitching] = useState<string | null>(null);
  const otherTeams = teams?.filter((team) => team._id !== activeTeam?._id);
  const openWorkspace = async (teamId: string) => {
    if (switching) return;
    const target = validInboxFocusReturnPath(
      location.pathname + location.search,
    );
    if (!target) throw new Error("Invalid focused Inbox path");
    sessionStorage.setItem(INBOX_FOCUS_RETURN_KEY, target);
    setSwitching(teamId);
    try {
      await switchTeam({ teamId: teamId as Id<"teams"> });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not open workspace",
      );
    } finally {
      setSwitching(null);
    }
  };
  return (
    <div className="m-auto flex w-full max-w-sm flex-col items-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">Open your inbox</h1>
      <p className="text-sm text-muted-foreground">
        This inbox is not in your current workspace. Choose your team's
        workspace below, or ask your team to give you access.
      </p>
      {teams === undefined ? (
        <Spinner className="size-5" />
      ) : (
        otherTeams?.map((team) => (
          <Button
            key={team._id}
            variant="outline"
            className="w-full"
            disabled={switching !== null}
            onClick={() => void openWorkspace(team._id)}
          >
            {switching === team._id ? <Spinner className="size-4" /> : null}
            Open {team.name}
          </Button>
        ))
      )}
      <Button variant="ghost" onClick={onSignOut}>
        Sign out
      </Button>
    </div>
  );
}
