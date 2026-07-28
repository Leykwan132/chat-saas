import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export const run = internalAction({
  args: {
    jobId: v.id("teamDeletionJobs"),
  },
  returns: v.object({
    completed: v.boolean(),
  }),
  handler: async () => {
    return { completed: false };
  },
});
