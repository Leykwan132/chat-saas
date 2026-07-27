import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isInboxImagePlaceholder } from "../shared/inboxAttachments";
import {
  getPlanFeatureDescriptionHover,
  MEDIA_UNDERSTANDING_LABEL,
  PLAN_CATALOG,
} from "../shared/planCatalog";
import { isAllowedMetaMediaUrl } from "./chat/inboundMediaFetch";
import { parseInboundMediaResults } from "./chat/inboundMediaModel";
import { inboundMediaProcessAfter } from "./inboundMediaBatch";
import { resolveWhatsAppDownloadMimeType } from "./chat/whatsappMediaIngest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("inbound media entitlement", () => {
  it("is enabled only for Growth and Business", () => {
    expect(PLAN_CATALOG.free.features.ai_handle_audio_image).toBe(false);
    expect(PLAN_CATALOG.starter.features.ai_handle_audio_image).toBe(false);
    expect(PLAN_CATALOG.growth.features.ai_handle_audio_image).toBe(true);
    expect(PLAN_CATALOG.business.features.ai_handle_audio_image).toBe(true);
    expect(PLAN_CATALOG.growth.displayFeatures).toContain(
      "Visual & Voice Intelligence",
    );
    expect(getPlanFeatureDescriptionHover(MEDIA_UNDERSTANDING_LABEL)).toEqual({
      title: "Visual & Voice Intelligence",
      description:
        "AI is able to understand the audio and photos sent by users.",
    });
  });
});

describe("inbound media batching", () => {
  it("uses a two-second quiet window capped at five seconds", () => {
    expect(inboundMediaProcessAfter(1_000, 1_000)).toBe(3_000);
    expect(inboundMediaProcessAfter(4_500, 1_000)).toBe(6_000);
    expect(inboundMediaProcessAfter(8_000, 1_000)).toBe(6_000);
  });

  it("deduplicates assets and finalizes one reply", () => {
    const batchSource = source("./inboundMediaBatch.ts");
    expect(batchSource).toContain('.withIndex("by_assetKey"');
    expect(batchSource).toContain("batch.revision !== args.revision");
    expect(
      batchSource.match(/inboxAiReplyPool\.enqueueAction/g),
    ).toHaveLength(1);
  });
});

describe("inbound media trust boundaries", () => {
  it("accepts only HTTPS Meta media hosts", () => {
    expect(
      isAllowedMetaMediaUrl(
        "https://lookaside.fbsbx.com/ig_messaging_cdn/file",
      ),
    ).toBe(true);
    expect(
      isAllowedMetaMediaUrl("https://scontent.cdninstagram.com/file"),
    ).toBe(true);
    expect(isAllowedMetaMediaUrl("http://lookaside.fbsbx.com/file")).toBe(
      false,
    );
    expect(isAllowedMetaMediaUrl("https://fbsbx.com.evil.test/file")).toBe(
      false,
    );
    expect(isAllowedMetaMediaUrl("https://127.0.0.1/file")).toBe(false);
  });

  it("maps only supplied assets and bounds generated fields", () => {
    const allowed = new Map<string, "image" | "audio">([
      ["image-1", "image"],
      ["audio-1", "audio"],
    ]);
    const parsed = parseInboundMediaResults(
      {
        captionResponse: "Damaged box",
        results: [
          {
            assetKey: "image-1",
            imageDescription: "x".repeat(5_000),
          },
          {
            assetKey: "audio-1",
            audioTranscript: "Hello",
            audioLanguage: "English",
          },
          {
            assetKey: "unknown",
            imageDescription: "Ignore me",
          },
        ],
      },
      allowed,
    );
    expect(parsed.results).toHaveLength(2);
    expect(parsed.results[0]?.imageDescription).toHaveLength(4_000);
    expect(parsed.results[1]?.audioTranscript).toBe("Hello");
  });
});

