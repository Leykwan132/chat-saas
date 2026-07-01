"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  getHeaderMediaMetadata,
  graphBase,
  readGraphObject,
  resolveMetaAppId,
  uploadHeaderAssetToMeta,
  type MetaTemplateComponent,
} from "./whatsappTemplateMetaUpload";

function cloneComponents(value: unknown): MetaTemplateComponent[] {
  const cloned = JSON.parse(JSON.stringify(value)) as unknown;
  if (!Array.isArray(cloned)) {
    throw new Error("Template components are invalid.");
  }

  return cloned.map((component) => {
    if (component === null || typeof component !== "object" || Array.isArray(component)) {
      throw new Error("Template components are invalid.");
    }
    return component as MetaTemplateComponent;
  });
}

export const submitTemplateToMeta = internalAction({
  args: {
    templateId: v.id("whatsappTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.runQuery(internal.whatsappTemplates.internalGetTemplate, {
      templateId: args.templateId,
    });
    if (!template) {
      console.error(`Template not found: ${args.templateId}`);
      return;
    }

    try {
      const channel = await ctx.runQuery(internal.whatsappTemplates.internalGetChannel, {
        channelId: template.channelId,
      });
      if (!channel) {
        throw new Error("WhatsApp channel not found");
      }
      
      const token = (channel.accessToken ?? "").trim();
      if (!token) {
        throw new Error("WhatsApp access token is missing");
      }
      
      const wabaId = channel.wabaId?.trim();
      if (!wabaId) {
        throw new Error("WABA ID is missing for this channel");
      }

      const appId = await resolveMetaAppId(token);
      const components = cloneComponents(template.components);

      for (const comp of components) {
        const metadata = getHeaderMediaMetadata(comp);
        if (metadata === null) continue;

        const headerHandle = await uploadHeaderAssetToMeta({
          token,
          appId,
          r2Key: metadata.r2Key,
          filename: metadata.filename,
          mimeType: metadata.mimeType,
        });

        comp.example = {
          header_handle: [headerHandle],
        };
        delete comp.r2Key;
        delete comp.filename;
        delete comp.mimeType;
      }

      console.log(`Submitting template ${template.name} to Meta...`);
      const payload: Record<string, unknown> = {
        name: template.name.trim(),
        category: template.category,
        language: template.language.trim(),
        components,
      };
      if (template.parameterFormat === "named") {
        payload.parameter_format = "named";
      }
      const metaRes = await fetch(`${graphBase()}/${wabaId}/message_templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      await readGraphObject(metaRes, "Meta template creation failed");

      await ctx.runMutation(internal.whatsappTemplates.updateTemplateStatus, {
        templateId: args.templateId,
        status: "submitted",
      });
      await ctx.runMutation(internal.whatsappTemplateMediaPool.enqueueTemplateMediaPreparation, {
        templateId: args.templateId,
      });
      console.log(`Template ${template.name} submitted successfully.`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`Error submitting template ${template.name}:`, errMsg);

      await ctx.runMutation(internal.whatsappTemplates.updateTemplateStatus, {
        templateId: args.templateId,
        status: "failed",
        error: errMsg,
      });
    }
  },
});
