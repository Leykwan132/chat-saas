import { afterEach, expect, test, vi } from "vitest";
import { api } from "../_generated/api";
import {
  pushFixture,
  endpoint,
  origin,
  keys,
} from "../../tests/pushNotificationsFixture";
import { validatePushEndpoint, validatePushKeys } from "./validation";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("device subscriptions are owned, idempotent and scoped to an accessible agent", async () => {
  const { owner, t, agentId, foreignAgentId, subscriptionId } =
    await pushFixture();
  expect(
    await owner.mutation(api.pushNotifications.subscriptions.subscribe, {
      agentId,
      origin,
      endpoint,
      ...keys,
      kinds: ["bookingCreated"],
    }),
  ).toBe(subscriptionId);
  const state = await owner.query(
    api.pushNotifications.subscriptions.getForAgent,
    { agentId, origin, endpoint },
  );
  expect(state.subscription?.kinds).toEqual(["bookingCreated"]);
  expect(JSON.stringify(state)).not.toContain("private-test-key");
  await expect(
    owner.mutation(api.pushNotifications.subscriptions.subscribe, {
      agentId: foreignAgentId,
      origin,
      endpoint,
      ...keys,
      kinds: ["humanEscalation"],
    }),
  ).rejects.toThrow("Agent not found");
  await expect(
    t
      .withIdentity({ subject: "other-owner" })
      .mutation(api.pushNotifications.subscriptions.removeDevice, { endpoint }),
  ).rejects.toThrow("Device not found");
});

test("preferences can pause an agent and logout removes device subscriptions", async () => {
  const { owner, agentId, t } = await pushFixture();
  await owner.mutation(api.pushNotifications.subscriptions.setPreferences, {
    agentId,
    origin,
    endpoint,
    kinds: ["humanEscalation"],
    enabled: false,
  });
  expect(
    (
      await owner.query(api.pushNotifications.subscriptions.getForAgent, {
        agentId,
        origin,
        endpoint,
      })
    ).subscription?.enabled,
  ).toBe(false);
  await owner.mutation(api.pushNotifications.subscriptions.removeDevice, {
    endpoint,
  });
  expect(
    await t.run((ctx) => ctx.db.query("pushAgentSubscriptions").collect()),
  ).toHaveLength(0);
  expect(
    await t.run((ctx) => ctx.db.query("pushDevices").collect()),
  ).toHaveLength(0);
});

test("rejects forged origins, private endpoints and malformed encryption keys", async () => {
  for (const url of [
    "http://localhost:8080",
    "https://127.0.0.1/test",
    "https://fcm.googleapis.com.attacker.test/x",
    "https://user@web.push.apple.com/x",
  ]) {
    expect(() => validatePushEndpoint(url)).toThrow();
  }
  for (const url of [
    "https://fcm.googleapis.com/fcm/send/x",
    "https://web.push.apple.com/token",
    "https://updates.push.services.mozilla.com/wpush/v2/x",
    "https://wns.notify.windows.com/x",
  ]) {
    expect(() => validatePushEndpoint(url)).not.toThrow();
  }
  expect(() => validatePushKeys("bad", "bad")).toThrow();
  const { owner, agentId } = await pushFixture();
  await expect(
    owner.mutation(api.pushNotifications.subscriptions.subscribe, {
      agentId,
      origin: "https://attacker.test",
      endpoint,
      ...keys,
      kinds: ["humanEscalation"],
    }),
  ).rejects.toThrow("Invalid notification origin");
  await expect(
    owner.mutation(api.pushNotifications.subscriptions.subscribe, {
      agentId,
      origin,
      endpoint,
      ...keys,
      kinds: ["humanEscalation", "humanEscalation"],
    }),
  ).rejects.toThrow("Duplicate notification types");
});
