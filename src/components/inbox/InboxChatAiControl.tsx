import { InboxAiReplyTimingDialog } from "./InboxAiReplyTimingDialog";
import { InboxResumeCountdown } from "./InboxResumeCountdown";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { PiRobot } from "react-icons/pi";
import type { Id } from "../../../convex/_generated/dataModel";
import type { InboxHandling } from "../../../shared/inboxHandling";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "../../../shared/permissions";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

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
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const active = chat.handling === "ai";
  const available =
    chat.aiControlAvailable === true && can(Permission.CHATS_ASSIGN);
  const label = active ? "Pause AI replies" : "Resume AI replies";
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
      <InboxAiReplyTimingDialog
        conversationId={chat.id}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        mode={active ? "pause" : "resume"}
        title={active ? "Pause AI replies?" : "Resume AI replies?"}
        disabled={!available}
        onBusyChange={setBusy}
      />
    </div>
  );
}
