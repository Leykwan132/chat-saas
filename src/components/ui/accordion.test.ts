import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("accordion content body can grow after the initial open measurement", () => {
  const source = readFileSync(new URL("./accordion.tsx", import.meta.url), "utf8");

  expect(source).not.toContain("h-(--radix-accordion-content-height)");
});
