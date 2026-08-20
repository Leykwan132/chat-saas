import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { PLAN_CATALOG, type PlanKey } from "../planCatalog";
import {
  assertCurrentPartnerAccess,
  assertPartnerOrganizationAccess,
  getCurrentPartnerAccess,
} from "./access";
import {
  getPartnerCreditBalance,
  grantPartnerOrganizationCredits,
} from "./creditLedger";

const planKeyValidator = v.union(
  v.literal("free"),
  v.literal("starter"),
  v.literal("growth"),
  v.literal("business"),
);

const partnerOverviewValidator = v.object({
  activeOrganizations: v.number(),
  grantCount: v.number(),
  totalGrantedCredits: v.number(),
  totalSpentCredits: v.number(),
  planMix: v.object({
    free: v.number(),
    starter: v.number(),
    growth: v.number(),
    business: v.number(),
  }),
  organizations: v.array(
    v.object({
      partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
      name: v.string(),
      status: v.literal("active"),
      planKey: planKeyValidator,
      monthlyAllowance: v.number(),
      addedCredits: v.number(),
      spentCredits: v.number(),
      remainingCredits: v.number(),
      lastGrantAt: v.union(v.number(), v.null()),
      grantCount: v.number(),
    }),
  ),
});

export const getCurrentPartner = query({
  args: {},
  handler: async (ctx) => {
    const access = await getCurrentPartnerAccess(ctx);
    if (access === null) return null;
    const domain = await ctx.db
      .query("whiteLabelPartnerDomains")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", access.partner._id))
      .first();
    const logoUrl = access.partner.logoStorageId
      ? await ctx.storage.getUrl(access.partner.logoStorageId)
      : null;
    return {
      partnerId: access.partner._id,
      name: access.partner.name,
      logoStorageId: access.partner.logoStorageId ?? null,
      logoUrl,
      domain: domain
        ? {
            hostname: domain.hostname,
            status: domain.status,
            dnsTarget: domain.dnsTarget ?? null,
            setupState: domain.setupState ?? null,
            ownershipRecord:
              domain.ownershipRecordName && domain.ownershipRecordValue
                ? {
                    type: "TXT" as const,
                    name: domain.ownershipRecordName,
                    value: domain.ownershipRecordValue,
                  }
                : null,
            delegatedDcvRecord:
              domain.delegatedDcvRecordName && domain.delegatedDcvRecordTarget
                ? {
                    type: "CNAME" as const,
                    name: domain.delegatedDcvRecordName,
                    value: domain.delegatedDcvRecordTarget,
                  }
                : null,
            cutoverRecord: domain.dnsTarget
              ? {
                  type: "CNAME" as const,
                  name: domain.hostname,
                  value: domain.dnsTarget,
                }
              : null,
            hostnameStatus: domain.hostnameStatus ?? null,
            certificateStatus: domain.certificateStatus ?? null,
            validationError: domain.validationError ?? null,
            previewUrl:
              domain.setupState === "connected"
                ? `https://${domain.hostname}`
                : null,
          }
        : null,
    };
  },
});

