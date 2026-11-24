import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { usePushNotificationSettings } from "./usePushNotificationSettings";

export function PushNotificationsPanel({ agentId }: { agentId: Id<"agents"> }) {
  const {
    settings,
    support,
    deviceError,
    busy,
    enabled,
    eligibleOptions,
    perform,
    enable,
    changePreferences,
    sendTest,
    endpoint,
    origin,
  } = usePushNotificationSettings(agentId);
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border p-5">
      <div>
        <h2 className="font-heading text-base font-medium">
          Push notifications
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Receive this agent’s alerts on this device, even when the app is
          closed.
        </p>
      </div>
      {support && <p className="text-sm text-muted-foreground">{support}</p>}
      {settings && !settings.configured && (
        <p className="text-sm text-muted-foreground">
          Push delivery hasn’t been configured yet.
        </p>
      )}
      {!settings && (
        <p className="text-sm text-muted-foreground">
          Loading notification settings…
        </p>
      )}
      {deviceError && (
        <p role="alert" className="text-sm text-destructive">
          {deviceError}
        </p>
      )}
      <div className="flex flex-col gap-3">
        <Button
          variant={enabled ? "destructive" : "default"}
          className="h-auto min-h-12 w-full whitespace-normal px-6 py-3 text-sm"
          disabled={
            busy ||
            !settings?.configured ||
            Boolean(support) ||
            !eligibleOptions.length
          }
          onClick={() =>
            void perform(() =>
              enabled
                ? changePreferences(settings!.subscription!.kinds, false)
                : enable(),
            )
          }
        >
          {busy
            ? "Updating…"
            : enabled
              ? "Disable for this agent"
              : "Enable on this device"}
        </Button>
        <Button
          variant="outline"
          className="h-auto min-h-12 w-full whitespace-normal px-6 py-3 text-sm"
          disabled={busy || !enabled || !settings?.subscription?.kinds.length}
          onClick={() =>
            void perform(async () => {
              await sendTest({ agentId, origin, endpoint: endpoint! });
              toast.success("Test notification queued");
            })
          }
        >
          Send test notification
        </Button>
      </div>
      {eligibleOptions.map((option) => (
        <label
          key={option.kind}
          className="flex items-center justify-between gap-4"
        >
          <span>
            <span className="block text-sm font-medium">{option.label}</span>
            <span className="text-sm text-muted-foreground">
              {option.description}
            </span>
          </span>
          <Switch
            aria-label={option.label}
            disabled={busy || !enabled}
            checked={
              settings?.subscription?.kinds.includes(option.kind) ?? false
            }
            onCheckedChange={(checked) =>
              void perform(() => {
                const kinds = settings!.subscription!.kinds;
                return changePreferences(
                  checked
                    ? [...kinds, option.kind]
                    : kinds.filter((kind) => kind !== option.kind),
                );
              })
            }
          />
        </label>
      ))}
      {settings?.lastDelivery && (
        <p className="text-xs text-muted-foreground" role="status">
          Last delivery:{" "}
          {settings.lastDelivery.status === "sent"
            ? "Accepted by push service"
            : settings.lastDelivery.status}
          .
          {settings.lastDelivery.status === "failed" &&
            " Try enabling this device again or contact your administrator."}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Notification previews contain no customer messages. Your device controls
        sound and lock-screen visibility.
      </p>
    </section>
  );
}
