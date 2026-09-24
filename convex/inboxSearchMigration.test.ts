/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import {
  reconcileInboxSearchDocumentsPage,
} from "./inboxSearchMigration";
import { upsertInboxConversationSummary } from "./inboxConversationSummary";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function createFixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const channelId = await ctx.db.insert("channels", {
      orgId: "",
      service: "whatsapp",
      phoneNumberId: "inbox-search-migration-phone",
      status: "connected",
      connectedByUserId: "inbox-search-migration-owner",
      conversationCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      userId: "inbox-search-migration-owner",
      channelId,
      service: "whatsapp",
      orgAddress: "+60999999999",
      contactAddress: "+60123456789",
      contactName: "Aisha Rahman",
      status: "open",
      assignToAiAgent: false,
      threadId: "inbox-search-migration-thread",
      lastMessageAt: now,
      lastMessagePreview: "Need to reschedule Friday",
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    const messageId = await ctx.db.insert("messages", {
      orgId: "",
      conversationId,
      channelId,
      service: "whatsapp",
      orgAddress: "+60999999999",
      contactAddress: "+60123456789",
      direction: "incoming",
      contentType: "text",
      content: "Need to reschedule Friday",
      createdAt: now,
    });
    await upsertInboxConversationSummary(ctx, conversationId);
    return { channelId, conversationId, messageId };
  });
  return { t, ...ids };
}

test("backfills contact and eligible message search documents", async () => {
  const fixture = await createFixture();
  await fixture.t.mutation(internal.inboxSearchMigration.backfillInboxChatSearchDocuments, {
    cursor: null,
    dryRun: false,
    oneBatchOnly: true,
  });
  await fixture.t.mutation(internal.inboxSearchMigration.backfillInboxMessageSearchDocuments, {
    cursor: null,
    dryRun: false,
    oneBatchOnly: true,
  });

  const documents = await fixture.t.run(async (ctx) => ({
    chats: await ctx.db.query("inboxChatSearchDocuments").collect(),
    messages: await ctx.db.query("inboxMessageSearchDocuments").collect(),
  }));
  expect(documents.chats).toHaveLength(1);
  expect(documents.messages).toHaveLength(1);
});

test("reconciliation repairs a stale disconnected conversation document", async () => {
  const fixture = await createFixture();
  await fixture.t.run(async (ctx) => {
    await ctx.db.insert("inboxChatSearchDocuments", {
      conversationId: fixture.conversationId,
      orgId: "",
      userId: "inbox-search-migration-owner",
      isChannelConnected: true,
      searchText: "Aisha Rahman",
    });
    await ctx.db.insert("inboxMessageSearchDocuments", {
      messageId: fixture.messageId,
      conversationId: fixture.conversationId,
      orgId: "",
      userId: "inbox-search-migration-owner",
      isChannelConnected: true,
      content: "Need to reschedule Friday",
      createdAt: Date.now(),
    });
    await ctx.db.patch(fixture.channelId, { status: "disconnected" });
    await upsertInboxConversationSummary(ctx, fixture.conversationId);
  });

  const audit = await fixture.t.run((ctx) =>
    reconcileInboxSearchDocumentsPage(ctx, { cursor: null, numItems: 25 }, false),
  );
  expect(audit).toMatchObject({ stale: 2, repaired: 0 });

  const repair = await fixture.t.run((ctx) =>
    reconcileInboxSearchDocumentsPage(ctx, { cursor: null, numItems: 25 }, true),
  );
  expect(repair).toMatchObject({ stale: 2, repaired: 2 });

  const verified = await fixture.t.run((ctx) =>
    reconcileInboxSearchDocumentsPage(ctx, { cursor: null, numItems: 25 }, false),
  );
  expect(verified).toMatchObject({ stale: 0, repaired: 0 });
});
