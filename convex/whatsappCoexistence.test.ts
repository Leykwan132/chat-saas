/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function insertWhatsAppChannel(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("channels", {
      orgId: "org-123",
      service: "whatsapp",
      wabaId: "waba-123",
      phoneNumberId: "phone-123",
      displayPhoneNumber: "15550783881",
      accessToken: "token-123",
      status: "connected",
      connectedByUserId: "user-123",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    });
  });
}

test("WhatsApp success account_update events are audit-only", async () => {
  const t = convexTest(schema, modules);
  const channelId = await insertWhatsAppChannel(t);

  const terms = await t.mutation(internal.whatsappWebhook.handleAccountUpdate, {
    wabaId: "waba-123",
    event: "MM_LITE_TERMS_SIGNED",
    timestampMs: 1_700_000_010_000,
  });
  expect(terms.shouldStartSync).toBe(false);

  const installed = await t.mutation(internal.whatsappWebhook.handleAccountUpdate, {
    wabaId: "waba-123",
    event: "PARTNER_APP_INSTALLED",
    timestampMs: 1_700_000_020_000,
  });
  expect(installed.shouldStartSync).toBe(false);

  const duplicate = await t.mutation(internal.whatsappWebhook.handleAccountUpdate, {
    wabaId: "waba-123",
    event: "PARTNER_APP_INSTALLED",
    timestampMs: 1_700_000_030_000,
  });
  expect(duplicate.shouldStartSync).toBe(false);

  const result = await t.run(async (ctx) => {
    const channel = await ctx.db.get(channelId);
    const installedEvent = await ctx.db
      .query("whatsappAccountUpdates")
      .withIndex("by_wabaId_and_event", (q) =>
        q.eq("wabaId", "waba-123").eq("event", "PARTNER_APP_INSTALLED"),
      )
      .unique();
    return { channel, installedEvent };
  });
  expect(result.channel?.mmLiteTermsSignedAt).toBeUndefined();
  expect(result.channel?.partnerAppInstalledAt).toBeUndefined();
  expect(result.channel?.coexistenceSyncStartedAt).toBeUndefined();
  expect(result.installedEvent?.eventAt).toBe(1_700_000_030_000);
});

test("account_update before channel exists is stored but does not drive connection", async () => {
  const t = convexTest(schema, modules);

  const early = await t.mutation(internal.whatsappWebhook.handleAccountUpdate, {
    wabaId: "waba-early",
    event: "PARTNER_APP_INSTALLED",
    ownerBusinessId: "business-123",
    partnerAppId: "app-123",
    timestampMs: 1_700_000_020_000,
  });
  expect(early.shouldStartSync).toBe(false);

  const channelId = await t.mutation(internal.channels.internalUpsertWhatsApp, {
    orgId: "org-123",
    wabaId: "waba-early",
    phoneNumberId: "phone-early",
    displayPhoneNumber: "15550783882",
    accessToken: "token-early",
    connectedByUserId: "user-123",
  });

  const result = await t.run(async (ctx) => {
    const channel = await ctx.db.get(channelId);
    const accountUpdate = await ctx.db
      .query("whatsappAccountUpdates")
      .withIndex("by_wabaId_and_event", (q) =>
        q.eq("wabaId", "waba-early").eq("event", "PARTNER_APP_INSTALLED"),
      )
      .unique();
    return { channel, accountUpdate };
  });

  expect(result.accountUpdate?.partnerAppId).toBe("app-123");
  expect(result.channel?.status).toBe("connected");
  expect(result.channel?.partnerAppInstalledAt).toBeUndefined();
  expect(result.channel?.coexistenceSyncStartedAt).toBeUndefined();
});

test("linked connection attempt ignores success account_update for connection state", async () => {
  const t = convexTest(schema, modules);
  const attemptId = await t.run(async (ctx) => {
    return await ctx.db.insert("whatsappConnectionAttempts", {
      orgId: "org-123",
      connectedByUserId: "user-123",
      status: "signup_finished",
      wabaId: "waba-linked",
      phoneNumberId: "phone-linked",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    });
  });

  const result = await t.mutation(internal.whatsappWebhook.handleAccountUpdate, {
    wabaId: "waba-linked",
    event: "PARTNER_APP_INSTALLED",
    timestampMs: 1_700_000_020_000,
  });
  const attempt = await t.run(async (ctx) => await ctx.db.get(attemptId));

  expect(result.shouldStartSync).toBe(false);
  expect(attempt?.status).toBe("signup_finished");
  expect(attempt?.partnerAppInstalledAt).toBeUndefined();
  expect(attempt?.channelId).toBeUndefined();
});

