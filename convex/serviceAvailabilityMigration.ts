import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { PERSONAL_ORG_FALLBACK } from "./authUtils";
import { getPersonalTeamForUser, getUserByWorkosId } from "./teamHelpers";

const migrations = new Migrations<DataModel>(components.migrations);

function isPersonalAgent(agentOrgId: string) {
  return !agentOrgId || agentOrgId === "personal" || agentOrgId === PERSONAL_ORG_FALLBACK;
}

export function getPersonalServiceAssignmentMigrationPatch({
  agentOrgId,
  ownerWorkosUserId,
  assignedWorkosUserIds,
  assignmentStrategy,
  specificWorkosUserId,
  now,
}: {
  agentOrgId: string;
  ownerWorkosUserId: string;
  assignedWorkosUserIds: string[] | undefined;
  assignmentStrategy: "conversation_owner" | "balanced" | "round_robin" | "specific_user";
  specificWorkosUserId: string | undefined;
  now: number;
}) {
  if (!isPersonalAgent(agentOrgId)) return undefined;
  const hasCurrentAssignee =
    assignedWorkosUserIds?.length === 1 &&
    assignedWorkosUserIds[0] === ownerWorkosUserId;
  const needsSpecificOwner =
    assignmentStrategy === "specific_user" && specificWorkosUserId !== ownerWorkosUserId;
  if (hasCurrentAssignee && !needsSpecificOwner) return undefined;
  return {
    assignedWorkosUserIds: [ownerWorkosUserId],
    ...(needsSpecificOwner ? { specificWorkosUserId: ownerWorkosUserId } : {}),
    updatedAt: now,
  };
}

export const backfillServiceAvailability = migrations.define({
  table: "appointmentServices",
  batchSize: 25,
  migrateOne: async (ctx, service) => {
    if (service.assignedWorkosUserIds !== undefined) return;
    const agent = await ctx.db.get(service.agentId);
    if (agent === null) return;
    const team = agent.orgId && agent.orgId !== "personal" && agent.orgId !== PERSONAL_ORG_FALLBACK
      ? await ctx.db
        .query("teams")
        .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", agent.orgId))
        .unique()
      : await getUserByWorkosId(ctx, agent.userId).then((user) =>
        user === null ? null : getPersonalTeamForUser(ctx, user._id),
      );
    if (team === null) return;
    const memberships = await ctx.db
      .query("teamMemberships")
      .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
      .take(100);
    const users = await Promise.all(memberships.map((membership) => ctx.db.get(membership.userId)));
    await ctx.db.patch(service._id, {
      assignedWorkosUserIds: [...new Set(users.flatMap((user) => user === null ? [] : [user.workosUserId]))],
      updatedAt: Date.now(),
    });
  },
});

export const normalizePersonalServiceAssignments = migrations.define({
  table: "appointmentServices",
  batchSize: 25,
  migrateOne: async (ctx, service) => {
    const agent = await ctx.db.get(service.agentId);
    if (agent === null) return;
    return getPersonalServiceAssignmentMigrationPatch({
      agentOrgId: agent.orgId,
      ownerWorkosUserId: agent.userId,
      assignedWorkosUserIds: service.assignedWorkosUserIds,
      assignmentStrategy: service.assignmentStrategy,
      specificWorkosUserId: service.specificWorkosUserId,
      now: Date.now(),
    });
  },
});

export const normalizeLegacyScheduleAvailability = migrations.define({
  table: "userSchedules",
  batchSize: 25,
  migrateOne: async (ctx, schedule) => {
    if (schedule.enabled && schedule.mode === "scheduled" && schedule.manualStatus === "available") return;
    await ctx.db.patch(schedule._id, {
      enabled: true,
      mode: "scheduled",
      manualStatus: "available",
      updatedAt: Date.now(),
    });
  },
});

export const runBackfillServiceAvailability = migrations.runner(
  internal.serviceAvailabilityMigration.backfillServiceAvailability,
);

export const runNormalizePersonalServiceAssignments = migrations.runner(
  internal.serviceAvailabilityMigration.normalizePersonalServiceAssignments,
);

export const runNormalizeLegacyScheduleAvailability = migrations.runner(
  internal.serviceAvailabilityMigration.normalizeLegacyScheduleAvailability,
);
