import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const source = readFileSync(
  new URL("./WorkflowTemplatePreviewOverlay.tsx", import.meta.url),
  "utf8",
);

test("template preview centers Replace Current and Skip actions", () => {
  expect(source).toContain("Previewing: {name}");
  expect(source).toContain("Replace Current");
  expect(source).toContain("Skip");
  expect(source).toContain('variant="outline"');
  expect(source).toContain("isReplacing");
  expect(source).toContain("items-center justify-center");
});
