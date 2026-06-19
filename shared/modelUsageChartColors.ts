/** Distinct palette for multi-series model usage charts (stacked areas/bars). */
export const MODEL_USAGE_CHART_COLORS = [
  "#5B8DEF",
  "#3EB489",
  "#F4A261",
  "#9B72CF",
  "#E76E96",
  "#4ECDC4",
  "#E9C46A",
  "#6C8EBF",
  "#C084FC",
  "#F472B6",
  "#2DD4BF",
  "#FB923C",
] as const;

export const MODEL_USAGE_OTHERS_COLOR = "#94A3B8";

export function modelUsageChartColor(index: number): string {
  return MODEL_USAGE_CHART_COLORS[index % MODEL_USAGE_CHART_COLORS.length];
}
