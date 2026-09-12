import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { checkAiFeature, getPlanForCurrentSession } from "../plans";

export const internalCanResearchWebsites = internalQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const stripeInfo = await getPlanForCurrentSession(ctx);
    return checkAiFeature(stripeInfo.plan, "website_research");
  },
});
