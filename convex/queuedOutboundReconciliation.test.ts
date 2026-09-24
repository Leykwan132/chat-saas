/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { ORPHAN_AFTER_MS } from "./chat/queuedOutboundReconciliation";

const modules = import.meta.glob("./**/*.ts");

async function insertFixture(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const channelId = await ctx.db.insert("channels", {
      conversationCount: 0,
      orgId: "org-123",
      service: "whatsapp",
      phoneNumberId: "phone-123",
      accessToken: "token",
      status: "connected",
      connectedByUserId: "user-123",
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "org-123",
      channelId,
      service: "whatsapp",
      orgAddress: "phone-123",
      contactAddress: "+60123456789",
      status: "open",
      tags: [],
      assignToAiAgent: false,
      threadId: "thread-sweep",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    return { channelId, conversationId, now };
  });
}

test("verifyQueuedFinalized marks only stale queued rows as failed", async () => {
  const t = convexTest(schema, modules);
  const { conversationId, channelId, now } = await insertFixture(t);

  const ids = await t.run(async (ctx) => {
    const stale = await ctx.db.insert("messages", {
      orgId: "org-123",
      conversationId,
      channelId,
      service: "whatsapp",
      orgAddress: "phone-123",
      contactAddress: "+60123456789",
      direction: "outgoing",
      contentType: "text",
      content: "stale",
      status: "queued",
      createdAt: now - ORPHAN_AFTER_MS - 1000,
    });
    const fresh = await ctx.db.insert("messages", {
      orgId: "org-123",
      conversationId,
      channelId,
      service: "whatsapp",
      orgAddress: "phone-123",
      contactAddress: "+60123456789",
      direction: "outgoing",
      contentType: "text",
      content: "fresh",
      status: "queued",
      createdAt: now,
    });
    const sent = await ctx.db.insert("messages", {
      orgId: "org-123",
      conversationId,
      channelId,
      service: "whatsapp",
      externalId: "wamid.sent",
      orgAddress: "phone-123",
      contactAddress: "+60123456789",
      direction: "outgoing",
      contentType: "text",
      content: "sent",
      status: "sent",
      createdAt: now - ORPHAN_AFTER_MS - 1000,
    });
    return { stale, fresh, sent };
  });

  const result = await t.mutation(
    internal.chat.queuedOutboundReconciliation.verifyQueuedFinalized,
    { messageIds: [ids.stale, ids.fresh, ids.sent] },
  );
  expect(result.swept).toBe(1);

  const rows = await t.run(async (ctx) => ({
    stale: await ctx.db.get(ids.stale),
    fresh: await ctx.db.get(ids.fresh),
    sent: await ctx.db.get(ids.sent),
  }));
  expect(rows.stale?.status).toBe("failed");
  expect(rows.stale?.failureReason).toContain("provider message ID");
  expect(rows.fresh?.status).toBe("queued");
  expect(rows.sent?.status).toBe("sent");
});

test("sweepStaleQueuedOutbound clears stale queued rows and stale pending receipts", async () => {
  const t = convexTest(schema, modules);
  const { conversationId, channelId, now } = await insertFixture(t);

  const staleId = await t.run(async (ctx) => {
    return await ctx.db.insert("messages", {
      orgId: "org-123",
      conversationId,
      channelId,
      service: "whatsapp",
      orgAddress: "phone-123",
      contactAddress: "+60123456789",
      direction: "outgoing",
      contentType: "text",
      content: "stale",
      status: "queued",
      createdAt: now - ORPHAN_AFTER_MS - 1000,
    });
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("pendingOutboundReceiptEvents", {
      externalId: "wamid.gone",
      channelId,
      status: "read",
      createdAt: now - ORPHAN_AFTER_MS - 1000,
      updatedAt: now - ORPHAN_AFTER_MS - 1000,
    });
    await ctx.db.insert("pendingOutboundReceiptEvents", {
      externalId: "wamid.fresh",
      channelId,
      status: "read",
      createdAt: now,
      updatedAt: now,
    });
  });

  const result = await t.mutation(
    internal.chat.queuedOutboundReconciliation.sweepStaleQueuedOutbound,
    {},
  );
  expect(result.swept).toBe(1);
  expect(result.pendingRemoved).toBe(1);
  expect(result.pendingApplied).toBe(0);

  const rows = await t.run(async (ctx) => ({
    stale: await ctx.db.get(staleId),
    pendings: await ctx.db.query("pendingOutboundReceiptEvents").collect(),
  }));
  expect(rows.stale?.status).toBe("failed");
  expect(rows.pendings).toHaveLength(1);
  expect(rows.pendings[0]?.externalId).toBe("wamid.fresh");
});
