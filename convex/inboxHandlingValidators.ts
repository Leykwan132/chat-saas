import { doc } from "convex-helpers/validators";
import { v } from "convex/values";
import schema from "./schema";

export const inboxHandlingSummaryValidator = doc(
  schema,
  "inboxConversationSummaries",
).extend({
  handling: v.union(
    v.literal("ai"),
    v.literal("human"),
    v.literal("attention"),
  ),
});
