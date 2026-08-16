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
  "h-8 max-w-56 gap-1.5 border-transparent bg-input/50 px-2.5 py-1.5 shadow-none transition-colors hover:bg-muted";

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
              <span className="inline-flex size-4 shrink-0 self-center items-center justify-center leading-none text-green-600" aria-label="Active"><svg className="block size-full" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" /><path stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" /></svg></span>
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
