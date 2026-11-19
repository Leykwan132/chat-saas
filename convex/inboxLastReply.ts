import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

export const lastReplyAuthorValidator = v.union(
  v.object({ kind: v.literal("ai"), name: v.string() }),
  v.object({ kind: v.literal("human"), name: v.string() }),
  v.object({ kind: v.literal("automation"), name: v.string() }),
  v.null(),
);

export async function getInboxLastReplyAuthor(
  ctx: QueryCtx,
  conversationId: Id<"conversations">,
) {
  const replies = await Promise.all(
    ([undefined, "sent", "delivered", "read"] as const).map((status) =>
      ctx.db
        .query("messages")
        .withIndex("by_conversation_reply_status", (q) =>
          q
            .eq("conversationId", conversationId)
            .eq("direction", "outgoing")
            .eq("status", status)
            .eq("revokedAt", undefined),
        )
        .order("desc")
        .first(),
    ),
  );
  const reply = replies
    .filter((reply) => reply !== null)
    .sort(
      (a, b) => b.createdAt - a.createdAt || b._creationTime - a._creationTime,
    )[0];
  if (!reply) return null;
  if (reply.authorUserId) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) =>
        q.eq("workosUserId", reply.authorUserId!),
      )
      .unique();
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
    return { kind: "human" as const, name: name || "Team" };
  }
  if (reply.agentId) return { kind: "ai" as const, name: "AI" };
  if (reply.workflowAutomationSource)
    return { kind: "automation" as const, name: "Automation" };
  return null;
}
