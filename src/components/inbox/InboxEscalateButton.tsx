import { Pause, Play } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { InboxEscalationCountdown } from "./InboxEscalationCountdown";

type Props = {
  conversationId: Id<"conversations"> | null;
  escalated: boolean;
  disabled: boolean;
  onDeescalate: () => void;
};

export function InboxEscalateButton({
  conversationId,
  escalated,
  disabled,
  onDeescalate,
}: Props) {
  const escalate = useMutation(api.inboxManualEscalation.escalate);
  const timer = useQuery(
    api.inboxEscalationTimer.get,
    conversationId && escalated ? { conversationId } : "skip",
  );
  const [busy, setBusy] = useState(false);
  const handleEscalate = async () => {
    if (!conversationId || disabled || busy) return;
    if (escalated) {
      onDeescalate();
      return;
    }
    setBusy(true);
    try {
      await escalate({ conversationId });
      toast.success("Conversation escalated");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not escalate conversation",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button
      type="button"
      variant="destructive"
      disabled={!conversationId || disabled || busy}
      className={cn(
        "relative isolate h-11 w-full gap-2 overflow-hidden text-white dark:text-white",
        escalated
          ? "bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-700 dark:hover:bg-emerald-800"
          : "bg-destructive hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90",
      )}
      onClick={() => void handleEscalate()}
    >
      {busy ? (
        <Spinner className="size-4" />
      ) : escalated ? (
        <Play
          className={cn(
            "size-3.5 shrink-0 fill-current",
            timer ? "absolute left-3 z-10" : "relative",
          )}
          aria-hidden="true"
        />
      ) : (
        <Pause
          className="relative size-3.5 shrink-0 fill-current"
          aria-hidden="true"
        />
      )}
      {busy ? (
        "Escalating…"
      ) : escalated && timer ? (
        <InboxEscalationCountdown
          key={`${conversationId}:${timer.startedAt}:${timer.dueAt}`}
          timer={timer}
        />
      ) : (
        <span className="relative">{escalated ? "Resolve" : "Escalate"}</span>
      )}
    </Button>
  );
}
