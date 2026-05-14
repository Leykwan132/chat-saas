import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";
import { instagramSyncPool, messengerSyncPool } from "./channelSyncPools";

/** Matches initial connect backfill; re-sync uses the same Graph list window. */
const META_SYNC_CONVERSATIONS_LIMIT = 10;

const serviceValidator = v.union(
  v.literal("whatsapp"),
  v.literal("instagram"),
  v.literal("messenger"),
);

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("connected"),
  v.literal("disconnected"),
  v.literal("error"),
);

// Returns every channel row (any status) for the caller's org.
// Used by the Channels page to render both connected and pending/error rows.
export const listForCurrentOrg = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await getAuthContext(ctx);
    if (orgId === "personal" || !orgId) return [];
    return await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) => q.eq("orgId", orgId))
      .collect();
  },
});

// Returns only currently-connected channel rows. Used by the Chats page to
// decide whether to render the "no channels connected" empty state.
export const getConnectedForCurrentOrg = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await getAuthContext(ctx);
    if (orgId === "personal" || !orgId) return [];
    const rows = await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) => q.eq("orgId", orgId))
      .collect();
    return rows.filter((r) => r.status === "connected");
  },
});

// Disconnect a channel. Flips status to "disconnected" and clears the access
// token so we can never accidentally call Graph after the user revokes.
export const disconnect = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (channel === null || channel.orgId !== orgId) {
      throw new Error("Channel not found");
    }
    await ctx.db.patch(args.channelId, {
      status: "disconnected",
      accessToken: undefined,
      tokenExpiresAt: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Enqueues Meta conversation list + per-conversation hydrate on the platform
// workpool (same pipeline as post-connect backfill). Instagram and Messenger only.
export const enqueueSyncConversations = action({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    if (!orgId) {
      throw new Error("Organization required");
    }
    const channel = await ctx.runQuery(internal.channels.internalGetChannel, {
      channelId: args.channelId,
    });
    if (channel === null || channel.orgId !== orgId) {
      throw new Error("Channel not found");
    }
    if (channel.status !== "connected") {
      throw new Error("Channel is not connected");
    }
    if (channel.service === "instagram") {
      console.log('enqueueing instagram sync');
      await instagramSyncPool.enqueueAction(
        ctx,
        internal.instagramSync.backfillConversations,
        {
          channelId: args.channelId,
          limit: META_SYNC_CONVERSATIONS_LIMIT,
        },
      );
      return null;
    }
    if (channel.service === "messenger") {
      await messengerSyncPool.enqueueAction(
        ctx,
        internal.messengerSync.backfillConversations,
        {
          channelId: args.channelId,
          limit: META_SYNC_CONVERSATIONS_LIMIT,
        },
      );
      return null;
    }
    throw new Error("Sync is only available for Instagram and Messenger");
  },
});

// Called from convex/whatsappEmbeddedSignup.ts after the Graph API setup
// succeeds. Inserts a fresh row or updates the existing per-(org, service)
// row in place so reconnecting a number does not orphan data.
export const internalUpsertWhatsApp = internalMutation({
  args: {
    orgId: v.string(),
    wabaId: v.string(),
    phoneNumberId: v.string(),
    displayPhoneNumber: v.optional(v.string()),
    accessToken: v.string(),
    tokenExpiresAt: v.optional(v.number()),
    connectedByUserId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"channels">> => {
    return await upsertWhatsAppChannel(ctx, args);
  },
});

async function upsertWhatsAppChannel(
  ctx: MutationCtx,
  args: {
    orgId: string;
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber?: string;
    accessToken: string;
    tokenExpiresAt?: number;
    connectedByUserId: string;
  },
): Promise<Id<"channels">> {
  const now = Date.now();
  const existing = await ctx.db
    .query("channels")
    .withIndex("by_orgId_and_service", (q) =>
      q.eq("orgId", args.orgId).eq("service", "whatsapp"),
    )
    .unique();

  const patch = {
    wabaId: args.wabaId,
    phoneNumberId: args.phoneNumberId,
    displayPhoneNumber: args.displayPhoneNumber,
    accessToken: args.accessToken,
    tokenExpiresAt: args.tokenExpiresAt,
    status: "connected" as const,
    progressStep: undefined,
    lastError: undefined,
    updatedAt: now,
  };

  if (existing === null) {
    return await ctx.db.insert("channels", {
      orgId: args.orgId,
      service: "whatsapp",
      ...patch,
      connectedByUserId: args.connectedByUserId,
      createdAt: now,
    });
  }
  await ctx.db.patch(existing._id, {
    ...patch,
    connectedByUserId: args.connectedByUserId,
  });
  return existing._id;
}

// Called at the very start of completeSignup so the UI has a row to subscribe
// to while the Graph calls run. Creates a placeholder row in `pending` status
// (or resets the existing one) and seeds `progressStep: "linking"` so the
// connecting dialog renders the first step immediately.
export const internalStartPending = internalMutation({
  args: {
    orgId: v.string(),
    wabaId: v.string(),
    phoneNumberId: v.string(),
    connectedByUserId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"channels">> => {
    const now = Date.now();
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) =>
        q.eq("orgId", args.orgId).eq("service", "whatsapp"),
      )
      .unique();
    if (existing === null) {
      return await ctx.db.insert("channels", {
        orgId: args.orgId,
        service: "whatsapp",
        wabaId: args.wabaId,
        phoneNumberId: args.phoneNumberId,
        status: "pending",
        progressStep: "linking",
        connectedByUserId: args.connectedByUserId,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch(existing._id, {
      wabaId: args.wabaId,
      phoneNumberId: args.phoneNumberId,
      status: "pending",
      progressStep: "linking",
      lastError: undefined,
      connectedByUserId: args.connectedByUserId,
      updatedAt: now,
    });
    return existing._id;
  },
});

// Patches just the progressStep on the existing channel row. Used between
// each Graph call in completeSignup so the live `Shimmer` label can advance.
// Service is explicit so a single helper can drive every channel kind.
export const internalSetProgress = internalMutation({
  args: {
    orgId: v.string(),
    service: serviceValidator,
    progressStep: v.union(
      v.literal("linking"),
      v.literal("subscribing"),
      v.literal("registering"),
      v.literal("exchanging"),
      v.literal("backfilling"),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) =>
        q.eq("orgId", args.orgId).eq("service", args.service),
      )
      .unique();
    if (existing === null) return;
    await ctx.db.patch(existing._id, {
      progressStep: args.progressStep,
      updatedAt: Date.now(),
    });
  },
});

// Records an error against a channel row so the UI can surface it. If no row
// exists yet (the user clicked Connect but the Graph round-trip failed before
// we got a wabaId), we create a placeholder pending row.
export const internalRecordError = internalMutation({
  args: {
    orgId: v.string(),
    service: serviceValidator,
    error: v.string(),
    connectedByUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) =>
        q.eq("orgId", args.orgId).eq("service", args.service),
      )
      .unique();
    if (existing === null) {
      await ctx.db.insert("channels", {
        orgId: args.orgId,
        service: args.service,
        status: "error",
        lastError: args.error,
        connectedByUserId: args.connectedByUserId,
        createdAt: now,
        updatedAt: now,
      });
      return;
    }
    await ctx.db.patch(existing._id, {
      status: "error",
      lastError: args.error,
      updatedAt: now,
    });
  },
});

// ──────────────────────────────────────────────────────────────────────────
// Instagram
// ──────────────────────────────────────────────────────────────────────────

// Insert (or patch) a pending Instagram channel row right before we kick off
// the OAuth code → token exchange, so the UI can subscribe to progressStep.
export const internalStartInstagramPending = internalMutation({
  args: {
    orgId: v.string(),
    connectedByUserId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"channels">> => {
    const now = Date.now();
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) =>
        q.eq("orgId", args.orgId).eq("service", "instagram"),
      )
      .unique();
    if (existing === null) {
      return await ctx.db.insert("channels", {
        orgId: args.orgId,
        service: "instagram",
        status: "pending",
        progressStep: "exchanging",
        connectedByUserId: args.connectedByUserId,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch(existing._id, {
      status: "pending",
      progressStep: "exchanging",
      lastError: undefined,
      connectedByUserId: args.connectedByUserId,
      updatedAt: now,
    });
    return existing._id;
  },
});

// Promote the pending Instagram row to `connected` with the long-lived token,
// IG user id, and handle. Mirrors `internalUpsertWhatsApp`.
export const internalUpsertInstagram = internalMutation({
  args: {
    orgId: v.string(),
    igUserId: v.string(),
    displayUsername: v.optional(v.string()),
    accessToken: v.string(),
    tokenExpiresAt: v.optional(v.number()),
    connectedByUserId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"channels">> => {
    const now = Date.now();
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) =>
        q.eq("orgId", args.orgId).eq("service", "instagram"),
      )
      .unique();

    const patch = {
      igUserId: args.igUserId,
      displayUsername: args.displayUsername,
      accessToken: args.accessToken,
      tokenExpiresAt: args.tokenExpiresAt,
      status: "connected" as const,
      progressStep: undefined,
      lastError: undefined,
      updatedAt: now,
    };

    if (existing === null) {
      return await ctx.db.insert("channels", {
        orgId: args.orgId,
        service: "instagram",
        ...patch,
        connectedByUserId: args.connectedByUserId,
        createdAt: now,
      });
    }
    await ctx.db.patch(existing._id, {
      ...patch,
      connectedByUserId: args.connectedByUserId,
    });
    return existing._id;
  },
});

// Patch just the token + expiry on an existing Instagram row. Used by the
// 60-day refresh cron so we never have to touch unrelated fields.
export const internalUpdateInstagramToken = internalMutation({
  args: {
    channelId: v.id("channels"),
    accessToken: v.string(),
    tokenExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.channelId, {
      accessToken: args.accessToken,
      tokenExpiresAt: args.tokenExpiresAt,
      updatedAt: Date.now(),
    });
  },
});

// Returns Instagram channels whose token expires before `now + withinMs`.
// Used by the refresh cron to enqueue per-channel refresh actions.
export const internalGetExpiringInstagramTokens = internalQuery({
  args: { withinMs: v.number() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() + args.withinMs;
    // We expect very few Instagram channels per deployment, so a small
    // full-table scan is fine — the schema does not currently index
    // tokenExpiresAt, and adding an index for a once-a-day cron would be
    // premature.
    const rows = await ctx.db.query("channels").collect();
    return rows.filter(
      (r) =>
        r.service === "instagram" &&
        r.status === "connected" &&
        typeof r.tokenExpiresAt === "number" &&
        r.tokenExpiresAt < cutoff,
    );
  },
});

// ──────────────────────────────────────────────────────────────────────────
// Messenger
// ──────────────────────────────────────────────────────────────────────────

// Insert (or patch) a pending Messenger channel row before we run the
// FB Login for Business code exchange. Same role as the Instagram variant.
export const internalStartMessengerPending = internalMutation({
  args: {
    orgId: v.string(),
    connectedByUserId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"channels">> => {
    const now = Date.now();
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) =>
        q.eq("orgId", args.orgId).eq("service", "messenger"),
      )
      .unique();
    if (existing === null) {
      return await ctx.db.insert("channels", {
        orgId: args.orgId,
        service: "messenger",
        status: "pending",
        progressStep: "exchanging",
        connectedByUserId: args.connectedByUserId,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch(existing._id, {
      status: "pending",
      progressStep: "exchanging",
      lastError: undefined,
      connectedByUserId: args.connectedByUserId,
      updatedAt: now,
    });
    return existing._id;
  },
});

// Promote the pending Messenger row to `connected` with the long-lived Page
// access token + Page id + Page name. No `tokenExpiresAt` is stored because
// FB Login for Business issues long-lived Page tokens that never expire.
// `fbUserId` is the Facebook user id of the connecting account — captured
// from /me?fields=id and stored so the deauthorize / data-deletion
// callbacks can resolve which channel row(s) to disconnect.
export const internalUpsertMessenger = internalMutation({
  args: {
    orgId: v.string(),
    pageId: v.string(),
    fbUserId: v.optional(v.string()),
    displayUsername: v.optional(v.string()),
    accessToken: v.string(),
    connectedByUserId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"channels">> => {
    const now = Date.now();
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) =>
        q.eq("orgId", args.orgId).eq("service", "messenger"),
      )
      .unique();

    const patch = {
      pageId: args.pageId,
      fbUserId: args.fbUserId,
      displayUsername: args.displayUsername,
      accessToken: args.accessToken,
      tokenExpiresAt: undefined,
      status: "connected" as const,
      progressStep: undefined,
      lastError: undefined,
      updatedAt: now,
    };

    if (existing === null) {
      return await ctx.db.insert("channels", {
        orgId: args.orgId,
        service: "messenger",
        ...patch,
        connectedByUserId: args.connectedByUserId,
        createdAt: now,
      });
    }
    await ctx.db.patch(existing._id, {
      ...patch,
      connectedByUserId: args.connectedByUserId,
    });
    return existing._id;
  },
});

// ──────────────────────────────────────────────────────────────────────────
// Shared lookups used by webhook + sync workers
// ──────────────────────────────────────────────────────────────────────────

// Webhook lookup: find the channel row for an Instagram-scoped user id.
export const internalGetChannelByIgUserId = internalQuery({
  args: { igUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("channels")
      .withIndex("by_igUserId", (q) => q.eq("igUserId", args.igUserId))
      .unique();
  },
});

// Webhook lookup: find the channel row for a Facebook Page id.
export const internalGetChannelByPageId = internalQuery({
  args: { pageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("channels")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId))
      .unique();
  },
});

