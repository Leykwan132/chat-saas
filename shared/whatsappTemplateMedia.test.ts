import { describe, expect, test } from "vitest";
import {
  assertWhatsAppTemplateMediaSpec,
  getWhatsAppTemplateMediaSpec,
  whatsappTemplateMediaAcceptForFormat,
} from "./whatsappTemplateMedia";

describe("whatsappTemplateMedia", () => {
  test.each([
    ["application/pdf", "DOCUMENT", "document"],
    ["image/jpeg", "IMAGE", "image"],
    ["image/jpg", "IMAGE", "image"],
    ["image/png", "IMAGE", "image"],
    ["video/mp4", "VIDEO", "video"],
  ] as const)("maps %s to Meta formats", (mimeType, headerFormat, sendType) => {
    const spec = assertWhatsAppTemplateMediaSpec(mimeType);
    expect(spec.mimeType).toBe(mimeType);
    expect(spec.headerFormat).toBe(headerFormat);
    expect(spec.sendType).toBe(sendType);
  });

  test.each(["", "image/gif", "video/quicktime", "application/json"])(
    "rejects unsupported MIME %s",
    (mimeType) => {
      expect(getWhatsAppTemplateMediaSpec(mimeType)).toBeNull();
      expect(() => assertWhatsAppTemplateMediaSpec(mimeType)).toThrow(
        "Unsupported WhatsApp template media type",
      );
    },
  );

  test("returns exact accept strings per header format", () => {
    expect(whatsappTemplateMediaAcceptForFormat("DOCUMENT")).toBe("application/pdf");
    expect(whatsappTemplateMediaAcceptForFormat("IMAGE")).toBe(
      "image/jpeg,image/jpg,image/png",
    );
    expect(whatsappTemplateMediaAcceptForFormat("VIDEO")).toBe("video/mp4");
  });
});
