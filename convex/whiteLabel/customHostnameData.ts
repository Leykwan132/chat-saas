import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalQuery,
  internalMutation,
  mutation,
  type MutationCtx,
} from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { assertCurrentPartnerAccess } from "./access";
import {
  getNextSetupState,
  type CustomHostnameSetupState,
} from "./customHostnameState";

const setupStateValidator = v.union(
  v.literal("draft"),
  v.literal("ownership_pending"),
  v.literal("ownership_checking"),
  v.literal("dcv_pending"),
  v.literal("certificate_checking"),
  v.literal("cutover_pending"),
  v.literal("connection_checking"),
  v.literal("connected"),
  v.literal("failed"),
);

const pollingDomainValidator = v.object({
  domainId: v.id("whiteLabelPartnerDomains"),
  hostname: v.string(),
  cloudflareHostnameId: v.optional(v.string()),
  setupState: v.optional(setupStateValidator),
  pollGeneration: v.optional(v.number()),
  pollAttempt: v.optional(v.number()),
});

async function getCurrentPartnerDomain(
  ctx: MutationCtx,
): Promise<Doc<"whiteLabelPartnerDomains">> {
  const { partner } = await assertCurrentPartnerAccess(ctx);
  const domain = await ctx.db
    .query("whiteLabelPartnerDomains")
    .withIndex("by_partnerId", (q) => q.eq("partnerId", partner._id))
    .unique();
  if (domain === null) {
    throw new Error("Create a custom hostname before confirming DNS.");
  }
  return domain;
}

async function startPolling(
  ctx: MutationCtx,
  domain: Doc<"whiteLabelPartnerDomains">,
  setupState: "ownership_checking" | "certificate_checking" | "connection_checking",
  delayMs = 60_000,
) {
  const now = Date.now();
  const generation = (domain.pollGeneration ?? 0) + 1;
  await ctx.db.patch(domain._id, {
    setupState,
    pollGeneration: generation,
    pollAttempt: 0,
    validationError: undefined,
    ...(setupState === "ownership_checking" ? { ownershipConfirmedAt: now } : {}),
    ...(setupState === "certificate_checking" ? { dcvConfirmedAt: now } : {}),
    ...(setupState === "connection_checking" ? { cutoverConfirmedAt: now } : {}),
    updatedAt: now,
  });
  await ctx.scheduler.runAfter(
    delayMs,
    internal.whiteLabel.customHostnameActions.pollCustomHostname,
    { domainId: domain._id, generation },
  );
}

export const getDomainForPolling = internalQuery({
  args: { domainId: v.id("whiteLabelPartnerDomains") },
  returns: v.union(pollingDomainValidator, v.null()),
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.domainId);
    if (domain === null) return null;
    return {
      domainId: domain._id,
      hostname: domain.hostname,
      cloudflareHostnameId: domain.cloudflareHostnameId,
      setupState: domain.setupState,
      pollGeneration: domain.pollGeneration,
      pollAttempt: domain.pollAttempt,
    };
  },
});

