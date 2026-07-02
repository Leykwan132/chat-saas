import { v } from "convex/values";

export const workflowNodeKindValidator = v.union(
  v.literal("start"),
  v.literal("answerQuestions"),
  v.literal("aiResponds"),
  v.literal("sendImage"),
  v.literal("sendFile"),
  v.literal("sendText"),
  v.literal("closeConversation"),
  v.literal("humanEscalation"),
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
  v.literal("answerQuestions"),
  v.literal("sendImage"),
  v.literal("sendFile"),
  v.literal("updateLeadsStatus"),
  v.literal("bookAppointment"),
  v.literal("humanEscalation"),
  v.literal("closeConversation"),
);
