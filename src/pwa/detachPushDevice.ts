import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { currentPushSubscription } from "./pushDevice";

export async function detachPushDevice(
  getAccessToken: () => Promise<string | null>,
) {
  let subscription: PushSubscription | null;
  try {
    subscription = await currentPushSubscription();
  } catch (error) {
    console.error("Could not read the push device during sign out", error);
    return;
  }
  if (!subscription) return;
  try {
    await subscription.unsubscribe();
  } catch (error) {
    console.error("Could not unsubscribe the browser push device", error);
  }
  try {
    const token = await getAccessToken();
    if (!token) return;
    const client = new ConvexHttpClient(
      import.meta.env.VITE_CONVEX_URL as string,
    );
    client.setAuth(token);
    await client.mutation(api.pushNotifications.subscriptions.removeDevice, {
      endpoint: subscription.endpoint,
    });
  } catch (error) {
    console.error("Could not remove the disconnected push device", error);
  }
}
