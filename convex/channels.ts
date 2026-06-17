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
import { getAuthContext, resolveChannelOrgId } from "./authUtils";
import { instagramSyncPool, messengerSyncPool } from "./channelSyncPools";
import { checkPlatformSupport, getPlanFromStripe, getChannelLimitForOrg } from "./plans";
import {
  isDemoInboxChannel,
  WHATSAPP_DEMO_PHONE_NUMBER_ID,
} from "./whatsappDemo";

async function enforceChannelLimit(
  ctx: MutationCtx,
  orgId: string,
  connectedByUserId: string,
  incomingChannelId?: Id<"channels">,
) {
  const limit = await getChannelLimitForOrg(ctx, orgId, connectedByUserId);
  const currentChannels = await ctx.db
    .query("channels")
    .withIndex("by_orgId_and_service", (q) => q.eq("orgId", orgId))
    .collect();
  
  const activeChannels = currentChannels.filter(
    (c) => c.status !== "disconnected" && c._id !== incomingChannelId
  );
  
  if (activeChannels.length >= limit) {
    throw new Error(`Channel limit reached. Your plan allows up to ${limit} channel(s).`);
  }
}

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

export const listForCurrentOrg = query({
  args: {},
  handler: async (ctx) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) => q.eq("orgId", channelOrgId))
      .collect();

    const visibleChannels = channels.filter((channel) => !isDemoInboxChannel(channel));

    return await Promise.all(
      visibleChannels.map(async (channel) => {
        const conversations = await ctx.db
          .query("conversations")
          .withIndex("by_channel_and_contactAddress", (q) => q.eq("channelId", channel._id))
          .collect();
        return {
          ...channel,
          conversationCount: conversations.length,
        };
      })
    );
  },
});

export const setDefaultAgentId = mutation({
  args: {
    channelId: v.id("channels"),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);
    const channel = await ctx.db.get(args.channelId);
    if (channel === null || channel.orgId !== channelOrgId) {
      throw new Error("Channel not found");
    }
    const agent = await ctx.db.get(args.agentId);
    if (agent === null || agent.orgId !== channelOrgId) {
      throw new Error("Agent not found");
    }
    await ctx.db.patch(args.channelId, {
      defaultAgentId: args.agentId,
      updatedAt: Date.now(),
    });
  },
});

export const ensureDefaultAgentId = mutation({
  args: {
    channelId: v.id("channels"),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);
    const channel = await ctx.db.get(args.channelId);
    if (channel === null || channel.orgId !== channelOrgId) {
      return;
    }
    if (channel.defaultAgentId !== undefined) {
      return;
    }
    const agent = await ctx.db.get(args.agentId);
    if (agent === null || agent.orgId !== channelOrgId) {
      return;
    }
    await ctx.db.patch(args.channelId, {
      defaultAgentId: args.agentId,
      updatedAt: Date.now(),
    });
  },
});

// Returns only currently-connected channel rows. Used by the Chats page to
// decide whether to render the "no channels connected" empty state.
export const getConnectedForCurrentOrg = query({
  args: {},
  handler: async (ctx) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);
    const rows = await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) => q.eq("orgId", channelOrgId))
      .collect();
    return rows.filter((r) => r.status === "connected" && !isDemoInboxChannel(r));
  },
});

