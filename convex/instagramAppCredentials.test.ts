import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("verifies Instagram signed requests with the Instagram Login app secret", () => {
  const source = readFileSync(new URL("./http.ts", import.meta.url), "utf8");

  expect(source).toContain("process.env.META_IG_APP_SECRET");
  expect(source).not.toContain("process.env.INSTAGRAM_APP_SECRET");
  const authSource = readFileSync(new URL("./instagramAuth.ts", import.meta.url), "utf8");
  expect(authSource).toContain("META_IG_APP_ID is not configured");
  expect(authSource).not.toContain("instagram_business_content_publish");
});
