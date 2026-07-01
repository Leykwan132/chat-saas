import { v } from "convex/values";
import type { ActionCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  assertWhatsAppTemplateMediaSpec,
  whatsappTemplateMediaFilename,
  type WhatsAppTemplateHeaderFormat,
  type WhatsAppTemplateMediaMimeType,
} from "../shared/whatsappTemplateMedia";
import {
  graphBase,
  readGraphObject,
  resolveMetaAppId,
  uploadHeaderAssetToMeta,
} from "./whatsappTemplateMetaUpload";
import { internal } from "./_generated/api";

const templateButtonValidator = v.object({
  type: v.union(
    v.literal("QUICK_REPLY"),
    v.literal("URL"),
    v.literal("PHONE_NUMBER"),
    v.literal("COPY_CODE"),
  ),
  text: v.string(),
  url: v.optional(v.string()),
  phone_number: v.optional(v.string()),
  example: v.optional(v.string()),
});

const namedBodyExampleValidator = v.object({
  body_text_named_params: v.array(
    v.object({
      param_name: v.string(),
      example: v.string(),
    }),
  ),
});

const mediaHeaderFormatValidator = v.union(v.literal("DOCUMENT"), v.literal("IMAGE"), v.literal("VIDEO"));

const mediaMimeTypeValidator = v.union(
  v.literal("application/pdf"),
  v.literal("image/jpeg"),
  v.literal("image/jpg"),
  v.literal("image/png"),
  v.literal("video/mp4"),
);

export const templateUpdateComponentValidator = v.union(
  v.object({
    type: v.literal("HEADER"),
    format: v.literal("TEXT"),
    text: v.string(),
  }),
  v.object({
    type: v.literal("HEADER"),
    format: mediaHeaderFormatValidator,
    r2Key: v.string(),
    filename: v.string(),
    mimeType: mediaMimeTypeValidator,
  }),
  v.object({
    type: v.literal("BODY"),
    text: v.string(),
    example: v.optional(namedBodyExampleValidator),
  }),
  v.object({
    type: v.literal("FOOTER"),
    text: v.string(),
  }),
  v.object({
    type: v.literal("BUTTONS"),
    buttons: v.array(templateButtonValidator),
  }),
);

export type TemplateUpdateComponent =
  | { type: "HEADER"; format: "TEXT"; text: string }
  | {
      type: "HEADER";
      format: WhatsAppTemplateHeaderFormat;
      r2Key: string;
      filename: string;
      mimeType: WhatsAppTemplateMediaMimeType;
    }
  | {
      type: "BODY";
      text: string;
      example?: {
        body_text_named_params: Array<{ param_name: string; example: string }>;
      };
    }
  | { type: "FOOTER"; text: string }
  | {
      type: "BUTTONS";
      buttons: Array<{
        type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE";
        text: string;
        url?: string;
        phone_number?: string;
        example?: string;
      }>;
    };

type MetaTemplateRow = {
  id?: string;
  name?: string;
  language?: string | { code?: string };
  category?: string;
  components?: unknown;
};

type StoredComponent = Record<string, unknown> & { type: string };

export function normalizeCategory(category: string): "MARKETING" | "UTILITY" {
  const normalized = category.trim().toUpperCase();
  if (normalized === "MARKETING" || normalized === "UTILITY") return normalized;
  throw new Error("Template category must be Marketing or Utility.");
}

export async function getOrgWhatsAppChannel(
  ctx: ActionCtx,
  channelId: Id<"channels">,
  orgId: string,
): Promise<Doc<"channels">> {
  const channel = await ctx.runQuery(internal.channels.internalGetChannel, { channelId });
  if (channel === null || channel.orgId !== orgId) throw new Error("Channel not found");
  if (channel.service !== "whatsapp") throw new Error("Not a WhatsApp channel");
  if (channel.status !== "connected") throw new Error("WhatsApp channel is not connected");
  if (!channel.wabaId?.trim()) {
    throw new Error("WhatsApp Business Account ID is missing for this channel.");
  }
  if (!channel.accessToken?.trim()) {
    throw new Error("WhatsApp channel has no access token. Reconnect in Channels.");
  }
  return channel;
}

function normalizeLanguage(lang: MetaTemplateRow["language"]): string {
  if (typeof lang === "string" && lang.trim()) return lang.trim();
  if (lang && typeof lang === "object" && typeof lang.code === "string") {
    return lang.code.trim();
  }
  return "";
}

