import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { isUserEligible } from "./eligibility";
import { getOrCreateLeadAssignmentSettings } from "./helpers";

type RosterEntry = {
  schedule: Doc<"userSchedules">;
  shifts: Doc<"userShifts">[];
  timeOff: Doc<"userTimeOff">[];
};

type AssignmentMethod = "round_robin" | "priority" | "tags";

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

function normalizeMethod(
  method: Doc<"leadAssignmentSettings">["method"],
): AssignmentMethod {
  if (method === "balanced") return "priority";
  return method;
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

async function pickPriority(
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
    const priorityA = a.schedule.assignmentPriority ?? 1;
    const priorityB = b.schedule.assignmentPriority ?? 1;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    const countA = counts.get(a.schedule.workosUserId) ?? 0;
    const countB = counts.get(b.schedule.workosUserId) ?? 0;
    return countA - countB;
  });

  return sorted[0]!.schedule.workosUserId;
}

async function collectConversationTags(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
): Promise<Set<string>> {
  const tags = new Set<string>();
  const conv = await ctx.db.get(conversationId);
  if (conv === null) return tags;

  for (const tag of conv.tags ?? []) {
    const normalized = tag.trim().toLowerCase();
    if (normalized.length > 0) tags.add(normalized);
  }

  if (conv.customerId !== undefined) {
    const customer = await ctx.db.get(conv.customerId);
    if (customer !== null) {
      for (const tag of customer.tags) {
        const normalized = tag.trim().toLowerCase();
        if (normalized.length > 0) tags.add(normalized);
      }
    }
  }

  return tags;
}

async function pickByTags(
  ctx: MutationCtx,
  pool: RosterEntry[],
  conversationId: Id<"conversations">,
  tagRules: Array<{ tag: string; workosUserId: string }>,
): Promise<string | null> {
  if (tagRules.length === 0) return null;

  const tags = await collectConversationTags(ctx, conversationId);
  if (tags.size === 0) return null;

  const poolIds = new Set(pool.map((entry) => entry.schedule.workosUserId));
  for (const rule of tagRules) {
    const normalizedTag = rule.tag.trim().toLowerCase();
    if (normalizedTag.length === 0) continue;
    if (tags.has(normalizedTag) && poolIds.has(rule.workosUserId)) {
      return rule.workosUserId;
    }
  }

  return null;
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
  const method = normalizeMethod(settings.method);
  const tagRules = settings.tagRules ?? [];

  const primaryPool = roster.filter((entry) =>
    isUserEligible(now, entry.schedule, entry.shifts, entry.timeOff),
  );
  const fallbackPool = roster.filter((entry) => entry.schedule.enabled);

  let pool = primaryPool;
  let usedFallback = false;

  if (pool.length === 0 && fallbackPool.length > 0) {
    pool = fallbackPool;
    usedFallback = true;
  }

  let workosUserId: string;
  let usedRoundRobinFallback = false;

  if (pool.length === 0) {
    workosUserId = await resolveLastResortUserId(
      ctx,
      args.orgId,
      args.agentId,
      args.channelConnectedByUserId,
    );
    usedFallback = true;
  } else if (method === "tags") {
    const taggedUserId = await pickByTags(ctx, pool, args.conversationId, tagRules);
    if (taggedUserId !== null) {
      workosUserId = taggedUserId;
    } else {
      workosUserId = pickRoundRobin(pool, settings.lastAssignedWorkosUserId);
      usedRoundRobinFallback = true;
    }
  } else if (method === "round_robin") {
    workosUserId = pickRoundRobin(pool, settings.lastAssignedWorkosUserId);
  } else {
    workosUserId = await pickPriority(ctx, pool, args.orgId, args.service, args.agentId);
  }

  await ctx.db.patch(args.conversationId, {
    assignedAgentId: args.agentId,
    assignedUserId: workosUserId,
    leadAssignmentFallback: usedFallback ? true : undefined,
    updatedAt: now,
  });

  if ((method === "round_robin" || usedRoundRobinFallback) && pool.length > 0) {
    await ctx.db.patch(settings._id, {
      lastAssignedWorkosUserId: workosUserId,
      lastAssignedAt: now,
      updatedAt: now,
    });
  }
}