describe("inbound media integration contracts", () => {
  it("queues all live Meta channel media through the same batcher", () => {
    for (const file of [
      "./whatsappWebhook.ts",
      "./instagramWebhook.ts",
      "./messengerWebhook.ts",
    ]) {
      expect(source(file)).toContain("queueInboundMediaBatch");
    }
  });

  it("downloads WhatsApp media with bearer auth and stores it durably", () => {
    const webhookSource = source("./whatsappWebhook.ts");
    const imageIngestSource = source("./chat/inboxImageIngest.ts");
    const audioIngestSource = source("./chat/inboxAudioIngest.ts");
    const mediaIngestSource = source("./chat/whatsappMediaIngest.ts");
    const uiSource = source(
      "../src/components/inbox/InboxThreadMessages.tsx",
    );
    expect(webhookSource).toContain("resolveWhatsAppImageFiles");
    expect(webhookSource).toContain("images: args.images");
    expect(webhookSource).toContain(
      "channel.orgId || channel.connectedByUserId",
    );
    expect(webhookSource.match(/orgId: mediaOwnerId/g)).toHaveLength(2);
    expect(imageIngestSource).toContain("storeWhatsAppMediaInR2");
    expect(audioIngestSource).toContain("storeWhatsAppMediaInR2");
    expect(mediaIngestSource).toContain(
      "Authorization: `Bearer ${accessToken}`",
    );
    expect(mediaIngestSource).toContain(
      'response.headers.get("content-type")',
    );
    expect(mediaIngestSource).toContain("5 * 1024 * 1024");
    expect(mediaIngestSource).toContain("16 * 1024 * 1024");
    expect(mediaIngestSource).toContain("response.status === 404");
    expect(mediaIngestSource).toContain("r2.store");
    expect(mediaIngestSource).toContain("getPublicMediaUrl");
    expect(mediaIngestSource).not.toContain("base64");
    expect(mediaIngestSource).not.toContain("console.log");
    const imageIndex = uiSource.indexOf("{imageFiles.length > 0");
    const captionIndex = uiSource.indexOf("{showText ? (", imageIndex);
    expect(imageIndex).toBeGreaterThan(-1);
    expect(captionIndex).toBeGreaterThan(imageIndex);
    expect(uiSource).toContain("'block h-6 w-full'");
  });

  it("hides captionless image placeholders from Inbox display", () => {
    expect(isInboxImagePlaceholder("<image>")).toBe(true);
    expect(isInboxImagePlaceholder("[User attached an image]")).toBe(true);
    expect(source("./whatsappWebhook.ts")).toContain(
      'if (msg.type === "image") return "";',
    );
  });

  it("uses the retrieved MIME when downloads return octet-stream", () => {
    expect(
      resolveWhatsAppDownloadMimeType(
        "image",
        "application/octet-stream",
        "image/jpeg",
      ),
    ).toBe("image/jpeg");
    expect(
      resolveWhatsAppDownloadMimeType("audio", "audio/mpeg", "audio/ogg"),
    ).toBe("audio/mpeg");
    expect(
      resolveWhatsAppDownloadMimeType("image", "text/html", "image/png"),
    ).toBe("text/html");
  });

  it("records MiMo usage without deducting customer credits", () => {
    const workerSource = source("./inboundMediaUnderstanding.ts");
    expect(workerSource).toContain("internal.agentUsage.insertRawUsage");
    expect(workerSource).toContain('model: INBOUND_MEDIA_MODEL');
    expect(workerSource).not.toContain("internalDeductCredits");
  });

  it("keeps temporary inbound-media diagnostics out of production paths", () => {
    for (const file of [
      "./whatsappWebhook.ts",
      "./instagramWebhook.ts",
      "./messengerWebhook.ts",
      "./inboundMediaUnderstanding.ts",
      "./chat/whatsappMediaIngest.ts",
    ]) {
      expect(source(file)).not.toContain("[inbound-media]");
      expect(source(file)).not.toContain("LOG_META_WEBHOOK_MESSAGE_ARRAYS");
    }
    expect(source("./whatsappWebhook.ts")).not.toContain(
      "[whatsapp-webhook] raw value.messages",
    );
    expect(source("./chat/whatsappMediaIngest.ts")).not.toContain(
      "[whatsapp-media]",
    );
  });

  it("updates source turns and always continues to one reply", () => {
    const workerSource = source("./inboundMediaUnderstanding.ts");
    expect(workerSource).toContain("configuredAgent.updateMessage");
    expect(workerSource).toContain("finally");
    expect(workerSource).toContain(
      "finalizeBatchAndEnqueueReply",
    );
  });

  it("renders only audio transcripts in Inbox", () => {
    const uiSource = source(
      "../src/components/inbox/InboxThreadMessages.tsx",
    );
    const transcriptSource = source(
      "../src/components/inbox/InboxAudioTranscript.tsx",
    );
    expect(uiSource).toContain("InboxAudioTranscript");
    expect(uiSource).toContain("audioTranscript");
    expect(uiSource).not.toContain("imageDescription");
    expect(transcriptSource).toContain("Show Transcript");
    expect(transcriptSource).toContain("Hide Transcript");
    expect(transcriptSource).toContain("ChevronDown");
    expect(transcriptSource).toContain("bg-muted");
  });
});
