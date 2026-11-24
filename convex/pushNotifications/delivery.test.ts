import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { telegramNotificationWorkpool } from "../telegramNotifications/pool";
import { queuePushDelivery, dispatchPushEvent } from "./dispatch";
import {
  pushFixture,
  endpoint,
  origin,
} from "../../tests/pushNotificationsFixture";

const event = {
  kind: "humanEscalation" as const,
  eventKey: "escalation:one",
  title: "Human help",
  body: "Open your inbox",
  path: "/dashboard/test/inbox",
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("event delivery is deduplicated and retries use the same notification", async () => {
  const enqueue = vi
    .spyOn(telegramNotificationWorkpool, "enqueueAction")
    .mockResolvedValue("work" as never);
  const { t, agentId } = await pushFixture();
  await t.run((ctx) => dispatchPushEvent(ctx, agentId, event));
  await t.run((ctx) => dispatchPushEvent(ctx, agentId, event));
  expect(enqueue).toHaveBeenCalledTimes(1);
  const jobs = await t.run((ctx) => ctx.db.query("pushDeliveries").collect());
  expect(jobs).toHaveLength(1);
  const delivery = await t.query(internal.pushNotifications.delivery.get, {
    deliveryId: jobs[0]._id,
    kind: event.kind,
  });
  expect(delivery?.branding.name).toBe("Kilobot");
  await t.mutation(internal.pushNotifications.delivery.record, {
    deliveryId: jobs[0]._id,
    status: "sent",
  });
  expect(
    await t.query(internal.pushNotifications.delivery.get, {
      deliveryId: jobs[0]._id,
      kind: event.kind,
    }),
  ).toBeNull();
  await t.mutation(internal.pushNotifications.delivery.record, {
    deliveryId: jobs[0]._id,
    status: "skipped",
  });
  expect((await t.run((ctx) => ctx.db.get(jobs[0]._id)))?.status).toBe("sent");
});

test("delivery rechecks current preferences, access and signing key", async () => {
  vi.spyOn(telegramNotificationWorkpool, "enqueueAction").mockResolvedValue(
    "work" as never,
  );
  const { t, owner, agentId, subscriptionId, device } = await pushFixture();
  await t.run((ctx) => queuePushDelivery(ctx, subscriptionId, event));
  const [job] = await t.run((ctx) => ctx.db.query("pushDeliveries").collect());
  await owner.mutation(api.pushNotifications.subscriptions.setPreferences, {
    agentId,
    origin,
    endpoint,
    kinds: ["bookingCreated"],
    enabled: true,
  });
  expect(
    await t.query(internal.pushNotifications.delivery.get, {
      deliveryId: job._id,
      kind: event.kind,
    }),
  ).toBeNull();
  await owner.mutation(api.pushNotifications.subscriptions.setPreferences, {
    agentId,
    origin,
    endpoint,
    kinds: ["humanEscalation"],
    enabled: true,
  });
  await t.run((ctx) => ctx.db.patch(device._id, { vapidPublicKey: "old-key" }));
  expect(
    await t.query(internal.pushNotifications.delivery.get, {
      deliveryId: job._id,
      kind: event.kind,
    }),
  ).toBeNull();
});

test("expired push endpoints remove every subscription for that device", async () => {
  vi.spyOn(telegramNotificationWorkpool, "enqueueAction").mockResolvedValue(
    "work" as never,
  );
  const { t, subscriptionId, device } = await pushFixture();
  await t.run((ctx) => queuePushDelivery(ctx, subscriptionId, event));
  const [job] = await t.run((ctx) => ctx.db.query("pushDeliveries").collect());
  await t.mutation(internal.pushNotifications.delivery.record, {
    deliveryId: job._id,
    status: "failed",
    statusCode: 410,
    expiredDeviceId: device._id,
  });
  expect(await t.run((ctx) => ctx.db.get(device._id))).toBeNull();
  expect(await t.run((ctx) => ctx.db.get(subscriptionId))).toBeNull();
});

test("test notifications are queued and rate limited", async () => {
  const enqueue = vi
    .spyOn(telegramNotificationWorkpool, "enqueueAction")
    .mockResolvedValue("work" as never);
  const { owner, agentId } = await pushFixture();
  await owner.mutation(api.pushNotifications.testNotification.send, {
    agentId,
    origin,
    endpoint,
  });
  expect(enqueue).toHaveBeenCalledTimes(1);
  await expect(
    owner.mutation(api.pushNotifications.testNotification.send, {
      agentId,
      origin,
      endpoint,
    }),
  ).rejects.toThrow("Wait 15 seconds");
});