test("completeSignup token persistence marks channel connected without account_update", async () => {
  const t = convexTest(schema, modules);

  const channelId = await t.mutation(internal.channels.internalUpsertWhatsApp, {
    orgId: "org-123",
    wabaId: "waba-pending",
    phoneNumberId: "phone-pending",
    accessToken: "token-pending",
    connectedByUserId: "user-123",
  });
  const channel = await t.run(async (ctx) => await ctx.db.get(channelId));
  expect(channel?.status).toBe("connected");
  expect(channel?.progressStep).toBeUndefined();
});

test("failure account_update marks linked channel and attempt as error", async () => {
  const t = convexTest(schema, modules);
  const channelId = await t.run(async (ctx) => {
    const insertedChannelId = await ctx.db.insert("channels", {
      orgId: "org-123",
      service: "whatsapp",
      wabaId: "waba-pending",
      phoneNumberId: "phone-pending",
      status: "connected",
      connectedByUserId: "user-123",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    });
    await ctx.db.insert("whatsappConnectionAttempts", {
      orgId: "org-123",
      connectedByUserId: "user-123",
      status: "syncing",
      wabaId: "waba-pending",
      phoneNumberId: "phone-pending",
      channelId: insertedChannelId,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    });
    return insertedChannelId;
  });

  const result = await t.mutation(internal.whatsappWebhook.handleAccountUpdate, {
    wabaId: "waba-pending",
    event: "ACCOUNT_OFFBOARDED",
    timestampMs: 1_700_000_020_000,
  });
  const rows = await t.run(async (ctx) => {
    const channel = await ctx.db.get(channelId);
    const attempt = await ctx.db
      .query("whatsappConnectionAttempts")
      .withIndex("by_wabaId", (q) => q.eq("wabaId", "waba-pending"))
      .unique();
    return { channel, attempt };
  });

  expect(result.shouldStartSync).toBe(false);
  expect(rows.channel?.status).toBe("error");
  expect(rows.channel?.lastError).toBe("WhatsApp account update ACCOUNT_OFFBOARDED");
  expect(rows.attempt?.status).toBe("error");
});

test("smb_app_state_sync upserts added contacts and preserves removed contacts", async () => {
  const t = convexTest(schema, modules);
  const channelId = await insertWhatsAppChannel(t);

  await t.mutation(internal.whatsappWebhook.handleStateSync, {
    phoneNumberId: "phone-123",
    contacts: [
      {
        type: "contact",
        action: "add",
        contact: {
          full_name: "Pablo Morales",
          first_name: "Pablo",
          phone_number: "16505551234",
        },
        timestampMs: 1_700_000_040_000,
      },
      {
        type: "contact",
        action: "remove",
        contact: {
          full_name: "Removed Person",
          phone_number: "16505559999",
        },
        timestampMs: 1_700_000_050_000,
      },
    ],
  });

  const result = await t.run(async (ctx) => {
    const added = await ctx.db
      .query("customers")
      .withIndex("by_orgId_and_service_and_contactAddress", (q) =>
        q
          .eq("orgId", "org-123")
          .eq("service", "whatsapp")
          .eq("contactAddress", "16505551234"),
      )
      .unique();
    const removed = await ctx.db
      .query("customers")
      .withIndex("by_orgId_and_service_and_contactAddress", (q) =>
        q
          .eq("orgId", "org-123")
          .eq("service", "whatsapp")
          .eq("contactAddress", "16505559999"),
      )
      .unique();
    return { channel: await ctx.db.get(channelId), added, removed };
  });

  expect(result.added?.name).toBe("Pablo Morales");
  expect(result.added?.phone).toBe("16505551234");
  expect(result.removed).toBeNull();
  expect(result.channel?.contactSyncStatus).toBe("completed");
  expect(result.channel?.contactSyncLastEventAt).toBe(1_700_000_050_000);
});

