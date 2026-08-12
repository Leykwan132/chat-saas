import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { ModelSelectorLogo } from "./model-selector";
import { getModelSelectorLogoSource } from "./modelSelectorLogo";

test("renders the colored LobeHub Qwen icon for the qwen provider", () => {
  const markup = renderToStaticMarkup(<ModelSelectorLogo provider="qwen" />);

  expect(markup).toContain("<title>Qwen</title>");
  expect(markup).not.toContain("<img");
});

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
