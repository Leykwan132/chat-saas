import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  assertCurrentPartnerAccess,
  assertPartnerOrganizationAccess,
} from "./access";
import { getAuthContext } from "../authUtils";

const modeValidator = v.union(v.literal("normal"), v.literal("focus"));

export const update = mutation({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    workosUserId: v.string(),
    interfaceMode: modeValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const access = await assertCurrentPartnerAccess(ctx);
    await assertPartnerOrganizationAccess(
      ctx,
      access.partner._id,
      args.partnerOrganizationId,
    );
    const account = await ctx.db
      .query("whiteLabelPartnerOrganizationAccounts")
      .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
        q
          .eq("partnerOrganizationId", args.partnerOrganizationId)
          .eq("workosUserId", args.workosUserId),
      )
      .unique();
    if (!account) throw new Error("Customer account not found.");
    await ctx.db.patch(account._id, {
      interfaceMode: args.interfaceMode,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const current = query({
  args: {},
  returns: v.object({
    interfaceMode: modeValidator,
    managed: v.boolean(),
    agentId: v.union(v.id("agents"), v.null()),
  }),
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);
    const organization = await ctx.db
      .query("whiteLabelPartnerOrganizations")
      .withIndex("by_teamId", (q) => q.eq("teamId", auth.activeTeamId))
      .unique();
    if (!organization || organization.status !== "active")
      return {
        interfaceMode: "normal" as const,
        managed: false,
        agentId: null,
      };
    const account = await ctx.db
      .query("whiteLabelPartnerOrganizationAccounts")
      .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
        q
          .eq("partnerOrganizationId", organization._id)
          .eq("workosUserId", auth.userId),
      )
      .unique();
    const interfaceMode = account?.interfaceMode ?? "normal";
    const agent =
      interfaceMode === "focus"
        ? await ctx.db
            .query("agents")
            .withIndex("by_orgId", (q) => q.eq("orgId", auth.orgId))
            .first()
        : null;
    return {
      interfaceMode,
      managed: account !== null,
      agentId: agent?._id ?? null,
    };
  },
});
