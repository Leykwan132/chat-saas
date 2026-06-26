import { v } from "convex/values";

export const workflowNodeKindValidator = v.union(
  v.literal("start"),
  v.literal("aiResponds"),
  v.literal("sendImage"),
  v.literal("sendText"),
  v.literal("closeConversation"),
  v.literal("updateLeadsStatus"),
  v.literal("bookAppointment"),
  v.literal("subagent"),
  v.literal("say"),
  v.literal("updateState"),
  v.literal("agentTransfer"),
  v.literal("phoneTransfer"),
  v.literal("tool"),
  v.literal("end"),
);

export const addableWorkflowNodeKindValidator = v.union(
  v.literal("updateLeadsStatus"),
  v.literal("bookAppointment"),
  v.literal("aiResponds"),
  v.literal("closeConversation"),
);
