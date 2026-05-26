import { internalMutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { WorkOSInvitation } from "./workosClient";

export type ParsedInvitation = {
  workosInvitationId: string;
  email: string;
  workosOrgId?: string;
  state: WorkOSInvitation["state"];
  roleSlug?: string;
  inviterWorkosUserId?: string;
  acceptedWorkosUserId?: string;
  acceptedAt?: number;
  revokedAt?: number;
  expiresAt?: number;
  workosCreatedAt: string;
  workosUpdatedAt: string;
};

const INVITATION_STATES = new Set<WorkOSInvitation["state"]>([
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

function parseIsoToMs(iso: string | null | undefined): number | undefined {
  if (!iso) {
    return undefined;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? undefined : ms;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function parseWorkosInvitationPayload(data: unknown): ParsedInvitation | null {
  const record = data as Record<string, unknown> | null | undefined;
  const workosInvitationId = optionalString(record?.id);
  if (!workosInvitationId) {
    return null;
  }

  const state = record?.state;
  if (typeof state !== "string" || !INVITATION_STATES.has(state as WorkOSInvitation["state"])) {
    return null;
  }

  return {
    workosInvitationId,
    email: typeof record?.email === "string" ? record.email.trim().toLowerCase() : "",
    workosOrgId: optionalString(record?.organization_id ?? record?.organizationId),
    state: state as WorkOSInvitation["state"],
    roleSlug: optionalString(record?.role_slug ?? record?.roleSlug),
    inviterWorkosUserId: optionalString(record?.inviter_user_id ?? record?.inviterUserId),
    acceptedWorkosUserId: optionalString(record?.accepted_user_id ?? record?.acceptedUserId),
    acceptedAt: parseIsoToMs(
      (record?.accepted_at ?? record?.acceptedAt) as string | null | undefined,
    ),
    revokedAt: parseIsoToMs(
      (record?.revoked_at ?? record?.revokedAt) as string | null | undefined,
    ),
    expiresAt: parseIsoToMs(
      (record?.expires_at ?? record?.expiresAt) as string | null | undefined,
    ),
    workosCreatedAt:
      optionalString(record?.created_at ?? record?.createdAt) ?? new Date().toISOString(),
    workosUpdatedAt:
      optionalString(record?.updated_at ?? record?.updatedAt) ?? new Date().toISOString(),
  };
}

export async function upsertInvitationRecord(
  ctx: MutationCtx,
  parsed: ParsedInvitation,
): Promise<void> {
  const now = Date.now();
  const existing = await ctx.db
    .query("teamInvitationRecords")
    .withIndex("by_workosInvitationId", (q) =>
      q.eq("workosInvitationId", parsed.workosInvitationId),
    )
    .unique();

  const fields = {
    email: parsed.email,
    workosOrgId: parsed.workosOrgId,
    state: parsed.state,
    roleSlug: parsed.roleSlug,
    inviterWorkosUserId: parsed.inviterWorkosUserId,
    acceptedWorkosUserId: parsed.acceptedWorkosUserId,
    acceptedAt: parsed.acceptedAt,
    revokedAt: parsed.revokedAt,
    expiresAt: parsed.expiresAt,
    workosCreatedAt: parsed.workosCreatedAt,
    workosUpdatedAt: parsed.workosUpdatedAt,
    updatedAt: now,
  };

  if (existing === null) {
    await ctx.db.insert("teamInvitationRecords", {
      workosInvitationId: parsed.workosInvitationId,
      ...fields,
      createdAt: now,
    });
    return;
  }

  await ctx.db.patch(existing._id, fields);
}

export const syncFromWorkosInvitation = internalMutation({
  args: {
    data: v.any(),
  },
  handler: async (ctx, { data }) => {
    const parsed = parseWorkosInvitationPayload(data);
    if (parsed === null) {
      return { synced: false as const };
    }

    await upsertInvitationRecord(ctx, parsed);
    return { synced: true as const, state: parsed.state };
  },
});
