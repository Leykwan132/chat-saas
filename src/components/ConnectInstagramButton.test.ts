import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("uses direct Instagram Login authorization", () => {
  const source = readFileSync(
    new URL("./ConnectInstagramButton.tsx", import.meta.url),
    "utf8",
  );

  expect(source).toContain("api.instagramAuth.start");
  expect(source).toContain("startInstagramLogin({");
  expect(source).toContain("window.location.assign");
  expect(source).not.toContain("VITE_IG_CONFIG_ID");
  expect(source).not.toContain("waitForFacebookSdk");
  expect(source).not.toContain("api.instagramEmbeddedSignup.completeSignup");
});
