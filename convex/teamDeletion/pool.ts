import { Workpool } from "@convex-dev/workpool";
import { components } from "../_generated/api";

export const teamDeletionPool = new Workpool(
  components.teamDeletionWorkpool,
  {
    maxParallelism: 1,
    retryActionsByDefault: true,
  },
);
