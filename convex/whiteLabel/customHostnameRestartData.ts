import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

const restartDomainValidator = v.object({
  domainId: v.id("whiteLabelPartnerDomains"),
  cloudflareHostnameId: v.optional(v.string()),
});

export const getPartnerDomainForRestart = internalQuery({
  args: { partnerId: v.id("whiteLabelPartners") },
  returns: v.union(restartDomainValidator, v.null()),
  handler: async (ctx, args) => {
    const domain = await ctx.db
      .query("whiteLabelPartnerDomains")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", args.partnerId))
      .unique();
    if (domain === null) return null;
    return {
      domainId: domain._id,
      cloudflareHostnameId: domain.cloudflareHostnameId,
    };
  },
});

export const removePartnerDomain = internalMutation({
  args: {
    partnerId: v.id("whiteLabelPartners"),
    domainId: v.id("whiteLabelPartnerDomains"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.domainId);
    if (domain === null || domain.partnerId !== args.partnerId) {
      throw new Error("Custom hostname not found.");
    }
    await ctx.db.delete(domain._id);
    return null;
  },
});
