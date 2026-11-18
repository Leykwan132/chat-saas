import { SmilePlus } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { InboxUIMessage } from "@/lib/inboxOptimistic";
import {
  INBOX_REACTION_EMOJIS,
  type InboxMessageReaction,
} from "../../../shared/messageReactions";
import { cn } from "@/lib/utils";

export type SelectedReaction = {
  message: InboxUIMessage;
  reaction: InboxMessageReaction;
};

export type PendingReaction = {
  messageKey: string;
  emoji: string;
  toastId: string | number;
};

export type AnimatingReaction = {
  messageKey: string;
  emoji: string;
};

export const REACTION_APPLY_TIMEOUT_MS = 15_000;

export function ReactionBadge({
  message,
  onClick,
  animatingEmoji,
}: {
  message: InboxUIMessage;
  onClick: (reaction: InboxMessageReaction) => void;
  animatingEmoji?: string;
}) {
  const reactions = message.reactions ?? [];
  if (reactions.length === 0) return null;
  return (
    <div className="absolute -right-2 -bottom-3 flex gap-1">
      {reactions.slice(0, 3).map((reaction) => (
        <button
          key={`${reaction.actorKey}-${reaction.emoji}`}
          type="button"
          onClick={() => onClick(reaction)}
          className={cn(
            "inline-grid shrink-0 place-items-center rounded-full border border-white bg-neutral-100 p-1.5 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700",
            animatingEmoji === reaction.emoji &&
              "animate-in zoom-in-0 fade-in duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          )}
          aria-label={`View ${reaction.emoji} reaction`}
        >
          <span className="block text-[0.6rem] leading-none">
            {reaction.emoji}
          </span>
        </button>
      ))}
    </div>
  );
}

export function ReactionPicker({
  message,
  onReact,
}: {
  message: InboxUIMessage;
  onReact?: (message: InboxUIMessage, emoji: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const disabled =
    !message.externalId ||
    onReact === undefined ||
    message.status === "pending";

  const handleSelect = (emoji: string) => {
    setOpen(false);
    void onReact?.(message, emoji);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={disabled}
              className="h-6 px-2 rounded-full border border-white bg-neutral-100 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-neutral-200 hover:text-foreground data-open:opacity-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-foreground"
              aria-label="React"
            >
              <SmilePlus className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>React</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="center"
        side="top"
        className="w-auto rounded-full p-1"
      >
        <div className="flex gap-1">
          {INBOX_REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="flex size-9 items-center justify-center rounded-full text-lg hover:bg-muted"
              onClick={() => handleSelect(emoji)}
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ReactionDialog({
  selected,
  onOpenChange,
  onRemoveReaction,
}: {
  selected: SelectedReaction | null;
  onOpenChange: (open: boolean) => void;
  onRemoveReaction?: (message: InboxUIMessage) => void | Promise<void>;
}) {
  const reaction = selected?.reaction;
  const canRemove =
    reaction !== undefined &&
    (reaction.source === "human" || reaction.source === "ai") &&
    onRemoveReaction !== undefined;

  return (
    <Dialog open={selected !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Reactions</DialogTitle>
        <DialogDescription>
          {canRemove ? "Click to remove the emoji." : "Reaction details."}
        </DialogDescription>
        {selected && reaction ? (
          <button
            type="button"
            disabled={!canRemove}
            onClick={() => {
              if (!canRemove) return;
              void onRemoveReaction?.(selected.message);
              onOpenChange(false);
            }}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border p-3 text-left",
              canRemove ? "hover:bg-muted" : "cursor-default",
            )}
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">{reaction.emoji}</span>
              <span className="text-sm">
                {reaction.actorName ??
                  (reaction.source === "customer"
                    ? "Customer"
                    : reaction.source === "ai"
                      ? "AI"
                      : "Team member")}
              </span>
            </span>
            <span className="text-xs capitalize text-muted-foreground">
              {reaction.source}
            </span>
          </button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
