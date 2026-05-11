import { v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";

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

// Patches just the progressStep on the existing whatsapp row. Used between
// each Graph call in completeSignup so the live `Shimmer` label can advance.
export const internalSetProgress = internalMutation({
  args: {
    orgId: v.string(),
    progressStep: v.union(
      v.literal("linking"),
      v.literal("subscribing"),
      v.literal("registering"),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) =>
        q.eq("orgId", args.orgId).eq("service", "whatsapp"),
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

// Webhook lookup: find the channel row for the WhatsApp business phone number
// the message was delivered to.
export { statusValidator };
