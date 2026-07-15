import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  assertWhatsAppTemplateMediaSpec,
  type WhatsAppTemplateHeaderFormat,
  type WhatsAppTemplateSendMediaType,
} from "../shared/whatsappTemplateMedia";
import { extractTemplateParameterKeys } from "../shared/whatsappTemplateParameters";
import { renderWhatsAppTemplateBodyText } from "./whatsappTemplateRender";
import { getPublicMediaUrl } from "./media/r2";
import { buildWhatsAppTemplateHeaderAsset } from "./whatsappTemplatePresentation";
import type { BroadcastHeaderAsset } from "../shared/broadcastMessage";

type TemplateComponent = {
  type?: unknown;
  format?: unknown;
  text?: unknown;
};

type TemplateMediaParameter =
  | { type: "document"; document: { id: string } }
  | { type: "image"; image: { id: string } }
  | { type: "video"; video: { id: string } };

type TemplateTextParameter = {
  type: "text";
  parameter_name: string;
  text: string;
};

type TemplateSendComponent =
  | { type: "header"; parameters: [TemplateMediaParameter] }
  | { type: "body"; parameters: TemplateTextParameter[] };

type TemplateSendPayload = {
  name: string;
  language: { code: string };
  components?: TemplateSendComponent[];
};

export type BuildWhatsAppTemplateSendPayloadArgs = {
  orgId: string;
  channelId: Id<"channels">;
  templateName: string;
  templateLanguage: string;
  customerId?: Id<"customers">;
  toPhone?: string;
};

type TemplateSendBuildResult = {
  template: TemplateSendPayload;
  renderedContent: string;
  headerAsset?: BroadcastHeaderAsset;
};

function asComponentArray(value: unknown): TemplateComponent[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (component): component is TemplateComponent =>
      component !== null &&
      typeof component === "object" &&
      !Array.isArray(component),
  );
}

function getBodyText(template: Doc<"whatsappTemplates"> | null) {
  if (template === null) return "";
  const body = asComponentArray(template.components).find(
    (component) => String(component.type ?? "").toUpperCase() === "BODY",
  );
  return typeof body?.text === "string" ? body.text : "";
}

function getHeaderFormat(template: Doc<"whatsappTemplates"> | null) {
  if (template === null) return null;
  const header = asComponentArray(template.components).find(
    (component) => String(component.type ?? "").toUpperCase() === "HEADER",
  );
  const format = String(header?.format ?? "").toUpperCase();
  if (format === "DOCUMENT" || format === "IMAGE" || format === "VIDEO") {
    return format as WhatsAppTemplateHeaderFormat;
  }
  return null;
}

function requireValue(values: Record<string, string>, key: string) {
  const value = values[key]?.trim();
  if (!value) {
    throw new Error(`Missing value for WhatsApp template parameter @${key}.`);
  }
  return value;
}

function mediaParameter(type: WhatsAppTemplateSendMediaType, id: string): TemplateMediaParameter {
  if (type === "document") return { type, document: { id } };
  if (type === "image") return { type, image: { id } };
  return { type, video: { id } };
}

export async function buildWhatsAppTemplateSendPayload(
  ctx: ActionCtx,
  args: BuildWhatsAppTemplateSendPayloadArgs,
): Promise<TemplateSendPayload> {
  const result = await buildWhatsAppTemplateSendPayloadWithContent(ctx, args);
  return result.template;
}

export async function buildWhatsAppTemplateSendPayloadWithContent(
  ctx: ActionCtx,
  args: BuildWhatsAppTemplateSendPayloadArgs,
): Promise<TemplateSendBuildResult> {
  const queryArgs = {
    orgId: args.orgId,
    channelId: args.channelId,
    templateName: args.templateName,
    templateLanguage: args.templateLanguage,
    ...(args.customerId !== undefined ? { customerId: args.customerId } : {}),
    ...(args.toPhone !== undefined ? { toPhone: args.toPhone } : {}),
  };
  const context = await ctx.runQuery(
    internal.whatsappTemplateSendPayload.getTemplateSendPayloadContext,
    queryArgs,
  );
  const template = context.template;
  const payload: TemplateSendPayload = {
    name: args.templateName.trim(),
    language: { code: args.templateLanguage.trim() },
  };
  const components: TemplateSendComponent[] = [];
  const bodyText = getBodyText(template);
  const renderedContent = renderWhatsAppTemplateBodyText(
    bodyText,
    context.parameterValues,
  );
  const bodyKeys = extractTemplateParameterKeys(bodyText);
  if (bodyKeys.length > 0) {
    components.push({
      type: "body",
      parameters: bodyKeys.map((key) => ({
        type: "text",
        parameter_name: key,
        text: requireValue(context.parameterValues, key),
      })),
    });
  }

  let headerAsset: BroadcastHeaderAsset | undefined;
  const headerFormat = getHeaderFormat(template);
  if (headerFormat !== null) {
    const mediaAsset = context.mediaAsset;
    if (mediaAsset === null) {
      throw new Error("WhatsApp template media is still preparing.");
    }
    if (mediaAsset.status !== "ready" || !mediaAsset.mediaId?.trim()) {
      throw new Error(
        mediaAsset.lastError?.trim() ||
          "WhatsApp template media is still preparing.",
      );
    }
    const spec = assertWhatsAppTemplateMediaSpec(mediaAsset.mimeType);
    if (spec.headerFormat !== headerFormat) {
      throw new Error("Prepared WhatsApp template media format is invalid.");
    }
    headerAsset = buildWhatsAppTemplateHeaderAsset(
      { mimeType: spec.mimeType, filename: mediaAsset.filename, headerFormat: spec.headerFormat },
      getPublicMediaUrl(mediaAsset.r2Key),
    );
    components.unshift({
      type: "header",
      parameters: [mediaParameter(spec.sendType, mediaAsset.mediaId.trim())],
    });
  }

  if (components.length > 0) {
    payload.components = components;
  }
  return { template: payload, renderedContent, ...(headerAsset ? { headerAsset } : {}) };
}
