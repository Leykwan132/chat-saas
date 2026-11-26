import type { Id } from "../../../convex/_generated/dataModel";
import { Switch } from "@/components/ui/switch";
import { usePushNotificationSettings } from "@/components/notifications/usePushNotificationSettings";

export function FocusNotificationSettings({
  agentId,
}: {
  agentId: Id<"agents">;
}) {
  const {
    settings,
    enabled,
    busy,
    support,
    eligibleOptions,
    perform,
    enable,
    changePreferences,
    deviceError,
  } = usePushNotificationSettings(agentId);
  return (
    <div className="rounded-lg border border-border p-4">
      <label className="flex min-h-10 items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-medium">
            Enable notifications
          </span>
          <span className="block text-sm text-muted-foreground" role="status">
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </span>
        <Switch
          aria-label="Enable notifications"
          checked={enabled}
          disabled={
            busy ||
            !settings?.configured ||
            Boolean(support) ||
            !eligibleOptions.length
          }
          onCheckedChange={(checked) =>
            void perform(() =>
              checked
                ? enable(eligibleOptions.map((option) => option.kind))
                : changePreferences(settings!.subscription!.kinds, false),
            )
          }
        />
      </label>
      {(deviceError || support || (settings && !settings.configured)) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {deviceError || support || "Notifications are not configured yet."}
        </p>
      )}
    </div>
  );
}
