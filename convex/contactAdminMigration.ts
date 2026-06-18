import { internalMutation } from "./_generated/server";
import { normalizeContactStatus } from "./contactAdminShared";

export const migrateContactRequestStatuses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("contactRequests").collect();
    let migrated = 0;

    for (const request of requests) {
      const nextStatus = normalizeContactStatus(request.status);
      if (nextStatus === request.status) {
        continue;
      }

      await ctx.db.patch(request._id, {
        status: nextStatus,
        updatedAt: Date.now(),
      });
      migrated += 1;
    }

    return { migrated, total: requests.length };
  },
});