export const reserveDomain = internalMutation({
  args: { partnerId: v.id("whiteLabelPartners"), hostname: v.string() },
  returns: v.id("whiteLabelPartnerDomains"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whiteLabelPartnerDomains")
      .withIndex("by_hostname", (q) => q.eq("hostname", args.hostname))
      .unique();
    if (existing && existing.partnerId !== args.partnerId) {
      throw new Error("This custom hostname is already in use.");
    }
    if (existing?.setupState === "connected") {
      throw new Error("Replace a connected domain from a dedicated flow.");
    }
    if (existing) return existing._id;
    return await ctx.db.insert("whiteLabelPartnerDomains", {
      partnerId: args.partnerId,
      hostname: args.hostname,
      status: "pending",
      setupState: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const persistCreatedHostname = internalMutation({
  args: {
    domainId: v.id("whiteLabelPartnerDomains"),
    partnerId: v.id("whiteLabelPartners"),
    cloudflareHostnameId: v.string(),
    ownershipRecordName: v.string(),
    ownershipRecordValue: v.string(),
    delegatedDcvRecordName: v.string(),
    delegatedDcvRecordTarget: v.string(),
    dnsTarget: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.domainId);
    if (domain === null) throw new Error("Custom hostname not found.");
    if (domain.partnerId !== args.partnerId) throw new Error("Custom hostname not found.");
    await ctx.db.patch(domain._id, {
      cloudflareHostnameId: args.cloudflareHostnameId,
      dnsTarget: args.dnsTarget,
      ownershipRecordName: args.ownershipRecordName,
      ownershipRecordType: "TXT",
      ownershipRecordValue: args.ownershipRecordValue,
      delegatedDcvRecordName: args.delegatedDcvRecordName,
      delegatedDcvRecordTarget: args.delegatedDcvRecordTarget,
      setupState: "ownership_pending",
      validationError: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const applyHostnameSnapshot = internalMutation({
  args: {
    domainId: v.id("whiteLabelPartnerDomains"),
    generation: v.number(),
    hostnameStatus: v.union(v.string(), v.null()),
    certificateStatus: v.union(v.string(), v.null()),
    validationError: v.union(v.string(), v.null()),
    cutoverMatches: v.boolean(),
  },
  returns: v.object({ shouldRetry: v.boolean() }),
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.domainId);
    if (
      domain === null ||
      domain.pollGeneration !== args.generation ||
      !domain.setupState?.endsWith("_checking")
    ) {
      return { shouldRetry: false };
    }
    const nextState = getNextSetupState({
      setupState: domain.setupState as CustomHostnameSetupState,
      snapshot: {
        hostnameStatus: args.hostnameStatus,
        certificateStatus: args.certificateStatus,
      },
      cutoverMatches: args.cutoverMatches,
    });
    const now = Date.now();
    await ctx.db.patch(domain._id, {
      setupState: nextState,
      status: nextState === "connected" ? "active" : "pending",
      hostnameStatus: args.hostnameStatus ?? undefined,
      certificateStatus: args.certificateStatus ?? undefined,
      validationError: args.validationError ?? undefined,
      pollAttempt: (domain.pollAttempt ?? 0) + 1,
      lastCheckedAt: now,
      ...(nextState === "connected" ? { connectedAt: now } : {}),
      updatedAt: now,
    });
    return { shouldRetry: nextState === domain.setupState && (domain.pollAttempt ?? 0) < 59 };
  },
});

export const markPollingFailure = internalMutation({
  args: { domainId: v.id("whiteLabelPartnerDomains"), generation: v.number(), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.domainId);
    if (domain?.pollGeneration !== args.generation) return null;
    await ctx.db.patch(domain._id, {
      setupState: "failed",
      status: "failed",
      validationError: args.error,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const confirmOwnershipDns = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const domain = await getCurrentPartnerDomain(ctx);
    if (domain.setupState !== "ownership_pending") {
      throw new Error("Ownership DNS is not ready to verify.");
    }
    await startPolling(ctx, domain, "ownership_checking");
    return null;
  },
});

export const confirmDelegatedDcvDns = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const domain = await getCurrentPartnerDomain(ctx);
    if (domain.setupState !== "dcv_pending") {
      throw new Error("Certificate DNS is not ready to verify.");
    }
    await startPolling(ctx, domain, "certificate_checking");
    return null;
  },
});

export const checkCertificateAgain = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const domain = await getCurrentPartnerDomain(ctx);
    if (domain.setupState !== "certificate_checking") {
      throw new Error("Certificate checking is not ready to resume.");
    }
    await startPolling(ctx, domain, "certificate_checking", 0);
    return null;
  },
});

export const confirmCutoverDns = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const domain = await getCurrentPartnerDomain(ctx);
    if (domain.setupState !== "cutover_pending") {
      throw new Error("The certificate must be active before DNS cutover.");
    }
    await startPolling(ctx, domain, "connection_checking");
    return null;
  },
});
