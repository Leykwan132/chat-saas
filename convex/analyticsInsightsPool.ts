import { Workpool } from "@convex-dev/workpool";
import { components } from "./_generated/api";

export const advancedAnalyticsPool = new Workpool(
  components.advancedAnalyticsWorkpool,
  { maxParallelism: 1 },
);
