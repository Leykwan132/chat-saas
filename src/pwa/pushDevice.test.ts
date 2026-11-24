import { afterEach, expect, test, vi } from "vitest";
import {
  currentPushSubscription,
  pushSupport,
  subscribePushDevice,
} from "./pushDevice";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function browserFixture(permission: "granted" | "denied" = "granted") {
  const subscription = {
    endpoint: "https://fcm.googleapis.com/fcm/send/one",
    options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
    unsubscribe: vi.fn().mockResolvedValue(true),
    toJSON: () => ({
      endpoint: "https://fcm.googleapis.com/fcm/send/one",
      keys: { p256dh: "key", auth: "auth" },
    }),
  };
  const registration = {
    installing: null,
    waiting: null,
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(subscription),
      subscribe: vi.fn().mockResolvedValue(subscription),
    },
  };
  const serviceWorker = {
    register: vi.fn().mockResolvedValue(registration),
    getRegistration: vi.fn().mockResolvedValue(registration),
  };
  vi.stubGlobal("navigator", {
    platform: "Linux",
    userAgent: "Chrome",
    maxTouchPoints: 0,
    serviceWorker,
  });
  vi.stubGlobal("window", {
    isSecureContext: true,
    PushManager: function () {},
    Notification: {},
    matchMedia: () => ({ matches: false }),
  });
  vi.stubGlobal("Notification", {
    requestPermission: vi.fn().mockResolvedValue(permission),
  });
  return { subscription, registration, serviceWorker };
}

test("does not subscribe when notification permission is denied", async () => {
  const { serviceWorker } = browserFixture("denied");
  await expect(subscribePushDevice("AQID")).rejects.toThrow(
    "Allow notifications",
  );
  expect(serviceWorker.register).not.toHaveBeenCalled();
});

test("reuses a matching browser subscription and replaces it for another session", async () => {
  const { subscription, registration } = browserFixture();
  expect(await subscribePushDevice("AQID")).toEqual({
    endpoint: subscription.endpoint,
    p256dh: "key",
    auth: "auth",
  });
  expect(subscription.unsubscribe).not.toHaveBeenCalled();
  await subscribePushDevice("AQID", true);
  expect(subscription.unsubscribe).toHaveBeenCalledOnce();
  expect(registration.pushManager.subscribe).toHaveBeenCalledWith({
    userVisibleOnly: true,
    applicationServerKey: new Uint8Array([1, 2, 3]),
  });
});

test("instructs iPhone users to install before requesting permission", () => {
  browserFixture();
  vi.stubGlobal("navigator", {
    platform: "iPhone",
    userAgent: "iPhone",
    maxTouchPoints: 1,
  });
  expect(pushSupport()).toContain("Home Screen");
});

test("current subscription does not wait indefinitely when no worker is registered", async () => {
  const { serviceWorker } = browserFixture();
  serviceWorker.getRegistration.mockResolvedValue(undefined);
  expect(await currentPushSubscription()).toBeNull();
});
