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
import { InboxResumeTiming } from "./InboxResumeTiming";

const resume = makeFunctionReference<
  "mutation",
  { conversationId: Id<"conversations">; minutes: number },
  null
>("inboxManualResume:set");

export function InboxResumeConversationDialog({
  conversationId,
  open,
  onOpenChange,
}: {
  conversationId: Id<"conversations">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const setResume = useMutation(resume);
  const [timing, setTiming] = useState<"now" | "later">("now");
  const [minutes, setMinutes] = useState("5");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setTiming("now");
  }, [open]);
  const valid =
    timing === "now" ||
    (Number.isInteger(Number(minutes)) &&
      Number(minutes) >= 1 &&
      Number(minutes) <= 10080);
  const confirm = async () => {
    if (busy || !valid) return;
    setBusy(true);
    try {
      await setResume({
        conversationId,
        minutes: timing === "now" ? 0 : Number(minutes),
      });
      toast.success(
        timing === "now"
          ? "AI resumed"
          : `AI will resume in ${minutes} minutes`,
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not resume AI",
      );
    } finally {
      setBusy(false);
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
          <DialogTitle>Hand over to AI</DialogTitle>
          <DialogDescription>
            Choose when AI should take over this conversation. Any escalation
            will be resolved when AI resumes.
          </DialogDescription>
        </DialogHeader>
        {timing === "later" && (
          <InboxResumeTiming
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
            {timing === "now" ? "Resume later" : "Back"}
          </Button>
          <Button disabled={busy || !valid} onClick={() => void confirm()}>
            {busy ? <Spinner className="size-4" /> : null}
            {timing === "now" ? "Resume now" : "Schedule resume"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
