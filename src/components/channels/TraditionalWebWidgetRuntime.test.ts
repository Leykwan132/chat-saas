import { expect, test } from "vitest";
import traditionalRuntime from "../../../public/widget/traditional.js?raw";

test("Traditional embed renders the supplied WhatsApp SVG inline", () => {
  expect(traditionalRuntime).toContain("aria-label='WhatsApp icon'");
  expect(traditionalRuntime).toContain("viewBox='0 0 512 512'");
  expect(traditionalRuntime).toContain("fill='#4CAF50'");
  expect(traditionalRuntime).toContain("fill='#FAFAFA'");
});