export async function resolveRemoteTemplate(args: {
  wabaId: string;
  token: string;
  templateName: string;
  templateLanguage: string;
}) {
  const url = `${graphBase()}/${args.wabaId}/message_templates?fields=id,name,language,category,components&limit=200`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${args.token}` },
  });
  const body = (await readGraphObject(res, "Meta template lookup failed")) as {
    data?: MetaTemplateRow[];
  };
  const template = (body.data ?? []).find(
    (row) =>
      row.name?.trim() === args.templateName.trim() &&
      normalizeLanguage(row.language) === args.templateLanguage.trim(),
  );
  if (!template?.id?.trim()) throw new Error("Template could not be found on Meta.");
  return template;
}

function normalizeStoredComponents(value: unknown): StoredComponent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((component) => {
    if (component === null || typeof component !== "object" || Array.isArray(component)) {
      return [];
    }
    const record = component as Record<string, unknown>;
    const type = typeof record.type === "string" ? record.type.trim().toUpperCase() : "";
    return type ? [{ ...record, type }] : [];
  });
}

export function normalizeUpdateComponent(
  component: TemplateUpdateComponent,
): TemplateUpdateComponent {
  if (component.type === "HEADER") {
    if (component.format === "TEXT") {
      const text = component.text.trim();
      if (!text) throw new Error("Header text is required.");
      return { type: "HEADER", format: "TEXT", text };
    }
    const r2Key = component.r2Key.trim();
    if (!r2Key) throw new Error("Header media is missing.");
    const spec = assertWhatsAppTemplateMediaSpec(component.mimeType);
    if (spec.headerFormat !== component.format) {
      throw new Error("Selected file type does not match the header type.");
    }
    return {
      type: "HEADER",
      format: spec.headerFormat,
      r2Key,
      filename: whatsappTemplateMediaFilename(component.filename, spec.mimeType),
      mimeType: spec.mimeType,
    };
  }
  if (component.type === "BODY") {
    const text = component.text.trim();
    if (!text) throw new Error("Main message is required.");
    return component.example ? { ...component, text } : { type: "BODY", text };
  }
  if (component.type === "FOOTER") {
    const text = component.text.trim();
    if (!text) throw new Error("Footer text is required.");
    return { type: "FOOTER", text };
  }
  const buttons = component.buttons.map((button) => {
    const text = button.text.trim();
    if (!text) throw new Error("Button text is required.");
    if (button.type === "URL") {
      const url = button.url?.trim();
      if (!url) throw new Error("URL button requires a web address.");
      return { type: "URL" as const, text, url };
    }
    if (button.type === "PHONE_NUMBER") {
      const phoneNumber = button.phone_number?.trim();
      if (!phoneNumber) throw new Error("Phone button requires a phone number.");
      return { type: "PHONE_NUMBER" as const, text, phone_number: phoneNumber };
    }
    if (button.type === "COPY_CODE") {
      const example = button.example?.trim();
      if (!example) throw new Error("Copy code button requires an example code.");
      return { type: "COPY_CODE" as const, text, example };
    }
    return { type: "QUICK_REPLY" as const, text };
  });
  if (buttons.length === 0) throw new Error("At least one button is required.");
  return { type: "BUTTONS", buttons };
}

export function mergeTemplateComponents(
  existing: unknown,
  updates: TemplateUpdateComponent[],
): StoredComponent[] {
  const byType = new Map<string, StoredComponent>();
  for (const component of normalizeStoredComponents(existing)) byType.set(component.type, component);
  for (const component of updates) {
    byType.set(component.type, JSON.parse(JSON.stringify(component)) as StoredComponent);
  }
  const order = new Map([
    ["HEADER", 0],
    ["BODY", 1],
    ["FOOTER", 2],
    ["BUTTONS", 3],
  ]);
  return [...byType.values()].sort(
    (a, b) => (order.get(a.type) ?? 99) - (order.get(b.type) ?? 99),
  );
}

export function hasNamedBodyParameters(components: StoredComponent[]) {
  const body = components.find((component) => component.type === "BODY");
  return typeof body?.text === "string" && /\{\{[a-z][a-z0-9_]*\}\}/.test(body.text);
}

export function hasMediaHeaderUpdate(components: TemplateUpdateComponent[]) {
  return components.some(
    (component) => component.type === "HEADER" && component.format !== "TEXT",
  );
}

export async function prepareMetaUpdateComponents(
  components: TemplateUpdateComponent[],
  token: string,
) {
  if (!hasMediaHeaderUpdate(components)) return components;
  const appId = await resolveMetaAppId(token);
  const prepared: Array<Record<string, unknown>> = [];
  for (const component of components) {
    if (component.type !== "HEADER" || component.format === "TEXT") {
      prepared.push(component);
      continue;
    }
    const headerHandle = await uploadHeaderAssetToMeta({
      token,
      appId,
      r2Key: component.r2Key,
      filename: component.filename,
      mimeType: component.mimeType,
    });
    prepared.push({
      type: "HEADER",
      format: component.format,
      example: { header_handle: [headerHandle] },
    });
  }
  return prepared;
}
