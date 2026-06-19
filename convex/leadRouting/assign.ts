import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { logConversationEvent } from "../conversationLogs";
import { isUserEligible } from "./eligibility";
import { getOrCreateLeadAssignmentSettings } from "./helpers";

type RosterEntry = {
  schedule: Doc<"userSchedules">;
  shifts: Doc<"userShifts">[];
  timeOff: Doc<"userTimeOff">[];
};

type AssignmentMethod = "balanced" | "round_robin" | "manual";

function normalizeAssignmentMethod(
  method: Doc<"leadAssignmentSettings">["method"],
): AssignmentMethod {
  if (method === "balanced" || method === "priority") return "balanced";
  if (method === "manual") return "manual";
  return "round_robin";
}

async function loadRoster(
  ctx: MutationCtx,
  agentId: Id<"agents">,
): Promise<RosterEntry[]> {
  const schedules = await ctx.db
    .query("userSchedules")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .collect();

  const entries: RosterEntry[] = [];
  for (const schedule of schedules) {
    const shifts = await ctx.db
      .query("userShifts")
      .withIndex("by_userScheduleId", (q) => q.eq("userScheduleId", schedule._id))
      .collect();
    const timeOff = await ctx.db
      .query("userTimeOff")
      .withIndex("by_userScheduleId", (q) => q.eq("userScheduleId", schedule._id))
      .collect();
    entries.push({ schedule, shifts, timeOff });
  }
  return entries;
}

async function resolveLastResortUserId(
  ctx: MutationCtx,
  orgId: string,
  agentId: Id<"agents">,
  channelConnectedByUserId: string,
): Promise<string> {
  const team = await ctx.db
    .query("teams")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
    .unique();
  if (team !== null) {
    const owner = await ctx.db.get(team.ownerId);
    if (owner !== null) {
      return owner.workosUserId;
    }
  }
  void agentId;
  return channelConnectedByUserId;
}

async function countOpenLeads(
  ctx: MutationCtx,
  orgId: string,
  service: Doc<"conversations">["service"],
  agentId: Id<"agents">,
  workosUserId: string,
): Promise<number> {
  const rows = await ctx.db
    .query("conversations")
    .withIndex("by_orgId_and_service_and_assignedAgentId_and_assignedUserId", (q) =>
      q
        .eq("orgId", orgId)
        .eq("service", service)
        .eq("assignedAgentId", agentId)
        .eq("assignedUserId", workosUserId),
    )
    .collect();
  return rows.filter((row) => row.status === "open").length;
}

function pickRoundRobin(
  pool: RosterEntry[],
  lastAssignedWorkosUserId: string | undefined,
): string {
  const sorted = [...pool].sort(
    (a, b) => a.schedule.createdAt - b.schedule.createdAt,
  );
  const ids = sorted.map((e) => e.schedule.workosUserId);
  if (ids.length === 0) {
    throw new Error("Empty pool");
  }
  if (!lastAssignedWorkosUserId) {
    return ids[0]!;
  }
  const lastIndex = ids.indexOf(lastAssignedWorkosUserId);
  if (lastIndex === -1) {
    return ids[0]!;
  }
  return ids[(lastIndex + 1) % ids.length]!;
}

async function pickBalanced(
  ctx: MutationCtx,
  pool: RosterEntry[],
  orgId: string,
  service: Doc<"conversations">["service"],
  agentId: Id<"agents">,
): Promise<string> {
  const counts = new Map<string, number>();
  for (const entry of pool) {
    const count = await countOpenLeads(
      ctx,
      orgId,
      service,
      agentId,
      entry.schedule.workosUserId,
    );
    counts.set(entry.schedule.workosUserId, count);
  }

  const sorted = [...pool].sort((a, b) => {
    const countA = counts.get(a.schedule.workosUserId) ?? 0;
    const countB = counts.get(b.schedule.workosUserId) ?? 0;
    if (countA !== countB) {
      return countA - countB;
    }
    return a.schedule.createdAt - b.schedule.createdAt;
  });

  return sorted[0]!.schedule.workosUserId;
}

export async function isAnyoneOnSchedule(
  ctx: MutationCtx,
  agentId: Id<"agents">,
  now: number = Date.now(),
): Promise<boolean> {
  const roster = await loadRoster(ctx, agentId);
  return roster.some((entry) =>
    isUserEligible(now, entry.schedule, entry.shifts, entry.timeOff),
  );
}

export async function applyInboundLeadRouting(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">;
    orgId: string;
    agentId: Id<"agents">;
    service: Doc<"conversations">["service"];
    channelConnectedByUserId: string;
  },
): Promise<void> {
  const settings = await getOrCreateLeadAssignmentSettings(ctx, args.agentId);
  const roster = await loadRoster(ctx, args.agentId);
  const now = Date.now();
  const method = normalizeAssignmentMethod(settings.method);

  if (method === "manual") {
    await ctx.db.patch(args.conversationId, {
      assignedAgentId: args.agentId,
      assignedUserId: undefined,
      updatedAt: now,
    });
    await logConversationEvent(ctx, {
      conversationId: args.conversationId,
      action: "assignee_changed",
      metadata: {
        assigneeUserId: null,
        assignmentMethod: method,
      },
    });
    await ctx.runMutation(internal.analytics.syncConversationAnalytics, {
      conversationId: args.conversationId,
    });
    return;
  }

  const pool = roster.filter((entry) =>
    isUserEligible(now, entry.schedule, entry.shifts, entry.timeOff),
  );

  let workosUserId: string;
  let usedFallback = false;

  if (pool.length === 0) {
    workosUserId = await resolveLastResortUserId(
      ctx,
      args.orgId,
      args.agentId,
      args.channelConnectedByUserId,
    );
    usedFallback = true;
  } else if (method === "round_robin") {
    workosUserId = pickRoundRobin(pool, settings.lastAssignedWorkosUserId);
  } else {
    workosUserId = await pickBalanced(
      ctx,
      pool,
      args.orgId,
      args.service,
      args.agentId,
    );
  }

  await ctx.db.patch(args.conversationId, {
    assignedAgentId: args.agentId,
    assignedUserId: workosUserId,
    leadAssignmentFallback: usedFallback ? true : undefined,
    updatedAt: now,
  });
  await logConversationEvent(ctx, {
    conversationId: args.conversationId,
    action: "assignee_changed",
    metadata: {
      assigneeUserId: workosUserId,
      assignmentMethod: method,
      fallback: usedFallback,
    },
  });
  await ctx.runMutation(internal.analytics.syncConversationAnalytics, {
    conversationId: args.conversationId,
  });

  if (method === "round_robin" && pool.length > 0) {
    await ctx.db.patch(settings._id, {
      lastAssignedWorkosUserId: workosUserId,
      lastAssignedAt: now,
      updatedAt: now,
    });
  }
}
