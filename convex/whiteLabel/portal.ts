import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  assertCurrentPartnerAccess,
  assertPartnerOrganizationAccess,
  getCurrentPartnerAccess,
} from "./access";
import { grantPartnerOrganizationCredits } from "./creditLedger";
import { getPartnerOverview, partnerOverviewValidator } from "./portalOverview";
import {
  applyPartnerOrganizationPlanChange,
  planChangeTimingValidator,
} from "./planChange";
import { applyPartnerOrganizationEntitlements } from "./entitlementChange";
import { listEnabledModels } from "../llm/modelPricing";

const planKeyValidator = v.union(
  v.literal("free"),
  v.literal("starter"),
  v.literal("growth"),
  v.literal("business"),
);

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
      pageTitle: access.partner.pageTitle ?? null,
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
  handler: getPartnerOverview,
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

export const deletePartnerOrganization = mutation({
  args: { partnerOrganizationId: v.id("whiteLabelPartnerOrganizations") },
  returns: teamDeletionRequestResultValidator,
  handler: async (ctx, args) => {
    const { partner } = await assertCurrentPartnerAccess(ctx);
    const organization = await assertPartnerOrganizationAccess(
      ctx,
      partner._id,
      args.partnerOrganizationId,
    );
    const team = await ctx.db.get(organization.teamId);
    if (team?.workosOrgId === undefined) {
      throw new Error("Customer organization workspace not found.");
    }
    const result = await requestTeamDeletion(ctx, {
      workosOrgId: team.workosOrgId,
      source: "workos",
      preserveOwnerSubscription: true,
    });
    await ctx.db.patch(organization._id, {
      status: "suspended",
      updatedAt: Date.now(),
    });
    return result;
  },
});

export const assignOrganizationPlan = mutation({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    planKey: planKeyValidator,
    timing: planChangeTimingValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { partner, user } = await assertCurrentPartnerAccess(ctx);
    await assertPartnerOrganizationAccess(
      ctx,
      partner._id,
      args.partnerOrganizationId,
    );
    await applyPartnerOrganizationPlanChange(ctx, {
      partnerOrganizationId: args.partnerOrganizationId,
      planKey: args.planKey,
      timing: args.timing,
      actorUserId: user._id,
    });
    return null;
  },
});

export const setOrganizationEntitlements = mutation({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    maxAgents: v.optional(v.number()),
    monthlyCredits: v.optional(v.number()),
    modelId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { partner, user } = await assertCurrentPartnerAccess(ctx);
    await assertPartnerOrganizationAccess(
      ctx,
      partner._id,
      args.partnerOrganizationId,
    );
    await applyPartnerOrganizationEntitlements(ctx, {
      partnerOrganizationId: args.partnerOrganizationId,
      maxAgents: args.maxAgents,
      monthlyCredits: args.monthlyCredits,
      modelId: args.modelId,
      actorUserId: user._id,
    });
    return null;
  },
});

export const listEnabledAgentModels = query({
  args: {},
  returns: v.array(
    v.object({
      value: v.string(),
      label: v.string(),
    }),
  ),
  handler: async (ctx) => {
    await assertCurrentPartnerAccess(ctx);
    return listEnabledModels().map((model) => ({
      value: model.value,
      label: model.label,
    }));
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
    pageTitle: v.optional(v.string()),
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
      ...(args.pageTitle === undefined ? {} : { pageTitle: args.pageTitle.trim() }),
      ...(args.logoStorageId === undefined
        ? {}
        : { logoStorageId: args.logoStorageId }),
      updatedAt: now,
    });
    return null;
  },
});
