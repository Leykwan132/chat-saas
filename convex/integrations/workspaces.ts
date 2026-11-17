import { ConvexError } from "convex/values";
import { z } from "zod";
import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

export async function personalWorkspace(ctx: QueryCtx, user: Doc<"users">) {
  const team = await ctx.db
    .query("teams")
    .withIndex("by_ownerId_and_type", (q) =>
      q.eq("ownerId", user._id).eq("type", "personal"),
    )
    .unique();
  return team?.deletionStatus === "deleting" ? null : team;
}

export function canReadWorkspaceRecord(
  record: { orgId?: string; userId?: string },
  orgId: string,
  subject: string,
  personal: Doc<"teams"> | null,
) {
  return (
    record.orgId === orgId ||
    (personal !== null && record.orgId === "" && record.userId === subject)
  );
}

export function canReadWorkspaceChannel(
  channel: Doc<"channels">,
  orgId: string,
  subject: string,
) {
  return (
    channel.orgId === orgId &&
    channel.status === "connected" &&
    (orgId !== "" || channel.connectedByUserId === subject)
  );
}

const discoveryCursor = z.strictObject({
  scope: z.enum(["organization", "personal"]),
  cursor: z.string().nullable(),
});

export async function discoverWorkspaceAgents(
  ctx: QueryCtx,
  team: Doc<"teams">,
  personal: Doc<"teams"> | null,
  subject: string,
  orgId: string,
  limit: number,
  cursor?: string | null,
) {
  const position = cursor
    ? discoveryCursor.parse(JSON.parse(cursor))
    : { scope: "organization", cursor: null };
  if (position.scope === "personal" && !personal)
    throw new ConvexError("WORKSPACE_UNAVAILABLE");
  const isPersonal = position.scope === "personal";
  const page = await (
    isPersonal
      ? ctx.db
          .query("agents")
          .withIndex("by_userId_and_orgId", (q) =>
            q.eq("userId", subject).eq("orgId", ""),
          )
      : ctx.db
          .query("agents")
          .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
  ).paginate({ numItems: limit, cursor: position.cursor });
  const name = isPersonal ? "Personal" : team.name;
  const next = !page.isDone
    ? { scope: position.scope, cursor: page.continueCursor }
    : !isPersonal && personal
      ? { scope: "personal", cursor: null }
      : null;
  return {
    items: page.page.map((agent) => ({
      agentId: agent._id,
      name: `${name.slice(0, 80)} / ${agent.name.slice(0, 117)}`,
      capability: "conversations:read" as const,
    })),
    nextCursor: next ? JSON.stringify(next) : null,
  };
}
