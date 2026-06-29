import { v } from "convex/values";

export const serviceFieldValidator = v.object({
  key: v.string(),
  label: v.string(),
  type: v.union(
    v.literal("text"),
    v.literal("number"),
    v.literal("select"),
    v.literal("boolean"),
    v.literal("date"),
    v.literal("time"),
    v.literal("phone"),
  ),
  options: v.optional(v.array(v.string())),
});

const collectedValueValidator = v.union(v.string(), v.number(), v.boolean(), v.null());

export const collectedFieldsValidator = v.record(v.string(), collectedValueValidator);

export const timeSlotPolicyValidator = v.union(
  v.literal("offer_slots"),
  v.literal("customer_suggests"),
);

export const salesStyleValidator = v.union(
  v.literal("proactive"),
  v.literal("neutral"),
  v.literal("gentle"),
);

export const assignmentStrategyValidator = v.union(
  v.literal("conversation_owner"),
  v.literal("balanced"),
  v.literal("round_robin"),
  v.literal("specific_user"),
);
