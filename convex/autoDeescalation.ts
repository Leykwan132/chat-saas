import { v } from "convex/values";
import { internalMutation } from "./triggers";
import { expireTimer, processHumanReply as processReply } from "./autoDeescalationRuntime";

export const expire = internalMutation({
  args: { timerId: v.id("autoDeescalationTimers"), revision: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await expireTimer(ctx, args.timerId, args.revision);
    return null;
  },
});

export const processHumanReply = internalMutation({
  args: { messageId: v.id("messages"), timerId: v.id("autoDeescalationTimers"), sentAt: v.number(), activationRevision: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await processReply(ctx, args.messageId, args.timerId, args.sentAt, args.activationRevision);
    return null;
  },
});
