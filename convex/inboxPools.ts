import { Workpool } from "@convex-dev/workpool";
import { components } from "./_generated/api";

export const inboxAiReplyPool = new Workpool(components.inboxAiReplyWorkpool, {
  maxParallelism: 4,
});

export const metaIndicatorPool = new Workpool(components.metaIndicatorWorkpool, {
  maxParallelism: 4,
});

export const metaReactionPool = new Workpool(components.metaReactionWorkpool, {
  maxParallelism: 4,
});

export const threadSummarizerPool = new Workpool(components.threadSummarizerWorkpool, {
  maxParallelism: 4,
});

export const leadLabelPool = new Workpool(components.leadLabelWorkpool, {
  maxParallelism: 4,
});
