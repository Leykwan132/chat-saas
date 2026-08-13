import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { GoogleCalendarConnectionStatus } from "./googleCalendarUi";

export const GOOGLE_CALENDAR_ICON_SRC =
  "https://www.gstatic.com/images/branding/productlogos/calendar_2026_13/v2/png/calendar_2026_13_96dp.png";

export type GoogleCalendarConnectionCardProps = GoogleCalendarConnectionStatus & {
  pending?: boolean;
  onConnect: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
};

const headerControlClassName =
  "h-8 max-w-56 gap-1.5 border-transparent bg-input/50 px-2.5 py-1.5 shadow-none hover:bg-input/50";

function GoogleCalendarIcon() {
  return <img src={GOOGLE_CALENDAR_ICON_SRC} alt="" className="size-4 shrink-0" />;
}

export function GoogleCalendarConnectionCard({
  state,
  connectedAccountEmail,
  lastErrorMessage,
  pending = false,
  onConnect,
  onReconnect,
  onDisconnect,
}: GoogleCalendarConnectionCardProps) {
  const connectLabel =
    pending || state === "syncing"
      ? "Connecting..."
      : state === "needs_reauthorization"
        ? "Reconnect"
        : "+ Connect";
  const connected = state === "connected";
  const tooltip = connected
    ? "Disconnect Google Calendar"
    : state === "needs_reauthorization"
      ? "Reconnect Google Calendar"
      : "Connect Google Calendar";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(headerControlClassName, connected && "font-normal")}
          disabled={pending}
          aria-label={connected ? "Disconnect Google Calendar" : tooltip}
          onClick={
            connected
              ? onDisconnect
              : state === "needs_reauthorization"
                ? onReconnect
                : onConnect
          }
        >
          <GoogleCalendarIcon />
          {connected ? (
            <>
              {connectedAccountEmail ? (
                <span className="min-w-0 truncate">{connectedAccountEmail}</span>
              ) : null}
              <BadgeCheck
                className="size-3.5 shrink-0 fill-green-600 text-white"
                aria-label="Active"
              />
            </>
          ) : (
            connectLabel
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {state === "syncing" && lastErrorMessage ? lastErrorMessage : tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
