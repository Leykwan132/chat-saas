import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { ensureUserAccount } from "../teamHelpers";
import { reconcilePartnerCustomerWorkspace } from "./customerWorkspace";

export type PersistActiveAccountArgs = {
  partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">;
  workosUserId: string;
  workosOrganizationMembershipId: string;
  email: string;
  role: "owner" | "admin" | "member";
  credential: {
    ciphertext: string;
    initializationVector: string;
    authenticationTag: string;
    keyVersion: "v1";
  };
};

export async function persistPartnerCustomerAccount(
  ctx: MutationCtx,
  args: PersistActiveAccountArgs,
) {
  const organization = await ctx.db.get(args.partnerOrganizationId);
  if (organization === null) {
    throw new Error("Customer organization not found.");
  }
  const existing = await ctx.db
    .query("whiteLabelPartnerOrganizationAccounts")
    .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
      q
        .eq("partnerOrganizationId", args.partnerOrganizationId)
        .eq("workosUserId", args.workosUserId),
    )
    .unique();
  const now = Date.now();
  const fields = {
    workosOrganizationMembershipId: args.workosOrganizationMembershipId,
    email: args.email.trim().toLowerCase(),
    role: args.role,
    status: "active" as const,
    updatedAt: now,
  };
  if (existing === null) {
    await ctx.db.insert("whiteLabelPartnerOrganizationAccounts", {
      partnerOrganizationId: args.partnerOrganizationId,
      workosUserId: args.workosUserId,
      ...fields,
      createdAt: now,
    });
  } else {
    await ctx.db.patch(existing._id, fields);
  }

  const existingCredential = await ctx.db
    .query("whiteLabelPartnerCustomerCredentials")
    .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
      q
        .eq("partnerOrganizationId", args.partnerOrganizationId)
        .eq("workosUserId", args.workosUserId),
    )
    .unique();
  const credentialFields = { ...args.credential, updatedAt: now };
  if (existingCredential === null) {
    await ctx.db.insert("whiteLabelPartnerCustomerCredentials", {
      partnerOrganizationId: args.partnerOrganizationId,
      workosUserId: args.workosUserId,
      ...credentialFields,
      createdAt: now,
    });
  } else {
    await ctx.db.patch(existingCredential._id, credentialFields);
  }

  await ensureUserAccount(ctx, {
    workosUserId: args.workosUserId,
    email: fields.email,
  });
  await reconcilePartnerCustomerWorkspace(ctx, args.workosUserId);
}
