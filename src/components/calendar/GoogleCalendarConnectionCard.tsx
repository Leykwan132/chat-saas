import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { GoogleCalendarConnectionStatus } from "./googleCalendarUi";

export const GOOGLE_CALENDAR_ICON_SRC =
  "https://cdn-icons-png.flaticon.com/128/5968/5968499.png";

export type GoogleCalendarConnectionCardProps = GoogleCalendarConnectionStatus & {
  pending?: boolean;
  onConnect: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
};

function GoogleCalendarIcon() {
  return <img src={GOOGLE_CALENDAR_ICON_SRC} alt="" className="size-4" />;
}

export function GoogleCalendarConnectionCard({
  state,
  lastErrorMessage,
  pending = false,
  onConnect,
  onReconnect,
  onDisconnect,
}: GoogleCalendarConnectionCardProps) {
  const connected = state === "connected";
  const connectLabel =
    pending || state === "syncing"
      ? "Connecting..."
      : state === "needs_reauthorization"
        ? "Reconnect"
        : "Connect";
  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 w-fit gap-2"
      disabled={pending}
      {...(connected
        ? { "aria-label": "Google Calendar connected" }
        : { onClick: state === "needs_reauthorization" ? onReconnect : onConnect })}
    >
      <GoogleCalendarIcon />
      {connected ? "Connected" : connectLabel}
      {connected ? <Check data-icon="inline-end" /> : null}
    </Button>
  );

  return (
    <div className="flex items-center gap-1.5" data-calendar-header-section="google-calendar">
      {connected ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                disabled={pending}
                onSelect={onDisconnect}
              >
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="bottom">
            {state === "needs_reauthorization"
              ? "Reconnect Google Calendar"
              : "Connect Google Calendar"}
          </TooltipContent>
        </Tooltip>
      )}
      {state === "syncing" && lastErrorMessage ? (
        <p className="max-w-40 truncate text-xs text-destructive">{lastErrorMessage}</p>
      ) : null}
    </div>
  );
}
