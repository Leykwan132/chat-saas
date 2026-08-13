import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import type { GoogleCalendarConnectionStatus } from "./googleCalendarUi";

export type GoogleCalendarConnectionCardProps = GoogleCalendarConnectionStatus & {
  pending?: boolean;
  onConnect: () => void;
  onReconnect: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
};

export function GoogleCalendarConnectionCard({
  state,
  lastSuccessfulSyncAt,
  lastErrorMessage,
  pending = false,
  onConnect,
  onReconnect,
  onRefresh,
  onDisconnect,
}: GoogleCalendarConnectionCardProps) {
  return (
    <div className="px-4 pb-3" data-calendar-sidebar-section="google-calendar">
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-sm font-medium text-foreground">Google Calendar</p>
        {state === "not_connected" ? (
          <Button
            type="button"
            className="mt-3 h-9 w-full"
            disabled={pending}
            onClick={onConnect}
          >
            Connect Google Calendar
          </Button>
        ) : null}
        {state === "connected" ? (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Connected</p>
            {lastSuccessfulSyncAt !== undefined ? (
              <p className="text-xs text-muted-foreground">
                Last synced {formatDistanceToNow(lastSuccessfulSyncAt, { addSuffix: true })}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={pending}
                onClick={onRefresh}
              >
                Refresh
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={onDisconnect}
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : null}
        {state === "needs_reauthorization" ? (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Reconnect required</p>
            <Button
              type="button"
              className="h-9 w-full"
              disabled={pending}
              onClick={onReconnect}
            >
              Reconnect
            </Button>
          </div>
        ) : null}
        {state === "syncing" ? (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Connecting...</p>
            {lastErrorMessage ? (
              <p className="text-xs text-destructive">{lastErrorMessage}</p>
            ) : null}
            <Button
              type="button"
              className="h-9 w-full"
              disabled={pending}
              onClick={onConnect}
            >
              Retry
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
