import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { renderWhatsAppTemplateBodyText } from "./whatsappTemplateRender";

test("template payload builder returns prepared header presentation", () => {
  const source = readFileSync(
    new URL("./whatsappTemplateSendPayloadBuild.ts", import.meta.url),
    "utf8",
  );
  expect(source).toContain("buildWhatsAppTemplateHeaderAsset");
  expect(source).toContain("getPublicMediaUrl(mediaAsset.r2Key)");
  expect(source).toContain("headerAsset");
});

test("renderWhatsAppTemplateBodyText renders named placeholders", () => {
  expect(
    renderWhatsAppTemplateBodyText("Hi {{customer_name}}, your booking is on {{booking_date}}.", {
      customer_name: "Jessica",
      booking_date: "July 18",
    }),
  ).toBe("Hi Jessica, your booking is on July 18.");
});

test("renderWhatsAppTemplateBodyText renders at-parameters", () => {
  expect(
    renderWhatsAppTemplateBodyText("Hi @customer_name, your phone is @customer_phone.", {
      customer_name: "Jessica",
      customer_phone: "+16505551234",
    }),
  ).toBe("Hi Jessica, your phone is +16505551234.");
});
