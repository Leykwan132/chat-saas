import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// One-shot dev reset: deletes every row from domain tables that previously
// held Clerk-keyed userId / orgId values, plus the new users / organizations
// tables themselves. Run once after the Clerk -> WorkOS migration:
//
//   npx convex run devReset:wipe
//
// Webhooks (and the AuthKit sign-in flow) will repopulate users / orgs.
export const wipe = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "agents",
      "textEntries",
      "fileEntries",
      "webEntries",
      "qaEntries",
      "conversations",
      "messages",
      "users",
      "organizations",
      "processedEvents",
    ] as const;

    const counts: Record<string, number> = {};
    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      counts[table] = rows.length;
    }
    return counts;
  },
});

// Same shape as `wipe` but targets only the WorkOS-bookkeeping tables. Useful
// when the webhook produced corrupt rows during dev and you want to start the
// users / organizations tables fresh without nuking domain data.
export const wipeWorkosState = internalMutation({
  args: { confirm: v.literal("yes") },
  handler: async (ctx) => {
    const tables = ["users", "organizations", "processedEvents"] as const;
    const counts: Record<string, number> = {};
    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      counts[table] = rows.length;
    }
    return counts;
  },
});
