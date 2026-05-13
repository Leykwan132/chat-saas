import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { generateCsrfToken, sanitizeReturnPath } from "./oauthShared";

const SESSION_TTL_MS = 10 * 60 * 1000;

const serviceValidator = v.union(
  v.literal("instagram"),
  v.literal("messenger"),
);

export const internalCreate = internalMutation({
  args: {
    csrf: v.string(),
    service: serviceValidator,
    orgId: v.string(),
    userId: v.string(),
    returnPath: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("oauthSessions", {
      csrf: args.csrf,
      service: args.service,
      orgId: args.orgId,
      userId: args.userId,
      returnPath: args.returnPath,
      expiresAt: Date.now() + SESSION_TTL_MS,
      consumed: false,
    });
  },
});

/**
 * After Messenger Embedded Signup (`FB.login` + `config_id`) the user token
 * cannot be returned to the client when multiple Pages exist — we persist it
 * until `messengerAuth.finalizePick` (same as redirect-flow picker).
 */
export const internalCreateMessengerPickerHold = internalMutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    userAccessToken: v.string(),
    returnPath: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"oauthSessions">> => {
    const returnPath = sanitizeReturnPath(args.returnPath);
    return await ctx.db.insert("oauthSessions", {
      csrf: generateCsrfToken(),
      service: "messenger",
      orgId: args.orgId,
      userId: args.userId,
      returnPath,
      expiresAt: Date.now() + SESSION_TTL_MS,
      consumed: false,
      pendingUserAccessToken: args.userAccessToken,
    });
  },
});

export const internalGetByCsrf = internalQuery({
  args: { csrf: v.string() },
  handler: async (ctx, args): Promise<Doc<"oauthSessions"> | null> => {
    return await ctx.db
      .query("oauthSessions")
      .withIndex("by_csrf", (q) => q.eq("csrf", args.csrf))
      .unique();
  },
});

export const internalGetById = internalQuery({
  args: { sessionId: v.id("oauthSessions") },
  handler: async (ctx, args): Promise<Doc<"oauthSessions"> | null> => {
    return await ctx.db.get(args.sessionId);
  },
});

export const internalSetPendingUserToken = internalMutation({
  args: {
    sessionId: v.id("oauthSessions"),
    userAccessToken: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      pendingUserAccessToken: args.userAccessToken,
    });
  },
});

export const internalMarkConsumed = internalMutation({
  args: { csrf: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("oauthSessions")
      .withIndex("by_csrf", (q) => q.eq("csrf", args.csrf))
      .unique();
    if (row === null) return;
    await ctx.db.patch(row._id, {
      consumed: true,
      pendingUserAccessToken: undefined,
    });
  },
});

export const internalMarkConsumedById = internalMutation({
  args: { sessionId: v.id("oauthSessions") },
  handler: async (ctx, args: { sessionId: Id<"oauthSessions"> }) => {
    await ctx.db.patch(args.sessionId, {
      consumed: true,
      pendingUserAccessToken: undefined,
    });
  },
});