// Disconnect a channel. Flips status to "disconnected" and clears the access
// token so we can never accidentally call Graph after the user revokes.
export const disconnect = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);
    const channel = await ctx.db.get(args.channelId);
    if (channel === null || channel.orgId !== channelOrgId) {
      throw new Error("Channel not found");
    }
    await cleanupChannelData(ctx, args.channelId);

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
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);
    const channel = await ctx.runQuery(internal.channels.internalGetChannel, {
      channelId: args.channelId,
    });
    if (channel === null || channel.orgId !== channelOrgId) {
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
  const channels = await ctx.db
    .query("channels")
    .withIndex("by_phoneNumberId", (q) => q.eq("phoneNumberId", args.phoneNumberId))
    .collect();
  const existing = channels.find((c) => c.orgId === args.orgId) ?? null;

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
    const stripeInfo = await getPlanFromStripe(ctx, args.connectedByUserId);
    if (!checkPlatformSupport(stripeInfo.plan, "whatsapp")) {
      throw new Error(`WhatsApp is not supported on the ${stripeInfo.plan} plan.`);
    }
    const now = Date.now();
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_phoneNumberId", (q) => q.eq("phoneNumberId", args.phoneNumberId))
      .collect();

    const isDemo = args.phoneNumberId === WHATSAPP_DEMO_PHONE_NUMBER_ID;
    const existing = channels.find((c) => c.orgId === args.orgId) ?? null;

    if (!isDemo) {
      const otherConnected = channels.find((c) => c.orgId !== args.orgId && c.status !== "disconnected");
      if (otherConnected) {
        throw new Error("This WhatsApp phone number is already connected to another workspace.");
      }
    }

    if (existing !== null && existing.status !== "disconnected") {
      if (existing.status === "connected") {
        throw new Error("This WhatsApp phone number is already connected to this workspace.");
      }
    }
    
    if (existing === null) {
      await enforceChannelLimit(ctx, args.orgId, args.connectedByUserId);
    } else if (existing.status === "disconnected") {
      await enforceChannelLimit(ctx, args.orgId, args.connectedByUserId, existing._id);
    }

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
      orgId: args.orgId,
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
    igUserId: v.optional(v.string()),
    pageId: v.optional(v.string()),
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let existing = null;
    if (args.igUserId) {
      existing = await ctx.db
        .query("channels")
        .withIndex("by_igUserId", (q) => q.eq("igUserId", args.igUserId!))
        .unique();
    } else if (args.pageId) {
      existing = await ctx.db
        .query("channels")
        .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId!))
        .unique();
    } else if (args.phoneNumberId) {
      const channels = await ctx.db
        .query("channels")
        .withIndex("by_phoneNumberId", (q) => q.eq("phoneNumberId", args.phoneNumberId!))
        .collect();
      existing = channels.find((c) => c.orgId === args.orgId) ?? null;
    } else {
      existing = await ctx.db
        .query("channels")
        .withIndex("by_orgId_and_service", (q) =>
          q.eq("orgId", args.orgId).eq("service", args.service),
        )
        .unique();
    }
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
    igUserId: v.optional(v.string()),
    pageId: v.optional(v.string()),
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let existing = null;
    if (args.igUserId) {
      existing = await ctx.db
        .query("channels")
        .withIndex("by_igUserId", (q) => q.eq("igUserId", args.igUserId!))
        .unique();
    } else if (args.pageId) {
      existing = await ctx.db
        .query("channels")
        .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId!))
        .unique();
    } else if (args.phoneNumberId) {
      const channels = await ctx.db
        .query("channels")
        .withIndex("by_phoneNumberId", (q) => q.eq("phoneNumberId", args.phoneNumberId!))
        .collect();
      existing = channels.find((c) => c.orgId === args.orgId) ?? null;
    } else {
      existing = await ctx.db
        .query("channels")
        .withIndex("by_orgId_and_service", (q) =>
          q.eq("orgId", args.orgId).eq("service", args.service),
        )
        .unique();
    }
    
    if (existing === null) {
      await ctx.db.insert("channels", {
        orgId: args.orgId,
        service: args.service,
        igUserId: args.igUserId,
        pageId: args.pageId,
        phoneNumberId: args.phoneNumberId,
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
    igUserId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"channels">> => {
    const stripeInfo = await getPlanFromStripe(ctx, args.connectedByUserId);
    if (!checkPlatformSupport(stripeInfo.plan, "instagram")) {
      throw new Error(`Instagram is not supported on the ${stripeInfo.plan} plan.`);
    }
    const now = Date.now();
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_igUserId", (q) => q.eq("igUserId", args.igUserId))
      .unique();

    if (existing !== null && existing.status !== "disconnected") {
      if (existing.orgId !== args.orgId) {
        throw new Error("This Instagram account is already connected to another workspace.");
      }
      if (existing.status === "connected") {
        throw new Error("This Instagram account is already connected to this workspace.");
      }
    }
    
    if (existing === null) {
      await enforceChannelLimit(ctx, args.orgId, args.connectedByUserId);
    } else if (existing.status === "disconnected") {
      await enforceChannelLimit(ctx, args.orgId, args.connectedByUserId, existing._id);
    }

    if (existing === null) {
      return await ctx.db.insert("channels", {
        orgId: args.orgId,
        service: "instagram",
        igUserId: args.igUserId,
        status: "pending",
        progressStep: "exchanging",
        connectedByUserId: args.connectedByUserId,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch(existing._id, {
      orgId: args.orgId,
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
      .withIndex("by_igUserId", (q) => q.eq("igUserId", args.igUserId))
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
      orgId: args.orgId,
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
    pageId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"channels">> => {
    const stripeInfo = await getPlanFromStripe(ctx, args.connectedByUserId);
    if (!checkPlatformSupport(stripeInfo.plan, "messenger")) {
      throw new Error(`Messenger is not supported on the ${stripeInfo.plan} plan.`);
    }
    const now = Date.now();
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId))
      .unique();

    if (existing !== null && existing.status !== "disconnected") {
      if (existing.orgId !== args.orgId) {
        throw new Error("This Facebook Page is already connected to another workspace.");
      }
      if (existing.status === "connected") {
        throw new Error("This Facebook Page is already connected to this workspace.");
      }
    }
    
    if (existing === null) {
      await enforceChannelLimit(ctx, args.orgId, args.connectedByUserId);
    } else if (existing.status === "disconnected") {
      await enforceChannelLimit(ctx, args.orgId, args.connectedByUserId, existing._id);
    }

    if (existing === null) {
      return await ctx.db.insert("channels", {
        orgId: args.orgId,
        service: "messenger",
        pageId: args.pageId,
        status: "pending",
        progressStep: "exchanging",
        connectedByUserId: args.connectedByUserId,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch(existing._id, {
      orgId: args.orgId,
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
      .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId))
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
      orgId: args.orgId,
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

export const internalGetChannelByPhoneNumberId = internalQuery({
  args: { phoneNumberId: v.string(), contactAddress: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_phoneNumberId", (q) =>
        q.eq("phoneNumberId", args.phoneNumberId),
      )
      .collect();

    if (channels.length === 0) {
      return null;
    }
    if (channels.length === 1) {
      return channels[0];
    }

    if (args.contactAddress) {
      for (const channel of channels) {
        const conversation = await ctx.db
          .query("conversations")
          .withIndex("by_channel_and_contactAddress", (q) =>
            q.eq("channelId", channel._id).eq("contactAddress", args.contactAddress!),
          )
          .unique();
        if (conversation !== null) {
          return channel;
        }
      }
    }

    return channels.find((c) => c.status === "connected") ?? channels[0];
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

async function cleanupChannelData(
  ctx: MutationCtx,
  channelId: Id<"channels">,
) {
  const conversations = await ctx.db
    .query("conversations")
    .withIndex("by_channel_and_contactAddress", (q) =>
      q.eq("channelId", channelId),
    )
    .collect();

  for (const conv of conversations) {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", conv._id),
      )
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
    await ctx.db.delete(conv._id);
  }
}

async function disconnectChannelRow(
  ctx: MutationCtx,
  channelId: Id<"channels">,
) {
  await cleanupChannelData(ctx, channelId);

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
