import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthContext } from "./authUtils";
import { getPublicMediaUrl } from "./media/r2";
import { mediaDeletePool } from "./mediaPools";
import { internal } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { activeTeamId } = await getAuthContext(ctx);
    if (!activeTeamId) {
      return [];
    }

    const replies = await ctx.db
      .query("quickReplies")
      .withIndex("by_teamId", (q) => q.eq("teamId", activeTeamId))
      .collect();

    return replies.map((reply) => {
      const imageUrls: string[] = [];
      if (reply.r2Keys && reply.r2Keys.length > 0) {
        for (const key of reply.r2Keys) {
          imageUrls.push(getPublicMediaUrl(key));
        }
      } else if (reply.r2Key) {
        imageUrls.push(getPublicMediaUrl(reply.r2Key));
      }
      return {
        ...reply,
        imageUrl: imageUrls[0] ?? undefined,
        imageUrls,
      };
    });
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    text: v.string(),
    imageClientIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);

    const membership = await ctx.db
      .query("teamMemberships")
      .withIndex("by_userId_and_teamId", (q) =>
        q.eq("userId", auth.userDbId).eq("teamId", auth.activeTeamId)
      )
      .unique();
    if (membership === null || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Only admins or owners can manage quick replies");
    }

    const title = args.title.trim();
    const text = args.text.trim();
    if (!title) {
      throw new Error("Title is required");
    }
    if (!text) {
      throw new Error("Text is required");
    }

    const r2Keys: string[] = [];
    if (args.imageClientIds && args.imageClientIds.length > 0) {
      for (const clientId of args.imageClientIds) {
        const uploadRow = await ctx.db
          .query("mediaUploads")
          .withIndex("by_orgId_userId_clientId", (q) =>
            q
              .eq("orgId", auth.orgId)
              .eq("userId", auth.userId)
              .eq("clientId", clientId)
          )
          .unique();

        if (uploadRow && uploadRow.status === "ready" && uploadRow.r2Key) {
          r2Keys.push(uploadRow.r2Key);
        }
      }
    }

    const now = Date.now();
    return await ctx.db.insert("quickReplies", {
      teamId: auth.activeTeamId,
      title,
      text,
      r2Key: r2Keys[0] ?? undefined,
      r2Keys: r2Keys.length > 0 ? r2Keys : undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("quickReplies"),
    title: v.optional(v.string()),
    text: v.optional(v.string()),
    imageClientIds: v.optional(v.array(v.string())),
    r2Keys: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const reply = await ctx.db.get(args.id);
    if (reply === null || reply.teamId !== auth.activeTeamId) {
      throw new Error("Quick reply not found");
    }

    const membership = await ctx.db
      .query("teamMemberships")
      .withIndex("by_userId_and_teamId", (q) =>
        q.eq("userId", auth.userDbId).eq("teamId", auth.activeTeamId)
      )
      .unique();
    if (membership === null || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Only admins or owners can manage quick replies");
    }

    const patch: Record<string, any> = { updatedAt: Date.now() };

    if (args.title !== undefined) {
      const title = args.title.trim();
      if (!title) throw new Error("Title cannot be empty");
      patch.title = title;
    }

    if (args.text !== undefined) {
      const text = args.text.trim();
      if (!text) throw new Error("Text cannot be empty");
      patch.text = text;
    }

    if (args.imageClientIds !== undefined || args.r2Keys !== undefined) {
      const nextR2Keys: string[] = [];

      if (args.r2Keys) {
        nextR2Keys.push(...args.r2Keys);
      }

      if (args.imageClientIds) {
        for (const clientId of args.imageClientIds) {
          const uploadRow = await ctx.db
            .query("mediaUploads")
            .withIndex("by_orgId_userId_clientId", (q) =>
              q
                .eq("orgId", auth.orgId)
                .eq("userId", auth.userId)
                .eq("clientId", clientId)
            )
            .unique();

          if (uploadRow && uploadRow.status === "ready" && uploadRow.r2Key) {
            nextR2Keys.push(uploadRow.r2Key);
          }
        }
      }

      // Track old keys to see which ones are deleted
      const oldKeys = new Set<string>();
      if (reply.r2Key) oldKeys.add(reply.r2Key);
      if (reply.r2Keys) {
        for (const k of reply.r2Keys) {
          oldKeys.add(k);
        }
      }

      const nextKeysSet = new Set(nextR2Keys);
      for (const k of oldKeys) {
        if (!nextKeysSet.has(k)) {
          await mediaDeletePool.enqueueAction(
            ctx,
            internal.workpool.mediaDeleteWorker,
            { r2Key: k },
            { retry: true }
          );
        }
      }

      patch.r2Keys = nextR2Keys.length > 0 ? nextR2Keys : undefined;
      patch.r2Key = nextR2Keys.length > 0 ? nextR2Keys[0] : undefined;
    }

    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("quickReplies") },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const reply = await ctx.db.get(args.id);
    if (reply === null || reply.teamId !== auth.activeTeamId) {
      throw new Error("Quick reply not found");
    }

    const membership = await ctx.db
      .query("teamMemberships")
      .withIndex("by_userId_and_teamId", (q) =>
        q.eq("userId", auth.userDbId).eq("teamId", auth.activeTeamId)
      )
      .unique();
    if (membership === null || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Only admins or owners can manage quick replies");
    }

    const keysToDelete = new Set<string>();
    if (reply.r2Key) keysToDelete.add(reply.r2Key);
    if (reply.r2Keys) {
      for (const k of reply.r2Keys) {
        keysToDelete.add(k);
      }
    }

    for (const key of keysToDelete) {
      await mediaDeletePool.enqueueAction(
        ctx,
        internal.workpool.mediaDeleteWorker,
        { r2Key: key },
        { retry: true }
      );
    }

    await ctx.db.delete(args.id);
  },
});
