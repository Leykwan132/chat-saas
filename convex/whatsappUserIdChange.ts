import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { customerSearchText } from "./customerSearch";

export const apply = internalMutation({
  args: {
    phoneNumberId: v.string(),
    previousUserId: v.string(),
    userId: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const previousUserId = args.previousUserId.trim();
    const userId = args.userId.trim();
    if (!previousUserId || !userId || previousUserId === userId) {
      return { updated: false };
    }

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_phoneNumberId", (q) =>
        q.eq("phoneNumberId", args.phoneNumberId),
      )
      .collect();
    const now = Date.now();
    const phone = args.phone?.trim() || undefined;

    for (const channel of channels) {
      if (channel.service !== "whatsapp") continue;
      const customerByUserId = await ctx.db
        .query("customers")
        .withIndex("by_orgId_and_service_and_whatsappUserId", (q) =>
          q
            .eq("orgId", channel.orgId)
            .eq("service", "whatsapp")
            .eq("whatsappUserId", previousUserId),
        )
        .unique();
      const customer =
        customerByUserId ??
        (await ctx.db
          .query("customers")
          .withIndex("by_orgId_and_service_and_contactAddress", (q) =>
            q
              .eq("orgId", channel.orgId)
              .eq("service", "whatsapp")
              .eq("contactAddress", previousUserId),
          )
          .unique());
      if (customer === null) continue;

      await ctx.db.patch(customer._id, {
        whatsappUserId: userId,
        contactAddress: userId,
        ...(phone ? { phone } : {}),
        searchText: customerSearchText({
          name: customer.name,
          email: customer.email,
          phone: phone ?? customer.phone,
          contactAddress: userId,
        }),
        updatedAt: now,
      });
      const conversations = await ctx.db
        .query("conversations")
        .withIndex("by_customerId", (q) => q.eq("customerId", customer._id))
        .collect();
      for (const conversation of conversations) {
        if (conversation.service !== "whatsapp") continue;
        await ctx.db.patch(conversation._id, {
          contactAddress: userId,
          updatedAt: now,
        });
      }
      return { updated: true };
    }

    return { updated: false };
  },
});
