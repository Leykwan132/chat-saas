import { Workpool } from "@convex-dev/workpool";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getPublicMediaUrl } from "./media/r2";
import {
  assertWhatsAppTemplateMediaSpec,
  whatsappTemplateMediaFilename,
} from "../shared/whatsappTemplateMedia";

export const whatsappTemplateMediaPool = new Workpool(
  components.whatsappTemplateMediaWorkpool,
  { maxParallelism: 2 },
);

const DEFAULT_GRAPH_VERSION = "v25.0";

type HeaderMediaComponent = {
  type?: unknown;
  format?: unknown;
  r2Key?: unknown;
  filename?: unknown;
  mimeType?: unknown;
};

function graphBase(): string {
  const version = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  return `https://graph.facebook.com/${version}`;
}

function graphError(body: unknown) {
  return typeof body === "string" ? body : JSON.stringify(body, null, 2);
}

async function readGraphObject(response: Response, errorPrefix: string) {
  const text = await response.text();
  let body: unknown;
  try {
    body = text.length ? JSON.parse(text) : text;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`${errorPrefix}: ${graphError(body)}`);
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new Error(`${errorPrefix}: Meta returned an unexpected response.`);
  }
  return body as Record<string, unknown>;
}

function asComponentArray(value: unknown): HeaderMediaComponent[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (component): component is HeaderMediaComponent =>
      component !== null &&
      typeof component === "object" &&
      !Array.isArray(component),
  );
}

function mediaComponentFromTemplate(
  template: Doc<"whatsappTemplates">,
) {
  for (const component of asComponentArray(template.components)) {
    if (String(component.type ?? "").toUpperCase() !== "HEADER") continue;
    const format = String(component.format ?? "").toUpperCase();
    if (format !== "DOCUMENT" && format !== "IMAGE" && format !== "VIDEO") {
      continue;
    }
    const r2Key = typeof component.r2Key === "string" ? component.r2Key.trim() : "";
    const mimeType = typeof component.mimeType === "string" ? component.mimeType.trim() : "";
    if (!r2Key || !mimeType) return null;
    const spec = assertWhatsAppTemplateMediaSpec(mimeType);
    if (spec.headerFormat !== format) {
      throw new Error("Header media format does not match MIME type.");
    }
    return {
      r2Key,
      filename:
        typeof component.filename === "string"
          ? component.filename.trim()
          : undefined,
      mimeType: spec.mimeType,
      headerFormat: spec.headerFormat,
    };
  }
  return null;
}

export const enqueueTemplateMediaPreparation = internalMutation({
  args: {
    templateId: v.id("whatsappTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (template === null) return null;

    const media = mediaComponentFromTemplate(template);
    if (media === null) return null;

    const filename = whatsappTemplateMediaFilename(media.filename, media.mimeType);
    const now = Date.now();
    const existing = await ctx.db
      .query("whatsappTemplateMediaAssets")
      .withIndex("by_templateId", (q) => q.eq("templateId", template._id))
      .take(1);

    const existingAsset = existing[0];
    const payload = {
      orgId: template.orgId,
      channelId: template.channelId,
      templateId: template._id,
      templateName: template.name,
      templateLanguage: template.language,
      r2Key: media.r2Key,
      filename,
      mimeType: media.mimeType,
      headerFormat: media.headerFormat,
      status: "preparing" as const,
      updatedAt: now,
    };

    const mediaAssetId: Id<"whatsappTemplateMediaAssets"> =
      existingAsset === undefined
        ? await ctx.db.insert("whatsappTemplateMediaAssets", {
            ...payload,
            retryCount: 0,
            createdAt: now,
          })
        : existingAsset._id;

    if (existingAsset !== undefined) {
      await ctx.db.patch(existingAsset._id, {
        ...payload,
        lastError: undefined,
      });
    }

    await whatsappTemplateMediaPool.enqueueAction(
      ctx,
      internal.whatsappTemplateMediaPool.prepareTemplateMediaAsset,
      { mediaAssetId },
    );

    return { mediaAssetId };
  },
});

export const getPrepareMediaContext = internalQuery({
  args: {
    mediaAssetId: v.id("whatsappTemplateMediaAssets"),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.mediaAssetId);
    if (asset === null) return null;
    const channel = await ctx.db.get(asset.channelId);
    if (channel === null) return null;
    return { asset, channel };
  },
});

export const markMediaPreparing = internalMutation({
  args: {
    mediaAssetId: v.id("whatsappTemplateMediaAssets"),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.mediaAssetId);
    if (asset === null) return;
    await ctx.db.patch(args.mediaAssetId, {
      status: "preparing",
      retryCount: asset.retryCount + 1,
      lastError: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const markMediaReady = internalMutation({
  args: {
    mediaAssetId: v.id("whatsappTemplateMediaAssets"),
    mediaId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.mediaAssetId, {
      mediaId: args.mediaId.trim(),
      status: "ready",
      uploadedAt: Date.now(),
      lastError: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const markMediaFailed = internalMutation({
  args: {
    mediaAssetId: v.id("whatsappTemplateMediaAssets"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.mediaAssetId, {
      status: "failed",
      lastError: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const prepareTemplateMediaAsset = internalAction({
  args: {
    mediaAssetId: v.id("whatsappTemplateMediaAssets"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.whatsappTemplateMediaPool.markMediaPreparing, {
      mediaAssetId: args.mediaAssetId,
    });

    try {
      const context = await ctx.runQuery(
        internal.whatsappTemplateMediaPool.getPrepareMediaContext,
        { mediaAssetId: args.mediaAssetId },
      );
      if (context === null) {
        throw new Error("Template media asset not found.");
      }

      const { asset, channel } = context;
      const spec = assertWhatsAppTemplateMediaSpec(asset.mimeType);
      if (spec.headerFormat !== asset.headerFormat) {
        throw new Error("Stored media format does not match MIME type.");
      }

      const token = (channel.accessToken ?? "").trim();
      const phoneNumberId = channel.phoneNumberId?.trim();
      if (!token || !phoneNumberId) {
        throw new Error("WhatsApp channel is missing access token or phone number ID.");
      }

      const mediaResponse = await fetch(getPublicMediaUrl(asset.r2Key));
      if (!mediaResponse.ok) {
        throw new Error(
          `Failed to fetch template media: ${mediaResponse.status} ${mediaResponse.statusText}`,
        );
      }

      const arrayBuffer = await mediaResponse.arrayBuffer();
      if (arrayBuffer.byteLength <= 0) {
        throw new Error("Template media file is empty.");
      }

      const blob = new Blob([arrayBuffer], { type: spec.mimeType });
      const formData = new FormData();
      formData.append("messaging_product", "whatsapp");
      formData.append("file", blob, asset.filename);

      const uploadResponse = await fetch(`${graphBase()}/${phoneNumberId}/media`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const uploadData = await readGraphObject(
        uploadResponse,
        "Meta template media upload failed",
      );
      const mediaId = uploadData.id;
      if (typeof mediaId !== "string" || !mediaId.trim()) {
        throw new Error("Meta media upload did not return a media ID.");
      }

      await ctx.runMutation(internal.whatsappTemplateMediaPool.markMediaReady, {
        mediaAssetId: args.mediaAssetId,
        mediaId,
      });

      return { ok: true, mediaId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.whatsappTemplateMediaPool.markMediaFailed, {
        mediaAssetId: args.mediaAssetId,
        error: message,
      });
      throw error;
    }
  },
});
