import { expect, test } from "vitest";
import { getModelSelectorLogoSource } from "./modelSelectorLogo";

test("uses a custom model image when supplied", () => {
  expect(
    getModelSelectorLogoSource(
      "ilmu",
      "https://storage.kilobot.app/ytl_ai_labs-removebg-preview.png",
    ),
  ).toBe("https://storage.kilobot.app/ytl_ai_labs-removebg-preview.png");
});

test("uses models.dev for ordinary providers", () => {
  expect(getModelSelectorLogoSource("deepseek")).toBe(
    "https://models.dev/logos/deepseek.svg",
  );
});
