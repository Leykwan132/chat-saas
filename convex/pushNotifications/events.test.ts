import { afterEach, expect, test, vi } from "vitest";
import { pushFixture } from "../../tests/pushNotificationsFixture";
import { telegramNotificationWorkpool } from "../telegramNotifications/pool";
import {
  notifyHumanEscalation,
  notifyAppointmentEvent,
} from "../telegramNotifications/events";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("escalations queue push even when Telegram is disabled and omit customer text", async () => {
  const enqueue = vi
    .spyOn(telegramNotificationWorkpool, "enqueueAction")
    .mockResolvedValue("work" as never);
  const { t, agentId } = await pushFixture();
  await t.run(async (ctx) => {
    await ctx.db.patch(agentId, { telegramNotificationKinds: [] });
    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      service: "web",
      orgAddress: "site",
      contactAddress: "private@example.com",
      contactName: "Private customer",
      lastMessagePreview: "Private conversation text",
      status: "requires_user_input",
      assignedAgentId: agentId,
      assignToAiAgent: false,
      escalation: {
        question: "Private question",
        context: "Private context",
        escalatedAt: now,
      },
      threadId: "push-thread",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await notifyHumanEscalation(ctx, agentId, conversationId, "Support");
  });
  expect(enqueue).toHaveBeenCalledTimes(1);
  const payload = JSON.stringify(enqueue.mock.calls[0][2]);
  expect(payload).toContain("humanEscalation");
  expect(payload).toContain("?conversation=");
  expect(payload).not.toContain("Private");
  expect(payload).not.toContain("private@example.com");
});

test("bookings queue push independently of Telegram settings", async () => {
  const enqueue = vi
    .spyOn(telegramNotificationWorkpool, "enqueueAction")
    .mockResolvedValue("work" as never);
  const { t, agentId, teamId, userId } = await pushFixture();
  await t.run(async (ctx) => {
    await ctx.db.patch(agentId, { telegramNotificationKinds: [] });
    const now = Date.now();
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId,
      agentId,
      title: "Private booking name",
      startAt: now,
      endAt: now + 1800000,
      timeZone: "Asia/Kuala_Lumpur",
      status: "confirmed",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
    await notifyAppointmentEvent(ctx, agentId, eventId, "Support", "booked");
  });
  expect(enqueue).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(enqueue.mock.calls[0][2])).toContain("bookingCreated");
  expect(JSON.stringify(enqueue.mock.calls[0][2])).not.toContain(
    "Private booking name",
  );
});
