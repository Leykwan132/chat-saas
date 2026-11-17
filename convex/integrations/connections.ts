import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { VerifiedMcpPrincipal } from "../../shared/integrations/contracts";
import { principalValidator } from "./schema";
import { resolveMemberAccess } from "./access";

export async function ensurePendingHandler(
  ctx: MutationCtx,
  { principal }: { principal: VerifiedMcpPrincipal },
) {
  await resolveMemberAccess(ctx, principal);
  const existing = await ctx.db
    .query("integrationConnections")
    .withIndex("by_issuer_and_consentId", (q) =>
      q.eq("issuer", principal.issuer).eq("consentId", principal.consentId),
    )
    .unique();
  if (existing) {
    if (
      existing.subject !== principal.subject ||
      existing.orgId !== principal.orgId ||
      existing.clientId !== principal.clientId
    )
      throw new ConvexError("CONNECTION_MISMATCH");
    if (existing.status === "pending")
      await ctx.db.patch(existing._id, {
        status: "active",
        updatedAt: Date.now(),
      });
    return existing._id;
  }
  return ctx.db.insert("integrationConnections", {
    issuer: principal.issuer,
    subject: principal.subject,
    orgId: principal.orgId,
    consentId: principal.consentId,
    clientId: principal.clientId,
    capability: "conversations:read",
    status: "active",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export const ensurePendingConnection = internalMutation({
  args: { principal: principalValidator },
  returns: v.id("integrationConnections"),
  handler: ensurePendingHandler,
});

const approvalArgs = {
  connectionId: v.id("integrationConnections"),
  expectedIssuer: v.string(),
  expectedSubject: v.string(),
  expectedOrgId: v.string(),
  expectedClientId: v.string(),
};
export async function approveHandler(
  ctx: MutationCtx,
  args: {
    connectionId: Id<"integrationConnections">;
    expectedIssuer: string;
    expectedSubject: string;
    expectedOrgId: string;
    expectedClientId: string;
  },
) {
  const connection = await ctx.db.get(args.connectionId);
  if (
    !connection ||
    connection.issuer !== args.expectedIssuer ||
    connection.subject !== args.expectedSubject ||
    connection.orgId !== args.expectedOrgId ||
    connection.clientId !== args.expectedClientId
  )
    throw new ConvexError("CONNECTION_MISMATCH");
  await resolveMemberAccess(ctx, { ...connection, grantedScopes: [] });
  await ctx.db.patch(connection._id, {
    status: "active",
    updatedAt: Date.now(),
  });
  await ctx.db.insert("integrationAudit", {
    consentId: connection.consentId,
    orgId: connection.orgId,
    operation: "approve",
    outcome: "active",
    createdAt: Date.now(),
  });
  return null;
}
export const approvePilotConnection = internalMutation({
  args: approvalArgs,
  returns: v.null(),
  handler: approveHandler,
});

export async function revokeHandler(
  ctx: MutationCtx,
  args: { connectionId: Id<"integrationConnections"> },
) {
  const connection = await ctx.db.get(args.connectionId);
  if (!connection) throw new ConvexError("CONNECTION_NOT_FOUND");
  await ctx.db.patch(connection._id, {
    status: "revoked",
    updatedAt: Date.now(),
  });
  await ctx.db.insert("integrationAudit", {
    consentId: connection.consentId,
    orgId: connection.orgId,
    operation: "revoke",
    outcome: "revoked",
    createdAt: Date.now(),
  });
  return null;
}
export const revokePilotConnection = internalMutation({
  args: { connectionId: v.id("integrationConnections") },
  returns: v.null(),
  handler: revokeHandler,
});

export const listPilotConnections = internalQuery({
  args: { subject: v.string() },
  returns: v.array(
    v.object({
      connectionId: v.id("integrationConnections"),
      issuer: v.string(),
      subject: v.string(),
      orgId: v.string(),
      consentId: v.string(),
      clientId: v.string(),
      status: v.string(),
    }),
  ),
  handler: async (ctx, { subject }) =>
    (
      await ctx.db
        .query("integrationConnections")
        .withIndex("by_subject", (q) => q.eq("subject", subject))
        .take(100)
    ).map((row) => ({
      connectionId: row._id,
      issuer: row.issuer,
      subject: row.subject,
      orgId: row.orgId,
      consentId: row.consentId,
      clientId: row.clientId,
      status: row.status,
    })),
});
