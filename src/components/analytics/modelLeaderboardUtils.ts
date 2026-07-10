export type LifetimeModelUsageRow = {
  model: string;
  totalTokens: number;
};

export type MonthlyModelUsageAggregates = {
  topModels: string[];
  data: Array<Record<string, number | string>>;
};

export type SupportedModelOption = {
  value: string;
  label: string;
  chef?: string;
  imageUrl?: string;
};

export function formatTokens(num: number, decimals = true): string {
  if (num >= 1e12) {
    const val = num / 1e12;
    return (decimals ? val.toFixed(2) : val.toFixed(0)) + 'T';
  }
  if (num >= 1e9) {
    const val = num / 1e9;
    return (decimals ? val.toFixed(2) : val.toFixed(0)) + 'B';
  }
  if (num >= 1e6) {
    const val = num / 1e6;
    return (decimals ? val.toFixed(2) : val.toFixed(0)) + 'M';
  }
  if (num >= 1e3) {
    const val = num / 1e3;
    return (decimals && val % 1 !== 0 ? val.toFixed(1) : val.toFixed(0)) + 'K';
  }
  return num.toLocaleString();
}

function findSupportedModel(
  model: string,
  supportedModels?: SupportedModelOption[],
) {
  return supportedModels?.find((entry) => entry.value === model);
}

export function getCleanModelName(
  model: string,
  supportedModels?: SupportedModelOption[],
): string {
  const found = findSupportedModel(model, supportedModels);
  if (found) return found.label;

  const baseName = model.split('/').pop() || model;
  return baseName.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function getModelChef(
  model: string,
  supportedModels?: SupportedModelOption[],
): string {
  const found = findSupportedModel(model, supportedModels);
  if (found?.chef) return found.chef;

  const parts = model.split('/');
  return parts.length > 1 ? parts[0]! : 'openrouter';
}

export function getModelImageUrl(
  model: string,
  supportedModels?: SupportedModelOption[],
): string | undefined {
  return findSupportedModel(model, supportedModels)?.imageUrl;
}

export function buildModelColorMap(
  models: string[],
  modelUsageChartColor: (index: number) => string,
): Map<string, string> {
  const colorMap = new Map<string, string>();
  models.forEach((model, index) => {
    colorMap.set(model, modelUsageChartColor(index));
  });
  return colorMap;
}
