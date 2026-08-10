import { v } from "convex/values";

export const templateKeyValidator = v.union(
  v.literal("blank"),
  v.literal("sales"),
  v.literal("productSales"),
  v.literal("support"),
);

export const agentGoalValidator = v.union(
  v.literal("support"),
  v.literal("bookService"),
);
