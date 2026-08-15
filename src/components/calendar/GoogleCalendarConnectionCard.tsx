import { HiCheck, HiCheckBadge } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { GOOGLE_CALENDAR_ICON_SRC } from "./googleCalendarBranding";
import type { GoogleCalendarConnectionStatus } from "./googleCalendarUi";

export { GOOGLE_CALENDAR_ICON_SRC } from "./googleCalendarBranding";

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
        : "Google Calendar";
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
              <span className="min-w-0 truncate">
                {connectedAccountEmail ?? "Google Calendar"}
              </span>
              <span className="relative grid size-5 shrink-0 place-items-center" aria-label="Active">
                <HiCheckBadge className="size-5 text-green-600" aria-hidden="true" />
                <HiCheck className="absolute size-3 text-white" aria-hidden="true" />
              </span>
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
