/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { applyPendingOutboundReceipt } from "./chat/pendingOutboundReceipt";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

type Service = "whatsapp" | "instagram" | "messenger";

async function insertFixture(
  t: ReturnType<typeof convexTest>,
  service: Service,
) {
  return await t.run(async (ctx) => {
    const now = 1_700_000_000_000;
    const channelId = await ctx.db.insert("channels", {
      conversationCount: 0,
      orgId: "org-123",
      service,
      ...(service === "whatsapp" ? { phoneNumberId: "phone-123" } : {}),
      ...(service === "instagram" ? { igUserId: "ig-business-123" } : {}),
      ...(service === "messenger" ? { pageId: "page-123" } : {}),
      accessToken: "token",
      status: "connected",
      connectedByUserId: "user-123",
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "org-123",
      channelId,
      service,
      orgAddress:
        service === "whatsapp"
          ? "phone-123"
          : service === "instagram"
            ? "ig-business-123"
            : "page-123",
      contactAddress:
        service === "whatsapp" ? "+60123456789" : "customer-123",
      status: "open",
      tags: [],
      assignToAiAgent: false,
      threadId: `thread-${service}`,
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return { channelId, conversationId, now };
  });
}

async function insertMessage(
  t: ReturnType<typeof convexTest>,
  args: {
    conversationId: Id<"conversations">;
    channelId: Id<"channels">;
    service: Service;
    externalId: string;
    direction?: "incoming" | "outgoing";
    status?: "queued" | "sent" | "delivered" | "read" | "failed";
    createdAt: number;
  },
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("messages", {
      orgId: "org-123",
      conversationId: args.conversationId,
      channelId: args.channelId,
      service: args.service,
      externalId: args.externalId,
      orgAddress:
        args.service === "whatsapp"
          ? "phone-123"
          : args.service === "instagram"
            ? "ig-business-123"
            : "page-123",
      contactAddress:
        args.service === "whatsapp" ? "+60123456789" : "customer-123",
      direction: args.direction ?? "outgoing",
      contentType: "text",
      content: "Hello",
      status: args.status ?? "sent",
      createdAt: args.createdAt,
    });
  });
}

test("WhatsApp read status updates duplicate outgoing rows by external id", async () => {
  const t = convexTest(schema, modules);
  const { channelId, conversationId, now } = await insertFixture(t, "whatsapp");
  const firstId = await insertMessage(t, {
    conversationId,
    channelId,
    service: "whatsapp",
    externalId: "wamid.outbound",
    createdAt: now,
  });
  const secondId = await insertMessage(t, {
    conversationId,
    channelId,
    service: "whatsapp",
    externalId: "wamid.outbound",
    createdAt: now + 1,
  });

  await t.mutation(internal.whatsappWebhook.handleStatus, {
    phoneNumberId: "phone-123",
    externalId: "wamid.outbound",
    status: "read",
    timestampMs: now + 5000,
  });

  const rows = await t.run(async (ctx) => {
    const first = await ctx.db.get(firstId);
    const second = await ctx.db.get(secondId);
    return { first, second };
  });
  expect(rows.first?.status).toBe("read");
  expect(rows.second?.status).toBe("read");
  expect(rows.first?.readAt).toBe(now + 5000);
  expect(rows.first?.receiptMetadata).toMatchObject({
    source: "whatsapp_status",
    providerMessageId: "wamid.outbound",
  });
});

