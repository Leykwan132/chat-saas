import {
  formatKnowledgeBaseLimit,
  PLAN_CATALOG,
  type PlanKey,
} from "../../../shared/planCatalog";

export type PlanLimitChange = {
  label: string;
  from: string;
  to: string;
  direction: "up" | "down";
};

function rankLimit(value: number | "unlimited"): number {
  return value === "unlimited" ? Number.POSITIVE_INFINITY : value;
}

function formatCount(value: number | "unlimited"): string {
  return value === "unlimited" ? "Unlimited" : value.toLocaleString("en-US");
}

function pushChange(
  changes: PlanLimitChange[],
  label: string,
  from: number | "unlimited",
  to: number | "unlimited",
  format: (value: number | "unlimited") => string,
) {
  const fromRank = rankLimit(from);
  const toRank = rankLimit(to);
  if (fromRank === toRank) return;
  changes.push({
    label,
    from: format(from),
    to: format(to),
    direction: toRank > fromRank ? "up" : "down",
  });
}

export function getPlanLimitChanges(
  fromPlanKey: PlanKey,
  toPlanKey: PlanKey,
): PlanLimitChange[] {
  const from = PLAN_CATALOG[fromPlanKey];
  const to = PLAN_CATALOG[toPlanKey];
  const changes: PlanLimitChange[] = [];
  pushChange(changes, "Agents", from.maxAgents, to.maxAgents, formatCount);
  pushChange(changes, "Channels", from.maxChannels, to.maxChannels, formatCount);
  pushChange(
    changes,
    "Monthly credits",
    from.monthlyCredits,
    to.monthlyCredits,
    formatCount,
  );
  pushChange(changes, "Team members", from.maxMembers, to.maxMembers, formatCount);
  pushChange(
    changes,
    "Knowledge base",
    from.knowledgeBaseBytesPerAgent,
    to.knowledgeBaseBytesPerAgent,
    (value) => formatKnowledgeBaseLimit(Number(value)),
  );
  return changes;
}
