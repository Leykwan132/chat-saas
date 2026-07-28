"use node";

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";
import { deleteFromCFOrThrow } from "../cloudflare";
import { r2 } from "../media/r2";
import { deleteWhatsAppTemplateMedia } from "../whatsappTemplateMediaGraph";

export async function deleteTrackedExternalResource(
  ctx: ActionCtx,
  resource: Doc<"teamExternalResources">,
): Promise<void> {
  if (resource.provider === "cloudflare") {
    await deleteFromCFOrThrow(resource.resourceId);
  } else if (resource.provider === "r2") {
    await r2.deleteObject(ctx, resource.resourceId);
  } else {
    if (!resource.authorization) {
      throw new Error("Meta media cleanup authorization is missing");
    }
    await deleteWhatsAppTemplateMedia(
      resource.resourceId,
      resource.authorization,
    );
  }
  await ctx.runMutation(
    internal.teamDeletion.externalResourceState.remove,
    { resourceId: resource._id },
  );
}

export const run = internalAction({
  args: {
    resourceId: v.id("teamExternalResources"),
  },
  returns: v.object({
    completed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const resource: Doc<"teamExternalResources"> | null =
      await ctx.runQuery(
        internal.teamDeletion.externalResourceState.get,
        args,
      );
    if (!resource) return { completed: true };
    await deleteTrackedExternalResource(ctx, resource);
    return { completed: true };
  },
});
