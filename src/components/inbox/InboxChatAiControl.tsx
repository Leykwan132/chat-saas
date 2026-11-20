import { InboxResumeTiming } from "./InboxResumeTiming";
import { InboxResumeCountdown } from "./InboxResumeCountdown";
import { makeFunctionReference } from "convex/server";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useMutation } from "convex/react";
import { Pause, Play } from "lucide-react";
import { PiRobot } from "react-icons/pi";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { InboxHandling } from "../../../shared/inboxHandling";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "../../../shared/permissions";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const scheduleResume = makeFunctionReference<
  "mutation",
  { conversationId: Id<"conversations">; minutes: number },
  null
>("inboxManualResume:set");

export function InboxChatAiControl({
  chat,
}: {
  chat: {
    id: Id<"conversations">;
    handling?: InboxHandling;
    aiControlAvailable?: boolean;
    aiResumeAt?: number | null;
    aiResumeStartedAt?: number | null;
  };
}) {
  const { can } = usePermissions();
  const toggle = useMutation(api.conversations.setConversationAiEnabled);
  const resume = useMutation(scheduleResume);
  const [timing, setTiming] = useState<"now" | "later">("now");
  const [minutes, setMinutes] = useState("5");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const active = chat.handling === "ai";
  const available =
    chat.aiControlAvailable === true && can(Permission.CHATS_ASSIGN);
  const label = active ? "Pause AI replies" : "Resume AI replies";
  const validMinutes =
    Number.isInteger(Number(minutes)) &&
    Number(minutes) >= 1 &&
    Number(minutes) <= 10080;
  const change = async () => {
    if (busy || !available || (timing === "later" && !validMinutes)) return;
    setBusy(true);
    try {
      if (active && timing === "now")
        await toggle({ conversationId: chat.id, enabled: false });
      else
        await resume({
          conversationId: chat.id,
          minutes: timing === "now" ? 0 : Number(minutes),
        });
      toast.success(
        active
          ? timing === "later"
            ? `AI paused for ${minutes} minutes`
            : "AI paused"
          : timing === "now"
            ? "AI resumed"
            : `AI will resume in ${minutes} minutes`,
      );
      setConfirmOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update AI",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="contents"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            disabled={busy || !available}
            onClick={(event) => {
              event.stopPropagation();
              setTiming("now");
              setConfirmOpen(true);
            }}
            onKeyDown={(event) => event.stopPropagation()}
            className="flex min-h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full disabled:opacity-50"
          >
            <span
              className={cn(
                "relative flex size-8 items-center justify-center rounded-full",
                active
                  ? "bg-zinc-800 text-white"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {active && !busy && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-0.5 rounded-full bg-[linear-gradient(90deg,#8b5cf6,#ec4899,#f59e0b,#22c55e,#06b6d4,#8b5cf6)] bg-size-[200%_100%] p-[2px] motion-safe:animate-[rainbow_4s_linear_infinite]"
                  style={{
                    maskImage:
                      "linear-gradient(#fff 0 0), linear-gradient(#fff 0 0)",
                    maskClip: "content-box, border-box",
                    maskComposite: "exclude",
                  }}
                />
              )}
              {busy ? (
                <Spinner className="size-4" />
              ) : !active && chat.aiResumeAt != null ? (
                <InboxResumeCountdown
                  key={chat.aiResumeAt}
                  dueAt={chat.aiResumeAt}
                  startedAt={chat.aiResumeStartedAt}
                />
              ) : (
                <PiRobot className="size-5" aria-hidden="true" />
              )}
              {!busy && (active || chat.aiResumeAt == null) && (
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full ring-2 ring-background",
                    active
                      ? "bg-violet-700 text-white"
                      : "bg-muted-foreground text-background",
                  )}
                >
                  {active ? (
                    <Pause className="size-2 fill-current" aria-hidden="true" />
                  ) : (
                    <Play className="size-2 fill-current" aria-hidden="true" />
                  )}
                </span>
              )}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {available ? label : "AI control unavailable"}
        </TooltipContent>
      </Tooltip>
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!busy) setConfirmOpen(open);
        }}
      >
        <DialogContent
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>
              {active ? "Pause AI replies?" : "Resume AI replies?"}
            </DialogTitle>
            <DialogDescription>
              {active
                ? timing === "later"
                  ? "AI will pause now and resume automatically after the selected duration, ready for the next customer message."
                  : "AI will stop replying to this conversation so your team can take over."
                : chat.handling === "attention"
                  ? "This will resolve the escalation and enable AI replies for the next customer message."
                  : "AI replies will be enabled for the next customer message."}
            </DialogDescription>
          </DialogHeader>
          {timing === "later" && (
            <InboxResumeTiming
              label={active ? "Pause for (minutes)" : "Resume in (minutes)"}
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
              {timing === "later" ? "Back" : "Schedule resume"}
            </Button>
            <Button
              disabled={busy || (timing === "later" && !validMinutes)}
              onClick={() => void change()}
            >
              {busy ? <Spinner className="size-4" /> : null}
              {active
                ? timing === "later"
                  ? "Pause and schedule resume"
                  : "Pause AI"
                : timing === "now"
                  ? "Resume now"
                  : "Schedule resume"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
