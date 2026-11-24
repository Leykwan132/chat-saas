import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { Permission } from "../../../shared/permissions";
import type { TelegramNotificationKind } from "../../../shared/telegramNotificationKinds";
import { telegramNotificationOptions } from "@/components/agent-setup/telegramNotificationOptions";
import {
  currentPushSubscription,
  pushSupport,
  subscribePushDevice,
} from "@/pwa/pushDevice";

export function usePushNotificationSettings(agentId: Id<"agents">) {
  const [endpoint, setEndpoint] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const support = pushSupport();
  const origin = window.location.origin;
  const settings = useQuery(api.pushNotifications.subscriptions.getForAgent, {
    agentId,
    origin,
    endpoint,
  });
  const subscribe = useMutation(api.pushNotifications.subscriptions.subscribe);
  const update = useMutation(
    api.pushNotifications.subscriptions.setPreferences,
  );
  const remove = useMutation(api.pushNotifications.subscriptions.removeDevice);
  const sendTest = useMutation(api.pushNotifications.testNotification.send);

  useEffect(() => {
    let active = true;
    const refresh = () =>
      void currentPushSubscription()
        .then((subscription) => {
          if (active) setEndpoint(subscription?.endpoint);
        })
        .catch((error) => {
          if (active)
            setDeviceError(
              error instanceof Error
                ? error.message
                : "Could not read this device’s notification settings",
            );
        });
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("kilobot-push-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("kilobot-push-changed", refresh);
    };
  }, []);

  const eligibleOptions = telegramNotificationOptions.filter(
    (option) =>
      settings?.personal ||
      settings?.permissions.includes(
        option.kind === "humanEscalation"
          ? Permission.CHATS_READ
          : Permission.CALENDAR_READ,
      ),
  );
  const enabled = Boolean(
    settings?.subscription?.enabled &&
    endpoint &&
    "Notification" in window &&
    Notification.permission === "granted",
  );

  async function perform(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
      window.dispatchEvent(new Event("kilobot-push-changed"));
      setDeviceError(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not update push notifications";
      setDeviceError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function enable() {
    if (!settings?.publicKey)
      throw new Error("Push delivery is not configured yet");
    const device = await subscribePushDevice(
      settings.publicKey,
      settings.needsNewSubscription,
    );
    if (endpoint && endpoint !== device.endpoint && settings.subscription)
      await remove({ endpoint });
    await subscribe({
      agentId,
      origin,
      ...device,
      kinds:
        settings.subscription?.kinds ??
        eligibleOptions.map((option) => option.kind),
    });
    setEndpoint(device.endpoint);
    toast.success("Push notifications enabled for this agent on this device");
  }

  async function changePreferences(
    kinds: TelegramNotificationKind[],
    nextEnabled = enabled,
  ) {
    if (!endpoint) throw new Error("Enable this device first");
    await update({ agentId, origin, endpoint, kinds, enabled: nextEnabled });
  }

  return {
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
  };
}
