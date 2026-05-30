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
      let imageUrl: string | null = null;
      if (reply.r2Key) {
        imageUrl = getPublicMediaUrl(reply.r2Key);
      }
      return {
        ...reply,
        imageUrl: imageUrl ?? undefined,
      };
    });
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    text: v.string(),
    imageClientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const title = args.title.trim();
    const text = args.text.trim();
    if (!title) {
      throw new Error("Title is required");
    }
    if (!text) {
      throw new Error("Text is required");
    }

    let r2Key: string | undefined;
    if (args.imageClientId) {
      const uploadRow = await ctx.db
        .query("mediaUploads")
        .withIndex("by_orgId_userId_clientId", (q) =>
          q
            .eq("orgId", auth.orgId)
            .eq("userId", auth.userId)
            .eq("clientId", args.imageClientId!)
        )
        .unique();

      if (uploadRow && uploadRow.status === "ready" && uploadRow.r2Key) {
        r2Key = uploadRow.r2Key;
      }
    }

    const now = Date.now();
    return await ctx.db.insert("quickReplies", {
      teamId: auth.activeTeamId,
      title,
      text,
      r2Key,
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
    imageClientId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const reply = await ctx.db.get(args.id);
    if (reply === null || reply.teamId !== auth.activeTeamId) {
      throw new Error("Quick reply not found");
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

    if (args.imageClientId !== undefined) {
      if (args.imageClientId === null) {
        // Remove image
        if (reply.r2Key) {
          await mediaDeletePool.enqueueAction(
            ctx,
            internal.workpool.mediaDeleteWorker,
            { r2Key: reply.r2Key },
            { retry: true }
          );
        }
        patch.r2Key = undefined;
      } else {
        // Lookup new image
        const uploadRow = await ctx.db
          .query("mediaUploads")
          .withIndex("by_orgId_userId_clientId", (q) =>
            q
              .eq("orgId", auth.orgId)
              .eq("userId", auth.userId)
              .eq("clientId", args.imageClientId!)
          )
          .unique();

        if (!uploadRow || uploadRow.status !== "ready" || !uploadRow.r2Key) {
          throw new Error("Attached image is not uploaded or ready yet.");
        }

        // Delete old image if it exists
        if (reply.r2Key && reply.r2Key !== uploadRow.r2Key) {
          await mediaDeletePool.enqueueAction(
            ctx,
            internal.workpool.mediaDeleteWorker,
            { r2Key: reply.r2Key },
            { retry: true }
          );
        }
        patch.r2Key = uploadRow.r2Key;
      }
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

    if (reply.r2Key) {
      await mediaDeletePool.enqueueAction(
        ctx,
        internal.workpool.mediaDeleteWorker,
        { r2Key: reply.r2Key },
        { retry: true }
      );
    }

    await ctx.db.delete(args.id);
  },
});
