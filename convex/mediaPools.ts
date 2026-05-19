import { Workpool } from "@convex-dev/workpool";
import { components } from "./_generated/api";

export const mediaDeletePool = new Workpool(components.mediaDeleteWorkpool, {
  maxParallelism: 5,
});
