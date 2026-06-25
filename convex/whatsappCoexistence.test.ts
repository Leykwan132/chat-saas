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
  expect(installed.channelId).toBe(channelId);

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

test("linked connection attempt moves to connected when partner app is installed", async () => {
  const t = convexTest(schema, modules);
  const channelId = await t.run(async (ctx) => {
    const insertedChannelId = await ctx.db.insert("channels", {
      orgId: "org-123",
      service: "whatsapp",
      wabaId: "waba-linked",
      phoneNumberId: "phone-linked",
      status: "connected",
      connectedByUserId: "user-123",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    });
    await ctx.db.insert("whatsappConnectionAttempts", {
      orgId: "org-123",
      connectedByUserId: "user-123",
      status: "token_ready",
      wabaId: "waba-linked",
      phoneNumberId: "phone-linked",
      channelId: insertedChannelId,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    });
    return insertedChannelId;
  });

  const result = await t.mutation(internal.whatsappWebhook.handleAccountUpdate, {
    wabaId: "waba-linked",
    event: "PARTNER_APP_INSTALLED",
    timestampMs: 1_700_000_020_000,
  });
  const attempt = await t.run(async (ctx) => {
    return await ctx.db
      .query("whatsappConnectionAttempts")
      .withIndex("by_wabaId", (q) => q.eq("wabaId", "waba-linked"))
      .unique();
  });

  expect(result.shouldStartSync).toBe(false);
  expect(result.channelId).toBe(channelId);
  expect(attempt?.status).toBe("connected");
  expect(attempt?.partnerAppInstalledAt).toBe(1_700_000_020_000);
});

test("partner app installed does not downgrade syncing connection attempt", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const channelId = await ctx.db.insert("channels", {
      orgId: "org-123",
      service: "whatsapp",
      wabaId: "waba-syncing",
      phoneNumberId: "phone-syncing",
      status: "connected",
      connectedByUserId: "user-123",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    });
    await ctx.db.insert("whatsappConnectionAttempts", {
      orgId: "org-123",
      connectedByUserId: "user-123",
      status: "syncing",
      wabaId: "waba-syncing",
      phoneNumberId: "phone-syncing",
      channelId,
      syncStartedAt: 1_700_000_010_000,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_010_000,
    });
  });

  await t.mutation(internal.whatsappWebhook.handleAccountUpdate, {
    wabaId: "waba-syncing",
    event: "PARTNER_APP_INSTALLED",
    timestampMs: 1_700_000_020_000,
  });
  const attempt = await t.run(async (ctx) => {
    return await ctx.db
      .query("whatsappConnectionAttempts")
      .withIndex("by_wabaId", (q) => q.eq("wabaId", "waba-syncing"))
      .unique();
  });

  expect(attempt?.status).toBe("syncing");
  expect(attempt?.partnerAppInstalledAt).toBe(1_700_000_020_000);
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
          user_id: "MY.1681538786237414",
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

