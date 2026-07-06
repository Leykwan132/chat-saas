import type { Doc } from "./_generated/dataModel";

export type AgentCostSortKey = [string, number];

export type AgentCostNamespace = {
  userId: string;
  provider: string;
  model: string;
};

export const UNCOSTED_AGENT_COST_NAMESPACE = "__uncosted__";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function extractOpenRouterCostUsd(providerMetadata: unknown): number | null {
  const root = asRecord(providerMetadata);
  const openrouter = asRecord(root?.openrouter);
  const usage = asRecord(openrouter?.usage);
  return readNumber(usage?.cost);
}

export function roundUsd(value: number): number {
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}

export function costMonthKeyFromTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

export function costMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${monthNames[Number(month) - 1]} ${year}`;
}

export function costMonthRange(startMonthKey: string, endMonthKey: string) {
  const [startYear, startMonth] = startMonthKey.split("-").map(Number);
  const [endYear, endMonth] = endMonthKey.split("-").map(Number);
  const months: Array<{ monthKey: string; label: string }> = [];
  let current = new Date(Date.UTC(startYear, startMonth - 1, 1));
  const end = new Date(Date.UTC(endYear, endMonth - 1, 1));

  while (current <= end) {
    const monthKey = costMonthKeyFromTimestamp(current.getTime());
    months.push({ monthKey, label: costMonthLabel(monthKey) });
    current = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1));
  }

  return months;
}

export function encodeAgentCostNamespace(parts: AgentCostNamespace) {
  return JSON.stringify([parts.userId, parts.provider, parts.model]);
}

export function parseAgentCostNamespace(namespace: string): AgentCostNamespace | null {
  if (namespace === UNCOSTED_AGENT_COST_NAMESPACE) {
    return null;
  }

  try {
    const parts = JSON.parse(namespace);
    if (
      Array.isArray(parts) &&
      parts.length === 3 &&
      parts.every((part) => typeof part === "string")
    ) {
      const [userId, provider, model] = parts;
      return { userId, provider, model };
    }
  } catch {
    return null;
  }

  return null;
}

export function agentCostNamespace(row: Doc<"rawAgentUsage">) {
  const costUsd = extractOpenRouterCostUsd(row.providerMetadata);
  if (costUsd === null) {
    return UNCOSTED_AGENT_COST_NAMESPACE;
  }
  return encodeAgentCostNamespace({
    userId: row.userId ?? "unassigned",
    provider: row.provider,
    model: row.model,
  });
}

export function agentCostSortKey(row: Doc<"rawAgentUsage">): AgentCostSortKey {
  return [costMonthKeyFromTimestamp(row.createdAt), row.createdAt];
}

export function agentCostMonthBounds(monthKey: string) {
  return { prefix: [monthKey] as [string] };
}