export const getOverview = query({
  args: {},
  returns: partnerOverviewValidator,
  handler: async (ctx) => {
    const { partner } = await assertCurrentPartnerAccess(ctx);
    const organizations = await ctx.db
      .query("whiteLabelPartnerOrganizations")
      .withIndex("by_partnerId_and_status", (q) =>
        q.eq("partnerId", partner._id).eq("status", "active"),
      )
      .take(100);
    const rows = await Promise.all(
      organizations.map(async (organization) => {
        const [team, plan, balance] = await Promise.all([
          ctx.db.get(organization.teamId),
          ctx.db
            .query("whiteLabelPartnerOrganizationPlans")
            .withIndex("by_partnerOrganizationId", (q) =>
              q.eq("partnerOrganizationId", organization._id),
            )
            .unique(),
          getPartnerCreditBalance(ctx, organization._id),
        ]);
        const planKey = plan?.activePlanKey ?? "free";
        return {
          partnerOrganizationId: organization._id,
          name: team?.name ?? "Unknown",
          status: "active" as const,
          planKey,
          monthlyAllowance: PLAN_CATALOG[planKey].monthlyCredits,
          addedCredits: balance.balance?.manualGrantedCredits ?? 0,
          spentCredits:
            (balance.period?.usedCredits ?? 0) +
            (balance.balance?.manualUsedCredits ?? 0),
          remainingCredits: balance.remainingCredits,
          lastGrantAt: balance.balance?.lastGrantAt ?? null,
          grantCount: balance.balance?.grantCount ?? 0,
        };
      }),
    );
    const planMix = rows.reduce<Record<PlanKey, number>>(
      (mix, row) => {
        mix[row.planKey] += 1;
        return mix;
      },
      { free: 0, starter: 0, growth: 0, business: 0 },
    );
    return {
      activeOrganizations: rows.length,
      grantCount: rows.reduce((count, row) => count + row.grantCount, 0),
      totalGrantedCredits: rows.reduce(
        (total, row) => total + row.addedCredits,
        0,
      ),
      totalSpentCredits: rows.reduce(
        (total, row) => total + row.spentCredits,
        0,
      ),
      planMix,
      organizations: rows,
    };
  },
});

export const setOrganizationStatus = mutation({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    status: v.union(v.literal("active"), v.literal("suspended")),
  },
  handler: async (ctx, args) => {
    const { partner } = await assertCurrentPartnerAccess(ctx);
    const organization = await assertPartnerOrganizationAccess(
      ctx,
      partner._id,
      args.partnerOrganizationId,
    );
    await ctx.db.patch(organization._id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const assignOrganizationPlan = mutation({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    planKey: planKeyValidator,
  },
  handler: async (ctx, args) => {
    const { partner, user } = await assertCurrentPartnerAccess(ctx);
    await assertPartnerOrganizationAccess(
      ctx,
      partner._id,
      args.partnerOrganizationId,
    );
    const plan = await ctx.db
      .query("whiteLabelPartnerOrganizationPlans")
      .withIndex("by_partnerOrganizationId", (q) =>
        q.eq("partnerOrganizationId", args.partnerOrganizationId),
      )
      .unique();
    if (plan === null) throw new Error("Customer organization plan not found.");
    const period = await ctx.db
      .query("whiteLabelPartnerOrganizationCreditPeriods")
      .withIndex("by_partnerOrganizationId_and_periodStart", (q) =>
        q.eq("partnerOrganizationId", args.partnerOrganizationId),
      )
      .order("desc")
      .first();
    const now = Date.now();
    await ctx.db.patch(plan._id, {
      activePlanKey: args.planKey,
      pendingCreditPlanKey: args.planKey,
      pendingCreditPlanEffectiveAt: period?.periodEnd ?? now,
      updatedByUserId: user._id,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerOrganizationPlanAssignments", {
      partnerOrganizationId: args.partnerOrganizationId,
      planKey: args.planKey,
      appliesAt: now,
      assignedByUserId: user._id,
      createdAt: now,
    });
  },
});

export const grantCredits = mutation({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    credits: v.number(),
  },
  handler: async (ctx, args) => {
    const { partner, user } = await assertCurrentPartnerAccess(ctx);
    await assertPartnerOrganizationAccess(
      ctx,
      partner._id,
      args.partnerOrganizationId,
    );
    await grantPartnerOrganizationCredits(ctx, {
      partnerOrganizationId: args.partnerOrganizationId,
      credits: args.credits,
      grantedByUserId: user._id,
    });
  },
});

export const generateLogoUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await assertCurrentPartnerAccess(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateBranding = mutation({
  args: {
    name: v.string(),
    logoStorageId: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { partner } = await assertCurrentPartnerAccess(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Partner name is required.");
    const now = Date.now();
    await ctx.db.patch(partner._id, {
      name,
      ...(args.logoStorageId === undefined
        ? {}
        : { logoStorageId: args.logoStorageId }),
      updatedAt: now,
    });
    return null;
  },
});