test("Meta official account is skipped for contact and history sync", async () => {
  const t = convexTest(schema, modules);
  const channelId = await insertWhatsAppChannel(t);

  await t.mutation(internal.whatsappWebhook.handleStateSync, {
    phoneNumberId: "phone-123",
    contacts: [
      {
        type: "contact",
        action: "add",
        contact: {
          full_name: "WhatsApp from Meta",
          phone_number: "447710173736",
        },
        timestampMs: 1_700_000_040_000,
      },
    ],
  });

  await t.mutation(internal.whatsappSync.internalStageHistoryBatch, {
    channelId,
    phoneNumberId: "phone-123",
    phase: 0,
    chunkOrder: 1,
    progress: 10,
    historyThreads: [
      {
        id: "447710173736",
        messages: [
          {
            id: "meta-msg-1",
            from: "447710173736",
            timestamp: "1700000",
            type: "text",
            text: { body: "WhatsApp Business Platform" },
          },
        ],
      },
    ],
  });

  await t.run(async (ctx) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_orgId_and_service_and_contactAddress", (q) =>
        q.eq("orgId", "org-123").eq("service", "whatsapp").eq("contactAddress", "447710173736"),
      )
      .unique();
    expect(customer).toBeNull();
    expect(await ctx.db.query("whatsappHistoryIngestMessages").collect()).toHaveLength(0);
    expect(await ctx.db.query("whatsappHistoryIngestThreads").collect()).toHaveLength(0);
  });
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
  await t.mutation(internal.whatsappSync.internalStageHistoryBatch, {
    channelId,
    phoneNumberId: "phone-123",
    phase: 0,
    chunkOrder: 1,
    progress: 55,
    historyThreads: [],
  });
  await t.mutation(internal.whatsappSync.internalStageHistoryBatch, {
    channelId,
    phoneNumberId: "phone-123",
    phase: 1,
    chunkOrder: 1,
    progress: 30,
    historyThreads: [],
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

test("history staging without phase and chunkOrder creates no batch", async () => {
  const t = convexTest(schema, modules);
  const channelId = await insertWhatsAppChannel(t);

  const result = await t.mutation(internal.whatsappSync.internalStageHistoryBatch, {
    channelId,
    phoneNumberId: "phone-123",
    progress: 100,
    historyThreads: [
      {
        id: "16505551234",
        messages: [
          {
            id: "msg-orphan",
            from: "16505551234",
            timestamp: "1700000",
            type: "text",
            text: { body: "Hi" },
          },
        ],
      },
    ],
  });

  expect(result.isNewBatch).toBe(false);
  expect(result.shouldSync).toBe(false);
  await t.run(async (ctx) => {
    expect(await ctx.db.query("whatsappHistorySyncBatches").collect()).toHaveLength(0);
    expect(await ctx.db.query("whatsappHistoryIngestThreads").collect()).toHaveLength(0);
    expect(await ctx.db.query("whatsappHistoryIngestMessages").collect()).toHaveLength(0);
  });
});

test("history read status is staged for outgoing messages", async () => {
  const t = convexTest(schema, modules);
  const channelId = await insertWhatsAppChannel(t);

  await t.mutation(internal.whatsappSync.internalStageHistoryBatch, {
    channelId,
    phoneNumberId: "phone-123",
    phase: 0,
    chunkOrder: 1,
    progress: 10,
    historyThreads: [
      {
        id: "16505551234",
        messages: [
          {
            id: "msg-read",
            from: "15550783881",
            to: "16505551234",
            timestamp: "1700000",
            type: "text",
            text: { body: "Already read" },
            history_context: { status: "read" },
          },
        ],
      },
    ],
  });

  const staged = await t.run(async (ctx) =>
    ctx.db.query("whatsappHistoryIngestMessages").first(),
  );
  expect(staged?.historyStatus).toBe("read");
  expect(staged?.direction).toBe("outgoing");

  const work = await t.mutation(internal.whatsappSync.internalBeginIngestContact, {
    channelId,
    whatsappThreadId: "16505551234",
  });
  expect(work?.messages[0]?.outboundStatus).toBe("read");
});

test("history batch and thread status use unified pending syncing completed", async () => {
  const t = convexTest(schema, modules);
  const channelId = await insertWhatsAppChannel(t);
  await t.run(async (ctx) => {
    await ctx.db.patch(channelId, { historySyncStatus: "syncing" });
  });

  await t.mutation(internal.whatsappSync.internalStageHistoryBatch, {
    channelId,
    phoneNumberId: "phone-123",
    phase: 2,
    chunkOrder: 3,
    progress: 100,
    historyThreads: [
      {
        id: "16505551234",
        messages: [
          {
            id: "msg-1",
            from: "16505551234",
            timestamp: "1700000",
            type: "text",
            text: { body: "Hi" },
          },
        ],
      },
    ],
  });

  const staged = await t.run(async (ctx) => ({
    batch: await ctx.db.query("whatsappHistorySyncBatches").first(),
    thread: await ctx.db.query("whatsappHistoryIngestThreads").first(),
  }));
  expect(staged.batch?.status).toBe("pending");
  expect(staged.thread?.status).toBe("pending");

  const work = await t.mutation(internal.whatsappSync.internalBeginIngestContact, {
    channelId,
    whatsappThreadId: "16505551234",
  });
  expect(work?.messages).toHaveLength(1);

  const syncing = await t.run(async (ctx) => ({
    batch: await ctx.db.get(staged.batch!._id),
    thread: await ctx.db.get(staged.thread!._id),
  }));
  expect(syncing.thread?.status).toBe("syncing");
  expect(syncing.batch?.status).toBe("syncing");

  await t.mutation(internal.whatsappSync.internalCompleteIngestContact, {
    channelId,
    whatsappThreadId: "16505551234",
    ingestThreadIds: work!.ingestThreadIds,
  });

  const completed = await t.run(async (ctx) => ({
    batch: await ctx.db.get(staged.batch!._id),
    thread: await ctx.db.get(staged.thread!._id),
  }));
  expect(completed.thread?.status).toBe("completed");
  expect(completed.batch?.status).toBe("completed");

  await t.mutation(internal.whatsappSync.internalCompleteHistorySync, {
    channelId,
  });
  const result = await t.run(async (ctx) => {
    const request = await ctx.db
      .query("whatsappSyncRequests")
      .withIndex("by_channelId_and_syncType", (q) =>
        q.eq("channelId", channelId).eq("syncType", "history"),
      )
      .first();
    return {
      channel: await ctx.db.get(channelId),
      request,
    };
  });
  expect(result.channel?.historySyncStatus).toBe("completed");
  expect(result.channel?.historySyncProgress).toBe(100);
});

test("history ingest triggers once all 3 batches arrive with progress >= 100", async () => {
  const t = convexTest(schema, modules);
  const channelId = await insertWhatsAppChannel(t);
  await t.run(async (ctx) => {
    await ctx.db.patch(channelId, { historySyncStatus: "syncing" });
  });

  const first = await t.mutation(internal.whatsappSync.internalStageHistoryBatch, {
    channelId,
    phoneNumberId: "phone-123",
    phase: 0,
    chunkOrder: 1,
    progress: 50,
    historyThreads: [],
  });
  expect(first.shouldSync).toBe(false);

  const second = await t.mutation(internal.whatsappSync.internalStageHistoryBatch, {
    channelId,
    phoneNumberId: "phone-123",
    phase: 1,
    chunkOrder: 1,
    progress: 75,
    historyThreads: [],
  });
  expect(second.shouldSync).toBe(false);

  const third = await t.mutation(internal.whatsappSync.internalStageHistoryBatch, {
    channelId,
    phoneNumberId: "phone-123",
    phase: 2,
    chunkOrder: 3,
    progress: 100,
    historyThreads: [],
  });
  expect(third.shouldSync).toBe(true);

  const state = await t.run(async (ctx) => {
    const batches = await ctx.db
      .query("whatsappHistorySyncBatches")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .collect();
    const channel = await ctx.db.get(channelId);
    return {
      batchCount: batches.length,
      status: channel?.historySyncStatus,
      progress: channel?.historySyncProgress,
      totalBatches: channel?.historySyncTotalBatchCount,
    };
  });
  expect(state.batchCount).toBe(3);
  expect(state.status).toBe("syncing");
  expect(state.progress).toBe(90);
  expect(state.totalBatches).toBe(3);
});

test("internalBeginIngestContact orders messages by timestamp across batches", async () => {
  const t = convexTest(schema, modules);
  const channelId = await insertWhatsAppChannel(t);
  await t.run(async (ctx) => {
    await ctx.db.patch(channelId, { historySyncStatus: "syncing" });
  });

  await t.mutation(internal.whatsappSync.internalStageHistoryBatch, {
    channelId,
    phoneNumberId: "phone-123",
    phase: 1,
    chunkOrder: 1,
    progress: 50,
    historyThreads: [
      {
        id: "16505551234",
        messages: [
          {
            id: "msg-newer",
            from: "16505551234",
            timestamp: "2000",
            type: "text",
            text: { body: "Newer" },
          },
        ],
      },
    ],
  });

  await t.mutation(internal.whatsappSync.internalStageHistoryBatch, {
    channelId,
    phoneNumberId: "phone-123",
    phase: 0,
    chunkOrder: 1,
    progress: 25,
    historyThreads: [
      {
        id: "16505551234",
        messages: [
          {
            id: "msg-older",
            from: "16505551234",
            timestamp: "1000",
            type: "text",
            text: { body: "Older" },
          },
        ],
      },
    ],
  });

  const work = await t.mutation(internal.whatsappSync.internalBeginIngestContact, {
    channelId,
    whatsappThreadId: "16505551234",
  });

  expect(work?.messages.map((m) => m.externalId)).toEqual(["msg-older", "msg-newer"]);
});

test("shared threads across batches complete all batches when ingest finishes", async () => {
  const t = convexTest(schema, modules);
  const channelId = await insertWhatsAppChannel(t);
  await t.run(async (ctx) => {
    await ctx.db.patch(channelId, { historySyncStatus: "syncing" });
  });

  for (const phase of [0, 1, 2]) {
    await t.mutation(internal.whatsappSync.internalStageHistoryBatch, {
      channelId,
      phoneNumberId: "phone-123",
      phase,
      chunkOrder: 1,
      progress: 100,
      historyThreads: [
        {
          id: "16505551234",
          messages: [
            {
              id: `msg-phase-${phase}`,
              from: "16505551234",
              timestamp: String(1000 + phase),
              type: "text",
              text: { body: `Phase ${phase}` },
            },
          ],
        },
      ],
    });
  }

  const work = await t.mutation(internal.whatsappSync.internalBeginIngestContact, {
    channelId,
    whatsappThreadId: "16505551234",
  });
  expect(work?.ingestThreadIds).toHaveLength(3);

  await t.mutation(internal.whatsappSync.internalCompleteIngestContact, {
    channelId,
    whatsappThreadId: "16505551234",
    ingestThreadIds: work!.ingestThreadIds,
  });

  await t.run(async (ctx) => {
    const batches = await ctx.db
      .query("whatsappHistorySyncBatches")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .collect();
    expect(batches).toHaveLength(3);
    expect(batches.every((batch) => batch.status === "completed")).toBe(true);
  });
});
