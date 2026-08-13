import { CheckCircle2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { GoogleCalendarConnectionStatus } from "./googleCalendarUi";

export const GOOGLE_CALENDAR_ICON_SRC =
  "https://www.gstatic.com/images/branding/productlogos/calendar_2026_13/v2/png/calendar_2026_13_96dp.png";

export type GoogleCalendarConnectionCardProps = GoogleCalendarConnectionStatus & {
  pending?: boolean;
  onConnect: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
};

function GoogleCalendarIcon() {
  return <img src={GOOGLE_CALENDAR_ICON_SRC} alt="" className="size-4" />;
}

function connectedSinceLabel(createdAt?: number, lastSuccessfulSyncAt?: number) {
  const at = createdAt ?? lastSuccessfulSyncAt;
  if (at === undefined) return undefined;
  return `Connected since ${format(at, "d MMM yyyy")}`;
}

export function GoogleCalendarConnectionCard({
  state,
  connectedAccountEmail,
  createdAt,
  lastSuccessfulSyncAt,
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
        : "+ Google Calendar";
  const accountLabel = connectedAccountEmail ?? "Google account";
  const sinceLabel = connectedSinceLabel(createdAt, lastSuccessfulSyncAt);

  return (
    <Card
      size="sm"
      className="gap-3 py-3 shadow-sm"
      data-calendar-sidebar-section="google-calendar"
    >
      <CardHeader className="px-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <GoogleCalendarIcon />
          Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3">
        {state === "connected" ? (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="min-w-0 truncate text-sm font-medium">{accountLabel}</span>
                <CheckCircle2
                  className="size-3.5 shrink-0 text-emerald-600"
                  aria-label="Active"
                />
              </div>
              {sinceLabel ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{sinceLabel}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={pending}
              aria-label="Disconnect Google Calendar"
              onClick={onDisconnect}
            >
              <Trash2 />
            </Button>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full gap-2"
                disabled={pending}
                onClick={state === "needs_reauthorization" ? onReconnect : onConnect}
              >
                <GoogleCalendarIcon />
                {connectLabel}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {state === "needs_reauthorization"
                ? "Reconnect Google Calendar"
                : "Connect Google Calendar"}
            </TooltipContent>
          </Tooltip>
        )}
        {state === "syncing" && lastErrorMessage ? (
          <p className="mt-2 truncate text-xs text-destructive">{lastErrorMessage}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