// Internal accessor used by sync actions to retrieve the persisted access
// token (kept off the public API surface).
export const internalGetChannel = internalQuery({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.channelId);
  },
});

// ──────────────────────────────────────────────────────────────────────────
// Deauthorize / data-deletion helpers
//
// Meta delivers Deauthorize and Data Deletion callbacks at the
// IG-user / FB-user level. The HTTP routes verify the signed_request, then
// hand the user id to one of these mutations to drop access tokens for
// every affected channel row. Per product decision: we keep conversations
// and messages — only the channel link is severed and the token cleared so
// no further Graph calls can be made on that user's behalf.
// ──────────────────────────────────────────────────────────────────────────

async function disconnectChannelRow(
  ctx: MutationCtx,
  channelId: Id<"channels">,
) {
  await ctx.db.patch(channelId, {
    status: "disconnected",
    accessToken: undefined,
    tokenExpiresAt: undefined,
    lastError: undefined,
    progressStep: undefined,
    updatedAt: Date.now(),
  });
}

export const internalDisconnectByIgUserId = internalMutation({
  args: { igUserId: v.string() },
  handler: async (ctx, args): Promise<Array<Id<"channels">>> => {
    const rows = await ctx.db
      .query("channels")
      .withIndex("by_igUserId", (q) => q.eq("igUserId", args.igUserId))
      .collect();
    for (const row of rows) {
      await disconnectChannelRow(ctx, row._id);
    }
    return rows.map((r) => r._id);
  },
});

export const internalDisconnectByFbUserId = internalMutation({
  args: { fbUserId: v.string() },
  handler: async (ctx, args): Promise<Array<Id<"channels">>> => {
    const rows = await ctx.db
      .query("channels")
      .withIndex("by_fbUserId", (q) => q.eq("fbUserId", args.fbUserId))
      .collect();
    for (const row of rows) {
      await disconnectChannelRow(ctx, row._id);
    }
    return rows.map((r) => r._id);
  },
});

export { statusValidator };
