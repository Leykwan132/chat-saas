import { expect, test } from "vitest";
import { buildWhatsAppTemplateHeaderAsset } from "./whatsappTemplatePresentation";

test("builds typed image header presentation", () => {
  expect(
    buildWhatsAppTemplateHeaderAsset(
      { mimeType: "image/jpeg", filename: "offer.jpg", headerFormat: "IMAGE" },
      "https://cdn.example.com/offer.jpg",
    ),
  ).toEqual({
    url: "https://cdn.example.com/offer.jpg",
    mimeType: "image/jpeg",
    filename: "offer.jpg",
    headerFormat: "IMAGE",
  });
});

test.each(["VIDEO", "DOCUMENT"] as const)(
  "preserves %s header format",
  (headerFormat) => {
    const mimeType = headerFormat === "VIDEO" ? "video/mp4" : "application/pdf";
    expect(
      buildWhatsAppTemplateHeaderAsset(
        { mimeType, filename: "asset", headerFormat },
        "https://cdn.example.com/asset",
      )?.headerFormat,
    ).toBe(headerFormat);
  },
);

test("returns no presentation for a template without header media", () => {
  expect(buildWhatsAppTemplateHeaderAsset(null, undefined)).toBeUndefined();
});
