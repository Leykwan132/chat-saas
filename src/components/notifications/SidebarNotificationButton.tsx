import { Bell } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { isInstalledApp } from "@/pwa/installedApp";
import { usePushNotificationSettings } from "./usePushNotificationSettings";

function InstalledNotificationButton({ agentId }: { agentId: Id<"agents"> }) {
  const { settings, enabled, busy, support, eligibleOptions, perform, enable } =
    usePushNotificationSettings(agentId);
  if (enabled || !settings?.configured || support || !eligibleOptions.length)
    return null;
  return (
    <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 text-xs"
        disabled={busy}
        onClick={() => void perform(enable)}
      >
        <Bell className="size-4" aria-hidden="true" />
        {busy ? "Turning on…" : "Turn on notifications"}
      </Button>
    </div>
  );
}

export function SidebarNotificationButton({
  agentId,
}: {
  agentId: Id<"agents">;
}) {
  return isInstalledApp() ? (
    <InstalledNotificationButton key={agentId} agentId={agentId} />
  ) : null;
}
