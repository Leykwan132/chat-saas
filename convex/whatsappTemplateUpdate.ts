import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";
import { graphBase, readGraphObject } from "./whatsappTemplateMetaUpload";
import {
  getOrgWhatsAppChannel,
  hasMediaHeaderUpdate,
  hasNamedBodyParameters,
  mergeTemplateComponents,
  normalizeCategory,
  normalizeUpdateComponent,
  prepareMetaUpdateComponents,
  templateUpdateComponentValidator,
} from "./whatsappTemplateUpdateHelpers";

export const updateTemplateComponents = action({
  args: {
    channelId: v.id("channels"),
    templateName: v.string(),
    templateLanguage: v.string(),
    category: v.string(),
    components: v.array(templateUpdateComponentValidator),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const channel = await getOrgWhatsAppChannel(ctx, args.channelId, resolvedOrgId);
    const token = channel.accessToken!.trim();
    const category = normalizeCategory(args.category);
    const components = args.components.map(normalizeUpdateComponent);

    if (components.length === 0) {
      throw new Error("Choose at least one template component to update.");
    }

    const localTemplate = await ctx.runQuery(
      internal.whatsappTemplateQueries.getByChannelAndNameAndLanguage,
      {
        channelId: args.channelId,
        name: args.templateName,
        language: args.templateLanguage,
      },
    );
    if (localTemplate === null || localTemplate.orgId !== resolvedOrgId) {
      throw new Error("Template not found");
    }
    const fullComponents = mergeTemplateComponents(localTemplate.components, components);
    const update = await ctx.runMutation(internal.whatsappTemplates.beginTemplateUpdate, {
      orgId: resolvedOrgId,
      channelId: args.channelId,
      name: args.templateName,
      language: args.templateLanguage,
      category,
      components: fullComponents,
      ...(hasNamedBodyParameters(fullComponents)
        ? { parameterFormat: "named" as const }
        : {}),
    });

    try {
      const metaComponents = await prepareMetaUpdateComponents(components, token);
      const res = await fetch(`${graphBase()}/${update.metaTemplateId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category, components: metaComponents }),
      });
      await readGraphObject(res, "Meta template update failed");
      await ctx.runMutation(internal.whatsappTemplates.completeTemplateSubmission, {
        templateId: update.templateId,
        metaTemplateId: update.metaTemplateId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.whatsappTemplates.failTemplateSubmission, {
        templateId: update.templateId,
        error: message,
      });
      throw error;
    }

    if (hasMediaHeaderUpdate(components)) {
      await ctx.runMutation(
        internal.whatsappTemplateMediaPool.enqueueTemplateMediaPreparation,
        { templateId: update.templateId },
      );
    }

    return { ok: true as const };
  },
});
