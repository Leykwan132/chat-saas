import { v } from "convex/values";
import { mutation } from "./triggers";
import { getAuthContext } from "./authUtils";
import { permissionsForCurrentUser } from "./appointmentBooking/access";
import { Permission } from "../shared/permissions";

export const setExcluded = mutation({
  args: {
    conversationId: v.id("conversations"),
    excluded: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (
      !conversation ||
      conversation.orgId !== orgId ||
      ((!orgId || orgId === "personal") && conversation.userId !== userId)
    )
      throw new Error("Conversation not found");
    const permissions = await permissionsForCurrentUser(ctx);
    if (!permissions.includes(Permission.CHATS_ASSIGN))
      throw new Error("Forbidden");
    await ctx.db.patch(args.conversationId, {
      excludeFromAiReplies: args.excluded,
      updatedAt: Date.now(),
    });
    return null;
  },
});
