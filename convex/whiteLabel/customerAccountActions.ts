"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { getAuthContext } from "../authUtils";
import { createWorkOSClient, workosRequest } from "../workosClient";
import { generateInitialCustomerPassword } from "./customerAccountPassword";
import {
  decryptInitialCustomerPassword,
  encryptInitialCustomerPassword,
} from "./customerCredentialEncryption";
import {
  WORKOS_ADMIN_ROLE_SLUG,
  WORKOS_MEMBER_ROLE_SLUG,
  WORKOS_OWNER_ROLE_SLUG,
} from "../../shared/teamRoleCatalog";

const roleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
);

function normalizeEmail(email: string) {
  const value = email.trim().toLowerCase();
  if (!value || value.length > 320 || !value.includes("@")) {
    throw new Error("Enter a valid customer email address.");
  }
  return value;
}

function roleSlugFor(role: "owner" | "admin" | "member") {
  if (role === "owner") return WORKOS_OWNER_ROLE_SLUG;
  if (role === "admin") return WORKOS_ADMIN_ROLE_SLUG;
  return WORKOS_MEMBER_ROLE_SLUG;
}

export const createCustomerAccount = action({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    email: v.string(),
    role: roleValidator,
  },
  returns: v.object({
    workosUserId: v.string(),
    email: v.string(),
    initialPassword: v.string(),
  }),
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const organization: { workosOrgId: string } = await ctx.runQuery(
      internal.whiteLabel.portalAuthorization.getInvitableOrganization,
      {
        email: auth.email,
        workosUserId: auth.userId,
        partnerOrganizationId: args.partnerOrganizationId,
      },
    );
    const workos = createWorkOSClient();
    const initialPassword = generateInitialCustomerPassword();
    const credential = encryptInitialCustomerPassword(initialPassword);
    const user = await workos.userManagement.createUser({
      email: normalizeEmail(args.email),
      password: initialPassword,
      emailVerified: true,
    });
    let membership: Awaited<
      ReturnType<typeof workos.userManagement.createOrganizationMembership>
    > | null = null;
    try {
      membership = await workos.userManagement.createOrganizationMembership({
        organizationId: organization.workosOrgId,
        userId: user.id,
        roleSlug: roleSlugFor(args.role),
      });
      await ctx.runMutation(
        internal.whiteLabel.customerAccounts.persistActiveAccount,
        {
          partnerOrganizationId: args.partnerOrganizationId,
          workosUserId: user.id,
          workosOrganizationMembershipId: membership.id,
          email: user.email,
          role: args.role,
          credential,
        },
      );
    } catch (error) {
      if (membership !== null) {
        await workos.userManagement.deleteOrganizationMembership(membership.id);
      }
      await workos.userManagement.deleteUser(user.id);
      throw error;
    }
    return {
      workosUserId: user.id,
      email: user.email,
      initialPassword,
    };
  },
});

export const startCurrentUserPasswordReset = action({
  args: {},
  returns: v.object({ passwordResetUrl: v.string() }),
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);
    const account: { email: string } | null = await ctx.runQuery(
      internal.whiteLabel.customerAccounts.getPasswordAccountForWorkosUser,
      { workosUserId: auth.userId },
    );
    if (account === null) {
      throw new Error("Password reset is unavailable for this account.");
    }
    const workos = createWorkOSClient();
    const passwordReset = await workos.userManagement.createPasswordReset({
      email: account.email,
    });
    return { passwordResetUrl: passwordReset.passwordResetUrl };
  },
});

export const getCustomerInitialCredentials = action({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    workosUserId: v.string(),
  },
  returns: v.object({
    email: v.string(),
    initialPassword: v.string(),
    passwordResetAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args): Promise<{
    email: string;
    initialPassword: string;
    passwordResetAt: number | null;
  }> => {
    const auth = await getAuthContext(ctx);
    await ctx.runQuery(
      internal.whiteLabel.portalAuthorization.getInvitableOrganization,
      {
        email: auth.email,
        workosUserId: auth.userId,
        partnerOrganizationId: args.partnerOrganizationId,
      },
    );
    const credential: {
      email: string;
      ciphertext: string;
      initializationVector: string;
      authenticationTag: string;
      keyVersion: "v1";
      passwordResetAt: number | null;
    } | null = await ctx.runQuery(
      internal.whiteLabel.customerAccounts.getInitialCredential,
      args,
    );
    if (credential === null) {
      throw new Error("Customer credentials are unavailable.");
    }
    return {
      email: credential.email,
      initialPassword: decryptInitialCustomerPassword(credential),
      passwordResetAt: credential.passwordResetAt,
    };
  },
});

export const updateCustomerAccountRole = action({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    workosUserId: v.string(),
    role: roleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    await ctx.runQuery(
      internal.whiteLabel.portalAuthorization.getInvitableOrganization,
      {
        email: auth.email,
        workosUserId: auth.userId,
        partnerOrganizationId: args.partnerOrganizationId,
      },
    );
    const target: { workosOrganizationMembershipId: string } =
      await ctx.runQuery(
        internal.whiteLabel.customerRoleRecords.getCustomerRoleTarget,
        {
          partnerOrganizationId: args.partnerOrganizationId,
          workosUserId: args.workosUserId,
        },
      );
    await workosRequest(
      `/user_management/organization_memberships/${target.workosOrganizationMembershipId}`,
      {
        method: "PUT",
        body: JSON.stringify({ role_slug: roleSlugFor(args.role) }),
      },
    );
    await ctx.runMutation(
      internal.whiteLabel.customerRoleRecords.updateCustomerRoleRecord,
      args,
    );
    return null;
  },
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

export const removeCustomerFromOrganization = action({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    removal: customerRemovalValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const organization: { workosOrgId: string } = await ctx.runQuery(
      internal.whiteLabel.portalAuthorization.getInvitableOrganization,
      {
        email: auth.email,
        workosUserId: auth.userId,
        partnerOrganizationId: args.partnerOrganizationId,
      },
    );
    const target = await ctx.runQuery(
      internal.whiteLabel.customerAccounts.resolveCustomerRemoval,
      args,
    );
    const workos = createWorkOSClient();
    if (!("workosInvitationId" in target)) {
      await workos.userManagement.deleteOrganizationMembership(
        target.workosOrganizationMembershipId,
      );
    } else if (target.kind === "pending") {
      await workos.userManagement.revokeInvitation(target.workosInvitationId);
    } else {
      const memberships = await workos.userManagement.listOrganizationMemberships(
        {
          organizationId: organization.workosOrgId,
          userId: target.workosUserId,
        },
      );
      const membership = memberships.data.find(
        (item) => item.status === "active",
      );
      if (membership === undefined) {
        throw new Error("Customer membership not found.");
      }
      await workos.userManagement.deleteOrganizationMembership(membership.id);
    }
    await ctx.runMutation(
      internal.whiteLabel.customerAccounts.removeCustomerRecord,
      args,
    );
    return null;
  },
});
