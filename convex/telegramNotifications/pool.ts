import { Workpool } from "@convex-dev/workpool";
import { components } from "../_generated/api";

export const telegramNotificationWorkpool = new Workpool(
  components.telegramNotificationWorkpool,
  { maxParallelism: 1, retryActionsByDefault: true },
);
