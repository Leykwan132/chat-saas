import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalQuery } from "../_generated/server";
import { getTeamByWorkosOrgId } from "../teamHelpers";
import { v } from "convex/values";

export type WorkspaceAvailability =
  | "active"
  | "deleting"
  | "missing"
  | "personal";

export async function getWorkspaceAvailability(
  ctx: QueryCtx | MutationCtx,
  orgId: string,
): Promise<WorkspaceAvailability> {
  if (!orgId || orgId === "personal" || orgId.startsWith("user_")) {
    return "personal";
  }
  const team = await getTeamByWorkosOrgId(ctx, orgId);
  if (!team) {
    return "missing";
  }
  return team.deletionStatus === "deleting" ? "deleting" : "active";
}

export async function canProcessWorkspaceActivity(
  ctx: QueryCtx | MutationCtx,
  orgId: string,
): Promise<boolean> {
  const availability = await getWorkspaceAvailability(ctx, orgId);
  return availability === "active" || availability === "personal";
}

export async function isTeamDeletionActive(
  ctx: QueryCtx | MutationCtx,
  orgId: string,
): Promise<boolean> {
  return (await getWorkspaceAvailability(ctx, orgId)) === "deleting";
}

export const canProcess = internalQuery({
  args: {
    orgId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) =>
    await canProcessWorkspaceActivity(ctx, args.orgId),
});

export const isDeleting = internalQuery({
  args: {
    orgId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) =>
    await isTeamDeletionActive(ctx, args.orgId),
});
