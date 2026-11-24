import { useParams } from "react-router";
import type { Id } from "../../convex/_generated/dataModel";
import { TelegramNotificationsPanel } from "@/components/agent-setup/TelegramNotificationsPanel";
import { PushNotificationsPanel } from "@/components/notifications/PushNotificationsPanel";

export default function NotificationsPage() {
  const { agentId } = useParams();
  if (!agentId)
    throw new Error("An agent is required for notification settings");

  return (
    <div className="flex w-full flex-col gap-8">
      <header>
        <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how you receive alerts from this agent.
        </p>
      </header>
      <PushNotificationsPanel agentId={agentId as Id<"agents">} />
      <TelegramNotificationsPanel agentId={agentId as Id<"agents">} />
    </div>
  );
}
