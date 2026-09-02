import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";
import { getAuthContext } from "../authUtils";
import { persistPartnerCustomerAccount } from "./customerAccountPersistence";

type CustomerRemoval =
  | {
      kind: "active";
      workosUserId: string;
      workosOrganizationMembershipId: string;
    }
  | { kind: "pending"; workosInvitationId: string }
  | {
      kind: "accepted";
      workosInvitationId: string;
      workosUserId: string;
    };

const roleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
);

const encryptedCredentialValidator = v.object({
  ciphertext: v.string(),
  initializationVector: v.string(),
  authenticationTag: v.string(),
  keyVersion: v.literal("v1"),
});

const customerRemovalValidator = v.union(
  v.object({
    kind: v.literal("active"),
    workosUserId: v.string(),
    workosOrganizationMembershipId: v.string(),
  }),
  v.object({
    kind: v.literal("pending"),
    workosInvitationId: v.string(),
  }),
  v.object({
    kind: v.literal("accepted"),
    workosInvitationId: v.string(),
    workosUserId: v.string(),
  }),
);

export const persistActiveAccount = internalMutation({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    workosUserId: v.string(),
    workosOrganizationMembershipId: v.string(),
    email: v.string(),
    role: roleValidator,
    credential: encryptedCredentialValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await persistPartnerCustomerAccount(ctx, args);
    return null;
  },
});

export const hasCurrentPasswordAccount = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);
    const account = await ctx.db
      .query("whiteLabelPartnerOrganizationAccounts")
      .withIndex("by_workosUserId", (q) =>
        q.eq("workosUserId", auth.userId),
      )
      .first();
    return account !== null && account.status === "active";
  },
});

export const getPasswordAccountForWorkosUser = internalQuery({
  args: { workosUserId: v.string() },
  returns: v.union(v.object({ email: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("whiteLabelPartnerOrganizationAccounts")
      .withIndex("by_workosUserId", (q) =>
        q.eq("workosUserId", args.workosUserId),
      )
      .first();
    return account === null || account.status !== "active"
      ? null
      : { email: account.email };
  },
});

export const getInitialCredential = internalQuery({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    workosUserId: v.string(),
  },
  returns: v.union(
    v.object({
      email: v.string(),
      ciphertext: v.string(),
      initializationVector: v.string(),
      authenticationTag: v.string(),
      keyVersion: v.literal("v1"),
      passwordResetAt: v.union(v.number(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("whiteLabelPartnerOrganizationAccounts")
      .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
        q
          .eq("partnerOrganizationId", args.partnerOrganizationId)
          .eq("workosUserId", args.workosUserId),
      )
      .unique();
    const credential = await ctx.db
      .query("whiteLabelPartnerCustomerCredentials")
      .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
        q
          .eq("partnerOrganizationId", args.partnerOrganizationId)
          .eq("workosUserId", args.workosUserId),
      )
      .unique();
    if (account === null || credential === null) return null;
    return {
      email: account.email,
      ciphertext: credential.ciphertext,
      initializationVector: credential.initializationVector,
      authenticationTag: credential.authenticationTag,
      keyVersion: credential.keyVersion,
      passwordResetAt: account.passwordResetAt ?? null,
    };
  },
});

export const resolveCustomerRemoval = internalQuery({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    removal: customerRemovalValidator,
  },
  returns: v.union(
    v.object({
      kind: v.literal("active"),
      workosOrganizationMembershipId: v.string(),
    }),
    v.object({ kind: v.literal("pending"), workosInvitationId: v.string() }),
    v.object({
      kind: v.literal("accepted"),
      workosInvitationId: v.string(),
      workosUserId: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const removal = args.removal as CustomerRemoval;
    const organization = await ctx.db.get(args.partnerOrganizationId);
    const team = organization ? await ctx.db.get(organization.teamId) : null;
    if (organization === null || team?.workosOrgId === undefined) {
      throw new Error("Customer organization not found.");
    }
    if (removal.kind === "active") {
      const account = await ctx.db
        .query("whiteLabelPartnerOrganizationAccounts")
        .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
          q
            .eq("partnerOrganizationId", organization._id)
            .eq("workosUserId", removal.workosUserId),
        )
        .unique();
      if (
        account === null ||
        account.workosOrganizationMembershipId !==
          removal.workosOrganizationMembershipId
      ) {
        throw new Error("Customer account not found.");
      }
      return {
        kind: "active" as const,
        workosOrganizationMembershipId:
          account.workosOrganizationMembershipId,
      };
    }
    const invitation = await ctx.db
      .query("teamInvitationRecords")
      .withIndex("by_workosInvitationId", (q) =>
        q.eq("workosInvitationId", removal.workosInvitationId),
      )
      .unique();
    if (invitation === null || invitation.workosOrgId !== team.workosOrgId) {
      throw new Error("Customer invitation not found.");
    }
    if (removal.kind === "pending") {
      if (invitation.state !== "pending") {
        throw new Error("Customer invitation is no longer pending.");
      }
      return {
        kind: "pending" as const,
        workosInvitationId: invitation.workosInvitationId,
      };
    }
    if (
      invitation.state !== "accepted" ||
      invitation.acceptedWorkosUserId !== removal.workosUserId
    ) {
      throw new Error("Accepted customer account not found.");
    }
    return {
      kind: "accepted" as const,
      workosInvitationId: invitation.workosInvitationId,
      workosUserId: invitation.acceptedWorkosUserId,
    };
  },
});

export const removeCustomerRecord = internalMutation({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    removal: customerRemovalValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const removal = args.removal as CustomerRemoval;
    if (removal.kind === "active") {
      const account = await ctx.db
        .query("whiteLabelPartnerOrganizationAccounts")
        .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
          q
            .eq("partnerOrganizationId", args.partnerOrganizationId)
            .eq("workosUserId", removal.workosUserId),
        )
        .unique();
      if (
        account === null ||
        account.workosOrganizationMembershipId !==
          removal.workosOrganizationMembershipId
      ) {
        throw new Error("Customer account not found.");
      }
      await ctx.db.delete(account._id);
      const credential = await ctx.db
        .query("whiteLabelPartnerCustomerCredentials")
        .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
          q
            .eq("partnerOrganizationId", args.partnerOrganizationId)
            .eq("workosUserId", removal.workosUserId),
        )
        .unique();
      if (credential !== null) await ctx.db.delete(credential._id);
      return null;
    }
    const invitation = await ctx.db
      .query("teamInvitationRecords")
      .withIndex("by_workosInvitationId", (q) =>
        q.eq("workosInvitationId", removal.workosInvitationId),
      )
      .unique();
    if (invitation === null) {
      throw new Error("Customer invitation not found.");
    }
    await ctx.db.delete(invitation._id);
    return null;
  },
});