test("WhatsApp read status received before the outbound record is finalized is applied", async () => {
  const t = convexTest(schema, modules);
  const { channelId, conversationId, now } = await insertFixture(t, "whatsapp");

  await t.mutation(internal.whatsappWebhook.handleStatus, {
    phoneNumberId: "phone-123",
    externalId: "wamid.race",
    status: "read",
    timestampMs: now + 5000,
  });

  const messageId = await t.run(async (ctx) => {
    return await ctx.db.insert("messages", {
      orgId: "org-123",
      conversationId,
      channelId,
      service: "whatsapp",
      orgAddress: "phone-123",
      contactAddress: "+60123456789",
      direction: "outgoing",
      contentType: "text",
      content: "Hello",
      status: "sent",
      createdAt: now + 1,
      externalId: "wamid.race",
    });
  });

  await t.run(async (ctx) => {
    await applyPendingOutboundReceipt(ctx, {
      externalId: "wamid.race",
      channelId,
    });
  });

  const result = await t.run(async (ctx) => ({
    message: await ctx.db.get(messageId),
    pending: await ctx.db
      .query("pendingOutboundReceiptEvents")
      .withIndex("by_externalId_and_channelId", (q) =>
        q.eq("externalId", "wamid.race").eq("channelId", channelId),
      )
      .unique(),
  }));
  expect(result.message?.status).toBe("read");
  expect(result.message?.readAt).toBe(now + 5000);
  expect(result.pending).toBeNull();
});

test("Instagram seen receipt marks matching message and earlier outgoing messages", async () => {
  const t = convexTest(schema, modules);
  const { channelId, conversationId, now } = await insertFixture(t, "instagram");
  const earlierId = await insertMessage(t, {
    conversationId,
    channelId,
    service: "instagram",
    externalId: "ig.earlier",
    createdAt: now,
  });
  const readId = await insertMessage(t, {
    conversationId,
    channelId,
    service: "instagram",
    externalId: "ig.read",
    createdAt: now + 10,
  });
  const laterId = await insertMessage(t, {
    conversationId,
    channelId,
    service: "instagram",
    externalId: "ig.later",
    createdAt: now + 20,
  });

  await t.mutation(internal.instagramWebhook.handleSeenReceipt, {
    recipientIgUserId: "ig-business-123",
    senderIgUserId: "customer-123",
    externalId: "ig.read",
    timestampMs: now + 1000,
  });

  const rows = await t.run(async (ctx) => ({
    earlier: await ctx.db.get(earlierId),
    read: await ctx.db.get(readId),
    later: await ctx.db.get(laterId),
  }));
  expect(rows.earlier?.status).toBe("read");
  expect(rows.read?.status).toBe("read");
  expect(rows.later?.status).toBe("sent");
});

test("Messenger read watermark marks outgoing messages up to the watermark", async () => {
  const t = convexTest(schema, modules);
  const { channelId, conversationId, now } = await insertFixture(t, "messenger");
  const beforeId = await insertMessage(t, {
    conversationId,
    channelId,
    service: "messenger",
    externalId: "mid.before",
    createdAt: now,
  });
  const afterId = await insertMessage(t, {
    conversationId,
    channelId,
    service: "messenger",
    externalId: "mid.after",
    createdAt: now + 20,
  });

  await t.mutation(internal.messengerWebhook.handleReadReceipt, {
    pageId: "page-123",
    senderPsid: "customer-123",
    watermarkMs: now + 10,
    timestampMs: now + 30,
  });

  const rows = await t.run(async (ctx) => ({
    before: await ctx.db.get(beforeId),
    after: await ctx.db.get(afterId),
  }));
  expect(rows.before?.status).toBe("read");
  expect(rows.before?.readAt).toBe(now + 30);
  expect(rows.after?.status).toBe("sent");
});

test("Receipt updates do not downgrade read messages", async () => {
  const t = convexTest(schema, modules);
  const { channelId, conversationId, now } = await insertFixture(t, "whatsapp");
  const messageId = await insertMessage(t, {
    conversationId,
    channelId,
    service: "whatsapp",
    externalId: "wamid.read",
    status: "read",
    createdAt: now,
  });

  await t.mutation(internal.whatsappWebhook.handleStatus, {
    phoneNumberId: "phone-123",
    externalId: "wamid.read",
    status: "delivered",
    timestampMs: now + 5000,
  });

  const row = await t.run(async (ctx) => await ctx.db.get(messageId));
  expect(row?.status).toBe("read");
});
