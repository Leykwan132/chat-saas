import type { Doc } from "./_generated/dataModel";

export type ModelAccumulator = {
  userId: string;
  model: string;
  provider: string;
  requestCount: number;
  totalTokens: number;
  totalCostUsd: number;
  lastRequestAt: number;
};

export type UserAccumulator = {
  userId: string;
  requestCount: number;
  totalTokens: number;
  totalCostUsd: number;
  lastRequestAt: number;
  models: Map<string, ModelAccumulator>;
};

export type MonthlyUserAccumulator = UserAccumulator & {
  monthKey: string;
  monthLabel: string;
};

export type MonthAccumulator = {
  monthKey: string;
  label: string;
  requestCount: number;
  totalTokens: number;
  totalCostUsd: number;
  lastRequestAt: number;
};

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

function getMonthKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `${monthNames[Number(month) - 1]} ${year}`;
}

function modelKey(row: Doc<"rawAgentUsage">): string {
  return `${row.provider}:${row.model}`;
}

export function addUsageRow(
  users: Map<string, UserAccumulator>,
  row: Doc<"rawAgentUsage">,
  costUsd: number,
  accumulatorKey?: string,
) {
  const userId = row.userId ?? "unassigned";
  const userAccumulatorKey = accumulatorKey ?? userId;
  const user =
    users.get(userAccumulatorKey) ??
    {
      userId,
      requestCount: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      lastRequestAt: 0,
      models: new Map<string, ModelAccumulator>(),
    };

  user.requestCount += 1;
  user.totalTokens += row.usage.totalTokens;
  user.totalCostUsd += costUsd;
  user.lastRequestAt = Math.max(user.lastRequestAt, row.createdAt);

  const modelAccumulatorKey = modelKey(row);
  const model =
    user.models.get(modelAccumulatorKey) ??
    {
      userId,
      model: row.model,
      provider: row.provider,
      requestCount: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      lastRequestAt: 0,
    };
  model.requestCount += 1;
  model.totalTokens += row.usage.totalTokens;
  model.totalCostUsd += costUsd;
  model.lastRequestAt = Math.max(model.lastRequestAt, row.createdAt);

  user.models.set(modelAccumulatorKey, model);
  users.set(userAccumulatorKey, user);
}

export function addMonthlyUsageRow(
  users: Map<string, MonthlyUserAccumulator>,
  row: Doc<"rawAgentUsage">,
  costUsd: number,
) {
  const monthKey = getMonthKey(row.createdAt);
  const userId = row.userId ?? "unassigned";
  const accumulatorKey = `${monthKey}:${userId}`;
  addUsageRow(users as Map<string, UserAccumulator>, row, costUsd, accumulatorKey);
  const user = users.get(accumulatorKey);
  if (user) {
    user.monthKey = monthKey;
    user.monthLabel = getMonthLabel(monthKey);
  }
}

export function addMonthOption(
  months: Map<string, MonthAccumulator>,
  row: Doc<"rawAgentUsage">,
  costUsd: number,
) {
  const monthKey = getMonthKey(row.createdAt);
  const month =
    months.get(monthKey) ??
    {
      monthKey,
      label: getMonthLabel(monthKey),
      requestCount: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      lastRequestAt: 0,
    };
  month.requestCount += 1;
  month.totalTokens += row.usage.totalTokens;
  month.totalCostUsd += costUsd;
  month.lastRequestAt = Math.max(month.lastRequestAt, row.createdAt);
  months.set(monthKey, month);
}

export function serializeMonthOptions(months: Map<string, MonthAccumulator>) {
  return [...months.values()]
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
    .map((month) => ({
      monthKey: month.monthKey,
      label: month.label,
      requestCount: month.requestCount,
      totalTokens: month.totalTokens,
      totalCostUsd: roundUsd(month.totalCostUsd),
      lastRequestAt: month.lastRequestAt,
    }));
}
