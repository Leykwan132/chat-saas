import { query } from "./_generated/server";
import { getAuthContext } from "./authUtils";

export const getForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const { identity } = await getAuthContext(ctx);

    return await ctx.db
      .query("messages")
      .withIndex("by_author", (q) => q.eq("author", identity.email as string))
      .collect();
  },
});