test("history progress is monotonic and opt-out is recorded", async () => {
  const t = convexTest(schema, modules);
  const channelId = await insertWhatsAppChannel(t);
  const requestId = await t.run(async (ctx) => {
    return await ctx.db.insert("whatsappSyncRequests", {
      channelId,
      orgId: "org-123",
      wabaId: "waba-123",
      phoneNumberId: "phone-123",
      syncType: "history",
      status: "requested",
      requestId: "meta-request-123",
      createdAt: 1_700_000_000_000,
      requestedAt: 1_700_000_001_000,
      updatedAt: 1_700_000_001_000,
    });
  });
  const storageIds = await t.run(async (ctx) => ({
    first: await ctx.storage.store(new Blob(["{}"], { type: "application/json" })),
    second: await ctx.storage.store(new Blob(["{}"], { type: "application/json" })),
  }));

  await t.mutation(internal.whatsappSync.internalCaptureHistoryChunk, {
    channelId,
    phoneNumberId: "phone-123",
    phase: 0,
    chunkOrder: 1,
    progress: 55,
    storageId: storageIds.first,
  });
  await t.mutation(internal.whatsappSync.internalCaptureHistoryChunk, {
    channelId,
    phoneNumberId: "phone-123",
    phase: 1,
    chunkOrder: 1,
    progress: 30,
    storageId: storageIds.second,
  });

  let result = await t.run(async (ctx) => ({
    channel: await ctx.db.get(channelId),
    request: await ctx.db.get(requestId),
  }));
  expect(result.channel?.historySyncProgress).toBe(55);
  expect(result.channel?.historySyncPhase).toBe(0);

  await t.mutation(internal.whatsappSync.internalMarkHistoryNotShared, {
    phoneNumberId: "phone-123",
    errorCode: 2593109,
    errorMessage: "History sharing is turned off by the business",
  });
  result = await t.run(async (ctx) => ({
    channel: await ctx.db.get(channelId),
    request: await ctx.db.get(requestId),
  }));
  expect(result.channel?.historySyncStatus).toBe("not_shared");
  expect(result.request?.status).toBe("not_shared");
  expect(result.request?.errorCode).toBe(2593109);
});

test("history chunk status transitions to processing and completed", async () => {
  const t = convexTest(schema, modules);
  const channelId = await insertWhatsAppChannel(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("whatsappSyncRequests", {
      channelId,
      orgId: "org-123",
      wabaId: "waba-123",
      phoneNumberId: "phone-123",
      syncType: "history",
      status: "requested",
      requestId: "meta-request-123",
      createdAt: 1_700_000_000_000,
      requestedAt: 1_700_000_001_000,
      updatedAt: 1_700_000_001_000,
    });
  });
  const storageId = await t.run(
    async (ctx) =>
      await ctx.storage.store(new Blob(["{}"], { type: "application/json" })),
  );
  const chunkId = await t.mutation(internal.whatsappSync.internalCaptureHistoryChunk, {
    channelId,
    phoneNumberId: "phone-123",
    phase: 2,
    chunkOrder: 3,
    progress: 100,
    storageId,
  });

  await t.mutation(internal.whatsappSync.internalMarkHistoryChunkProcessing, {
    chunkId,
  });
  const chunk = await t.run(async (ctx) => await ctx.db.get(chunkId));
  expect(chunk?.status).toBe("processing");

  await t.mutation(internal.whatsappSync.internalMarkHistoryChunkCompleted, {
    chunkId,
  });
  const result = await t.run(async (ctx) => {
    const request = await ctx.db
      .query("whatsappSyncRequests")
      .withIndex("by_channelId_and_syncType", (q) =>
        q.eq("channelId", channelId).eq("syncType", "history"),
      )
      .unique();
    return {
      chunk: await ctx.db.get(chunkId),
      channel: await ctx.db.get(channelId),
      request,
    };
  });
  expect(result.chunk?.status).toBe("completed");
  expect(result.channel?.historySyncStatus).toBe("completed");
  expect(result.channel?.historySyncProgress).toBe(100);
  expect(result.request?.status).toBe("completed");
});
