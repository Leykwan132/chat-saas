import { afterEach, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { analyticsProjectionTest } from "./analyticsProjection.testUtils";

afterEach(() => {
  vi.useRealTimers();
});

test("dispatcher leases 25 due rows and self-drains remainder", async () => {
  vi.useFakeTimers();
  const convex = analyticsProjectionTest();
  const now = 1_700_000_000_000;
  const futureAttemptAt = now + 60_000;
  const futureRequestId = await convex.run(async (ctx) => {
    const channelId = await ctx.db.insert("channels", {
      orgId: "org-dispatch",
      service: "whatsapp",
      phoneNumberId: "phone-dispatch",
      accessToken: "token",
      status: "connected",
      connectedByUserId: "user-dispatch",
      createdAt: now,
      updatedAt: now,
    });
    let futureRequestId:
      | Id<"conversationAnalyticsDirtyRequests">
      | undefined;
    for (let index = 0; index < 28; index += 1) {
      const contactAddress = `+601100000${index}`;
      const customerId = await ctx.db.insert("customers", {
        orgId: "org-dispatch",
        service: "whatsapp",
        contactAddress,
        tags: [],
        source: "whatsapp",
        firstSeenAt: now,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      });
      const conversationId = await ctx.db.insert("conversations", {
        orgId: "org-dispatch",
        channelId,
        service: "whatsapp",
        orgAddress: "phone-dispatch",
        contactAddress,
        customerId,
        status: "open",
        tags: [],
        assignToAiAgent: false,
        threadId: `thread-${index}`,
        lastMessageAt: now,
        unreadCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      const requestId = await ctx.db.insert(
        "conversationAnalyticsDirtyRequests",
        {
          conversationId,
          revision: 1,
          requestedAt: now,
          nextAttemptAt: index < 27 ? now : futureAttemptAt,
        },
      );
      if (index === 27) futureRequestId = requestId;
    }
    if (futureRequestId === undefined) {
      throw new Error("Future request fixture was not created");
    }
    return futureRequestId;
  });

  const firstDispatch = await convex.mutation(
    internal.analyticsDirtyDispatcher.dispatchDue,
    { now },
  );
  const afterFirstDispatch = await convex.run(async (ctx) =>
    await ctx.db
      .query("conversationAnalyticsDirtyRequests")
      .withIndex("by_nextAttemptAt")
      .take(30),
  );
  expect(firstDispatch).toEqual({ dispatched: 25, continued: true });
  expect(
    afterFirstDispatch.filter(
      (request) => request.nextAttemptAt === now + 15 * 60 * 1000,
    ),
  ).toHaveLength(25);
  expect(
    afterFirstDispatch.filter(
      (request) => request.nextAttemptAt === now,
    ),
  ).toHaveLength(2);
  expect(
    await convex.run(async (ctx) => await ctx.db.get(futureRequestId)),
  ).toMatchObject({ nextAttemptAt: futureAttemptAt });

  await convex.finishAllScheduledFunctions(vi.runAllTimers);
  const remaining = await convex.run(async (ctx) =>
    await ctx.db
      .query("conversationAnalyticsDirtyRequests")
      .withIndex("by_nextAttemptAt")
      .take(30),
  );
  expect(remaining).toEqual([
    expect.objectContaining({
      _id: futureRequestId,
      nextAttemptAt: futureAttemptAt,
    }),
  ]);
});
