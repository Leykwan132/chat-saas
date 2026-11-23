import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "../../../convex/_generated/api";
import { InboxResumeTiming } from "./InboxResumeTiming";
import { optimisticallySetInboxAiEnabled } from "./inboxAiAssignment";

const resume = makeFunctionReference<
  "mutation",
  { conversationId: Id<"conversations">; minutes: number },
  null
>("inboxManualResume:set");

export function InboxAiReplyTimingDialog({
  conversationId,
  open,
  onOpenChange,
  mode = "resume",
  disabled = false,
  title,
  onBusyChange,
}: {
  conversationId: Id<"conversations">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "pause" | "resume";
  disabled?: boolean;
  title?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const setResume = useMutation(resume);
  const pause = useMutation(
    api.conversations.setConversationAiEnabled,
  ).withOptimisticUpdate(optimisticallySetInboxAiEnabled);
  const pausing = mode === "pause";
  const [timing, setTiming] = useState<"now" | "later">("now");
  const [minutes, setMinutes] = useState("5");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setTiming("now");
  }, [open, conversationId]);
  const valid =
    timing === "now" ||
    (Number.isInteger(Number(minutes)) &&
      Number(minutes) >= 1 &&
      Number(minutes) <= 10080);
  const confirm = async () => {
    if (busy || disabled || !valid) return;
    setBusy(true);
    onBusyChange?.(true);
    try {
      if (pausing && timing === "now")
        await pause({ conversationId, enabled: false });
      else
        await setResume({
          conversationId,
          minutes: timing === "now" ? 0 : Number(minutes),
        });
      toast.success(
        timing === "now"
          ? pausing
            ? "AI paused"
            : "AI resumed"
          : `AI will resume in ${minutes} minutes`,
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update AI",
      );
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) {
          if (value) setTiming("now");
          onOpenChange(value);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title ?? (pausing ? "Pause AI replies?" : "Hand over to AI")}
          </DialogTitle>
          <DialogDescription>
            {pausing
              ? timing === "later"
                ? "AI will pause now and resume automatically after the selected duration, ready for the next customer message."
                : "AI will stop replying to this conversation so your team can take over."
              : "Choose when AI should take over this conversation. Any escalation will be resolved when AI resumes."}
          </DialogDescription>
        </DialogHeader>
        {timing === "later" && (
          <InboxResumeTiming
            label={pausing ? "Pause for (minutes)" : "Resume in (minutes)"}
            minutes={minutes}
            disabled={busy}
            onMinutesChange={setMinutes}
          />
        )}
        <DialogFooter>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => setTiming(timing === "now" ? "later" : "now")}
          >
            {timing === "now" ? "Schedule resume" : "Back"}
          </Button>
          <Button
            disabled={busy || disabled || !valid}
            onClick={() => void confirm()}
          >
            {busy ? <Spinner className="size-4" /> : null}
            {pausing
              ? timing === "now"
                ? "Pause AI"
                : "Pause and schedule resume"
              : timing === "now"
                ? "Resume now"
                : "Schedule resume"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
