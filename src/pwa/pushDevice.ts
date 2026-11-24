export function pushSupport() {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone;
  if (ios && !standalone)
    return "Install this app on your Home Screen, then open it there to enable notifications.";
  if (
    !window.isSecureContext ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "Push notifications are not available in this browser.";
  }
  return null;
}

export async function currentPushSubscription() {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return registration ? await registration.pushManager.getSubscription() : null;
}

function applicationServerKey(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

export async function subscribePushDevice(publicKey: string, forceNew = false) {
  const support = pushSupport();
  if (support) throw new Error(support);
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error(
      "Allow notifications in your browser or device settings to continue.",
    );
  const registration = await navigator.serviceWorker.register(
    "/kilobot-sw.js",
    { updateViaCache: "none" },
  );
  const worker = registration.installing ?? registration.waiting;
  if (worker && worker.state !== "activated") {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        worker.removeEventListener("statechange", changed);
        reject(
          new Error(
            "Notification setup timed out. Reopen the app and try again.",
          ),
        );
      }, 15000);
      function changed() {
        if (worker!.state !== "activated" && worker!.state !== "redundant")
          return;
        window.clearTimeout(timeout);
        worker!.removeEventListener("statechange", changed);
        if (worker!.state === "activated") resolve();
        else
          reject(
            new Error("The notification service worker could not activate."),
          );
      }
      worker.addEventListener("statechange", changed);
      changed();
    });
  }
  let subscription = await registration.pushManager.getSubscription();
  const key = applicationServerKey(publicKey);
  if (subscription) {
    const existingKey = subscription.options.applicationServerKey;
    if (
      forceNew ||
      !existingKey ||
      String(new Uint8Array(existingKey)) !== String(key)
    ) {
      await subscription.unsubscribe();
      subscription = null;
    }
  }
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });
  const data = subscription.toJSON();
  if (!data.endpoint || !data.keys?.p256dh || !data.keys.auth)
    throw new Error("The browser did not provide a complete push subscription");
  return {
    endpoint: data.endpoint,
    p256dh: data.keys.p256dh,
    auth: data.keys.auth,
  };
}
