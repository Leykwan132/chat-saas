import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { PERSONAL_ORG_FALLBACK } from "./authUtils";
import { getActiveTeamForUser, getUserByWorkosId } from "./teamHelpers";

const migrations = new Migrations<DataModel>(components.migrations);

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
        user === null ? null : getActiveTeamForUser(ctx, user),
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

export const runNormalizeLegacyScheduleAvailability = migrations.runner(
  internal.serviceAvailabilityMigration.normalizeLegacyScheduleAvailability,
);
