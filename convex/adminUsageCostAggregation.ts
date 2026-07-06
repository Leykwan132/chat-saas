import { costMonthLabel, roundUsd } from "./agentCostAggregateModel";

export type ModelAccumulator = {
  userId: string;
  model: string;
  provider: string;
  requestCount: number;
  totalCostUsd: number;
  lastRequestAt: number;
};

export type UserAccumulator = {
  userId: string;
  requestCount: number;
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
  totalCostUsd: number;
  lastRequestAt: number;
};

export type CostAggregateInput = {
  userId: string;
  model: string;
  provider: string;
  requestCount: number;
  totalCostUsd: number;
  lastRequestAt: number;
};

function modelKey(input: Pick<CostAggregateInput, "provider" | "model">): string {
  return `${input.provider}:${input.model}`;
}

export function addCostAggregateRow(
  users: Map<string, UserAccumulator>,
  input: CostAggregateInput,
  accumulatorKey?: string,
) {
  const userAccumulatorKey = accumulatorKey ?? input.userId;
  const user =
    users.get(userAccumulatorKey) ??
    {
      userId: input.userId,
      requestCount: 0,
      totalCostUsd: 0,
      lastRequestAt: 0,
      models: new Map<string, ModelAccumulator>(),
    };

  user.requestCount += input.requestCount;
  user.totalCostUsd += input.totalCostUsd;
  user.lastRequestAt = Math.max(user.lastRequestAt, input.lastRequestAt);

  const modelAccumulatorKey = modelKey(input);
  const model =
    user.models.get(modelAccumulatorKey) ??
    {
      userId: input.userId,
      model: input.model,
      provider: input.provider,
      requestCount: 0,
      totalCostUsd: 0,
      lastRequestAt: 0,
    };

  model.requestCount += input.requestCount;
  model.totalCostUsd += input.totalCostUsd;
  model.lastRequestAt = Math.max(model.lastRequestAt, input.lastRequestAt);

  user.models.set(modelAccumulatorKey, model);
  users.set(userAccumulatorKey, user);
}

export function addMonthlyCostAggregateRow(
  users: Map<string, MonthlyUserAccumulator>,
  input: CostAggregateInput & { monthKey: string },
) {
  const accumulatorKey = `${input.monthKey}:${input.userId}`;
  addCostAggregateRow(users as Map<string, UserAccumulator>, input, accumulatorKey);
  const user = users.get(accumulatorKey);
  if (user) {
    user.monthKey = input.monthKey;
    user.monthLabel = costMonthLabel(input.monthKey);
  }
}

export function addMonthOption(
  months: Map<string, MonthAccumulator>,
  input: CostAggregateInput & { monthKey: string },
) {
  const month =
    months.get(input.monthKey) ??
    {
      monthKey: input.monthKey,
      label: costMonthLabel(input.monthKey),
      requestCount: 0,
      totalCostUsd: 0,
      lastRequestAt: 0,
    };
  month.requestCount += input.requestCount;
  month.totalCostUsd += input.totalCostUsd;
  month.lastRequestAt = Math.max(month.lastRequestAt, input.lastRequestAt);
  months.set(input.monthKey, month);
}

export function serializeMonthOptions(months: Map<string, MonthAccumulator>) {
  return [...months.values()]
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
    .map((month) => ({
      monthKey: month.monthKey,
      label: month.label,
      requestCount: month.requestCount,
      totalCostUsd: roundUsd(month.totalCostUsd),
      lastRequestAt: month.lastRequestAt,
    }));
}
