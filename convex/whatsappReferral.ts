import { v, type Infer } from "convex/values";

export const whatsappReferralValidator = v.object({
  sourceType: v.union(v.literal("ad"), v.literal("post")),
  sourceId: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  headline: v.optional(v.string()),
  body: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  videoUrl: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),
  mediaType: v.optional(v.string()),
  clickId: v.optional(v.string()),
});

export const whatsappReferralEntryValidator = v.object({
  messageId: v.id("messages"),
  receivedAt: v.number(),
  replyDeadlineAt: v.number(),
});

export const whatsappFreeMessagingWindowValidator = v.object({
  sourceMessageId: v.id("messages"),
  replyMessageId: v.id("messages"),
  startedAt: v.number(),
  expiresAt: v.number(),
  confirmed: v.boolean(),
});

export type WhatsAppReferral = Infer<typeof whatsappReferralValidator>;

export function parseWhatsAppReferral(value: unknown): WhatsAppReferral | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const referral = value as Record<string, unknown>;
  if (referral.source_type !== "ad" && referral.source_type !== "post") return undefined;
  const result: WhatsAppReferral = { sourceType: referral.source_type };
  const fields = {
    source_id: "sourceId", source_url: "sourceUrl", headline: "headline", body: "body",
    image_url: "imageUrl", video_url: "videoUrl", thumbnail_url: "thumbnailUrl",
    media_type: "mediaType", ctwa_clid: "clickId",
  } as const;
  for (const [providerField, storedField] of Object.entries(fields)) {
    const fieldValue = referral[providerField];
    if (typeof fieldValue === "string") result[storedField] = fieldValue;
  }
  return result;
}
