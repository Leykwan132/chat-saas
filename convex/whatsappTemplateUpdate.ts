import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
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
  resolveRemoteTemplate,
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
    const wabaId = channel.wabaId!.trim();
    const category = normalizeCategory(args.category);
    const components = args.components.map(normalizeUpdateComponent);

    if (components.length === 0) {
      throw new Error("Choose at least one template component to update.");
    }

    const remoteTemplate = await resolveRemoteTemplate({
      wabaId,
      token,
      templateName: args.templateName,
      templateLanguage: args.templateLanguage,
    });
    const remoteTemplateId = remoteTemplate.id?.trim();
    if (!remoteTemplateId) throw new Error("Template could not be found on Meta.");

    const metaComponents = await prepareMetaUpdateComponents(components, token);
    const res = await fetch(`${graphBase()}/${remoteTemplateId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ category, components: metaComponents }),
    });
    await readGraphObject(res, "Meta template update failed");

    const fullComponents = mergeTemplateComponents(remoteTemplate.components, components);
    const mutationArgs = {
      orgId: resolvedOrgId,
      channelId: args.channelId,
      name: args.templateName,
      language: args.templateLanguage,
      category,
      components: fullComponents,
      ...(hasNamedBodyParameters(fullComponents)
        ? { parameterFormat: "named" as const }
        : {}),
    };
    const result: { templateId: Id<"whatsappTemplates"> } = await ctx.runMutation(
      internal.whatsappTemplates.upsertLocalTemplateComponents,
      mutationArgs,
    );

    if (hasMediaHeaderUpdate(components)) {
      await ctx.runMutation(
        internal.whatsappTemplateMediaPool.enqueueTemplateMediaPreparation,
        { templateId: result.templateId },
      );
    }

    return { ok: true as const };
  },
});
